"use server"

import { and, desc, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth"
import { db, conversationShares, users } from "@/lib/db"
import {
  buildShareSnapshot,
  generateShareToken,
  shareAuthorName,
} from "@/lib/data/conversation-shares"
import { shareActionLimiter, shareReadLimiter } from "@/lib/security/rate-limit"
import { isUuid } from "@/lib/utils"

// Paylaşım uçları. Kimlik yalnızca oturumdan gelir; her sorgu `userId` ile
// kapsanır, yani başkasının sohbeti ne paylaşılabilir ne de paylaşımı
// görülebilir/kapatılabilir. Sahiplik hatası "not_found" döner (var olup
// olmadığı sızmasın).

export type ConversationShareInfo = {
  token: string
  anonymous: boolean
  /** Görseller paylaşılan sayfada gizli mi. */
  hideImages: boolean
  /** Kopyanın alındığı an (ISO). */
  sharedAt: string
  /** Sohbet kopyadan sonra değişti mi (yeni mesaj, yeniden adlandırma, ürün değiştirme). */
  stale: boolean
}

export type ConversationShareState = {
  /** Anonim olmayan paylaşımda sayfada görünecek ad (pencere önizler). */
  authorName: string | null
  /** Sohbette paylaşılabilecek görsel var mı ("Resimleri gizle" yalnız o zaman). */
  hasImages: boolean
  share: ConversationShareInfo | null
}

export type ShareActionError =
  | "unauthorized"
  | "not_found"
  | "empty"
  | "too_large"
  | "rate_limited"
  | "failed"

type Result<T> = ({ ok: true } & T) | { ok: false; error: ShareActionError }

const shareInputSchema = z.object({
  conversationId: z.string().refine(isUuid),
  anonymous: z.boolean(),
  hideImages: z.boolean().default(true),
})

const hideImagesInputSchema = z.object({
  conversationId: z.string().refine(isUuid),
  hideImages: z.boolean(),
})

async function authorNameFor(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return shareAuthorName(row?.name)
}

async function limited(
  userId: string,
  limiter = shareActionLimiter
): Promise<boolean> {
  const { success } = await limiter.limit(`user:${userId}`)
  return !success
}

/** Paylaşım penceresinin açılışı: sohbet paylaşılmış mı, kopya güncel mi. */
export async function getConversationShareState(
  conversationId: string
): Promise<Result<{ state: ConversationShareState }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  if (!isUuid(conversationId)) return { ok: false, error: "not_found" }
  if (await limited(userId, shareReadLimiter)) {
    return { ok: false, error: "rate_limited" }
  }

  const [[share], authorName] = await Promise.all([
    db
      .select({
        token: conversationShares.token,
        anonymous: conversationShares.anonymous,
        hideImages: conversationShares.hideImages,
        images: conversationShares.images,
        updatedAt: conversationShares.updatedAt,
        contentHash: conversationShares.contentHash,
      })
      .from(conversationShares)
      .where(
        and(
          eq(conversationShares.conversationId, conversationId),
          eq(conversationShares.userId, userId)
        )
      )
      .limit(1),
    authorNameFor(userId),
  ])

  // Sohbetin şimdiki hâli: bu kullanıcının mı (değilse pencere "paylaş"
  // sunmasın), görsel var mı, paylaşılmışsa kopya güncel mi.
  const current = await buildShareSnapshot(conversationId, userId)
  if (!current.ok && current.error === "not_found") {
    return { ok: false, error: "not_found" }
  }
  const hasImages = current.ok && current.snapshot.images.length > 0

  if (!share) {
    return { ok: true, state: { authorName, hasImages, share: null } }
  }

  return {
    ok: true,
    state: {
      authorName,
      hasImages,
      share: {
        token: share.token,
        anonymous: share.anonymous,
        hideImages: share.hideImages,
        sharedAt: share.updatedAt.toISOString(),
        // Görsel numaraları gelmeden önce alınmış kopyada görsel listesi boş;
        // sohbet değişmemiş olsa da güncellenmeden görseller gösterilemez.
        stale:
          current.ok &&
          (current.snapshot.contentHash !== share.contentHash ||
            (hasImages && share.images.length === 0)),
      },
    },
  }
}

/**
 * Sohbeti "bağlantıya sahip herkes" ile paylaşır ya da var olan paylaşımın
 * kopyasını şimdiki hâliyle günceller. Var olan paylaşımda token değişmez:
 * daha önce gönderilen bağlantı yeni kopyayı gösterir.
 */
export async function shareConversation(input: {
  conversationId: string
  anonymous: boolean
  hideImages?: boolean
}): Promise<
  Result<{
    state: ConversationShareState
    /** Yeni bağlantı mı üretildi (yoksa var olanın kopyası mı güncellendi). */
    created: boolean
  }>
> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  const parsed = shareInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "not_found" }
  const { conversationId, anonymous, hideImages } = parsed.data
  if (await limited(userId)) return { ok: false, error: "rate_limited" }

  const built = await buildShareSnapshot(conversationId, userId)
  if (!built.ok) return { ok: false, error: built.error }
  const { title, messages, contentHash, images } = built.snapshot
  // Görseli olmayan kopyada tercih anlamsız; gizli saklanır ki sohbete sonradan
  // eklenen görsel, sahibi pencerede görmeden açılmasın.
  const storedHideImages = images.length > 0 ? hideImages : true

  try {
    const now = new Date()
    const [row] = await db
      .insert(conversationShares)
      .values({
        token: generateShareToken(),
        conversationId,
        userId,
        title,
        messages,
        contentHash,
        anonymous,
        images,
        hideImages: storedHideImages,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: conversationShares.conversationId,
        set: {
          title,
          messages,
          contentHash,
          anonymous,
          images,
          hideImages: storedHideImages,
          updatedAt: now,
        },
        // Savunma: sohbet bu kullanıcının olduğu için paylaşımı da onundur;
        // yine de başkasının satırı asla ezilmesin.
        setWhere: eq(conversationShares.userId, userId),
      })
      .returning({
        token: conversationShares.token,
        anonymous: conversationShares.anonymous,
        hideImages: conversationShares.hideImages,
        updatedAt: conversationShares.updatedAt,
        // Postgres: INSERT edilen satırda xmax 0, ON CONFLICT ile
        // güncellenende değil. Pencere açıkken bağlantı başka yerden
        // (Ayarlar, başka sekme) kaldırıldıysa "güncellendi" demek yanlış olur.
        created: sql<boolean>`(xmax = 0)`,
      })
    if (!row) return { ok: false, error: "not_found" }

    return {
      ok: true,
      created: row.created,
      state: {
        authorName: await authorNameFor(userId),
        hasImages: images.length > 0,
        share: {
          token: row.token,
          anonymous: row.anonymous,
          hideImages: row.hideImages,
          sharedAt: row.updatedAt.toISOString(),
          stale: false,
        },
      },
    }
  } catch (err) {
    // Kopya alınırken sohbet silindiyse FK ihlali; ya da geçici DB hatası.
    console.error("[shareConversation] failed", err)
    return { ok: false, error: "failed" }
  }
}

/**
 * Var olan paylaşımda adın görünüp görünmeyeceği. Kopyaya dokunmaz: ad
 * okurken kullanıcı satırından geldiği için değişiklik bağlantıda anında
 * geçerli olur.
 */
export async function setConversationShareAnonymous(input: {
  conversationId: string
  anonymous: boolean
}): Promise<Result<{ anonymous: boolean }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  const parsed = shareInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "not_found" }
  const { conversationId, anonymous } = parsed.data
  if (await limited(userId)) return { ok: false, error: "rate_limited" }

  const rows = await db
    .update(conversationShares)
    .set({ anonymous })
    .where(
      and(
        eq(conversationShares.conversationId, conversationId),
        eq(conversationShares.userId, userId)
      )
    )
    .returning({ anonymous: conversationShares.anonymous })
  if (rows.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, anonymous: rows[0].anonymous }
}

/**
 * Var olan paylaşımda görsellerin gösterilip gösterilmeyeceği. Kopyaya
 * dokunmaz: görsel numaraları kopyada hep durur, bu bayrak yalnız sayfanın
 * ve görsel ucunun onları verip vermeyeceğini belirler; değişiklik anında
 * geçerli olur.
 */
export async function setConversationShareHideImages(input: {
  conversationId: string
  hideImages: boolean
}): Promise<Result<{ hideImages: boolean }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  const parsed = hideImagesInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "not_found" }
  const { conversationId, hideImages } = parsed.data
  if (await limited(userId)) return { ok: false, error: "rate_limited" }

  const rows = await db
    .update(conversationShares)
    .set({ hideImages })
    .where(
      and(
        eq(conversationShares.conversationId, conversationId),
        eq(conversationShares.userId, userId)
      )
    )
    .returning({ hideImages: conversationShares.hideImages })
  if (rows.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, hideImages: rows[0].hideImages }
}

/**
 * Paylaşımı kapatır: satır silinir, bağlantı anında 404 olur. Tekrar
 * paylaşılırsa yeni bir bağlantı üretilir; eskisi bir daha açılmaz.
 * Hız limiti yok: erişimi geri almak her zaman mümkün olmalı.
 */
export async function unshareConversation(
  conversationId: string
): Promise<Result<object>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  if (!isUuid(conversationId)) return { ok: false, error: "not_found" }

  await db
    .delete(conversationShares)
    .where(
      and(
        eq(conversationShares.conversationId, conversationId),
        eq(conversationShares.userId, userId)
      )
    )
  // Zaten paylaşılmamışsa da sonuç aynı: bağlantı yok.
  return { ok: true }
}

export type SharedLinkItem = {
  conversationId: string
  title: string
  token: string
  anonymous: boolean
  sharedAt: string
}

/** Ayarlar → Paylaşılan bağlantılar. */
export async function listConversationShares(): Promise<SharedLinkItem[]> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return []

  const rows = await db
    .select({
      conversationId: conversationShares.conversationId,
      title: conversationShares.title,
      token: conversationShares.token,
      anonymous: conversationShares.anonymous,
      updatedAt: conversationShares.updatedAt,
    })
    .from(conversationShares)
    .where(eq(conversationShares.userId, userId))
    .orderBy(desc(conversationShares.updatedAt))
    .limit(200)

  return rows.map((r) => ({
    conversationId: r.conversationId,
    title: r.title,
    token: r.token,
    anonymous: r.anonymous,
    sharedAt: r.updatedAt.toISOString(),
  }))
}

/** Tüm paylaşımları kapatır. Silinen bağlantı sayısını döner. */
export async function unshareAllConversations(): Promise<
  Result<{ deleted: number }>
> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }

  const rows = await db
    .delete(conversationShares)
    .where(eq(conversationShares.userId, userId))
    .returning({ id: conversationShares.id })
  return { ok: true, deleted: rows.length }
}
