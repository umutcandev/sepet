import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import {
  db,
  users,
  accounts,
  sessions,
  verificationTokens,
  userSessions,
} from "@/lib/db"
import { authConfig } from "./auth.config"
import { readRequestDeviceInfo } from "@/lib/auth/device"

// Revoke kontrolü her istekte değil, en fazla bu aralıkla bir kez DB'ye gider.
const SID_CHECK_INTERVAL_MS = 60_000

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
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
