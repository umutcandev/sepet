/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // camgoz.net ve tüm subdomain'leri (file., cdn., vb.)
      { protocol: "https", hostname: "camgoz.net" },
      { protocol: "https", hostname: "**.camgoz.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/zxing_reader.wasm",
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
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=*",
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
