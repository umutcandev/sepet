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
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Facebook profil fotoğrafı CDN'leri (Graph /me?fields=picture)
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
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
      {
        source: "/:path*.(png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|ttf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
}

export default nextConfig
