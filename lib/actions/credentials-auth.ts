"use server"

import { and, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"

import { signIn } from "@/auth"
import { db, users, accounts, emailVerification, pendingLogin } from "@/lib/db"
import { UNPROVEN_EMAIL_PROVIDERS } from "@/lib/auth/providers"
import {
  normalizeEmail,
  generateCode,
  generateToken,
  hashSecret,
  safeEqual,
} from "@/lib/auth/codes"
import { hashPassword, passwordSchema } from "@/lib/auth/password"
import { sanitizeCallback } from "@/lib/auth/callback"
import {
  mapCredentialsError,
  isAuthError,
  authErrorCode,
} from "@/lib/auth/auth-errors"
// E-posta linkleri Host başlığından DEĞİL, yalnız env tabanlı SITE_URL'den üretilir
// (Host header poisoning ile sıfırlama/doğrulama linki zehirlenemesin).
import { absoluteUrl } from "@/lib/site"
import { sendMail } from "@/lib/email/mailer"
import { verificationEmail, accountExistsEmail } from "@/lib/email/templates"
import { getClientIp, checkLimit } from "@/lib/security/action-rate-limit"
import {
  registerLimiter,
  emailSendLimiter,
  emailSendIpLimiter,
  codeVerifyLimiter,
  credentialsLoginLimiter,
  twoFactorLimiter,
} from "@/lib/security/rate-limit"

// Doğrulama satırı ömrü ve maksimum yanlış kod denemesi. Sert limit DB'de zorlanır
// (attempts), Upstash yalnız yumuşak throttle katmanı.
const SIGNUP_TTL_MS = 15 * 60 * 1000
const PENDING_TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 5

export type ActionResult = { ok: true } | { ok: false; error: string }
export type LoginResult =
  | { ok: true; twoFactor?: false; callbackUrl: string }
  | { ok: true; twoFactor: true; pendingToken: string }
  // code: authorize'un CredentialsSignin kodu (ör. "pending_expired") — istemci
  // bazı durumlarda akışı buna göre yönlendirir (2FA aşamasından girişe dönüş).
  | { ok: false; error: string; code?: string }

// ─── Zod şemaları ───
// Email format kontrolü sürüm-bağımsız basit regex ile (Zod .email() deprecation'ından
// kaçınır); normalizasyon her zaman normalizeEmail'de.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const emailField = z
  .string()
  .trim()
  .min(3, "E-posta gerekli.")
  .max(254, "E-posta çok uzun.")
  .regex(EMAIL_RE, "Geçerli bir e-posta gir.")

const registerSchema = z.object({ email: emailField, password: passwordSchema })
const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Şifre gerekli.").max(128),
  callbackUrl: z.string().optional(),
})
const verifyCodeSchema = z.object({
  email: emailField,
  code: z.string().trim().regex(/^\d{6}$/, "Kod 6 haneli olmalı."),
})

// ─── Kayıt (kullanıcı satırı DOĞRULANANA KADAR oluşmaz) ───
export async function registerAction(input: {
  email: string
  password: string
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz bilgi.",
    }
  }
  const email = normalizeEmail(parsed.data.email)
  const ip = await getClientIp()

  for (const check of [
    await checkLimit(registerLimiter, ip),
    await checkLimit(emailSendIpLimiter, ip),
    await checkLimit(emailSendLimiter, email),
  ]) {
    if (!check.ok) return check
  }

  // Şifreyi HER iki dalda da hash'le (var-olan e-posta dalıyla timing eşitlenir →
  // enumeration yok). Ardından varlık kontrolü.
  const passwordHash = await hashPassword(parsed.data.password)

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  // Zaten kayıtlı: durumu forma AÇMA (yine { ok: true }); bilgi e-postası yalnız
  // posta kutusu sahibine gider.
  if (existing) {
    const loginUrl = absoluteUrl("/")
    void sendMail({ to: email, ...accountExistsEmail({ loginUrl }) })
    return { ok: true }
  }

  const code = generateCode()
  const token = generateToken()
  const codeHash = hashSecret(code)
  const tokenHash = hashSecret(token)
  const expiresAt = new Date(Date.now() + SIGNUP_TTL_MS)

  // Önceki (email, "signup") satırını ez. Unique (email, purpose) index'i var.
  await db
    .insert(emailVerification)
    .values({
      email,
      purpose: "signup",
      codeHash,
      tokenHash,
      payload: { passwordHash },
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [emailVerification.email, emailVerification.purpose],
      set: {
        codeHash,
        tokenHash,
        payload: { passwordHash },
        attempts: 0,
        expiresAt,
        createdAt: new Date(),
      },
    })

  const url = absoluteUrl(`/dogrula?token=${encodeURIComponent(token)}`)
  void sendMail({ to: email, ...verificationEmail({ code, url }) })
  return { ok: true }
}

