// Analiz çerezi tercihi. Projede şu an gerçek bir analitik yok; bu yüzden tercih
// DB yerine bir cookie'de tutulur (migration gerektirmez, kendi içinde tutarlı).
// İleride analitik eklendiğinde yükleyici bu cookie'yi kontrol etmelidir:
// cookie "1" → kullanıcı vazgeçti (analitik yükleme); yoksa/"0" → izin var.
//
// Bu modül istemci-güvenlidir (next/headers import etmez) çünkü ayarlar paneli
// bir client component'tir.

export const ANALYTICS_OPT_OUT_COOKIE = "analytics_opt_out"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/** Kullanıcı analitikten vazgeçti mi? (cookie "1" ise true) */
export function readAnalyticsOptOut(): boolean {
  if (typeof document === "undefined") return false
  return document.cookie
    .split("; ")
    .some((c) => c === `${ANALYTICS_OPT_OUT_COOKIE}=1`)
}

/** Tercihi cookie'ye yazar. optOut=true → analitik kapalı. */
export function writeAnalyticsOptOut(optOut: boolean): void {
  if (typeof document === "undefined") return
  document.cookie = `${ANALYTICS_OPT_OUT_COOKIE}=${
    optOut ? "1" : "0"
  }; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
}
