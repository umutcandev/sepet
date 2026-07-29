"use client"

import { OnboardingModal } from "@/components/onboarding/onboarding-modal"
import { useCurrentUser } from "@/components/providers/session-provider"

// Oturum artık kök layout'ta değil istemci tarafı SessionProvider'da yüklenir
// (paylaşımlı rotalar statik cache'lenebilsin diye); host da context'ten okur.
//
// LocationHost ile aynı kalıp: modal, kapı koşulu SAĞLANANA KADAR HİÇ MOUNT
// EDİLMEZ. Kapıyı prop olarak geçmek çalışmıyordu — `user` ilk render'da her
// zaman null (/api/me asenkron), modal o anda mount olup açık durumunu
// `useState` ile false'a kilitliyor ve oturum gelince bir daha açılmıyordu.
export function OnboardingHost() {
  const { user } = useCurrentUser()
  if (!user || user.onboardingCompletedAt !== null) return null
  return <OnboardingModal />
}
