import { MF_DEFAULT_LOCATION, type LocationContext } from "@/lib/marketfiyati/client"
import { getCurrentUser } from "./session"

/**
 * Giriş yapmış kullanıcının kayıtlı konumunu marketfiyati `LocationContext`'ine
 * çevirir. Konum yoksa env default'a düşer (graceful) — API patlamaz, sadece
 * fallback koordinatla çalışır. Client tarafı zaten `useRequireLocation` ile
 * konum set edilmeden konum-gerekli aksiyonları tetiklemez.
 */
export async function getUserLocationContext(): Promise<LocationContext> {
  const user = await getCurrentUser()
  if (!user?.location) return MF_DEFAULT_LOCATION
  return {
    latitude: user.location.lat,
    longitude: user.location.lng,
    distance: user.location.distance,
    depots: user.location.depotIds,
  }
}
