"use server"

import { eq } from "drizzle-orm"

import { auth, signIn, signOut } from "@/auth"
import { db, userSessions } from "@/lib/db"
import { sanitizeCallback } from "@/lib/auth/callback"

export async function signOutAction() {
  // Bu cihazın oturum kaydını da kapat ki Aktif oturumlar listesinde "aktif"
  // görünmeye devam etmesin (menüden çıkış = bu cihazdan çıkış).
  const session = await auth()
  if (session?.sid) {
    try {
      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.id, session.sid))
    } catch {
      // Revoke başarısız olsa da çıkışı engelleme.
    }
  }
  await signOut({ redirectTo: "/" })
}

export async function signInWithGoogleAction(callbackUrl?: string) {
  const safe = sanitizeCallback(callbackUrl)
  await signIn("google", { redirectTo: safe })
}
