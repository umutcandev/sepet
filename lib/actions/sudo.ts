"use server"

import { and, eq, sql } from "drizzle-orm"
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server"

import { auth } from "@/auth"
import { db, users, emailVerification } from "@/lib/db"
import { verifyPassword } from "@/lib/auth/password"
import {
  normalizeEmail,
  generateCode,
  generateToken,
  hashSecret,
  safeEqual,
} from "@/lib/auth/codes"
import { decryptSecret, verifyTotp, claimTotpStep } from "@/lib/auth/totp"
import { createReauthOptions, verifyAssertion } from "@/lib/auth/webauthn"
import { grantSudo } from "@/lib/auth/sudo"
import { sendMail } from "@/lib/email/mailer"
import { reauthCodeEmail } from "@/lib/email/templates"
import { getClientIp, checkLimit } from "@/lib/security/action-rate-limit"
import {
  passwordChangeLimiter,
  emailSendLimiter,
  emailSendIpLimiter,
} from "@/lib/security/rate-limit"

// Hassas işlem öncesi yeniden doğrulama ("sudo" penceresi, bkz. lib/auth/sudo.ts).
// Kabul edilen faktörler: mevcut geçiş anahtarı, şifre, TOTP kodu; şifresiz
// (sosyal giriş) hesapta e-postaya gelen kod. Birini geçmek bu oturuma 10 dk açar.

const REAUTH_TTL_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const FAILED = "Doğrulama başarısız. Bilgilerini kontrol edip tekrar dene."

export type ActionResult = { ok: true } | { ok: false; error: string }

export type SudoInput =
  | { method: "passkey"; response: unknown }
  | { method: "password"; password: string }
  | { method: "totp"; code: string }
  | { method: "email"; code: string }

// ─── Şifresiz hesap: e-postaya doğrulama kodu gönder ───
export async function requestSudoEmailCodeAction(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  const [u] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)
  if (!u?.email) return { ok: false, error: "Oturum bulunamadı." }
  // Şifresi olan hesap şifresiyle (ya da diğer faktörlerle) doğrular.
  if (u.passwordHash) {
    return { ok: false, error: "Doğrulama için şifreni girmen yeterli." }
  }

  const email = normalizeEmail(u.email)
  const ip = await getClientIp()
  for (const check of [
    await checkLimit(emailSendIpLimiter, ip),
    await checkLimit(emailSendLimiter, email),
  ]) {
    if (!check.ok) return check
  }

  const code = generateCode()
  // Link yok ama tokenHash notNull + unique → kullanılmayan bir token üretilir.
  const token = generateToken()
  const expiresAt = new Date(Date.now() + REAUTH_TTL_MS)
  await db
    .insert(emailVerification)
    .values({
      email,
      purpose: "reauth",
      userId: uid,
      codeHash: hashSecret(code),
      tokenHash: hashSecret(token),
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [emailVerification.email, emailVerification.purpose],
      set: {
        userId: uid,
        codeHash: hashSecret(code),
        tokenHash: hashSecret(token),
        attempts: 0,
        expiresAt,
        createdAt: new Date(),
      },
    })

  void sendMail({ to: email, ...reauthCodeEmail({ code }) })
  return { ok: true }
}

// ─── Geçiş anahtarıyla teyit: yalnız bu kullanıcının anahtarları için seçenekler ───
export async function beginSudoPasskeyAction(): Promise<
  | { ok: true; options: PublicKeyCredentialRequestOptionsJSON }
  | { ok: false; error: string }
> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const options = await createReauthOptions(session.user.id)
  if (!options) {
    return { ok: false, error: "Hesabında kayıtlı bir geçiş anahtarı yok." }
  }
  return { ok: true, options }
}

// ─── Teyit: faktörü doğrula, bu oturuma sudo penceresi aç ───
export async function confirmSudoAction(
  input: SudoInput
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  const limit = await checkLimit(passwordChangeLimiter, `sudo:${uid}`)
  if (!limit.ok) return limit

  const [u] = await db
    .select({
      email: users.email,
      passwordHash: users.passwordHash,
      totpEnabled: users.totpEnabled,
      totpSecretEnc: users.totpSecretEnc,
    })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)
  if (!u) return { ok: false, error: "Oturum bulunamadı." }

  let ok = false
  switch (input?.method) {
    case "passkey": {
      const result = await verifyAssertion(input.response, "reauth", uid)
      if (!result.ok && result.code === "expired") {
        return { ok: false, error: "İsteğin süresi doldu. Tekrar dene." }
      }
      ok = result.ok
      break
    }
    case "password": {
      const password = typeof input.password === "string" ? input.password : ""
      if (password && u.passwordHash) {
        ok = await verifyPassword(u.passwordHash, password)
      }
      break
    }
    case "totp": {
      const code = typeof input.code === "string" ? input.code.trim() : ""
      if (/^\d{6}$/.test(code) && u.totpEnabled && u.totpSecretEnc) {
        try {
          const step = verifyTotp(decryptSecret(u.totpSecretEnc), code)
          // Girişteki atomik adım talebiyle aynı replay koruması.
          ok = step !== null && (await claimTotpStep(uid, step))
        } catch {
          ok = false
        }
      }
      break
    }
    case "email": {
      const code = typeof input.code === "string" ? input.code.trim() : ""
      if (!u.passwordHash && u.email && /^\d{6}$/.test(code)) {
        const consumed = await consumeReauthCode(uid, u.email, code)
        if (!consumed.ok) return consumed
        ok = true
      }
      break
    }
  }

  if (!ok) return { ok: false, error: FAILED }
  await grantSudo(uid, session.sid)
  return { ok: true }
}

// "reauth" e-posta kodunu atomik attempts++ (cap MAX_ATTEMPTS) + süre +
// safeEqual ile tüket (kayıt ve 2FA kurulum kodlarıyla aynı desen).
async function consumeReauthCode(
  uid: string,
  rawEmail: string,
  code: string
): Promise<ActionResult> {
  const email = normalizeEmail(rawEmail)
  const [row] = await db
    .update(emailVerification)
    .set({ attempts: sql`${emailVerification.attempts} + 1` })
    .where(
      and(
        eq(emailVerification.email, email),
        eq(emailVerification.purpose, "reauth"),
        eq(emailVerification.userId, uid)
      )
    )
    .returning({
      id: emailVerification.id,
      codeHash: emailVerification.codeHash,
      expiresAt: emailVerification.expiresAt,
      attempts: emailVerification.attempts,
    })

  if (!row) {
    return {
      ok: false,
      error: "Kod geçersiz ya da süresi dolmuş. Yeni kod iste.",
    }
  }
  if (row.attempts > MAX_ATTEMPTS) {
    await db.delete(emailVerification).where(eq(emailVerification.id, row.id))
    return { ok: false, error: "Çok fazla yanlış deneme. Yeni kod iste." }
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(emailVerification).where(eq(emailVerification.id, row.id))
    return { ok: false, error: "Kodun süresi doldu. Yeni kod iste." }
  }
  if (!safeEqual(hashSecret(code), row.codeHash)) {
    return { ok: false, error: "Kod hatalı. Tekrar dene." }
  }
  await db.delete(emailVerification).where(eq(emailVerification.id, row.id))
  return { ok: true }
}
