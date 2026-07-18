"use client"

import { OnboardingModal } from "@/components/onboarding/onboarding-modal"
import { useCurrentUser } from "@/components/providers/session-provider"

// Oturum artık kök layout'ta değil istemci tarafı SessionProvider'da yüklenir
// (paylaşımlı rotalar statik cache'lenebilsin diye); host da context'ten okur.
export function OnboardingHost() {
  const { user } = useCurrentUser()
  const enabled = Boolean(user && user.onboardingCompletedAt === null)
  return <OnboardingModal enabled={enabled} />
}
