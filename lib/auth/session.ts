import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db, users } from "@/lib/db"

export type CurrentUser = {
  id: string
  name: string
  email: string
  avatar: string
  onboardingCompletedAt: Date | null
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth()
  if (!session?.user) return null

  const [row] = await db
    .select({ onboardingCompletedAt: users.onboardingCompletedAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  return {
    id: session.user.id,
    name: session.user.name ?? "Kullanıcı",
    email: session.user.email ?? "",
    avatar: session.user.image ?? "",
    onboardingCompletedAt: row?.onboardingCompletedAt ?? null,
  }
}
