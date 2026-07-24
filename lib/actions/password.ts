"use server"

import { and, eq, isNull, ne, sql } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth"
import { db, users, passwordReset, userSessions, emailVerification } from "@/lib/db"
import {
  normalizeEmail,
  generateCode,
  generateToken,
  hashSecret,
  safeEqual,
} from "@/lib/auth/codes"
import { hashPassword, verifyPassword, passwordSchema } from "@/lib/auth/password"
import { appUrl } from "@/lib/auth/urls"
import { sendMail } from "@/lib/email/mailer"
import {
  passwordResetEmail,
  passwordChangedEmail,
  setPasswordCodeEmail,
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
const SET_PASSWORD_TTL_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

export type ActionResult = { ok: true } | { ok: false; error: string }

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

  const loginUrl = await appUrl("/")

  if (user && user.passwordHash) {
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
    const url = await appUrl(`/sifre-sifirla?token=${encodeURIComponent(token)}`)
    void sendMail({ to: email, ...passwordResetEmail({ code, url }) })
  } else if (user) {
    // Google-only (şifresi yok): sıfırlama değil, yönlendirme bilgisi.
    void sendMail({ to: email, ...googleSignInEmail({ loginUrl }) })
  }
  // Kullanıcı yoksa hiçbir şey; her durumda:
  return { ok: true }
}

// ─── Şifreyi sıfırla: token VEYA (email + code) + yeni şifre ───
export async function resetPasswordAction(input: {
  token?: string
  email?: string
  code?: string
  newPassword: string
}): Promise<ActionResult> {
  const pw = passwordSchema.safeParse(input?.newPassword)
  if (!pw.success) {
    return { ok: false, error: pw.error.issues[0]?.message ?? "Geçersiz şifre." }
  }
  const newPassword = pw.data

  const token = typeof input?.token === "string" ? input.token : ""
  if (token) {
    const limit = await checkLimit(codeVerifyLimiter, `reset:${hashSecret(token)}`)
    if (!limit.ok) return limit

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
      return { ok: false, error: "Bağlantının süresi doldu. Yeni kod iste." }
    }
    return applyReset(row.userId, newPassword)
  }

  // Kod yolu.
  const emailParsed = emailField.safeParse(input?.email)
  const code = typeof input?.code === "string" ? input.code.trim() : ""
  if (!emailParsed.success || !/^\d{6}$/.test(code)) {
    return { ok: false, error: "Kod ya da e-posta hatalı." }
  }
  const email = normalizeEmail(emailParsed.data)
  const limit = await checkLimit(codeVerifyLimiter, `reset:${email}`)
  if (!limit.ok) return limit

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  // Kullanıcı yoksa da jenerik "kod hatalı" (enumeration yok — kod yolu zaten
  // koda erişimi olanlar içindir).
  if (!user) return { ok: false, error: "Kod hatalı ya da süresi dolmuş." }

  // Atomik attempts++ (tek aktif satır invariant'ı forgot'ta korunur).
  const [row] = await db
    .update(passwordReset)
    .set({ attempts: sql`${passwordReset.attempts} + 1` })
    .where(eq(passwordReset.userId, user.id))
    .returning({
      id: passwordReset.id,
      codeHash: passwordReset.codeHash,
      expiresAt: passwordReset.expiresAt,
      attempts: passwordReset.attempts,
    })

  if (!row) return { ok: false, error: "Kod hatalı ya da süresi dolmuş." }
  if (row.attempts > MAX_ATTEMPTS) {
    await db.delete(passwordReset).where(eq(passwordReset.id, row.id))
    return { ok: false, error: "Çok fazla yanlış deneme. Yeni kod iste." }
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(passwordReset).where(eq(passwordReset.id, row.id))
    return { ok: false, error: "Kodun süresi doldu. Yeni kod iste." }
  }
  if (!safeEqual(hashSecret(code), row.codeHash)) {
    return { ok: false, error: "Kod hatalı. Tekrar dene." }
  }
  return applyReset(user.id, newPassword)
}

// Şifreyi güncelle, TÜM cihaz oturumlarını düşür (60 sn içinde), reset satırlarını
// sil, bildirim gönder.
async function applyReset(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  const passwordHash = await hashPassword(newPassword)
  const [updated] = await db
    .update(users)
    .set({ passwordHash, passwordUpdatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ email: users.email })

  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)))

  await db.delete(passwordReset).where(eq(passwordReset.userId, userId))

  if (updated?.email) {
    void sendMail({ to: updated.email, ...passwordChangedEmail() })
  }
  return { ok: true }
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

// Google-only hesap (passwordHash IS NULL) için şifre belirleme kodu iste. Link
// yok, yalnız uygulama içi OTP.
export async function requestSetPasswordCodeAction(): Promise<ActionResult> {
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

  const code = generateCode()
  // set_password'de link yok ama tokenHash notNull + unique → kullanılmayan bir
  // token yine de üretilir.
  const token = generateToken()
  const codeHash = hashSecret(code)
  const tokenHash = hashSecret(token)
  const expiresAt = new Date(Date.now() + SET_PASSWORD_TTL_MS)

  await db
    .insert(emailVerification)
    .values({
      email,
      purpose: "set_password",
      userId: uid,
      codeHash,
      tokenHash,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [emailVerification.email, emailVerification.purpose],
      set: {
        userId: uid,
        codeHash,
        tokenHash,
        attempts: 0,
        expiresAt,
        createdAt: new Date(),
      },
    })

  void sendMail({ to: email, ...setPasswordCodeEmail({ code }) })
  return { ok: true }
}

// Kodu doğrula ve Google-only hesaba şifre belirle.
export async function setPasswordAction(input: {
  code: string
  newPassword: string
}): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  const pw = passwordSchema.safeParse(input?.newPassword)
  if (!pw.success) {
    return { ok: false, error: pw.error.issues[0]?.message ?? "Geçersiz şifre." }
  }
  const code = typeof input?.code === "string" ? input.code.trim() : ""
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "6 haneli kodu gir." }

  const limit = await checkLimit(codeVerifyLimiter, `setpw:${uid}`)
  if (!limit.ok) return limit

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

  // Atomik attempts++ (yalnız bu kullanıcının set_password satırı).
  const [row] = await db
    .update(emailVerification)
    .set({ attempts: sql`${emailVerification.attempts} + 1` })
    .where(
      and(
        eq(emailVerification.email, email),
        eq(emailVerification.purpose, "set_password"),
        eq(emailVerification.userId, uid),
      ),
    )
    .returning({
      id: emailVerification.id,
      codeHash: emailVerification.codeHash,
      expiresAt: emailVerification.expiresAt,
      attempts: emailVerification.attempts,
    })

  if (!row) return { ok: false, error: "Kod geçersiz ya da süresi dolmuş. Baştan dene." }
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
  const passwordHash = await hashPassword(pw.data)
  await db
    .update(users)
    .set({ passwordHash, passwordUpdatedAt: new Date() })
    .where(eq(users.id, uid))
  return { ok: true }
}
