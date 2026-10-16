import "server-only"

import { and, eq } from "drizzle-orm"
import type { AdapterAccountType } from "next-auth/adapters"

import { db, users, accounts } from "@/lib/db"
import { redis } from "@/lib/redis"
import { createPendingLogin, PENDING_TTL_MS } from "@/lib/auth/pending-login"

// ─── Google'ın TOTP'li bir hesaba İLK bağlanışı ───
// Google, e-posta eşleşmesiyle mevcut hesaba otomatik bağlanır
// (allowDangerousEmailAccountLinking, bkz. auth.ts). 2FA yalnız şifreyle girişi
// korur; zaten bağlı bir Google hesabıyla giriş TOTP sormaz (bilinçli). Ama
// bağlantı kurulurken de sorulmasaydı, e-postası Google hesabı olan kullanıcının
// o hesabını ele geçiren TOTP'ye hiç takılmadan girerdi.
//
// Bu yüzden ilk bağlamada Auth.js bağlamadan ÖNCE durdurulur (signIn callback):
// pending_login + bekleyen bağlama kaydı yazılır, kullanıcı mevcut 2FA adımına
// gider (aynı deneme sınırı ve hız limitleri). Kod doğrulanınca hesap bağlanır;
// sonraki Google girişleri bağlı hesap olarak TOTP'siz devam eder.

type PendingLink = {
  u: string
  provider: string
  providerAccountId: string
  type: AdapterAccountType
}

const linkKey = (pendingId: string) => `oauth-link:${pendingId}`

/**
 * Bu OAuth hesabı henüz bağlı değilse ve aynı e-postalı mevcut hesapta TOTP
 * açıksa 2FA adımı için ham pending token döner; aksi halde null (giriş normal
 * sürer).
 */
export async function beginLinkTwoFactor(input: {
  email: string | null | undefined
  provider: string
  providerAccountId: string
  type: AdapterAccountType
}): Promise<string | null> {
  if (!input.email) return null

  const [linked] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId)
      )
    )
    .limit(1)
  if (linked) return null

  // Auth.js'in otomatik bağlamada kullandığı eşleşmenin aynısı (getUserByEmail;
  // e-posta küçük harfe çevrilmiş gelir).
  const [u] = await db
    .select({ id: users.id, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)
  if (!u?.totpEnabled) return null

  const pending = await createPendingLogin(u.id)
  await redis.set<PendingLink>(
    linkKey(pending.id),
    {
      u: u.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      type: input.type,
    },
    { ex: Math.ceil(PENDING_TTL_MS / 1000) }
  )
  return pending.token
}

/**
 * 2FA bu pending ile başarıyla tamamlandı: bekleyen bir bağlama varsa hesabı
 * bağla. Sağlayıcı token'ları saklanmaz (uygulama kullanmıyor); bağlantı yalnız
 * kimlik eşlemesi. Hesap bu arada başka kullanıcıya bağlandıysa dokunulmaz.
 */
export async function completeLinkTwoFactor(pendingId: string, userId: string) {
  const link = await redis.getdel<PendingLink>(linkKey(pendingId))
  if (!link || link.u !== userId) return
  await db
    .insert(accounts)
    .values({
      userId,
      type: link.type,
      provider: link.provider,
      providerAccountId: link.providerAccountId,
    })
    .onConflictDoNothing()
}
