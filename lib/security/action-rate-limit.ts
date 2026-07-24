import { headers } from "next/headers"
import type { Ratelimit } from "@upstash/ratelimit"

// Server action'lar sayfa rotalarına POST eder; proxy.ts'in /api/* rate-limit
// dalı onları GÖRMEZ. Bu yüzden yeni auth akışları limiti action içinde uygular.
// IP okuma mantığı proxy.ts / device.ts ile birebir aynı.
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers()
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      "anon"
    )
  } catch {
    return "anon"
  }
}

export type LimitResult = { ok: true } | { ok: false; error: string }

const TOO_MANY = "Çok fazla deneme yaptın. Lütfen biraz bekle."

// Standart limit kontrolü: aşılırsa jenerik Türkçe hata döner ({ ok, error? }
// deseni action'larla uyumlu).
export async function checkLimit(
  limiter: Ratelimit,
  key: string,
): Promise<LimitResult> {
  const { success } = await limiter.limit(key)
  if (!success) return { ok: false, error: TOO_MANY }
  return { ok: true }
}
