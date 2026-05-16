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
