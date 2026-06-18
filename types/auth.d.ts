import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    /** Geçerli cihaz oturumunun kimliği (user_session.id). Aktif oturumlar
     *  panelinde "bu cihaz" satırını işaretlemek için kullanılır. */
    sid?: string
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    /** Bu token'a bağlı user_session.id. */
    sid?: string
    /** Son revoke kontrolünün epoch (ms) zamanı — DB sorgusunu throttle eder. */
    sidCheckedAt?: number
  }
}
