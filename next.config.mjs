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
}

export default nextConfig
