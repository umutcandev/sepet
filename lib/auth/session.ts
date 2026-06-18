import { cache } from "react"
import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db, users } from "@/lib/db"
import { MF_DEFAULT_COORDS } from "@/lib/marketfiyati/client"

export type UserLocation = {
  lat: number
  lng: number
  distance: number
  label: string | null
  depotIds: string[]
  updatedAt: Date | null
}

export type CurrentUser = {
  id: string
  name: string
  email: string
  /** Görüntülenen avatar: customImage varsa o, yoksa Google fotoğrafı. */
  avatar: string
  /** Google sağlayıcı fotoğrafı — "Google'a dön" sonrası gösterilecek görsel. */
  googleAvatar: string
  /** Kullanıcı özel bir avatar yüklemiş mi (avatar !== Google fotoğrafı). */
  hasCustomAvatar: boolean
  onboardingCompletedAt: Date | null
  location: UserLocation | null
}

// React `cache()` ile sarılı: tek bir RSC render'ında (layout + OnboardingHost +
// LocationHost) aynı argümanla yapılan çağrılar tek `auth()` + tek DB sorgusuna
// indirgenir. Cache request bazlıdır → istekler arası sızıntı yok.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth()
  if (!session?.user) return null

  const [row] = await db
    .select({
      name: users.name,
      image: users.image,
      customImage: users.customImage,
      onboardingCompletedAt: users.onboardingCompletedAt,
      locationLat: users.locationLat,
      locationLng: users.locationLng,
      locationDistance: users.locationDistance,
      locationLabel: users.locationLabel,
      selectedDepotIds: users.selectedDepotIds,
      locationUpdatedAt: users.locationUpdatedAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  // numeric kolonlar Drizzle'da string döner → Number'a çevir. lat/lng dolu
  // değilse konum yok say.
  const location: UserLocation | null =
    row?.locationLat != null && row?.locationLng != null
      ? {
          lat: Number(row.locationLat),
          lng: Number(row.locationLng),
          distance: row.locationDistance ?? MF_DEFAULT_COORDS.distance,
          label: row.locationLabel ?? null,
          depotIds: row.selectedDepotIds ?? [],
          updatedAt: row.locationUpdatedAt ?? null,
        }
      : null

  // Ad/avatar düzenlemelerinin otoriter olması için DB'yi esas al; satır
  // bulunamazsa session (JWT) değerlerine düş.
  const googleAvatar = row?.image ?? session.user.image ?? ""
  const customImage = row?.customImage ?? null

  return {
    id: session.user.id,
    name: row?.name ?? session.user.name ?? "Kullanıcı",
    email: session.user.email ?? "",
    avatar: customImage ?? googleAvatar,
    googleAvatar,
    hasCustomAvatar: customImage != null,
    onboardingCompletedAt: row?.onboardingCompletedAt ?? null,
    location,
  }
})
