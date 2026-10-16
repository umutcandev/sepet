"use server"

import { and, count, eq } from "drizzle-orm"
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server"

import { auth, signIn } from "@/auth"
import { db, users, accounts, passkeys } from "@/lib/db"
import { sanitizeCallback } from "@/lib/auth/callback"
import {
  mapCredentialsError,
  isAuthError,
  authErrorCode,
} from "@/lib/auth/auth-errors"
import { readRequestDeviceInfo } from "@/lib/auth/device"
import {
  defaultPasskeyName,
  normalizePasskeyName,
  providerNameFromAaguid,
} from "@/lib/auth/passkey-names"
import { hasSudo } from "@/lib/auth/sudo"
import {
  MAX_PASSKEYS,
  createLoginOptions,
  createRegistrationOptions,
  getRelyingParty,
  listUserPasskeys,
  verifyRegistration,
} from "@/lib/auth/webauthn"
import { sendMail } from "@/lib/email/mailer"
import { passkeyAddedEmail, passkeyRemovedEmail } from "@/lib/email/templates"
import { getClientIp, checkLimit } from "@/lib/security/action-rate-limit"
import {
  passkeyLoginLimiter,
  passkeyOptionsLimiter,
  passkeyRegisterLimiter,
} from "@/lib/security/rate-limit"

export type ActionResult = { ok: true } | { ok: false; error: string }

export type PasskeyItem = {
  id: string
  credentialId: string
  name: string
  /** AAGUID'den sağlayıcı adı (ör. "iCloud Anahtar Zinciri"); bilinmiyorsa null. */
  provider: string | null
  /** multiDevice: şifre yöneticisiyle cihazlar arasında senkronize edilebilir. */
  synced: boolean
  /** ISO string — istemcide tr-TR Intl ile biçimlenir. */
  createdAt: string
  lastUsedAt: string | null
}

export type ReauthMethods = {
  passkey: boolean
  password: boolean
  totp: boolean
  email: boolean
}

// İstemcinin şifre yöneticisine sunucu durumunu bildirmesi için (Signal API).
export type PasskeySignal = {
  rpID: string
  userID: string
  userName: string
  userDisplayName: string
}

export type PasskeyState =
  | { enabled: false }
  | {
      enabled: true
      /** İstemci, rpID bu sayfanın alan adına uymuyorsa arayüzü gizler. */
      rpID: string
      passkeys: PasskeyItem[]
      sudo: boolean
      reauth: ReauthMethods
      signal: PasskeySignal | null
    }

const SUDO_REQUIRED = "Devam etmek için kimliğini doğrula."
const DISABLED = "Geçiş anahtarları şu an kullanılamıyor."

function toItem(row: {
  id: string
  credentialId: string
  name: string
  aaguid: string | null
  deviceType: "singleDevice" | "multiDevice"
  createdAt: Date
  lastUsedAt: Date | null
}): PasskeyItem {
  return {
    id: row.id,
    credentialId: row.credentialId,
    name: row.name,
    provider: providerNameFromAaguid(row.aaguid),
    synced: row.deviceType === "multiDevice",
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  }
}

// ─── Giriş (oturumsuz) ───

// Giriş modalı açılınca önceden çekilir (otomatik doldurma + buton aynı
// seçenekleri kullanır; Safari, async fetch sonrası gelen get() çağrısını user
// gesture'dan kopmuş sayabildiği için tıklamada yeniden istek atılmaz).
export async function beginPasskeyLoginAction(): Promise<
  | { ok: true; options: PublicKeyCredentialRequestOptionsJSON }
  | { ok: false; error: string; code?: string }
> {
  const ip = await getClientIp()
  const limit = await checkLimit(passkeyOptionsLimiter, `ip:${ip}`)
  if (!limit.ok) return { ...limit, code: "rate_limited" }
  const options = await createLoginOptions()
  if (!options) return { ok: false, error: DISABLED, code: "disabled" }
  return { ok: true, options }
}

export async function passkeyLoginAction(input: {
  response: unknown
  callbackUrl?: string
}): Promise<
  | { ok: true; callbackUrl: string }
  | { ok: false; error: string; code?: string }
> {
  const ip = await getClientIp()
  const limit = await checkLimit(passkeyLoginLimiter, `ip:${ip}`)
  if (!limit.ok) return { ...limit, code: "rate_limited" }

  try {
    // Credentials provider alanları string taşır; doğrulama authorize'da.
    await signIn("passkey", {
      response: JSON.stringify(input?.response ?? null),
      redirect: false,
    })
  } catch (error) {
    if (!isAuthError(error)) throw error
    return {
      ok: false,
      error: mapCredentialsError(error),
      code: authErrorCode(error),
    }
  }
  return { ok: true, callbackUrl: sanitizeCallback(input?.callbackUrl) }
}

// ─── Ayarlar (oturum gerekli) ───

export async function getPasskeyStateAction(): Promise<PasskeyState | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const uid = session.user.id
  const rp = getRelyingParty()
  if (!rp) return { enabled: false }

  const [[u], rows, sudo] = await Promise.all([
    db
      .select({
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        totpEnabled: users.totpEnabled,
        webauthnUserId: users.webauthnUserId,
      })
      .from(users)
      .where(eq(users.id, uid))
      .limit(1),
    listUserPasskeys(uid),
    hasSudo(uid, session.sid),
  ])
  if (!u) return null

  const userName = u.email ?? u.name ?? ""
  return {
    enabled: true,
    rpID: rp.id,
    passkeys: rows.map(toItem),
    sudo,
    reauth: {
      passkey: rows.length > 0,
      password: u.passwordHash != null,
      totp: u.totpEnabled,
      email: u.passwordHash == null && u.email != null,
    },
    signal:
      u.webauthnUserId && userName
        ? {
            rpID: rp.id,
            userID: u.webauthnUserId,
            userName,
            userDisplayName: u.name?.trim() || userName,
          }
        : null,
  }
}

