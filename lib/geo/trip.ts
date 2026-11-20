import type { MarketAllocation } from "@/lib/ai/schemas"

export type GeoPoint = { lat: number; lng: number }
/** `products`: o şubeden alınan her kalemin görseli (yoksa null). */
export type DepotStop = GeoPoint & { market: string; products: (string | null)[] }

export type RouteMode = "car" | "walk"
/** İki durak arası; `start`/`end` yolun `path` içindeki indeksleri. */
export type RouteLeg = {
  distanceM: number
  durationS: number
  start: number
  end: number
}

export type RouteResult = {
  distanceM: number
  durationS: number
  /** [lat, lng] çiftleri. */
  path: [number, number][]
  /** Sırayla ev → 1. şube, …, son şube → ev. */
  legs: RouteLeg[]
}

const EARTH_KM = 6371
const rad = (d: number) => (d * Math.PI) / 180

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

/** Rota ucunun kabul ettiği en fazla şube; ORS tavanı 50 nokta (ev iki kez), sınırı harita okunurluğu koyar. */
export const MAX_ROUTE_STOPS = 20

/**
 * Dökümdeki farklı şubeler; koordinatı eksik satır varsa ya da rota ucunun
 * sınırını aşıyorsa null (tahmin yok, kalıcı hata gösterilmez).
 */
export function depotStops(
  allocation: readonly MarketAllocation[],
  imageFallback?: Record<string, string>
): DepotStop[] | null {
  if (allocation.length === 0) return null
  const stops = new Map<string, DepotStop>()
  for (const a of allocation) {
    if (!a.depotCoords) return null
    const { lat, lng } = a.depotCoords
    // Aynı koordinattaki farklı marketler (ör. AVM) ayrı durak kalır.
    const key = `${a.market}:${lat}:${lng}`
    const stop = stops.get(key) ?? { lat, lng, market: a.market, products: [] }
    stop.products.push(a.imageUrl ?? imageFallback?.[a.productId] ?? null)
    stops.set(key, stop)
  }
  return stops.size <= MAX_ROUTE_STOPS ? [...stops.values()] : null
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs]
  return xs.flatMap((x, i) =>
    permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])
  )
}

const tourKm = (origin: GeoPoint, order: GeoPoint[]) =>
  [origin, ...order, origin].reduce(
    (sum, p, i, all) => (i === 0 ? 0 : sum + haversineKm(all[i - 1], p)),
    0
  )

/** Ev → şubeler → ev turu için durak sırası; yol rotası bu sırayla istenir. */
export function orderStops<T extends GeoPoint>(origin: GeoPoint, stops: T[]): T[] {
  if (stops.length <= 6) {
    let best = stops
    let bestKm = Infinity
    for (const order of permutations(stops)) {
      const km = tourKm(origin, order)
      if (km < bestKm) [best, bestKm] = [order, km]
    }
    // Tur iki yönde de aynı uzunlukta; yakın şubeye önce uğrayan yön seçilir.
    const first = best[0]
    const last = best[best.length - 1]
    return haversineKm(origin, last) < haversineKm(origin, first)
      ? [...best].reverse()
      : best
  }
  // Çok durakta en yakın komşu yeterli.
  const left = [...stops]
  const order: T[] = []
  let at: GeoPoint = origin
  while (left.length) {
    let next = 0
    for (let i = 1; i < left.length; i++) {
      if (haversineKm(at, left[i]) < haversineKm(at, left[next])) next = i
    }
    at = left.splice(next, 1)[0]
    order.push(at as T)
  }
  return order
}

/** 125 → "2 dk", 3900 → "1 sa 5 dk" */
export function formatDuration(seconds: number): string {
  const total = Math.max(1, Math.round(seconds / 60))
  if (total < 60) return `${total} dk`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h} sa ${m} dk` : `${h} sa`
}

/** 850 → "850 m", 4120 → "4,1 km" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`
}

/** Kombinasyon rotasının tek markete göre süre farkı, sade cümleyle. */
export function compareDuration(comboS: number, singleS: number): string {
  const diff = Math.round((comboS - singleS) / 60)
  const span = formatDuration(Math.abs(diff) * 60)
  if (diff >= 1) return `Tek markete göre ${span} daha uzun`
  if (diff <= -1) return `Tek markete göre ${span} daha kısa`
  return "Tek marketle neredeyse aynı süre"
}
