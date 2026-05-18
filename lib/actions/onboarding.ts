"use server"

import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db, users } from "@/lib/db"

export async function completeOnboarding(): Promise<{ ok: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false }

  await db
    .update(users)
    .set({ onboardingCompletedAt: new Date() })
    .where(eq(users.id, session.user.id))

  return { ok: true }
}
