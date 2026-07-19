"use client"

import { LocationModal } from "@/components/location/location-modal"
import { useCurrentUser } from "@/components/providers/session-provider"

/**
 * OnboardingHost ile aynı kalıp: girişsiz kullanıcı için modalı hiç mount etme.
 * Modal başlangıç değerini SessionProvider context'inden (useUserLocation) okur,
 * açık durumunu locationDialog store'undan alır (tembel kapı).
 *
 * Oturum artık kök layout'ta değil istemci tarafı SessionProvider'da yüklenir
 * (paylaşımlı rotalar statik cache'lenebilsin diye); bu yüzden host da
 * context'ten okuyan bir istemci bileşenidir.
 */
export function LocationHost() {
  const { user } = useCurrentUser()
  if (!user) return null
  return <LocationModal />
}
