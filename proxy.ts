import NextAuth from "next-auth"
import { NextResponse } from "next/server"

import { authConfig } from "./auth.config"
import {
  authLimiter,
  locationLimiter,
  productLimiter,
  receiptUploadLimiter,
  transcribeBurstLimiter,
  transcribeDailyLimiter,
} from "@/lib/security/rate-limit"
import { applySecurityHeaders } from "@/lib/security/headers"

const { auth: withAuth } = NextAuth(authConfig)

function tooManyResponse(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  return new NextResponse(
    JSON.stringify({ error: "rate_limited" }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(retryAfter),
      },
    },
  )
}

export default withAuth(async (req) => {
  const { nextUrl } = req
  const path = nextUrl.pathname
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon"
  const userId = req.auth?.user?.id

  if (path.startsWith("/api/auth")) {
    const { success, reset } = await authLimiter.limit(`auth:${ip}`)
    if (!success) return tooManyResponse(reset)
  }

  if (path.startsWith("/api/products")) {
    const key = userId ? `user:${userId}` : `ip:${ip}`
    const { success, reset } = await productLimiter.limit(key)
    if (!success) return tooManyResponse(reset)
  }

  if (path.startsWith("/api/location")) {
    const key = userId ? `user:${userId}` : `ip:${ip}`
    const { success, reset } = await locationLimiter.limit(key)
    if (!success) return tooManyResponse(reset)
  }

  if (path.startsWith("/api/receipts")) {
    const key = userId ? `user:${userId}` : `ip:${ip}`
    const { success, reset } = await receiptUploadLimiter.limit(key)
    if (!success) return tooManyResponse(reset)
  }

  // Sesli giriş (Gemini audio). Aylık kotaya dahil değil; bir hesabın AI
  // bakiyesini tüketmesini engelleyen tek koruma bu altyapı limiti. Burst (dk)
  // hızlı döngüyü, günlük tavan toplam hacmi sınırlar. /api/transcribe auth
  // gerektirir → userId beklenir; yine de ip fallback bırakılır.
  if (path === "/api/transcribe") {
    const key = userId ? `user:${userId}` : `ip:${ip}`
    const burst = await transcribeBurstLimiter.limit(key)
    if (!burst.success) return tooManyResponse(burst.reset)
    const daily = await transcribeDailyLimiter.limit(key)
    if (!daily.success) return tooManyResponse(daily.reset)
  }

  const res = NextResponse.next()
  applySecurityHeaders(res.headers)
  return res
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|gif)$).*)",
  ],
}
