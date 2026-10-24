import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const authConfig = {
  providers: [Google],
  callbacks: {
    authorized() {
      return true
    },
    // proxy.ts hız limitlerini kullanıcı başına anahtarlamak için `req.auth.user.id`
    // okur. Bu callback olmadan Auth.js varsayılan oturumu yalnız name/email/image
    // taşır; id hiç gelmez ve her limit sessizce IP'ye düşerdi. auth.ts kendi
    // session callback'iyle bunu ezer (sid dahil). Burada iptal kontrolü yok:
    // id yalnız limit anahtarıdır, yetki kararı değil.
    session({ session, token }) {
      if (typeof token?.id === "string" && session.user) {
        session.user.id = token.id
      }
      return session
    },
  },
} satisfies NextAuthConfig

