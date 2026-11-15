import { redis } from "@/lib/redis"
import { orsDailyLimiter, orsMinuteLimiter } from "@/lib/security/rate-limit"
import { coarsen, parseOrsRoute, round } from "./ors"
import type { GeoPoint, RouteMode, RouteResult } from "./trip"

const ORS_URL = "https://api.heigit.org/openrouteservice/v2/directions"
const PROFILE: Record<RouteMode, string> = {
  car: "driving-car",
  walk: "foot-walking",
}
// Yollar sık değişmez; aynı sepet tekrar açılınca ORS'ye gidilmez.
const CACHE_TTL = 60 * 60 * 24 * 7
// Şube yola bu kadar uzaksa en yakın yola bağlanır (ORS varsayılanı 350 m).
const SNAP_RADIUS_M = 1000

async function acquireOrsSlot(): Promise<boolean> {
  const minute = await orsMinuteLimiter.limit("global")
  if (!minute.success) return false
  const daily = await orsDailyLimiter.limit("global")
  return daily.success
}

/** Ev → şubeler → ev yol rotası; anahtar yoksa, kota dolduysa ya da hata olursa null. */
export async function getRoute(
  mode: RouteMode,
  home: GeoPoint,
  stops: GeoPoint[]
): Promise<RouteResult | null> {
  const key = process.env.ORS_API_KEY
  if (!key) return null

  // Sıra istemcinin: bacakları o sırayla marketlere eşliyor.
  const origin = coarsen(home)
  const ordered = stops.map(coarsenStop)
  const cacheKey = `geo:route:v3:${mode}:${pointKey(origin)}:${ordered.map(pointKey).join("|")}`

  try {
    const cached = await redis.get<RouteResult>(cacheKey)
    if (cached) return cached
  } catch (err) {
    console.error("[directions] cache read failed", err)
  }

  if (!(await acquireOrsSlot())) return null

  const coordinates = [origin, ...ordered, origin].map((p) => [p.lng, p.lat])
  try {
    const res = await fetch(`${ORS_URL}/${PROFILE[mode]}/geojson`, {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
        Accept: "application/geo+json, application/json",
      },
      body: JSON.stringify({
        coordinates,
        // Bacak süreleri (`segments`) yalnız talimatlarla gelir; talimatlar
        // parse'ta atılır, cache'e girmez.
        instructions: true,
        radiuses: coordinates.map(() => SNAP_RADIUS_M),
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error("[directions] ors failed", res.status)
      return null
    }
    const route = parseOrsRoute(await res.json())
    if (route) await redis.set(cacheKey, route, { ex: CACHE_TTL }).catch(() => {})
    return route
  } catch (err) {
    console.error("[directions] ors request failed", err)
    return null
  }
}

// Şube koordinatı 5 hane (~1 m) yeter; cache anahtarı kısa kalır.
const coarsenStop = (p: GeoPoint): GeoPoint => ({
  lat: round(p.lat, 5),
  lng: round(p.lng, 5),
})

const pointKey = (p: GeoPoint) => `${p.lat},${p.lng}`
