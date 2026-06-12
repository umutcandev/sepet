import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { nearest, MarketfiyatiError } from "@/lib/marketfiyati/client"
import { getMarketDisplayName } from "@/lib/markets/registry"
import { redis, MF_NEAREST_TTL } from "@/lib/redis"

export const runtime = "nodejs"

export type NearbyDepot = {
  id: string
  market: string
  branch: string | null
  distance: number | null
  lat: number | null
  lng: number | null
}

const round2 = (n: number) => Math.round(n * 100) / 100
const clampDistance = (n: number) => Math.min(10, Math.max(1, Math.round(n)))

/**
 * Konum seçim modalı için canlı yakın şube listesi. marketfiyati /nearest WAF
 * header'ları gerektirdiğinden client'tan doğrudan çağrılamaz — bu route
 * server'dan çağırıp normalize eder. Sonuç koordinat+mesafe ile kısa cache'lenir
 * (modal pin sürüklerken aynı bölgeyi tekrar tekrar sorgulamasın).
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const lat = Number(url.searchParams.get("lat"))
  const lng = Number(url.searchParams.get("lng"))
  const distance = clampDistance(Number(url.searchParams.get("distance")) || 10)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "invalid_coords" }, { status: 400 })
  }

  // v2: distance birimi metre→km'ye geçti; eski cache değerlerini atlamak için
  // anahtar sürümlendi.
  const cacheKey = `mf:nearbydepots:v2:${round2(lat)}:${round2(lng)}:${distance}`
  try {
    const cached = await redis.get<NearbyDepot[]>(cacheKey)
    if (cached) return NextResponse.json({ depots: cached })
  } catch (err) {
    console.error("[location/nearest] cache read failed", err)
  }

  try {
    const raw = await nearest(lat, lng, distance)
    const depots: NearbyDepot[] = raw
      .map((d) => ({
        id: d.id,
        market: getMarketDisplayName(d.marketName),
        branch: d.sellerName ?? null,
        // marketfiyati mesafeyi METRE döndürüyor; resmi site gibi km'ye çevirip
        // 2 ondalığa yuvarlıyoruz (720.73 m → 0.72 km).
        distance: d.distance != null ? round2(d.distance / 1000) : null,
        lat: d.location?.lat ?? null,
        lng: d.location?.lon ?? null,
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))

    try {
      if (depots.length > 0) {
        await redis.set(cacheKey, depots, { ex: MF_NEAREST_TTL })
      }
    } catch (err) {
      console.error("[location/nearest] cache write failed", err)
    }

    return NextResponse.json({ depots })
  } catch (err) {
    const status = err instanceof MarketfiyatiError ? err.status : 500
    console.error("[location/nearest] failed", err)
    return NextResponse.json({ error: "nearest_failed" }, { status })
  }
}
