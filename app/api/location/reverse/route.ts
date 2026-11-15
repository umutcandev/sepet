import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { redis } from "@/lib/redis"
import { nominatimLimiter } from "@/lib/security/rate-limit"

export const runtime = "nodejs"

// Nominatim reverse geocode sunucudan çağrılır: kullanıcının IP'si OSM'ye
// gitmez, koordinat ~100 m'ye yuvarlanır. Kullanım politikası gereği tanıtıcı
// User-Agent, global 1 istek/sn ve önbellek.
const CACHE_TTL = 60 * 60 * 24 * 30
const USER_AGENT = "Sepet/1.0 (+https://trysepet.com)"

type NominatimReverse = {
  display_name?: string
  address?: Record<string, string>
}

/** Adres bileşenlerinden kısa, okunabilir bir label kur ("İlçe, İl"). */
function formatLabel(data: NominatimReverse): string | null {
  const a = data.address ?? {}
  const locality =
    a.suburb ||
    a.neighbourhood ||
    a.quarter ||
    a.town ||
    a.village ||
    a.city_district
  const city = a.city || a.province || a.state || a.county
  const parts = [locality, city].filter(Boolean)
  if (parts.length > 0) return parts.join(", ")
  return data.display_name ?? null
}

async function acquireSlot(): Promise<boolean> {
  for (let i = 0; i < 2; i++) {
    const { success, reset } = await nominatimLimiter.limit("global")
    if (success) return true
    await new Promise((r) => setTimeout(r, Math.min(1100, Math.max(50, reset - Date.now()))))
  }
  return false
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const lat = Number(url.searchParams.get("lat"))
  const lng = Number(url.searchParams.get("lng"))
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return NextResponse.json({ error: "invalid_coords" }, { status: 400 })
  }

  const qLat = lat.toFixed(3)
  const qLng = lng.toFixed(3)
  const cacheKey = `geo:reverse:v1:${qLat}:${qLng}`
  try {
    const cached = await redis.get<string>(cacheKey)
    if (cached) return NextResponse.json({ label: cached })
  } catch (err) {
    console.error("[location/reverse] cache read failed", err)
  }

  try {
    if (!(await acquireSlot())) return NextResponse.json({ label: null })
    const res = await fetch(
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
        `&lat=${qLat}&lon=${qLng}&zoom=14&accept-language=tr`,
      {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok) return NextResponse.json({ label: null })
    const label = formatLabel((await res.json()) as NominatimReverse)
    if (label) {
      await redis.set(cacheKey, label, { ex: CACHE_TTL }).catch(() => {})
    }
    return NextResponse.json({ label })
  } catch {
    return NextResponse.json({ label: null })
  }
}
