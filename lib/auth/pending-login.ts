import "server-only"

import { eq } from "drizzle-orm"

import { db, pendingLogin } from "@/lib/db"
import { generateToken, hashSecret } from "@/lib/auth/codes"

// 2FA ara durumu (şifre doğrulandı ya da Google TOTP'li bir hesaba ilk kez
// bağlanıyor, bkz. lib/auth/oauth-link.ts): ham token yalnız istemciye, DB'de
// yalnız HMAC. Tek aktif pending: öncekiler temizlenir. Deneme sınırı ve tek
// kullanım authorizeTwoFactor'da (auth.ts).
export const PENDING_TTL_MS = 5 * 60 * 1000

export async function createPendingLogin(
  userId: string
): Promise<{ id: string; token: string }> {
  const token = generateToken()
  await db.delete(pendingLogin).where(eq(pendingLogin.userId, userId))
  const [row] = await db
    .insert(pendingLogin)
    .values({
      userId,
      tokenHash: hashSecret(token),
      expiresAt: new Date(Date.now() + PENDING_TTL_MS),
    })
    .returning({ id: pendingLogin.id })
  return { id: row.id, token }
}
