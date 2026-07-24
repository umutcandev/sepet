// Açık yönlendirme (open redirect) koruması: yalnız aynı-origin, "/" ile başlayan
// göreli yollar kabul edilir. Hem server action (Google girişi) hem client
// navigasyonu (credentials girişi sonrası window.location.assign) aynı mantığı
// paylaşsın diye tek yerde. "use server"/"server-only" YOK: saf util, iki tarafta da
// import edilebilir.
const ALLOWED_CALLBACK_PREFIXES = ["/"]

export function sanitizeCallback(callbackUrl: string | undefined | null): string {
  if (!callbackUrl) return "/"
  if (typeof callbackUrl !== "string") return "/"
  if (!callbackUrl.startsWith("/")) return "/"
  if (callbackUrl.startsWith("//")) return "/"
  if (!ALLOWED_CALLBACK_PREFIXES.some((p) => callbackUrl.startsWith(p))) {
    return "/"
  }
  return callbackUrl
}
