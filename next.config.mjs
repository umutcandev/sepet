import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Velite içerik katmanını (content/blog → .velite) Next başlamadan derle.
// Turbopack'te webpack plugin çalışmadığından önerilen yöntem budur; tek sefer
// çalışması için VELITE_STARTED guard'ı kullanılır (next.config birden çok kez
// yüklenebilir).
const isDev = process.argv.includes("dev")
const isBuild = process.argv.includes("build")
if (!process.env.VELITE_STARTED && (isDev || isBuild)) {
  process.env.VELITE_STARTED = "1"
  const { build } = await import("velite")
  await build({ watch: isDev, clean: !isDev })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  // Geçiş anahtarı rpID'sini çözen env'in istemciye aktarılan kopyası (bkz.
  // lib/auth/passkey-availability.ts). Arayüz, rpID'nin sayfa host'una uyup
  // uymadığını sunucu yanıtını beklemeden bilir; preview'da belirip
  // kaybolmaz. Gizli değil: rpID her giriş seçeneğinde zaten açıkça gider.
  // Sunucu kodu WEBAUTHN_* adlarını okumaya devam eder (farklı adlar şart:
  // `env` anahtarları sunucu bundle'ına da gömülür).
  env: {
    NEXT_PUBLIC_PASSKEY_RP_ID: process.env.WEBAUTHN_RP_ID ?? "",
    NEXT_PUBLIC_PASSKEY_ORIGINS: process.env.WEBAUTHN_ORIGINS ?? "",
    NEXT_PUBLIC_PASSKEY_VERCEL_URL: process.env.VERCEL_URL ?? "",
  },
  experimental: {
    // Next 16.3'te varsayılan açık; Vercel `.next/cache`i her build'de geri
    // yüklüyor. Taze clone + eski cache ile Turbopack `globals.css`in ESKİ
    // derlenmiş hâlini kullandı: bileşenler yeni sınıfları taşırken yeni
    // token'lar (`--composer`, `--surface-outline`…) CSS'e hiç girmedi ve
    // prompt ile butonların zemini production'da boş kaldı. Yerelde aynı
    // senaryoyla tekrarlandı; bu ayar kapalıyken CSS doğru çıkıyor. Bedeli
    // daha yavaş build. Açmadan önce aynı senaryoyu tekrar dene.
    turbopackFileSystemCacheForBuild: false,
  },
  // Telefondan yerel ağ üzerinden test ederken (http://192.168.1.x:3000) Next
  // dev sunucusu /_next/* isteklerini "cross-origin" sayıp ENGELLİYOR. Sonuç
  // sessiz bir bozulma: sayfa 200 dönüyor ama chunk'lar inmediği için istemci
  // bileşenleri hiç mount olmuyor — hero shader'ın telefonda gelmemesinin
  // sebebi buydu. Yalnız dev sunucusunu ilgilendirir, production'a çıkmaz.
  allowedDevOrigins: ["192.168.1.*"],
  // argon2 (native napi binary) ve nodemailer server-only; bundle'a girmeyip
  // Node runtime'da require edilmeleri gerekir. Aksi halde build/serverless
  // paketleme bozulur.
  serverExternalPackages: ["@node-rs/argon2", "nodemailer"],
  images: {
    // Yalnız next/image'ın gerçekten optimize ettiği kaynaklar. Profil
    // fotoğrafları (Google lh3, Facebook fbcdn/lookaside) düz <img> ile
    // (AvatarImage) gösteriliyor, optimizer'dan geçmiyor; burada durmaları
    // /_next/image'ı herhangi bir fbcdn alt alanındaki her görseli işleyen
    // açık bir proxy'ye çeviriyordu (görsel optimizasyon maliyeti). CSP
    // img-src onları <img> için listelemeye devam ediyor.
    remotePatterns: [
      // marketfiyati ürün görselleri CDN'i
      { protocol: "https", hostname: "cdn.marketfiyati.org.tr" },
    ],
  },
  async headers() {
    return [
      {
        source: "/wasm/zxing_reader.wasm",
        headers: [
          {
            key: "Content-Type",
            value: "application/wasm",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      // Uzun önbellek yalnız public/ altındaki statik dosyalara. Eskiden her
      // görsel uzantılı yolu kapsıyordu; `/api/products/x.png` gibi dinamik
      // bir yanıt da 1 yıllık `immutable` alıyordu.
      ...[
        "/:dir(brand|github|market-logos|onboarding|static)/:path*",
        "/blog/authors/:path*",
      ].map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      })),
    ]
  },
}

export default nextConfig
