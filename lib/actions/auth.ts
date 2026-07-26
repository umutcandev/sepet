"use server"

import { eq } from "drizzle-orm"

import { auth, signIn, signOut } from "@/auth"
import { db, userSessions } from "@/lib/db"
import { sanitizeCallback } from "@/lib/auth/callback"

export async function signOutAction() {
  // Bu cihazın oturum kaydını da kapat ki Aktif oturumlar listesinde "aktif"
  // görünmeye devam etmesin (menüden çıkış = bu cihazdan çıkış). auth() okuması
  // ya da revoke patlasa bile ASIL iş olan cookie silmeyi engelleme.
  try {
    const session = await auth()
    if (session?.sid) {
      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.id, session.sid))
    }
  } catch {
    // Yut: oturum kaydı revoke edilemese de cookie silme aşağıda çalışmalı.
  }
  // redirect: false → httpOnly session cookie'sini siler ama NEXT_REDIRECT
  // FIRLATMAZ. Böylece çağıran bu action'ı gerçekten await'leyebilir; cookie
  // silme başarısız olursa hata client'a ulaşır (sessizce yutulmaz) ve
  // navigasyonu client kendi yapar (deterministik çıkış).
  await signOut({ redirect: false })
}

export async function signInWithGoogleAction(callbackUrl?: string) {
  const safe = sanitizeCallback(callbackUrl)
  await signIn("google", { redirectTo: safe })
}

// Sağlayıcı id'si parametre DEĞİL: server action'lar dışarıdan çağrılabilir
// uçlardır, her sağlayıcı için ayrı action tutmak allowlist derdini tamamen
// ortadan kaldırır.
export async function signInWithFacebookAction(callbackUrl?: string) {
  const safe = sanitizeCallback(callbackUrl)
  await signIn("facebook", { redirectTo: safe })
}
