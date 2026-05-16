const isDev = process.env.NODE_ENV !== "production"

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval'"

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://camgoz.net https://file.camgoz.net https://cdn.camgoz.net/ https://cdn.trysepet.com https://pub-35b1290eb3ac4f07b50824e8f7d12f48.r2.dev",
  "font-src 'self' data:",
  "connect-src 'self' https://accounts.google.com https://*.upstash.io",
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
  h.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()")
}
