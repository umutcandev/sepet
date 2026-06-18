import { headers } from "next/headers"

// Aktif oturumlar paneli için istek bağlamından okunan cihaz/konum bilgisi.
// Bağımlılık eklemeden user-agent'tan kaba bir "tarayıcı · işletim sistemi"
// etiketi ve (Vercel ardında) IP geo başlıklarından konum etiketi üretir.
export type RequestDeviceInfo = {
  userAgent: string | null
  ip: string | null
  deviceLabel: string | null
  locationLabel: string | null
}

function detectBrowser(ua: string): string | null {
  if (/Edg\//.test(ua)) return "Edge"
  if (/OPR\/|Opera/.test(ua)) return "Opera"
  if (/SamsungBrowser\//.test(ua)) return "Samsung Internet"
  if (/Firefox\//.test(ua)) return "Firefox"
  if (/Chrome\//.test(ua)) return "Chrome"
  if (/Safari\//.test(ua)) return "Safari"
  return null
}

function detectOS(ua: string): string | null {
  if (/Windows NT/.test(ua)) return "Windows"
  if (/Android/.test(ua)) return "Android"
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS"
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS"
  if (/Linux/.test(ua)) return "Linux"
  return null
}

export function parseDeviceLabel(ua: string | null | undefined): string | null {
  if (!ua) return null
  const parts = [detectBrowser(ua), detectOS(ua)].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : null
}

function safeDecode(value: string | null): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function formatLocation(
  city: string | null,
  country: string | null,
): string | null {
  const c = safeDecode(city)?.trim() || null
  const co = country?.trim().toUpperCase() || null
  if (c && co) return `${c}, ${co}`
  return c ?? co ?? null
}

/**
 * Geçerli isteğin başlıklarından cihaz/konum bilgisini okur. NextAuth jwt
 * callback'i (node runtime) içinde ilk girişte çağrılır. Başlıklar okunamazsa
 * tüm alanlar null döner — giriş yine de tamamlanır.
 */
export async function readRequestDeviceInfo(): Promise<RequestDeviceInfo> {
  try {
    const h = await headers()
    const ua = h.get("user-agent")
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null
    const locationLabel = formatLocation(
      h.get("x-vercel-ip-city"),
      h.get("x-vercel-ip-country"),
    )
    return {
      userAgent: ua ?? null,
      ip,
      deviceLabel: parseDeviceLabel(ua),
      locationLabel,
    }
  } catch {
    return { userAgent: null, ip: null, deviceLabel: null, locationLabel: null }
  }
}
