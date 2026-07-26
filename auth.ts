import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq, sql } from "drizzle-orm"
import {
  db,
  users,
  accounts,
  sessions,
  verificationTokens,
  userSessions,
  pendingLogin,
} from "@/lib/db"
import { authConfig } from "./auth.config"
import { readRequestDeviceInfo } from "@/lib/auth/device"
import { normalizeEmail, hashSecret } from "@/lib/auth/codes"
import { dummyHash, verifyPassword } from "@/lib/auth/password"
import {
  decryptSecret,
  verifyTotp,
  claimTotpStep,
  consumeRecoveryCode,
} from "@/lib/auth/totp"

// Revoke kontrolü her istekte değil, en fazla bu aralıkla bir kez DB'ye gider.
const SID_CHECK_INTERVAL_MS = 60_000

// Facebook Graph API sürümü. @auth/core'un yerleşik Facebook provider'ı v19.0'a
// sabitlenmiş durumda ve v19.0 21.05.2026'da EXPIRE OLDU — bu yüzden aşağıda
// authorization/token/userinfo uçlarının üçü de override ediliyor. Meta her
// sürümü çıkışından en az 2 yıl yaşatıyor; v25.0 (18.02.2026) → ~Şubat 2028.
// O tarihten önce buradan güncelle, başka yerde sürüm tutulmuyor.
const FACEBOOK_GRAPH_VERSION = "v25.0"

// ─── Credentials hata sınıfları ───
// NextAuth beta.31: authorize içinde CredentialsSignin türevi fırlatılır; action
// tarafında AuthError yakalanıp `error.code` okunur (bkz. lib/actions). Kodlar
// Türkçe kullanıcı mesajlarına action'larda eşlenir (enumeration yok).
export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials"
}
export class TwoFactorRequiredError extends CredentialsSignin {
  code = "2fa_required"
}
export class TwoFactorInvalidError extends CredentialsSignin {
  code = "2fa_invalid"
}
export class PendingExpiredError extends CredentialsSignin {
  code = "pending_expired"
}

