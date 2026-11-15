"use client"

// Reverse geocode sunucu üzerinden (/api/location/reverse → Nominatim): IP'n
// OpenStreetMap'e gitmez. Pin oturunca debounce'lu tek istek atılır.

/** Koordinat → okunabilir adres ("İlçe, İl"). Hata/iptal durumunda null (sessiz). */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`, {
      signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { label?: string | null }
    return data.label ?? null
  } catch {
    return null
  }
}
