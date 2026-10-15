"use client"

import * as React from "react"

import type { NearbyDepot } from "@/app/api/location/nearest/route"

// marketfiyati resmi sitesi yarıçapı 1–10 km arasında tutuyor; daha geniş
// değerler hem alakasız sonuç hem yavaş sorgu getiriyor.
export const DISTANCE_OPTIONS = [1, 3, 5, 10] as const
// Konumu ilk kez seçen kullanıcının yarıçapı (konum modalıyla aynı).
export const DEFAULT_DISTANCE = 10

// Prompt menüsü her açılışta aynı bölgeyi tekrar sormasın diye sayfa ömrü
// boyunca tutulan istemci cache'i. Sunucu zaten Redis'te tutuyor; bu yalnız ağ
// turunu keser. Çözülen listeler ayrıca senkron okunur ki kaydetme sonrası
// (cache'te olan) yeni yarıçapa geçerken bir karelik iskelet görünmesin.
const pending = new Map<string, Promise<NearbyDepot[]>>()
const resolved = new Map<string, NearbyDepot[]>()

// Sunucu cache anahtarıyla aynı hassasiyet (≈1 km); pin aynı mahallede kaldıkça
// aynı liste döner.
function depotKey(lat: number, lng: number, distance: number) {
  return `${lat.toFixed(2)}:${lng.toFixed(2)}:${distance}`
}

export function fetchNearbyDepots(
  lat: number,
  lng: number,
  distance: number
): Promise<NearbyDepot[]> {
  const key = depotKey(lat, lng, distance)
  const done = resolved.get(key)
  if (done) return Promise.resolve(done)

  let request = pending.get(key)
  if (!request) {
    request = fetch(
      `/api/location/nearest?lat=${lat}&lng=${lng}&distance=${distance}`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`nearest ${res.status}`)
        const data = (await res.json()) as { depots?: NearbyDepot[] }
        const depots = data.depots ?? []
        resolved.set(key, depots)
        return depots
      })
      .finally(() => pending.delete(key))
    pending.set(key, request)
  }
  return request
}

/** Bir konum + yarıçap için yakın şubeler. `null` sorgu hiçbir şey çekmez. */
export function useNearbyDepots(
  lat: number | null,
  lng: number | null,
  distance: number | null
) {
  const key =
    lat != null && lng != null && distance != null
      ? depotKey(lat, lng, distance)
      : null
  const [, rerender] = React.useReducer((n: number) => n + 1, 0)
  const [failedKey, setFailedKey] = React.useState<string | null>(null)
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (key === null || resolved.has(key)) return
    let alive = true
    fetchNearbyDepots(lat!, lng!, distance!).then(
      () => alive && rerender(),
      () => alive && setFailedKey(key)
    )
    return () => {
      alive = false
    }
  }, [key, lat, lng, distance, attempt])

  const depots = key !== null ? (resolved.get(key) ?? null) : null
  const error = key !== null && depots === null && failedKey === key
  return {
    depots,
    loading: key !== null && depots === null && !error,
    error,
    retry: () => {
      setFailedKey(null)
      setAttempt((n) => n + 1)
    },
  }
}
