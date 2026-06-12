"use client"

// MapTiler SDK yalnız tarayıcıda çalışır (window/DOM bağımlı). Bu yüzden modül
// üst seviyesinde import ETMEYİZ — ilk ihtiyaçta dinamik import edip apiKey'i
// konfigüre eder, sonuç promise'ini cache'leriz (tek yükleme).

export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ""

// Haritanın kullanacağı stil. Hesaptaki özel stil id'si env ile override
// edilebilir; key config.apiKey'den değil URL'den okunur (MapLibre stil URL'i
// tam adres bekler), bu yüzden burada key'i ekliyoruz.
const MAPTILER_STYLE_ID =
  process.env.NEXT_PUBLIC_MAPTILER_STYLE_ID ??
  "0198d3ad-e9df-70c5-89f9-7d40f1ac90f1"

export const MAPTILER_STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/style.json?key=${MAPTILER_KEY}`
  : ""

type MaptilerSdk = typeof import("@maptiler/sdk")

let sdkPromise: Promise<MaptilerSdk> | null = null

export function loadMaptiler(): Promise<MaptilerSdk> {
  if (!sdkPromise) {
    sdkPromise = import("@maptiler/sdk").then((sdk) => {
      sdk.config.apiKey = MAPTILER_KEY
      return sdk
    })
  }
  return sdkPromise
}

export type GeoFeature = {
  id: string
  label: string
  lat: number
  lng: number
}

/** Koordinat → okunabilir adres (pin hareket edince adres alanını doldurmak için). */
export async function reverseGeocode(
  lng: number,
  lat: number,
): Promise<string | null> {
  try {
    const sdk = await loadMaptiler()
    const res = await sdk.geocoding.reverse([lng, lat], {
      language: "tr",
      limit: 1,
    })
    return res.features[0]?.place_name ?? null
  } catch {
    return null
  }
}

/** Adres metni → konum adayları (arama kutusu önerileri). */
export async function forwardGeocode(query: string): Promise<GeoFeature[]> {
  const q = query.trim()
  if (q.length < 3) return []
  try {
    const sdk = await loadMaptiler()
    const res = await sdk.geocoding.forward(q, {
      language: "tr",
      country: ["tr"],
      limit: 5,
    })
    return res.features.map((f) => ({
      id: String(f.id ?? f.place_name),
      label: f.place_name ?? "",
      lng: f.center[0],
      lat: f.center[1],
    }))
  } catch {
    return []
  }
}
