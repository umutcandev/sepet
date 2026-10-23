import "server-only"

import { cookies } from "next/headers"

// Auth.js'in "oturum var mı" kararıyla BİREBİR aynı kural: @auth/core
// SessionStore (lib/utils/cookie.js), adı yapılandırılmış oturum çerezi adıyla
// BAŞLAYAN ve değeri boş olmayan her çerezi parça sayıp birleştirir, sonra
// JWT olarak çözer. Ad tam eşleşme değil önek eşleşmesi olduğu için daha dar
// bir kural (ör. yalnız `.0`, `.1` parçaları) `authjs.session-tokenX` gibi bir
// adla atlatılabiliyordu: bizim kontrolümüz "oturum yok" derken Auth.js aynı
// çerezi çözüp OAuth hesabını o kullanıcıya bağlıyordu. Ortama göre
// (HTTP/HTTPS) iki ad da olası; ikisine birden bakılır.
const SESSION_COOKIE_PREFIXES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
]

function isSessionCookie(name: string, value: string): boolean {
  return value !== "" && SESSION_COOKIE_PREFIXES.some((p) => name.startsWith(p))
}

/** İstekte Auth.js'in oturum olarak okuyacağı bir çerez var mı. */
export async function hasSessionCookie(): Promise<boolean> {
  const jar = await cookies()
  return jar.getAll().some((c) => isSessionCookie(c.name, c.value))
}

/**
 * Oturum çerezlerini siler (route handler / server action içinde). `__Secure-`
 * önekli çerez yalnız `Secure` niteliğiyle silinebildiği için düz delete()
 * yerine süresi geçmiş bir set yazılır.
 */
export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies()
  for (const { name, value } of jar.getAll()) {
    if (!isSessionCookie(name, value)) continue
    jar.set(name, "", {
      maxAge: 0,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: name.startsWith("__Secure-"),
    })
  }
}
