import type { GeoPoint, RouteResult } from "./trip"

export const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d

/** ~100 m'ye yuvarlar: ORS'ye ve cache anahtarına evin tam konumu gitmez. */
export const coarsen = (p: GeoPoint): GeoPoint => ({
  lat: round(p.lat, 3),
  lng: round(p.lng, 3),
})

type OrsGeoJson = {
  features?: Array<{
    geometry?: { coordinates?: number[][] }
    properties?: {
      summary?: { distance?: number; duration?: number }
      segments?: Array<{ distance?: number; duration?: number }>
      way_points?: number[]
    }
  }>
}

export function parseOrsRoute(json: unknown): RouteResult | null {
  const feature = (json as OrsGeoJson | null)?.features?.[0]
  const coords = feature?.geometry?.coordinates
  if (!coords?.length) return null
  const props = feature?.properties
  const wp = props?.way_points ?? []
  const legs = (props?.segments ?? []).map((s, i) => ({
    distanceM: Math.round(s.distance ?? 0),
    durationS: Math.round(s.duration ?? 0),
    start: wp[i] ?? 0,
    end: wp[i + 1] ?? coords.length - 1,
  }))
  return {
    distanceM: Math.round(props?.summary?.distance ?? 0),
    durationS: Math.round(props?.summary?.duration ?? 0),
    path: coords.map(([lng, lat]) => [round(lat, 5), round(lng, 5)]),
    legs,
  }
}