// 2FA ön-doğrulama (authorize şekil 2). Duruş: pending_login tek kullanımlık,
// attempts DB'de cap'li (5), TTL 5 dk; TOTP window:1 + totpLastUsedStep atomik
// replay koruması; recovery kod atomik tek tüketim. 3. adım (pending DELETE)
// başarana dek hiçbir session cookie yazılmaz.
async function authorizeTwoFactor(
  pendingTokenRaw: string,
  otp: string,
  recoveryCode: string,
) {
  const tokenHash = hashSecret(pendingTokenRaw)

  // Atomik attempts++ RETURNING (neon-http transaction yok; tek statement).
  const [pending] = await db
    .update(pendingLogin)
    .set({ attempts: sql`${pendingLogin.attempts} + 1` })
    .where(eq(pendingLogin.tokenHash, tokenHash))
    .returning({
      id: pendingLogin.id,
      userId: pendingLogin.userId,
      expiresAt: pendingLogin.expiresAt,
      attempts: pendingLogin.attempts,
    })

  if (!pending) throw new PendingExpiredError()
  if (pending.attempts > 5 || pending.expiresAt.getTime() < Date.now()) {
    await db.delete(pendingLogin).where(eq(pendingLogin.id, pending.id))
    throw new PendingExpiredError()
  }

  const [u] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      totpEnabled: users.totpEnabled,
      totpSecretEnc: users.totpSecretEnc,
      totpLastUsedStep: users.totpLastUsedStep,
    })
    .from(users)
    .where(eq(users.id, pending.userId))
    .limit(1)

  if (!u || !u.totpEnabled || !u.totpSecretEnc) {
    await db.delete(pendingLogin).where(eq(pendingLogin.id, pending.id))
    throw new PendingExpiredError()
  }

  let verified = false
  if (otp) {
    const step = verifyTotp(decryptSecret(u.totpSecretEnc), otp)
    // Atomik adım talebi (claimTotpStep): aynı kod ikinci kez oynatılamaz.
    if (step !== null && (await claimTotpStep(u.id, step))) verified = true
  } else if (recoveryCode) {
    // Atomik tek kullanım: usedAt IS NULL iken işaretlenir.
    if (await consumeRecoveryCode(u.id, recoveryCode)) verified = true
  }

  if (!verified) throw new TwoFactorInvalidError()

  // Tek-kullanım commit: pending sil. Boş dönerse paralel istek kazanmıştır.
  const [consumed] = await db
    .delete(pendingLogin)
    .where(eq(pendingLogin.id, pending.id))
    .returning({ id: pendingLogin.id })
  if (!consumed) throw new PendingExpiredError()

  return { id: u.id, email: u.email, name: u.name, image: u.image }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  // Auth hataları NextAuth'un varsayılan (İngilizce) /api/auth/error sayfasına
  // değil ana sayfaya döner; LoginDialogHost ?error= kodunu Türkçe mesaja
  // çevirip modalı yeniden açar. Bkz. components/auth/login-dialog-host.tsx.
  pages: { error: "/" },
  // Sağlayıcılar auth.ts'te komple override edilir (auth.config.ts middleware
  // listesi [Google] aynen kalır; middleware provider çalıştırmaz). Google
  // allowDangerousEmailAccountLinking GÜVENLİDİR çünkü: (a) credentials kullanıcısı
  // e-posta doğrulanmadan asla oluşmaz, (b) Google profilleri yalnız email_verified
  // === true ile kabul edilir (aşağıdaki signIn callback). İki taraf da e-posta
  // sahipliğini kanıtladığından aynı users satırına bağlanma güvenli.
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    // Facebook'ta allowDangerousEmailAccountLinking BİLEREK YOK: Google için
    // geçerli olan gerekçe (profil yalnız email_verified === true ile kabul
    // edilir) burada işlemiyor, çünkü Graph /me yanıtında email_verified diye
    // bir alan hiç bulunmuyor — e-posta sahipliği kanıtlanamaz. Aynı e-postaya
    // sahip bir hesap varsa adapter OAuthAccountNotLinked fırlatır ve kullanıcı
    // mevcut yöntemiyle girmeye yönlendirilir.
    Facebook({
      authorization: {
        url: `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`,
        params: { scope: "email,public_profile" },
      },
      token: `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`,
      // Yalnız url override ediliyor: @auth/core provider seçeneklerini DERİN
      // birleştirdiğinden (lib/utils/merge.js) varsayılan `request` (Bearer
      // token'la fetch) olduğu gibi korunur, kopyalamaya gerek yok.
      userinfo: {
        url: `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me?fields=id,name,email,picture.type(large)`,
      },
      // Yerleşik profile() doğrudan `profile.picture.data.url` okuyor; picture
      // dönmediğinde TypeError ile callback'i patlatır. Alanların hiçbiri
      // garanti değil → hepsi opsiyonel zincirle okunur.
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name ?? null,
          email: profile.email ?? null,
          image: profile.picture?.data?.url ?? null,
        }
      },
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
        pendingToken: {},
        otp: {},
        recoveryCode: {},
      },
      authorize: async (credentials) => {
        // ── Şekil 2: pendingToken 2FA doğrulaması ──
        const pendingToken =
          typeof credentials?.pendingToken === "string"
            ? credentials.pendingToken
            : ""
        if (pendingToken) {
          return authorizeTwoFactor(
            pendingToken,
            typeof credentials?.otp === "string" ? credentials.otp : "",
            typeof credentials?.recoveryCode === "string"
              ? credentials.recoveryCode
              : "",
          )
        }

        // ── Şekil 1: e-posta + şifre ──
        const email =
          typeof credentials?.email === "string"
            ? normalizeEmail(credentials.email)
            : ""
        const password =
          typeof credentials?.password === "string" ? credentials.password : ""

        // Eksik alan: yine de sabit-süreli yol (dummy hash yak) → timing sızıntısı yok.
        if (!email || !password) {
          await verifyPassword(await dummyHash(), password || "x")
          throw new InvalidCredentialsError()
        }

        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            image: users.image,
            passwordHash: users.passwordHash,
            totpEnabled: users.totpEnabled,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        // Kullanıcı yok VEYA şifresi yok (sosyal giriş): sabit-süreli dummy verify
        // sonra jenerik hata (enumeration yok, timing yok).
        if (!user || !user.passwordHash) {
          await verifyPassword(await dummyHash(), password)
          throw new InvalidCredentialsError()
        }

        const ok = await verifyPassword(user.passwordHash, password)
        if (!ok) throw new InvalidCredentialsError()

        // 2FA'lı hesap şifre-only şekille ASLA giremez — /api/auth/callback/credentials'a
        // doğrudan POST edilse bile. loginAction 2FA'yı pending_login ile yürütür.
        if (user.totpEnabled) throw new TwoFactorRequiredError()

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Google hesapları yalnız e-posta doğrulanmışsa kabul edilir (güvenli otomatik
    // bağlamanın önkoşulu). Credentials ve diğer akışlar için engel yok.
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return profile?.email_verified === true
      }
      if (account?.provider === "facebook") {
        // Facebook e-posta döndürmeyebilir: mobilde açılan hesaplarda e-posta
        // hiç olmayabilir, ya da kullanıcı izin ekranından e-postayı kaldırır.
        // Sistemin tamamı e-postaya dayalı (şifre sıfırlama, 2FA, oturum
        // snapshot'ı) → e-postasız kullanıcı yaratmak yerine anlaşılır bir
        // mesajla geri gönder. String dönüş = yönlendirme (@auth/core
        // handleAuthorized: string ise redirect callback'ine geçirilir).
        if (!profile?.email) return "/?error=FacebookNoEmail"
        return true
      }
      return true
    },
    async jwt({ token, user }) {
      // ─── İlk giriş ───
      // Kullanıcı kimliğini göm, varsa arşivi iptal et (14 günlük silmeyi
      // durdurur) ve bu cihaz için bir oturum kaydı oluşturup id'sini token'a
      // `sid` olarak yaz.
      if (user?.id) {
        token.id = user.id
        const uid = user.id
        try {
          await db
            .update(users)
            .set({ archivedAt: null })
            .where(eq(users.id, uid))
        } catch {
          // Arşiv iptali başarısız olsa da girişi engelleme.
        }
        try {
          const info = await readRequestDeviceInfo()
          const [row] = await db
            .insert(userSessions)
            .values({
              userId: uid,
              userAgent: info.userAgent,
              deviceLabel: info.deviceLabel,
              ip: info.ip,
              locationLabel: info.locationLabel,
            })
            .returning({ id: userSessions.id })
          if (row) {
            token.sid = row.id
            token.sidCheckedAt = Date.now()
          }
        } catch {
          // Oturum kaydı oluşmazsa cihaz listede görünmez ama giriş tamamlanır.
        }
        return token
      }

      // ─── Sonraki istekler: revoke zorlaması (throttle'lı) ───
      // Oturum satırı silinmiş veya revokedAt dolmuşsa token'ı geçersiz kıl
      // (null döndür) → kullanıcı çıkış yapmış sayılır. Uzaktan oturum kapatma
      // ve "tüm cihazlardan çıkış" bu kontrolle veri katmanında zorlanır.
      // (token alanları bu v5 beta'sında {} olarak gelir; mevcut `token.id as
      // string` kalıbına uyup cast ediyoruz.)
      const sid = token.sid as string | undefined
      if (sid) {
        const now = Date.now()
        const last = (token.sidCheckedAt as number | undefined) ?? 0
        if (now - last >= SID_CHECK_INTERVAL_MS) {
          try {
            const [row] = await db
              .select({ revokedAt: userSessions.revokedAt })
              .from(userSessions)
              .where(eq(userSessions.id, sid))
              .limit(1)
            if (!row || row.revokedAt) return null
            await db
              .update(userSessions)
              .set({ lastSeenAt: new Date() })
              .where(eq(userSessions.id, sid))
            token.sidCheckedAt = now
          } catch {
            // DB hatasında oturumu düşürme; bir sonraki turda yeniden denenir.
          }
        }
      }
      return token
    },
    session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string
      }
      if (token?.sid) {
        session.sid = token.sid as string
      }
      return session
    },
  },
})
