// Site geneli sabitler — OG görseli, metadata, JSON-LD, sitemap ve RSS bu tek
// kaynaktan beslenir. (app/layout.tsx kendi metadata'sını koruyor; buradaki
// değerler blog ve SEO altyapısı içindir.)

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000")

export const SITE_NAME = "Sepet"

export const SITE_DESCRIPTION =
  "Alışveriş listeni yaz, marketlerdeki en uygun fiyatları karşılaştır ve en ucuz sepeti saniyeler içinde oluştur."

// Sepet'in resmî sosyal hesabı — Organization.sameAs ve RSS için.
export const SITE_X = "https://x.com/trysepet"

/** Göreli yolu mutlak URL'e çevirir (canonical, OG, JSON-LD, sitemap). */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString()
}
