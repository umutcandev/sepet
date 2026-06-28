"use client"

// Nominatim (OpenStreetMap) reverse geocode — ücretsiz, API anahtarı YOK.
// Public instance kuralı: saniyede en fazla 1 istek, sistematik/grid sorgu yasak.
// Bizde yalnız pin oturunca (sürükle/tıkla/konum) debounce'lu TEK istek atılır →
// kurala uygun. Tarayıcı Referer'ı otomatik gönderir (kimlik şartı). Türkçe label
// için accept-language=tr. Attribution haritada zaten gösteriliyor.

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

/** Koordinat → okunabilir adres. Hata/iptal durumunda null (sessiz). */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
      `&lat=${lat}&lon=${lng}&zoom=14&accept-language=tr`
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    const data = (await res.json()) as NominatimReverse
    return formatLabel(data)
  } catch {
    return null
  }
}
