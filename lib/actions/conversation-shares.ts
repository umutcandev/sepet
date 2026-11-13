"use server"

import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth"
import { db, conversationShares } from "@/lib/db"
import {
  buildShareSnapshot,
  generateShareToken,
  shareAuthorNameFor,
} from "@/lib/data/conversation-shares"
import { shareLimited as limited } from "@/lib/security/rate-limit"
import { isUuid } from "@/lib/utils"
import { logError } from "@/lib/ai/telemetry"
import type {
  ShareInfo,
  ShareResult as Result,
  ShareStatus,
} from "@/lib/share/types"

// Paylaşım uçları. Kimlik yalnızca oturumdan gelir; her sorgu `userId` ile
// kapsanır, yani başkasının sohbeti ne paylaşılabilir ne de paylaşımı
// görülebilir/kapatılabilir. Sahiplik hatası "not_found" döner (var olup
// olmadığı sızmasın).

const shareInputSchema = z.object({
  conversationId: z.string().refine(isUuid),
  anonymous: z.boolean(),
  hideImages: z.boolean().default(true),
})

const hideImagesInputSchema = z.object({
  conversationId: z.string().refine(isUuid),
  hideImages: z.boolean(),
})

function ownedShare(conversationId: string, userId: string) {
  return and(
    eq(conversationShares.conversationId, conversationId),
    eq(conversationShares.userId, userId)
  )
}

/** Pencerenin arkadan tazelenmesi: paylaşım satırı ve ad; limitsiz, iki nokta sorgu. */
export async function getConversationShareStatus(
  conversationId: string
): Promise<Result<{ status: ShareStatus }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  if (!isUuid(conversationId)) return { ok: false, error: "not_found" }

  const [[share], authorName] = await Promise.all([
    db
      .select({
        token: conversationShares.token,
        anonymous: conversationShares.anonymous,
        hideImages: conversationShares.hideImages,
      })
      .from(conversationShares)
      .where(ownedShare(conversationId, userId))
      .limit(1),
    shareAuthorNameFor(userId),
  ])
  return { ok: true, status: { authorName, share: share ?? null } }
}

/**
 * Sohbeti "bağlantıya sahip herkes" ile paylaşır ya da var olan paylaşımın
 * kopyasını şimdiki hâliyle günceller. Var olan paylaşımda token değişmez:
 * daha önce gönderilen bağlantı yeni kopyayı gösterir. Bağlantı her
 * kopyalanışında çağrılır; içerik aynıysa tarih ilerlemez.
 */
export async function shareConversation(input: {
  conversationId: string
  anonymous: boolean
  hideImages?: boolean
}): Promise<
  Result<{
    share: ShareInfo
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
          updatedAt: sql`CASE WHEN ${conversationShares.contentHash} = excluded."contentHash" THEN ${conversationShares.updatedAt} ELSE excluded."updatedAt" END`,
        },
        // Savunma: sohbet bu kullanıcının olduğu için paylaşımı da onundur;
        // yine de başkasının satırı asla ezilmesin.
        setWhere: eq(conversationShares.userId, userId),
      })
      .returning({
        token: conversationShares.token,
        anonymous: conversationShares.anonymous,
        hideImages: conversationShares.hideImages,
        // Postgres: INSERT edilen satırda xmax 0, ON CONFLICT ile
        // güncellenende değil. Pencere açıkken bağlantı başka yerden
        // (Ayarlar, başka sekme) kaldırıldıysa "güncellendi" demek yanlış olur.
        created: sql<boolean>`(xmax = 0)`,
      })
    if (!row) return { ok: false, error: "not_found" }

    const { created, ...share } = row
    return { ok: true, created, share }
  } catch (err) {
    // Kopya alınırken sohbet silindiyse FK ihlali; ya da geçici DB hatası.
    logError("[shareConversation] failed", err)
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
