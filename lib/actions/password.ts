"use server"

import { and, eq, isNull, ne } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth"
import { db, users, passwordReset, userSessions } from "@/lib/db"
import {
  normalizeEmail,
  generateCode,
  generateToken,
  hashSecret,
} from "@/lib/auth/codes"
import { hashPassword, verifyPassword, passwordSchema } from "@/lib/auth/password"
// E-posta linkleri Host başlığından DEĞİL, yalnız env tabanlı SITE_URL'den üretilir
// (Host header poisoning ile sıfırlama linki zehirlenemesin).
import { absoluteUrl } from "@/lib/site"
import { sendMail } from "@/lib/email/mailer"
import {
  passwordResetEmail,
  passwordChangedEmail,
  passwordSetEmail,
  setPasswordLinkEmail,
  googleSignInEmail,
} from "@/lib/email/templates"
import { getClientIp, checkLimit } from "@/lib/security/action-rate-limit"
import {
  emailSendLimiter,
  emailSendIpLimiter,
  codeVerifyLimiter,
  passwordChangeLimiter,
} from "@/lib/security/rate-limit"

const RESET_TTL_MS = 15 * 60 * 1000

export type ActionResult = { ok: true } | { ok: false; error: string }
// Sıfırlama/belirleme sonucu: sessionsRevoked yalnız var olan bir şifre
// DEĞİŞTİĞİNDE true olur (ilk kez şifre belirleyen Google kullanıcısının
// oturumları düşürülmez); başarı ekranı metnini bu belirler.
export type ResetResult =
  | { ok: true; sessionsRevoked: boolean }
  | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const emailField = z
  .string()
  .trim()
  .min(3, "E-posta gerekli.")
  .max(254, "E-posta çok uzun.")
  .regex(EMAIL_RE, "Geçerli bir e-posta gir.")

// ─── Şifremi unuttum (durumdan bağımsız aynı yanıt) ───
export async function forgotPasswordAction(input: {
  email: string
}): Promise<ActionResult> {
  const parsed = emailField.safeParse(input?.email)
  // Geçersiz e-posta bile jenerik ok döner (enumeration yok); ama boşsa erken çık.
  if (!parsed.success) return { ok: true }
  const email = normalizeEmail(parsed.data)
  const ip = await getClientIp()

  for (const check of [
    await checkLimit(emailSendIpLimiter, ip),
    await checkLimit(emailSendLimiter, email),
  ]) {
    if (!check.ok) return check
  }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  const loginUrl = absoluteUrl("/")

  if (user && user.passwordHash) {
    // Sıfırlama yalnız link (token) ile; code artık maile konmaz, sadece
    // codeHash notNull kısıtını doldurmak için üretilir.
    const code = generateCode()
    const token = generateToken()
    const expiresAt = new Date(Date.now() + RESET_TTL_MS)
    // Tek aktif satır: öncekileri sil, yenisini ekle.
    await db.delete(passwordReset).where(eq(passwordReset.userId, user.id))
    await db.insert(passwordReset).values({
      userId: user.id,
      codeHash: hashSecret(code),
      tokenHash: hashSecret(token),
      expiresAt,
    })
    const url = absoluteUrl(`/sifre-sifirla?token=${encodeURIComponent(token)}`)
    void sendMail({ to: email, ...passwordResetEmail({ url }) })
  } else if (user) {
    // Google-only (şifresi yok): sıfırlama değil, yönlendirme bilgisi.
    void sendMail({ to: email, ...googleSignInEmail({ loginUrl }) })
  }
  // Kullanıcı yoksa hiçbir şey; her durumda:
  return { ok: true }
}

// ─── Şifreyi sıfırla: e-postadaki link token'ı + yeni şifre ───
export async function resetPasswordAction(input: {
  token?: string
  newPassword: string
}): Promise<ResetResult> {
  const pw = passwordSchema.safeParse(input?.newPassword)
  if (!pw.success) {
    return { ok: false, error: pw.error.issues[0]?.message ?? "Geçersiz şifre." }
  }
  const newPassword = pw.data

  const token = typeof input?.token === "string" ? input.token : ""
  if (!token) return { ok: false, error: "Bağlantı geçersiz ya da süresi dolmuş." }

  // İki eksen: token başına + IP başına (token-anahtarlı limit tek başına
  // cross-token taramada her tahmine taze bucket açar; IP ekseni bunu kapatır).
  const ip = await getClientIp()
  for (const check of [
    await checkLimit(codeVerifyLimiter, `reset:${hashSecret(token)}`),
    await checkLimit(codeVerifyLimiter, `reset:ip:${ip}`),
  ]) {
    if (!check.ok) return check
  }

  const [row] = await db
    .select({
      id: passwordReset.id,
      userId: passwordReset.userId,
      expiresAt: passwordReset.expiresAt,
    })
    .from(passwordReset)
    .where(eq(passwordReset.tokenHash, hashSecret(token)))
    .limit(1)

  if (!row) return { ok: false, error: "Bağlantı geçersiz ya da süresi dolmuş." }
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(passwordReset).where(eq(passwordReset.id, row.id))
    return { ok: false, error: "Bağlantının süresi doldu. Yeni bağlantı iste." }
  }
  return applyReset(row.userId, newPassword)
}

