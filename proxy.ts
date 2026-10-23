import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import type { NextRequest, NextFetchEvent } from "next/server"

import { authConfig } from "./auth.config"
import {
  assistantBurstLimiter,
  authLimiter,
  avatarUploadLimiter,
  locationLimiter,
  productLimiter,
  receiptUploadLimiter,
  shareImageLimiter,
  shareViewLimiter,
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

// Yalnızca /api rotaları için: hız limiti için `req.auth` (userId) gerektiğinden
// NextAuth `withAuth` sarmalayıcısı burada uygulanır. Bu sarmalayıcı her yanıta
// CSRF cookie ekler; bu yüzden SAYFA rotalarına UYGULANMAZ — aksi halde ana
// sayfa/blog gibi statik rotalar Set-Cookie yüzünden CDN'de cache'lenemez.
const apiMiddleware = withAuth(async (req) => {
  const { nextUrl } = req
  const path = nextUrl.pathname
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon"
  const userId = req.auth?.user?.id

  if (path.startsWith("/api/auth")) {
    const { success, reset } = await authLimiter.limit(`auth:${ip}`)
    if (!success) return tooManyResponse(reset)
  }

  // Asistan (Gemini vision + parse + eşleştirme). Hacim sınırı aylık kotadır;
  // bu yalnızca burst korumasıdır — kota dolduğunda dönen 402'lerin de
  // hammer'lanmasını ve iptal döngülerini keser.
  if (path.startsWith("/api/assistant")) {
    const key = userId ? `user:${userId}` : `ip:${ip}`
    const { success, reset } = await assistantBurstLimiter.limit(key)
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

  if (path.startsWith("/api/avatar")) {
    const key = userId ? `user:${userId}` : `ip:${ip}`
    const { success, reset } = await avatarUploadLimiter.limit(key)
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

// Sayfa rotaları auth okumaz → CSRF cookie set edilmez → statik/ISR yanıtları
// CDN'de cache'lenebilir. Yalnızca güvenlik başlıkları eklenir (CSP tek kaynak
// burada kalır). /api rotaları auth gerektiren hız-limiti sarmalayıcısına gider.
export default async function proxy(req: NextRequest, ev: NextFetchEvent) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    // NextAuth `withAuth` sarmalayıcısı ikinci argümanı route-handler context'i
    // olarak tipler; middleware olarak çağrıldığında runtime NextFetchEvent
    // geçer (NextAuth bunu işler), o yüzden beklenen tipe daraltıyoruz.
    return apiMiddleware(
      req,
      ev as unknown as Parameters<typeof apiMiddleware>[1],
    )
  }
  if (req.nextUrl.pathname.startsWith(SHARE_PATH)) {
    return shareResponse(req)
  }
  const res = NextResponse.next()
  applySecurityHeaders(res.headers)
  // Şifre sıfırlama / e-posta doğrulama sayfaları tek kullanımlık token'ı
  // URL'de taşır. Varsayılan politika aynı origin'e (RSC, /api/me,
  // /_next/image istekleri) tam URL'yi Referer olarak gönderir; token o
  // isteklerle loglara düşmesin.
  if (TOKEN_PAGE_PATHS.has(req.nextUrl.pathname)) {
    res.headers.set("Referrer-Policy", "no-referrer")
  }
  return res
}

const TOKEN_PAGE_PATHS = new Set(["/sifre-sifirla", "/dogrula"])

const SHARE_PATH = "/paylasim/"
const SHARE_IMAGE_PATH = /^\/paylasim\/[^/]+\/gorsel\//

/* Paylaşılan sohbet sayfası. URL'nin kendisi erişim anahtarı (token), bu
   yüzden:
   - Referrer-Policy no-referrer: sayfadan dışarı giden bir bağlantı ya da
     istek, Referer başlığında token'ı taşımasın (varsayılan politika aynı
     origin'e tam URL gönderir).
   - X-Robots-Tag: bağlantı bir yerde yayımlansa bile arama motoru dizine
     almasın. robots.txt'te engellemek yerine bu: engellenen sayfanın noindex
     başlığını tarayıcı hiç göremezdi.
   - IP başına hız limiti: token tahmin edilemez, limit yalnızca DB'yi toplu
     taramaya karşı korur. Tavan cömert: operatör NAT'ı arkasında aynı IP'yi
     paylaşan çok sayıda telefon, bir grupta dolaşan bağlantıyı açabilmeli.
   Önbellek başlığı burada yazılmıyor: sayfa `force-dynamic`, Next zaten
   no-store gönderiyor; paylaşım kapatılınca bağlantı anında 404 olur. */
async function shareResponse(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon"
  // Görseller ayrı sayılır: sayfa başına 20'ye kadar istek sayfa limitini yemesin.
  const limiter = SHARE_IMAGE_PATH.test(req.nextUrl.pathname)
    ? shareImageLimiter
    : shareViewLimiter
  const { success, reset } = await limiter.limit(`ip:${ip}`)
  const res = success ? NextResponse.next() : shareTooManyResponse(reset)
  applySecurityHeaders(res.headers)
  res.headers.set("Referrer-Policy", "no-referrer")
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return res
}

// Bağlantıyı açan bir insan: JSON yerine okunur bir sayfa.
function shareTooManyResponse(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  return new NextResponse(
    '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biraz bekle</title><p style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5">Bu bağlantı şu an çok sık açılıyor. Birkaç saniye sonra sayfayı yenileyebilirsin.</p></html>',
    {
      status: 429,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": String(retryAfter),
      },
    },
  )
}

// Görsel uzantısı istisnası YALNIZ public/ altındaki statik klasörler için
// (/blog altında dinamik rotalar da var: yalnız blog/media ve blog/authors
// statik; kapak.svg kendi sıkı CSP'sini yazan bir rota).
// Eskiden her yolu kapsıyordu: `/api/products/x.png` gibi dinamik bir rota
// proxy'ye hiç uğramadan çalışıyor, hız limitini ve güvenlik başlıklarını
// atlıyordu. public/'e yeni bir klasör eklenirse buraya da eklenmeli
// (eklenmezse yalnızca proxy'den geçer; güvenli taraf).
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|(?:brand|github|market-logos|onboarding|static|blog/media|blog/authors)/.*\\.(?:svg|png|jpg|jpeg|webp|ico|gif)$|blog/[^/]+/kapak\\.svg$).*)",
  ],
}
