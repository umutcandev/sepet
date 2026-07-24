"use server"

import { and, eq, sql } from "drizzle-orm"

import { auth } from "@/auth"
import { db, users, twoFactorRecoveryCode, emailVerification } from "@/lib/db"
import { verifyPassword } from "@/lib/auth/password"
import {
  normalizeEmail,
  generateCode,
  generateToken,
  hashSecret,
  safeEqual,
} from "@/lib/auth/codes"
import {
  generateTotpSecret,
  encryptSecret,
  decryptSecret,
  createTotp,
  verifyTotp,
  claimTotpStep,
  consumeRecoveryCode,
  generateRecoveryCodes,
} from "@/lib/auth/totp"
import { sendMail } from "@/lib/email/mailer"
import {
  totpSetupCodeEmail,
  twoFactorEnabledEmail,
  twoFactorDisabledEmail,
} from "@/lib/email/templates"
import { getClientIp, checkLimit } from "@/lib/security/action-rate-limit"
import {
  twoFactorLimiter,
  passwordChangeLimiter,
  emailSendLimiter,
  emailSendIpLimiter,
} from "@/lib/security/rate-limit"

const TOTP_SETUP_TTL_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

export type ActionResult = { ok: true } | { ok: false; error: string }
type CodesResult =
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; error: string }

// ─── Google-only (şifresiz) hesap için kurulum doğrulama kodu iste ───
// Kurulum, çalınmış bir oturum cookie'siyle yapılamamalı: şifreli hesap şifresini
// girer; şifresiz hesapta sahiplik e-postaya giden kodla kanıtlanır.
export async function requestTotpSetupCodeAction(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  const [u] = await db
    .select({
      email: users.email,
      passwordHash: users.passwordHash,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)
  if (!u || !u.email) return { ok: false, error: "Oturum bulunamadı." }
  if (u.totpEnabled) {
    return { ok: false, error: "İki adımlı doğrulama zaten açık." }
  }
  if (u.passwordHash) {
    return { ok: false, error: "Kurulum için şifreni girmen yeterli." }
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
  const expiresAt = new Date(Date.now() + TOTP_SETUP_TTL_MS)

  await db
    .insert(emailVerification)
    .values({
      email,
      purpose: "totp_setup",
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

  void sendMail({ to: email, ...totpSetupCodeEmail({ code }) })
  return { ok: true }
}

// ─── Kurulumu başlat: yeniden doğrula, secret üret, sakla (henüz totpEnabled:
// false) ───
// Yeniden doğrulama ZORUNLU: yalnız oturum cookie'sine güvenmek, çalınmış bir
// oturumla 2FA kurdurup (kurtarma kodları saldırgana gider) gerçek sahibi hesaptan
// kilitlemeye izin verirdi. Şifreli hesap şifre; şifresiz hesap e-posta kodu.
export async function beginTotpSetupAction(input: {
  password?: string
  emailCode?: string
}): Promise<
  { ok: true; otpauthUri: string; secretB32: string } | { ok: false; error: string }
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
    })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)
  if (!u) return { ok: false, error: "Oturum bulunamadı." }
  if (u.totpEnabled) {
    return { ok: false, error: "İki adımlı doğrulama zaten açık." }
  }

  if (u.passwordHash) {
    const password = typeof input?.password === "string" ? input.password : ""
    if (!password) return { ok: false, error: "Şifreni gir." }
    const ok = await verifyPassword(u.passwordHash, password)
    if (!ok) return { ok: false, error: "Şifren hatalı." }
  } else {
    const emailCode =
      typeof input?.emailCode === "string" ? input.emailCode.trim() : ""
    if (!/^\d{6}$/.test(emailCode)) {
      return { ok: false, error: "E-postana gelen 6 haneli kodu gir." }
    }
    const verified = await consumeTotpSetupCode(uid, u.email, emailCode)
    if (!verified.ok) return verified
  }

  try {
    const secretB32 = generateTotpSecret()
    const enc = encryptSecret(secretB32)
    await db
      .update(users)
      .set({ totpSecretEnc: enc, totpEnabled: false, totpLastUsedStep: null })
      .where(eq(users.id, uid))
    const totp = createTotp(secretB32, u.email ?? "Sepet")
    return { ok: true, otpauthUri: totp.toString(), secretB32 }
  } catch {
    // TOTP_ENCRYPTION_KEY eksik/geçersizse buraya düşer.
    return { ok: false, error: "İki adımlı doğrulama şu an kullanılamıyor." }
  }
}

// totp_setup doğrulama kodunu atomik attempts++ (cap MAX_ATTEMPTS) + süre +
// safeEqual ile tüket (setPasswordAction ile aynı desen).
async function consumeTotpSetupCode(
  uid: string,
  rawEmail: string | null,
  code: string,
): Promise<ActionResult> {
  if (!rawEmail) return { ok: false, error: "Oturum bulunamadı." }
  const email = normalizeEmail(rawEmail)

  const [row] = await db
    .update(emailVerification)
    .set({ attempts: sql`${emailVerification.attempts} + 1` })
    .where(
      and(
        eq(emailVerification.email, email),
        eq(emailVerification.purpose, "totp_setup"),
        eq(emailVerification.userId, uid),
      ),
    )
    .returning({
      id: emailVerification.id,
      codeHash: emailVerification.codeHash,
      expiresAt: emailVerification.expiresAt,
      attempts: emailVerification.attempts,
    })

  if (!row) {
    return { ok: false, error: "Kod geçersiz ya da süresi dolmuş. Yeni kod iste." }
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

// ─── Kapat: şifre, OTP veya kurtarma kodu ile doğrula, alanları temizle ───
export async function disableTotpAction(input: {
  password?: string
  otp?: string
  recoveryCode?: string
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
  recoveryCode?: string
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

// 2FA açıkken hassas işlem için yeniden doğrulama: şifre, geçerli OTP VEYA tek
// kullanımlık kurtarma kodu (telefonu kaybetmiş şifresiz hesabın tek çıkışı).
async function requireReauth(input: {
  password?: string
  otp?: string
  recoveryCode?: string
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
  const recoveryCode =
    typeof input?.recoveryCode === "string" ? input.recoveryCode.trim() : ""

  let ok = false
  if (password && u.passwordHash) {
    ok = await verifyPassword(u.passwordHash, password)
  } else if (otp && u.totpSecretEnc) {
    try {
      const step = verifyTotp(decryptSecret(u.totpSecretEnc), otp)
      // Girişteki atomik adım talebiyle aynı replay koruması: girişte kullanılmış
      // bir kod pencere içinde burada tekrar oynatılamaz.
      ok = step !== null && (await claimTotpStep(uid, step))
    } catch {
      ok = false
    }
  } else if (recoveryCode) {
    // Atomik tek kullanım: doğrulama kodu yakar (disable zaten hepsini siler;
    // regenerate yeni set üretir).
    ok = await consumeRecoveryCode(uid, recoveryCode)
  }
  if (!ok) {
    return { ok: false, error: "Doğrulama başarısız. Şifreni ya da kodu kontrol et." }
  }
  return { ok: true, uid, email: u.email }
}
