import { cache } from "react"
import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db, users } from "@/lib/db"
import { getLinkedProvider } from "@/lib/auth/linked-provider"
import { type OAuthProviderId } from "@/lib/auth/providers"
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
  /** Görüntülenen avatar: customImage varsa o, yoksa sağlayıcı fotoğrafı. */
  avatar: string
  /** Sosyal sağlayıcıdan (Google/Facebook) gelen fotoğraf — özel avatar
   *  kaldırıldığında geri dönülecek görsel. */
  providerAvatar: string
  /** Kullanıcı özel bir avatar yüklemiş mi (avatar !== sağlayıcı fotoğrafı). */
  hasCustomAvatar: boolean
  /** Bağlı sosyal giriş sağlayıcısı; yalnız e-posta + şifre kullanıcısında null. */
  authProvider: OAuthProviderId | null
  onboardingCompletedAt: Date | null
  location: UserLocation | null
}

// E-posta ile kayıtta ad sorulmaz; adı olmayan kullanıcı için jenerik
// "Kullanıcı" yerine e-postanın yerel kısmından okunaklı bir ad türet
// (ahmet.yilmaz@… → "Ahmet Yilmaz"). Yerel kısım yoksa null.
export function displayNameFromEmail(email: string | null | undefined): string | null {
  const local = (email ?? "").split("@")[0]?.trim()
  if (!local) return null
  const name = local
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1))
    .join(" ")
  return name || null
}

// React `cache()` ile sarılı: tek bir RSC render'ında (layout + OnboardingHost +
// LocationHost) aynı argümanla yapılan çağrılar tek `auth()` + tek DB sorgusuna
// indirgenir. Cache request bazlıdır → istekler arası sızıntı yok.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth()
  if (!session?.user) return null

  // İki sorgu birbirinden bağımsız → seri beklemeyi önlemek için paralel.
  const [rows, authProvider] = await Promise.all([
    db
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
      .limit(1),
    getLinkedProvider(session.user.id),
  ])
  const row = rows[0]

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
  const providerAvatar = row?.image ?? session.user.image ?? ""
  const customImage = row?.customImage ?? null

  const email = session.user.email ?? ""

  return {
    id: session.user.id,
    name:
      row?.name ??
      session.user.name ??
      displayNameFromEmail(email) ??
      "Kullanıcı",
    email,
    avatar: customImage ?? providerAvatar,
    providerAvatar,
    hasCustomAvatar: customImage != null,
    authProvider,
    onboardingCompletedAt: row?.onboardingCompletedAt ?? null,
    location,
  }
})
