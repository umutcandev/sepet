"use server"

import { eq } from "drizzle-orm"

import { auth, signIn, signOut } from "@/auth"
import { db, userSessions } from "@/lib/db"

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

const ALLOWED_CALLBACK_PREFIXES = ["/"]

function sanitizeCallback(callbackUrl: string | undefined | null): string {
  if (!callbackUrl) return "/"
  // Only allow same-origin relative paths starting with "/"
  if (typeof callbackUrl !== "string") return "/"
  if (!callbackUrl.startsWith("/")) return "/"
  if (callbackUrl.startsWith("//")) return "/"
  if (!ALLOWED_CALLBACK_PREFIXES.some((p) => callbackUrl.startsWith(p))) {
    return "/"
  }
  return callbackUrl
}

export async function signInWithGoogleAction(callbackUrl?: string) {
  const safe = sanitizeCallback(callbackUrl)
  await signIn("google", { redirectTo: safe })
}
