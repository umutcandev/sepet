const isDev = process.env.NODE_ENV !== "production"

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval'"

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  // *.tile.openstreetmap.org: Leaflet OSM raster döşemeleri (<img> olarak yüklenir).
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://cdn.marketfiyati.org.tr https://cdn.trysepet.com https://pub-35b1290eb3ac4f07b50824e8f7d12f48.r2.dev https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  // nominatim.openstreetmap.org: pin oturunca reverse geocode (ücretsiz, anahtarsız).
  "connect-src 'self' https://accounts.google.com https://*.upstash.io https://nominatim.openstreetmap.org",
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "base-uri 'self'",
].join("; ")

export function applySecurityHeaders(h: Headers) {
  h.set("Content-Security-Policy", CSP)
  h.set("X-Frame-Options", "DENY")
  h.set("X-Content-Type-Options", "nosniff")
  h.set("Referrer-Policy", "strict-origin-when-cross-origin")
  h.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)")
}
