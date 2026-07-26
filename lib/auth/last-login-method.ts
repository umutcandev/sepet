// Son kullanılan giriş yöntemi (yalnız istemci ipucu): giriş modalının method
// aşamasında ilgili butona "Son kullanılan" rozeti koymak için. Sunucu tarafında
// karşılığı yok; localStorage erişilemezse sessizce yok sayılır.

export type LastLoginMethod = "google" | "facebook" | "email"

const KEY = "sepet:last-login-method:v1"

// Union genişledi ama anahtar (:v1) aynı kaldı: eski cihazlarda yazılı
// "google"/"email" değerleri hâlâ geçerli, sürüm yükseltmeye gerek yok.
const METHODS: readonly string[] = ["google", "facebook", "email"]

export function getLastLoginMethod(): LastLoginMethod | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(KEY)
    return value && METHODS.includes(value) ? (value as LastLoginMethod) : null
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
