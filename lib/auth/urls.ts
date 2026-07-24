import { headers } from "next/headers"

// E-postalardaki mutlak bağlantılar için taban URL. Canonical NEXT_PUBLIC_SITE_URL
// varsa o; yoksa isteğin host başlığından türetilir (Vercel'de x-forwarded-*);
// son çare localhost. Sunucu tarafında (action/route) çağrılır.
export async function appUrl(path: string): Promise<string> {
  let base = process.env.NEXT_PUBLIC_SITE_URL ?? null
  if (!base) {
    try {
      const h = await headers()
      const host = h.get("x-forwarded-host") ?? h.get("host")
      const proto = h.get("x-forwarded-proto") ?? "https"
      if (host) base = `${proto}://${host}`
    } catch {
      // header okunamadıysa env fallback'ine düş.
    }
  }
  base =
    base ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  return new URL(path, base).toString()
}
