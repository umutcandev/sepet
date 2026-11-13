"use server"

import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth"
import { db, recordShares } from "@/lib/db"
import { generateShareToken } from "@/lib/data/conversation-shares"
import {
  buildRecordSnapshot,
  recordShareStatus,
} from "@/lib/data/record-shares"
import type { RecordShareKind } from "@/lib/records/record-data"
import { shareLimited as limited } from "@/lib/security/rate-limit"
import type {
  ShareInfo,
  ShareResult as Result,
  ShareStatus,
} from "@/lib/share/types"
import { isUuid } from "@/lib/utils"
import { logError } from "@/lib/ai/telemetry"

// Sepet/fiş paylaşım uçları; kurallar sohbetinkiyle aynı (bkz.
// conversation-shares). Limit bütçesi sohbetle ortak.

export type RecordShareTarget = { kind: RecordShareKind; recordId: string }

const targetSchema = z.object({
  kind: z.enum(["basket", "receipt"]),
  recordId: z.string().refine(isUuid),
})

const shareInputSchema = targetSchema.extend({
  anonymous: z.boolean(),
  hideImages: z.boolean().default(true),
})

const anonymousInputSchema = targetSchema.extend({ anonymous: z.boolean() })
const hideImagesInputSchema = targetSchema.extend({ hideImages: z.boolean() })

function targetColumn(kind: RecordShareKind) {
  return kind === "basket" ? recordShares.basketId : recordShares.receiptId
}

function ownedShare(kind: RecordShareKind, recordId: string, userId: string) {
  return and(
    eq(targetColumn(kind), recordId),
    eq(recordShares.kind, kind),
    eq(recordShares.userId, userId)
  )
}

/** Pencerenin arkadan tazelenmesi: paylaşım satırı ve ad; limitsiz, iki nokta sorgu. */
export async function getRecordShareStatus(
  input: RecordShareTarget
): Promise<Result<{ status: ShareStatus }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  const parsed = targetSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "not_found" }
  const { kind, recordId } = parsed.data
  return { ok: true, status: await recordShareStatus(kind, recordId, userId) }
}

/**
 * Kaydı "bağlantıya sahip herkes" ile paylaşır ya da var olan paylaşımın
 * kopyasını şimdiki hâliyle günceller; var olan paylaşımda token değişmez.
 * Bağlantı her kopyalanışında çağrılır; içerik aynıysa tarih ilerlemez.
 */
export async function shareRecord(
  input: RecordShareTarget & { anonymous: boolean; hideImages?: boolean }
): Promise<Result<{ share: ShareInfo; created: boolean }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  const parsed = shareInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "not_found" }
  const { kind, recordId, anonymous, hideImages } = parsed.data
  if (await limited(userId)) return { ok: false, error: "rate_limited" }

  const built = await buildRecordSnapshot(kind, recordId, userId)
  if (!built.ok) return { ok: false, error: built.error }
  const { title, data, contentHash, imageKey } = built.snapshot
  // Görselsiz kopyada tercih anlamsız; gizli saklanır (bkz. shareConversation).
  const storedHideImages = imageKey ? hideImages : true

  try {
    const now = new Date()
    const [row] = await db
      .insert(recordShares)
      .values({
        token: generateShareToken(),
        kind,
        basketId: kind === "basket" ? recordId : null,
        receiptId: kind === "receipt" ? recordId : null,
        userId,
        title,
        snapshot: data,
        contentHash,
        anonymous,
        imageKey,
        hideImages: storedHideImages,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: targetColumn(kind),
        set: {
          title,
          snapshot: data,
          contentHash,
          anonymous,
          imageKey,
          hideImages: storedHideImages,
          updatedAt: sql`CASE WHEN ${recordShares.contentHash} = excluded."contentHash" THEN ${recordShares.updatedAt} ELSE excluded."updatedAt" END`,
        },
        setWhere: eq(recordShares.userId, userId),
      })
      .returning({
        token: recordShares.token,
        anonymous: recordShares.anonymous,
        hideImages: recordShares.hideImages,
        created: sql<boolean>`(xmax = 0)`,
      })
    if (!row) return { ok: false, error: "not_found" }

    const { created, ...share } = row
    return { ok: true, created, share }
  } catch (err) {
    // Kopya alınırken kayıt silindiyse FK ihlali; ya da geçici DB hatası.
    logError("[shareRecord] failed", err)
    return { ok: false, error: "failed" }
  }
}

/** Var olan paylaşımda adın görünüp görünmeyeceği; anında geçerli. */
export async function setRecordShareAnonymous(
  input: RecordShareTarget & { anonymous: boolean }
): Promise<Result<{ anonymous: boolean }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  const parsed = anonymousInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "not_found" }
  const { kind, recordId, anonymous } = parsed.data
  if (await limited(userId)) return { ok: false, error: "rate_limited" }

  const rows = await db
    .update(recordShares)
    .set({ anonymous })
    .where(ownedShare(kind, recordId, userId))
    .returning({ anonymous: recordShares.anonymous })
  if (rows.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, anonymous: rows[0].anonymous }
}

/** Var olan paylaşımda fiş görselinin gösterilip gösterilmeyeceği; anında geçerli. */
export async function setRecordShareHideImages(
  input: RecordShareTarget & { hideImages: boolean }
): Promise<Result<{ hideImages: boolean }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  const parsed = hideImagesInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "not_found" }
  const { kind, recordId, hideImages } = parsed.data
  if (await limited(userId)) return { ok: false, error: "rate_limited" }

  const rows = await db
    .update(recordShares)
    .set({ hideImages })
    .where(ownedShare(kind, recordId, userId))
    .returning({ hideImages: recordShares.hideImages })
  if (rows.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, hideImages: rows[0].hideImages }
}

/**
 * Paylaşımı kapatır: satır silinir, bağlantı anında 404 olur. Hız limiti
 * yok: erişimi geri almak her zaman mümkün olmalı.
 */
export async function unshareRecord(
  input: RecordShareTarget
): Promise<Result<object>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  const parsed = targetSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "not_found" }
  const { kind, recordId } = parsed.data

  await db.delete(recordShares).where(ownedShare(kind, recordId, userId))
  return { ok: true }
}
