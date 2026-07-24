"use server"

import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db, users, twoFactorRecoveryCode } from "@/lib/db"
import { verifyPassword } from "@/lib/auth/password"
import {
  generateTotpSecret,
  encryptSecret,
  decryptSecret,
  createTotp,
  verifyTotp,
  generateRecoveryCodes,
} from "@/lib/auth/totp"
import { sendMail } from "@/lib/email/mailer"
import {
  twoFactorEnabledEmail,
  twoFactorDisabledEmail,
} from "@/lib/email/templates"
import { checkLimit } from "@/lib/security/action-rate-limit"
import {
  twoFactorLimiter,
  passwordChangeLimiter,
} from "@/lib/security/rate-limit"

export type ActionResult = { ok: true } | { ok: false; error: string }
type CodesResult =
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; error: string }

// ─── Kurulumu başlat: secret üret, sakla (henüz totpEnabled: false) ───
export async function beginTotpSetupAction(): Promise<
  { ok: true; otpauthUri: string; secretB32: string } | { ok: false; error: string }
> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }

  const [u] = await db
    .select({ email: users.email, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
  if (!u) return { ok: false, error: "Oturum bulunamadı." }
  if (u.totpEnabled) {
    return { ok: false, error: "İki adımlı doğrulama zaten açık." }
  }

  try {
    const secretB32 = generateTotpSecret()
    const enc = encryptSecret(secretB32)
    await db
      .update(users)
      .set({ totpSecretEnc: enc, totpEnabled: false, totpLastUsedStep: null })
      .where(eq(users.id, session.user.id))
    const totp = createTotp(secretB32, u.email ?? "Sepet")
    return { ok: true, otpauthUri: totp.toString(), secretB32 }
  } catch {
    // TOTP_ENCRYPTION_KEY eksik/geçersizse buraya düşer.
    return { ok: false, error: "İki adımlı doğrulama şu an kullanılamıyor." }
  }
}

// ─── Kurulumu onayla: kodu doğrula, aç, kurtarma kodlarını üret ───
export async function confirmTotpSetupAction(input: {
  code: string
}): Promise<CodesResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id
  const code = typeof input?.code === "string" ? input.code.trim() : ""
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "6 haneli kodu gir." }

  const limit = await checkLimit(twoFactorLimiter, `setup:${uid}`)
  if (!limit.ok) return limit

  const [u] = await db
    .select({
      email: users.email,
      totpSecretEnc: users.totpSecretEnc,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)
  if (!u || !u.totpSecretEnc) {
    return { ok: false, error: "Önce kurulumu başlat." }
  }
  if (u.totpEnabled) {
    return { ok: false, error: "İki adımlı doğrulama zaten açık." }
  }

  let step: number | null
  try {
    step = verifyTotp(decryptSecret(u.totpSecretEnc), code)
  } catch {
    return { ok: false, error: "İki adımlı doğrulama şu an kullanılamıyor." }
  }
  if (step === null) return { ok: false, error: "Kod doğrulanamadı. Tekrar dene." }

  const { plaintext, hashes } = generateRecoveryCodes(10)
  // Aç + ilk adımı işaretle (bu kod replay edilemesin) + kurtarma kodlarını yaz.
  await db
    .update(users)
    .set({ totpEnabled: true, totpLastUsedStep: step })
    .where(eq(users.id, uid))
  await db.delete(twoFactorRecoveryCode).where(eq(twoFactorRecoveryCode.userId, uid))
  await db
    .insert(twoFactorRecoveryCode)
    .values(hashes.map((codeHash) => ({ userId: uid, codeHash })))

  if (u.email) void sendMail({ to: u.email, ...twoFactorEnabledEmail() })
  return { ok: true, recoveryCodes: plaintext }
}

// ─── Kapat: şifre veya OTP ile doğrula, alanları temizle ───
export async function disableTotpAction(input: {
  password?: string
  otp?: string
}): Promise<ActionResult> {
  const guard = await requireReauth(input)
  if (!guard.ok) return guard
  const { uid, email } = guard

  await db
    .update(users)
    .set({ totpEnabled: false, totpSecretEnc: null, totpLastUsedStep: null })
    .where(eq(users.id, uid))
  await db.delete(twoFactorRecoveryCode).where(eq(twoFactorRecoveryCode.userId, uid))

  if (email) void sendMail({ to: email, ...twoFactorDisabledEmail() })
  return { ok: true }
}

// ─── Kurtarma kodlarını yenile: doğrula, eskiyi sil, yeni set döndür ───
export async function regenerateRecoveryCodesAction(input: {
  password?: string
  otp?: string
}): Promise<CodesResult> {
  const guard = await requireReauth(input)
  if (!guard.ok) return guard
  const { uid } = guard

  const { plaintext, hashes } = generateRecoveryCodes(10)
  await db.delete(twoFactorRecoveryCode).where(eq(twoFactorRecoveryCode.userId, uid))
  await db
    .insert(twoFactorRecoveryCode)
    .values(hashes.map((codeHash) => ({ userId: uid, codeHash })))
  return { ok: true, recoveryCodes: plaintext }
}

// 2FA açıkken hassas işlem için yeniden doğrulama: şifre VEYA geçerli OTP.
async function requireReauth(input: {
  password?: string
  otp?: string
}): Promise<
  { ok: true; uid: string; email: string | null } | { ok: false; error: string }
> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  const limit = await checkLimit(passwordChangeLimiter, uid)
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
  if (!u || !u.totpEnabled) {
    return { ok: false, error: "İki adımlı doğrulama zaten kapalı." }
  }

  const password = typeof input?.password === "string" ? input.password : ""
  const otp = typeof input?.otp === "string" ? input.otp.trim() : ""

  let ok = false
  if (password && u.passwordHash) {
    ok = await verifyPassword(u.passwordHash, password)
  } else if (otp && u.totpSecretEnc) {
    try {
      ok = verifyTotp(decryptSecret(u.totpSecretEnc), otp) !== null
    } catch {
      ok = false
    }
  }
  if (!ok) {
    return { ok: false, error: "Doğrulama başarısız. Şifreni ya da kodu kontrol et." }
  }
  return { ok: true, uid, email: u.email }
}
