// Son kullanılan giriş yöntemi (yalnız istemci ipucu): giriş modalının method
// aşamasında ilgili butona "Son kullanılan" rozeti koymak için. Sunucu tarafında
// karşılığı yok; localStorage erişilemezse sessizce yok sayılır.

export type LastLoginMethod = "google" | "email"

const KEY = "sepet:last-login-method:v1"

export function getLastLoginMethod(): LastLoginMethod | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(KEY)
    return value === "google" || value === "email" ? value : null
  } catch {
    return null
  }
}

export function setLastLoginMethod(method: LastLoginMethod): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, method)
  } catch {
    // Erişim yoksa (gizli mod vb.) rozet bir dahaki sefere görünmez, o kadar.
  }
}