// ─── Doğrulama: uygulama içi 6 haneli kod ───
export async function verifySignupAction(input: {
  email: string
  code: string
}): Promise<ActionResult> {
  const parsed = verifyCodeSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz kod." }
  }
  const email = normalizeEmail(parsed.data.email)
  const limit = await checkLimit(codeVerifyLimiter, `signup:${email}`)
  if (!limit.ok) return limit
  return consumeSignupByCode(email, parsed.data.code)
}

// ─── Doğrulama: /dogrula link'inden token (butonla, server action'da) ───
export async function verifySignupByTokenAction(input: {
  token: string
}): Promise<ActionResult> {
  const token = typeof input?.token === "string" ? input.token : ""
  if (!token) return { ok: false, error: "Bağlantı geçersiz." }
  const tokenHash = hashSecret(token)
  // İki eksen: token başına (aynı token'ı yeniden deneme) + IP başına (her
  // tahminde taze bucket açan token-anahtarlı limiti aşan cross-token taramaya
  // karşı derinlemesine savunma).
  const ip = await getClientIp()
  for (const check of [
    await checkLimit(codeVerifyLimiter, `signuptoken:${tokenHash}`),
    await checkLimit(codeVerifyLimiter, `signuptoken:ip:${ip}`),
  ]) {
    if (!check.ok) return check
  }

  const [row] = await db
    .select({
      id: emailVerification.id,
      expiresAt: emailVerification.expiresAt,
    })
    .from(emailVerification)
    .where(
      and(
        eq(emailVerification.tokenHash, tokenHash),
        eq(emailVerification.purpose, "signup"),
      ),
    )
    .limit(1)

  if (!row) return { ok: false, error: "Bağlantı geçersiz ya da süresi dolmuş." }
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(emailVerification).where(eq(emailVerification.id, row.id))
    return { ok: false, error: "Bağlantının süresi doldu. Yeni kod iste." }
  }
  return finalizeSignup(row.id)
}

// ─── Kodu tekrar gönder (durumdan bağımsız aynı yanıt) ───
export async function resendSignupCodeAction(input: {
  email: string
}): Promise<ActionResult> {
  const email = normalizeEmail(
    typeof input?.email === "string" ? input.email : "",
  )
  if (!email) return { ok: true }
  const ip = await getClientIp()
  for (const check of [
    await checkLimit(emailSendIpLimiter, ip),
    await checkLimit(emailSendLimiter, email),
  ]) {
    if (!check.ok) return check
  }

  const code = generateCode()
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SIGNUP_TTL_MS)

  // Yalnız bekleyen bir signup satırı varsa yeni kod/token yazıp gönder; yoksa
  // sessizce ok (enumeration yok).
  const [row] = await db
    .update(emailVerification)
    .set({
      codeHash: hashSecret(code),
      tokenHash: hashSecret(token),
      attempts: 0,
      expiresAt,
    })
    .where(
      and(
        eq(emailVerification.email, email),
        eq(emailVerification.purpose, "signup"),
      ),
    )
    .returning({ id: emailVerification.id })

  if (row) {
    const url = absoluteUrl(`/dogrula?token=${encodeURIComponent(token)}`)
    void sendMail({ to: email, ...verificationEmail({ code, url }) })
  }
  return { ok: true }
}

// ─── Giriş ───
export async function loginAction(input: {
  email: string
  password: string
  callbackUrl?: string
}): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "E-posta veya şifre hatalı." }
  const email = normalizeEmail(parsed.data.email)
  const ip = await getClientIp()

  // İki eksende throttle: IP + e-posta.
  const lIp = await checkLimit(credentialsLoginLimiter, `ip:${ip}`)
  if (!lIp.ok) return lIp
  const lEmail = await checkLimit(credentialsLoginLimiter, `email:${email}`)
  if (!lEmail.ok) return lEmail

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    })
  } catch (error) {
    if (!isAuthError(error)) throw error
    // 2FA'lı hesap: authorize şifreyi doğruladıktan SONRA TwoFactorRequiredError
    // atar (yani şifre doğru). pending_login üretip 2FA aşamasına geç.
    if (authErrorCode(error) === "2fa_required") {
      const pendingToken = await createPendingLogin(email)
      if (!pendingToken) {
        return { ok: false, error: "Giriş yapılamadı. Lütfen tekrar dene." }
      }
      return { ok: true, twoFactor: true, pendingToken }
    }
    return {
      ok: false,
      error: mapCredentialsError(error),
      code: authErrorCode(error),
    }
  }
  return { ok: true, callbackUrl: sanitizeCallback(parsed.data.callbackUrl) }
}