// Şifreyi güncelle, reset satırlarını sil, bildirim gönder. Var olan bir şifre
// DEĞİŞİYORSA (olası ele geçirme senaryosu) tüm cihaz oturumları da düşürülür
// (60 sn içinde); Google-only hesaba İLK şifre belirlemede eski şifre olmadığı
// için oturumlar korunur ve daha yumuşak bir bildirim gider.
async function applyReset(
  userId: string,
  newPassword: string,
): Promise<ResetResult> {
  const [before] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!before) return { ok: false, error: "Bağlantı geçersiz ya da süresi dolmuş." }
  const hadPassword = before.passwordHash != null

  const passwordHash = await hashPassword(newPassword)
  await db
    .update(users)
    .set({ passwordHash, passwordUpdatedAt: new Date() })
    .where(eq(users.id, userId))

  if (hadPassword) {
    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)),
      )
  }

  await db.delete(passwordReset).where(eq(passwordReset.userId, userId))

  if (before.email) {
    void sendMail({
      to: before.email,
      ...(hadPassword ? passwordChangedEmail() : passwordSetEmail()),
    })
  }
  return { ok: true, sessionsRevoked: hadPassword }
}

// ─── Ayarlar > Güvenlik ───

// Güvenlik grubu durumu: şifresi var mı, 2FA açık mı (panel bunlara göre çizilir).
export async function getSecurityStateAction(): Promise<{
  hasPassword: boolean
  twoFactorEnabled: boolean
} | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const [u] = await db
    .select({ passwordHash: users.passwordHash, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
  if (!u) return null
  return { hasPassword: u.passwordHash != null, twoFactorEnabled: u.totpEnabled }
}

// Şifresi olan kullanıcı için: mevcut şifreyi doğrula, güncelle, bu cihaz HARİÇ
// tüm oturumları düşür, bildirim gönder.
export async function changePasswordAction(input: {
  currentPassword: string
  newPassword: string
}): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  const pw = passwordSchema.safeParse(input?.newPassword)
  if (!pw.success) {
    return { ok: false, error: pw.error.issues[0]?.message ?? "Geçersiz şifre." }
  }
  const limit = await checkLimit(passwordChangeLimiter, uid)
  if (!limit.ok) return limit

  const [u] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)
  if (!u || !u.passwordHash) {
    return { ok: false, error: "Bu hesabın bir şifresi yok." }
  }
  const currentPassword =
    typeof input?.currentPassword === "string" ? input.currentPassword : ""
  const ok = await verifyPassword(u.passwordHash, currentPassword)
  if (!ok) return { ok: false, error: "Mevcut şifren hatalı." }

  const passwordHash = await hashPassword(pw.data)
  await db
    .update(users)
    .set({ passwordHash, passwordUpdatedAt: new Date() })
    .where(eq(users.id, uid))

  // Bu cihaz (session.sid) HARİÇ tüm oturumları düşür.
  const conditions = [
    eq(userSessions.userId, uid),
    isNull(userSessions.revokedAt),
  ]
  if (session.sid) conditions.push(ne(userSessions.id, session.sid))
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(...conditions))

  if (u.email) void sendMail({ to: u.email, ...passwordChangedEmail() })
  return { ok: true }
}

// Google-only hesap (passwordHash IS NULL) için şifre belirleme bağlantısı iste.
// "Şifremi unuttum" ile aynı altyapı: password_reset satırı + /sifre-sifirla
// linki; kullanıcı şifreyi o sayfada belirler (diyalogda kod/form yok).
export async function requestSetPasswordLinkAction(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  const [u] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)
  if (!u || !u.email) return { ok: false, error: "Oturum bulunamadı." }
  if (u.passwordHash) {
    return { ok: false, error: "Hesabının zaten bir şifresi var." }
  }
  const email = normalizeEmail(u.email)
  const ip = await getClientIp()
  for (const check of [
    await checkLimit(emailSendIpLimiter, ip),
    await checkLimit(emailSendLimiter, email),
  ]) {
    if (!check.ok) return check
  }

  // codeHash yalnız notNull kısıtı için üretilir; e-postada kod yok, yalnız link.
  const code = generateCode()
  const token = generateToken()
  const expiresAt = new Date(Date.now() + RESET_TTL_MS)

  // Tek aktif satır: öncekileri sil, yenisini ekle (forgot ile aynı desen).
  await db.delete(passwordReset).where(eq(passwordReset.userId, uid))
  await db.insert(passwordReset).values({
    userId: uid,
    codeHash: hashSecret(code),
    tokenHash: hashSecret(token),
    expiresAt,
  })

  const url = absoluteUrl(`/sifre-sifirla?token=${encodeURIComponent(token)}`)
  void sendMail({ to: email, ...setPasswordLinkEmail({ url }) })
  return { ok: true }
}
