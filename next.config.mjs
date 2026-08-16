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
  // Telefondan yerel ağ üzerinden test ederken (http://192.168.1.x:3000) Next
  // dev sunucusu /_next/* isteklerini "cross-origin" sayıp ENGELLİYOR. Sonuç
  // sessiz bir bozulma: sayfa 200 dönüyor ama chunk'lar inmediği için istemci
  // bileşenleri hiç mount olmuyor — hero shader'ın telefonda gelmemesinin
  // sebebi buydu. Yalnız dev sunucusunu ilgilendirir, production'a çıkmaz.
  allowedDevOrigins: ["192.168.1.176", "192.168.1.*"],
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
