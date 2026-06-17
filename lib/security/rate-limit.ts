import { Ratelimit } from "@upstash/ratelimit"

import { redis } from "@/lib/redis"

export const productLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:products",
  analytics: true,
})

export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:auth",
})

// Konum modalı pin sürükledikçe / mesafe değiştikçe /api/location/nearest'a
// (WAF korumalı external API'ye proxy) istek atar. Debounce + abort var; bu
// limit yalnızca kötüye kullanımı sınırlar, normal etkileşim altında kalır.
export const locationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(40, "1 m"),
  prefix: "rl:location",
  analytics: true,
})

export const receiptUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:receipts:upload",
  analytics: true,
})

// NOT: assistantBurstLimiter / assistantDailyLimiter kaldırıldı. AI asistanı
// (/api/assistant/chat) artık hesap özelinde aylık kota + atomik rezervasyon
// ile sınırlanıyor (bkz. lib/usage). Yukarıdaki limiter'lar yalnızca altyapı
// korumasıdır.

// /api/transcribe (sesli giriş → Gemini Flash Lite audio) bilinçli olarak aylık
// kotaya DAHİL DEĞİL ("mesaj mesajdır": üretilen metin /chat'te zaten sayılır).
// Ama gerçek bir AI maliyeti üretir ve eski assistant burst/daily limiter'ı
// kaldırılınca korumasız kaldı. Bu yüzden adanmış bir altyapı limiti uygulanır:
// burst kötü-amaçlı döngüyü kırar, günlük tavan tek bir hesabın bakiyeyi
// tüketmesini sert biçimde imkânsız kılar. Sayılar cömert ama sınırlı: gerçek
// bir sesli kullanıcı (her dikte ayrı kayıt) bu tavanlara çarpmaz.
export const transcribeBurstLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "1 m"),
  prefix: "rl:transcribe:burst",
  analytics: true,
})

export const transcribeDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(80, "1 d"),
  prefix: "rl:transcribe:daily",
  analytics: true,
})
