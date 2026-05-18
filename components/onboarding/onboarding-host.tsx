import { OnboardingModal } from "@/components/onboarding/onboarding-modal"
import { getCurrentUser } from "@/lib/auth/session"

export async function OnboardingHost() {
  const user = await getCurrentUser()
  const enabled = Boolean(user && user.onboardingCompletedAt === null)
  return <OnboardingModal enabled={enabled} />
}