// ─── 2FA: pending_login doğrulama (OTP veya kurtarma kodu) ───
export async function verifyTwoFactorAction(input: {
  pendingToken: string
  code: string
  isRecovery?: boolean
  callbackUrl?: string
}): Promise<LoginResult> {
  const pendingToken =
    typeof input?.pendingToken === "string" ? input.pendingToken : ""
  const code = typeof input?.code === "string" ? input.code.trim() : ""
  if (!pendingToken || !code) return { ok: false, error: "Kod gerekli." }

  const limit = await checkLimit(twoFactorLimiter, hashSecret(pendingToken))
  if (!limit.ok) return limit

  try {
    await signIn("credentials", {
      pendingToken,
      ...(input.isRecovery ? { recoveryCode: code } : { otp: code }),
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

// Şifre doğrulandıktan sonra 2FA ara durumu: ham token yalnız istemciye, DB'de
// yalnız HMAC. Tek aktif pending: öncekiler temizlenir.
async function createPendingLogin(email: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (!user) return null
  const raw = generateToken()
  await db.delete(pendingLogin).where(eq(pendingLogin.userId, user.id))
  await db.insert(pendingLogin).values({
    userId: user.id,
    tokenHash: hashSecret(raw),
    expiresAt: new Date(Date.now() + PENDING_TTL_MS),
  })
  return raw
}

// ─── İç yardımcılar ───

// 6 haneli kod yolu: atomik attempts++ (cap MAX_ATTEMPTS) + süre + safeEqual.
async function consumeSignupByCode(
  email: string,
  code: string,
): Promise<ActionResult> {
  const [row] = await db
    .update(emailVerification)
    .set({ attempts: sql`${emailVerification.attempts} + 1` })
    .where(
      and(
        eq(emailVerification.email, email),
        eq(emailVerification.purpose, "signup"),
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
  return finalizeSignup(row.id)
}

// Tek-kullanım commit: DELETE ... RETURNING. Boş dönerse paralel istek kazanmıştır.
async function finalizeSignup(id: string): Promise<ActionResult> {
  const [row] = await db
    .delete(emailVerification)
    .where(eq(emailVerification.id, id))
    .returning({
      email: emailVerification.email,
      payload: emailVerification.payload,
    })

  const passwordHash = row?.payload?.passwordHash
  if (!row || !passwordHash) {
    return { ok: false, error: "Doğrulama tamamlanamadı. Baştan dene." }
  }
  const completed = await completeSignup(row.email, passwordHash)
  if (!completed) {
    // İki durum: (a) yarış — doğrulama sürerken aynı e-posta şifreli hesap
    // olarak oluşmuş; (b) adres, e-postasını kanıtlayamayan bir sağlayıcıyla
    // (Facebook) açılmış şifresiz bir hesaba ait ve birleştirme bilerek
    // engellendi. İkisinde de doğru yönlendirme aynı: mevcut hesaba giriş yap
    // (şifre isteyen kullanıcı Ayarlar > Güvenlik > Şifre belirle ile koyar).
    // Kod doğrulandığı için e-posta sahipliği kanıtlı → durumu söylemek
    // enumeration riski taşımaz; sessiz ok + başarısız otomatik giriş yerine
    // net yönlendirme.
    return {
      ok: false,
      error: "Bu e-posta ile zaten bir hesabın var. Giriş yapmayı dene.",
    }
  }
  return { ok: true }
}

// Kullanıcıyı oluştur (emailVerified = now). Aynı e-posta sosyal giriş (şifresiz) olarak zaten
// varsa (yarış), yalnız passwordHash null'ken şifreyi bağla → güvenli birleştirme;
// şifresi olan mevcut satır no-op (setWhere false → false döner, çağıran kullanıcıya
// söyler).
//
// Birleştirme yalnız mevcut satırın e-postası KANITLIYSA güvenli. Google bunu
// email_verified ile kanıtlıyor, Facebook kanıtlayamıyor (bkz.
// UNPROVEN_EMAIL_PROVIDERS). Kanıtlanmamış bir sağlayıcıyla açılmış satır
// birleştirmeden muaf tutulmazsa şu senaryo açılır: saldırgan kurbanın adresini
// taşıyan bir Facebook hesabıyla önden `users` satırını yaratır, kurban sonra
// e-posta+şifre ile kaydolur, kayıt o satırın içine akar ve iki taraf aynı hesabı
// paylaşır (klasik ön-kayıt / hesap devralma). NOT EXISTS koşulu bunu, ayrı bir
// SELECT'e gerek kalmadan tek ifadede ve yarışa kapalı biçimde engeller.
async function completeSignup(
  email: string,
  passwordHash: string,
): Promise<boolean> {
  const [row] = await db
    .insert(users)
    .values({ email, emailVerified: new Date(), passwordHash })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        emailVerified: sql`COALESCE(${users.emailVerified}, now())`,
      },
      setWhere: sql`${users.passwordHash} IS NULL AND NOT EXISTS (
        SELECT 1 FROM ${accounts}
        WHERE ${accounts.userId} = ${users.id}
          AND ${inArray(accounts.provider, [...UNPROVEN_EMAIL_PROVIDERS])}
      )`,
    })
    .returning({ id: users.id })
  return Boolean(row)
}
