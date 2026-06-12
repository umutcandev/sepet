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

export const assistantBurstLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:assistant:burst",
  analytics: true,
})

export const assistantDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 d"),
  prefix: "rl:assistant:daily",
  analytics: true,
})