export async function beginPasskeyRegistrationAction(): Promise<
  | { ok: true; options: PublicKeyCredentialCreationOptionsJSON }
  | { ok: false; error: string; code?: "sudo_required" }
> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  if (!(await hasSudo(uid, session.sid))) {
    return { ok: false, error: SUDO_REQUIRED, code: "sudo_required" }
  }
  const limit = await checkLimit(passkeyRegisterLimiter, uid)
  if (!limit.ok) return limit

  const result = await createRegistrationOptions(uid)
  if (result.ok) return result
  if (result.reason === "limit") {
    return {
      ok: false,
      error: `En fazla ${MAX_PASSKEYS} geçiş anahtarı ekleyebilirsin. Yenisi için birini sil.`,
    }
  }
  if (result.reason === "disabled") return { ok: false, error: DISABLED }
  return { ok: false, error: "Oturum bulunamadı." }
}

// Kayıt seçenekleri yalnız sudo penceresinde ve bu kullanıcıya bağlı bir
// challenge ile verilir; challenge tek kullanımlık olduğundan burada ayrıca sudo
// aranmaz (pencere, tarayıcı penceresi açıkken kapanmış olabilir).
export async function finishPasskeyRegistrationAction(input: {
  response: unknown
}): Promise<{ ok: true; passkey: PasskeyItem } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  const result = await verifyRegistration(uid, input?.response)
  if (!result.ok) {
    if (result.code === "expired") {
      return { ok: false, error: "İsteğin süresi doldu. Tekrar dene." }
    }
    if (result.code === "disabled") return { ok: false, error: DISABLED }
    return { ok: false, error: "Geçiş anahtarı doğrulanamadı. Tekrar dene." }
  }
  const { credential } = result

  const [existing, device, [u]] = await Promise.all([
    db
      .select({ name: passkeys.name })
      .from(passkeys)
      .where(eq(passkeys.userId, uid)),
    readRequestDeviceInfo(),
    db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, uid))
      .limit(1),
  ])
  if (existing.length >= MAX_PASSKEYS) {
    return {
      ok: false,
      error: `En fazla ${MAX_PASSKEYS} geçiş anahtarı ekleyebilirsin. Yenisi için birini sil.`,
    }
  }

  const name = defaultPasskeyName(
    {
      aaguid: credential.aaguid,
      transports: credential.transports,
      deviceLabel: device.deviceLabel,
    },
    existing.map((r) => r.name)
  )
  // credentialId unique: aynı kimlik bilgisi (başka hesapta bile) ikinci kez
  // kaydedilmez (WebAuthn L3: RP bu kaydı reddetmeli).
  const [row] = await db
    .insert(passkeys)
    .values({ userId: uid, name, ...credential })
    .onConflictDoNothing({ target: passkeys.credentialId })
    .returning()
  if (!row) return { ok: false, error: "Bu geçiş anahtarı zaten kayıtlı." }

  if (u?.email) {
    void sendMail({
      to: u.email,
      ...passkeyAddedEmail({
        name,
        deviceLabel: device.deviceLabel,
        locationLabel: device.locationLabel,
      }),
    })
  }
  return { ok: true, passkey: toItem(row) }
}

export async function renamePasskeyAction(input: {
  id: string
  name: string
}): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const id = typeof input?.id === "string" ? input.id : ""
  const name = normalizePasskeyName(input?.name)
  if (!id || !name) return { ok: false, error: "Bir ad gir." }

  const [row] = await db
    .update(passkeys)
    .set({ name })
    .where(and(eq(passkeys.id, id), eq(passkeys.userId, session.user.id)))
    .returning({ name: passkeys.name })
  if (!row) return { ok: false, error: "Geçiş anahtarı bulunamadı." }
  return { ok: true, name: row.name }
}

export async function deletePasskeyAction(input: {
  id: string
}): Promise<
  ActionResult | { ok: false; error: string; code: "sudo_required" }
> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id
  const id = typeof input?.id === "string" ? input.id : ""
  if (!id) return { ok: false, error: "Geçiş anahtarı bulunamadı." }

  if (!(await hasSudo(uid, session.sid))) {
    return { ok: false, error: SUDO_REQUIRED, code: "sudo_required" }
  }

  // Son giriş yöntemi silinemez: şifre ya da bağlı sosyal hesap yoksa ve bu son
  // geçiş anahtarıysa hesap kilitlenirdi.
  const [[u], [linked], [keys]] = await Promise.all([
    db
      .select({ email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, uid))
      .limit(1),
    db.select({ n: count() }).from(accounts).where(eq(accounts.userId, uid)),
    db.select({ n: count() }).from(passkeys).where(eq(passkeys.userId, uid)),
  ])
  if (!u) return { ok: false, error: "Oturum bulunamadı." }
  if (!u.passwordHash && (linked?.n ?? 0) === 0 && (keys?.n ?? 0) <= 1) {
    return {
      ok: false,
      error:
        "Bu, hesabına girmenin tek yolu. Silmeden önce başka bir giriş yöntemi ekle.",
    }
  }

  const [row] = await db
    .delete(passkeys)
    .where(and(eq(passkeys.id, id), eq(passkeys.userId, uid)))
    .returning({ name: passkeys.name })
  if (!row) return { ok: false, error: "Geçiş anahtarı bulunamadı." }

  if (u.email) {
    void sendMail({ to: u.email, ...passkeyRemovedEmail({ name: row.name }) })
  }
  return { ok: true }
}
