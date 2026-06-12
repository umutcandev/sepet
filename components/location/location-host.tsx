import { LocationModal } from "@/components/location/location-modal"
import { getCurrentUser } from "@/lib/auth/session"

/**
 * OnboardingHost ile aynı kalıp: girişsiz kullanıcı için modalı hiç mount etme.
 * Modal başlangıç değerini SessionProvider context'inden (useUserLocation) okur,
 * açık durumunu locationDialog store'undan alır (tembel kapı).
 */
export async function LocationHost() {
  const user = await getCurrentUser()
  if (!user) return null
  return <LocationModal />
}
