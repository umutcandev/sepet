const isDev = process.env.NODE_ENV !== "production"

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval'"

// Fiş/avatar görsellerinin origin'i env'den gelir; adres değişince CSP kendiliğinden uyar.
function storageOrigin(): string | null {
  try {
    return new URL(process.env.R2_PUBLIC_BASE_URL ?? "").origin
  } catch {
    return null
  }
}

const imgSrc = [
  "'self' data: blob:",
  "https://lh3.googleusercontent.com",
  // Facebook profil fotoğrafı CDN'leri.
  "https://platform-lookaside.fbsbx.com https://*.fbcdn.net",
  "https://cdn.marketfiyati.org.tr",
  // Blog görselleri MDX'te doğrudan bu adresle geçer.
  "https://cdn.trysepet.com",
  storageOrigin(),
]

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${[...new Set(imgSrc.filter(Boolean))].join(" ")}`,
  "font-src 'self' data:",
  // tiles.openfreemap.org: harita vektör döşemeleri, TileJSON ve yazı tipleri
  // (MapLibre hepsini fetch ile çeker; worker'ı ise aynı origin'den gelir).
  "connect-src 'self' https://accounts.google.com https://*.upstash.io https://tiles.openfreemap.org",
  // platform.twitter.com: blogdaki X gönderisi iframe'i (components/blog/mdx-x-post.tsx).
  "frame-src https://accounts.google.com https://platform.twitter.com",
  "frame-ancestors 'none'",
  // Sosyal giriş butonları gerçek form POST'u (JS kapalıyken de çalışır) ve
  // cross-origin redirect ile biter; form-action redirect zinciri boyunca
  // uygulandığından (Firefox/Safari) sağlayıcı origin'i burada da olmak zorunda.
  // Facebook OAuth dialog'u mobil UA'da m.facebook.com'a, bazı bölgelerde
  // web.facebook.com'a yönlendiriyor — üçü de listede olmazsa akış o
  // tarayıcılarda sessizce blok yer.
  "form-action 'self' https://accounts.google.com https://www.facebook.com https://m.facebook.com https://web.facebook.com",
  "base-uri 'self'",
].join("; ")

export function applySecurityHeaders(h: Headers) {
  h.set("Content-Security-Policy", CSP)
  h.set("X-Frame-Options", "DENY")
  h.set("X-Content-Type-Options", "nosniff")
  h.set("Referrer-Policy", "strict-origin-when-cross-origin")
  // publickey-credentials-*: geçiş anahtarları. Varsayılan izin listesi zaten
  // 'self'; açık yazılması üçüncü taraf iframe'lere asla devredilmeyeceğini belgeler.
  h.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(self), publickey-credentials-get=(self), publickey-credentials-create=(self)",
  )
}
