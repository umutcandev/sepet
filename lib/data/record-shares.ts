import "server-only"
import { createHash } from "node:crypto"
import { cache } from "react"
import { and, asc, eq, isNull } from "drizzle-orm"

import {
  db,
  baskets,
  basketItems,
  receipts,
  receiptItems,
  recordShares,
  users,
} from "@/lib/db"
import {
  isShareToken,
  shareAuthorName,
  shareAuthorNameFor,
} from "@/lib/data/conversation-shares"
import type { ShareStatus } from "@/lib/share/types"
import { withResolvedItemImages } from "@/lib/data/item-images"
import { sanitizeShareTitle } from "@/lib/assistant/share-snapshot"
import {
  basketRecordData,
  receiptRecordData,
  receiptTitle,
  type BasketRecordData,
  type ReceiptRecordData,
  type RecordShareKind,
} from "@/lib/records/record-data"
import {
  RECORD_SNAPSHOT_MAX_BYTES,
  publicRecordTitle,
  sanitizeSharedBasket,
  sanitizeSharedReceipt,
  sanitizeSharedRecord,
} from "@/lib/records/share-snapshot"
import { isOwnedReceiptKey } from "@/lib/storage/r2"

// Server-only: kimliği doğrulanmış userId alır (bkz. conversation-shares).

export const RECORD_TITLE_FALLBACK: Record<RecordShareKind, string> = {
  basket: "Paylaşılan sepet",
  receipt: "Paylaşılan fiş",
}

type RecordData = BasketRecordData | ReceiptRecordData

/**
 * Görünen verinin özeti. Görsellerin adresi değil varlığı sayılır: sonradan
 * dolan görsel "güncelle" önerir, adres değişimi önermez.
 */
function recordHash(title: string, data: RecordData): string {
  const { itemImages, ...rest } = data
  const items = rest.items.map((it) =>
    "matchedImageUrl" in it
      ? { ...it, matchedImageUrl: !!it.matchedImageUrl }
      : it
  )
  return createHash("sha256")
    .update(
      JSON.stringify({
        title,
        ...rest,
        items,
        images: Object.keys(itemImages).sort(),
      })
    )
    .digest("hex")
}

export type RecordSnapshot = {
  title: string
  data: RecordData
  contentHash: string
  /** Fiş görselinin R2 anahtarı; yalnız sunucuda. */
  imageKey: string | null
}

export type RecordSnapshotResult =
  | { ok: true; snapshot: RecordSnapshot }
  | {
      ok: false
      error: "not_found" | "empty" | "too_large" | "unsupported"
    }

async function loadBasket(id: string, userId: string) {
  const [[basket], rows] = await Promise.all([
    db
      .select()
      .from(baskets)
      .where(and(eq(baskets.id, id), eq(baskets.userId, userId)))
      .limit(1),
    db
      .select()
      .from(basketItems)
      .where(eq(basketItems.basketId, id))
      .orderBy(asc(basketItems.sortIndex), asc(basketItems.rawName)),
  ])
  if (!basket) return null
  const items = await withResolvedItemImages(rows, "basket", userId)
  return {
    title: basket.name,
    data: basketRecordData(basket, items),
    imageKey: null,
  }
}

async function loadReceipt(id: string, userId: string) {
  const [[receipt], rows] = await Promise.all([
    db
      .select()
      .from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
      .limit(1),
    db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, id))
      .orderBy(asc(receiptItems.sortIndex), asc(receiptItems.rawName)),
  ])
  if (!receipt) return null
  const items = await withResolvedItemImages(rows, "receipt", userId)
  return {
    title: receiptTitle(receipt),
    data: receiptRecordData(receipt, items),
    // Anahtar istemciden kaydedilmiş olabilir: yalnız sahibinin klasöründeyse.
    imageKey: isOwnedReceiptKey(receipt.imageR2Key, userId)
      ? receipt.imageR2Key
      : null,
  }
}

/** Paylaşım penceresinin hızlı açılış durumu; detay sayfası ve action ortak. */
export async function recordShareStatus(
  kind: RecordShareKind,
  recordId: string,
  userId: string
): Promise<ShareStatus> {
  const target =
    kind === "basket" ? recordShares.basketId : recordShares.receiptId
  const [[share], authorName] = await Promise.all([
    db
      .select({
        token: recordShares.token,
        anonymous: recordShares.anonymous,
        hideImages: recordShares.hideImages,
      })
      .from(recordShares)
      .where(
        and(
          eq(target, recordId),
          eq(recordShares.kind, kind),
          eq(recordShares.userId, userId)
        )
      )
      .limit(1),
    shareAuthorNameFor(userId),
  ])
  return { authorName, share: share ?? null }
}

/** Bu kullanıcının kaydının şu anki hâlinden paylaşılabilir kopya. */
export async function buildRecordSnapshot(
  kind: RecordShareKind,
  recordId: string,
  userId: string
): Promise<RecordSnapshotResult> {
  const loaded =
    kind === "basket"
      ? await loadBasket(recordId, userId)
      : await loadReceipt(recordId, userId)
  if (!loaded) return { ok: false, error: "not_found" }
  if (loaded.data.items.length === 0) return { ok: false, error: "empty" }

  const data = sanitizeSharedRecord(kind, loaded.data)
  if (!data) return { ok: false, error: "unsupported" }
  if (
    Buffer.byteLength(JSON.stringify(data), "utf8") > RECORD_SNAPSHOT_MAX_BYTES
  ) {
    return { ok: false, error: "too_large" }
  }
  return {
    ok: true,
    snapshot: {
      title: sanitizeShareTitle(
        publicRecordTitle(loaded.title),
        RECORD_TITLE_FALLBACK[kind]
      ),
      data,
      contentHash: recordHash(loaded.title, loaded.data),
      imageKey: loaded.imageKey,
    },
  }
}

type SharedRecordBase = {
  title: string
  /** null → anonim paylaşım (ya da adı hiç olmayan hesap). */
  authorName: string | null
  sharedAt: Date
  /** Yalnızca sahibine "kayda dön" bağlantısı göstermek için. */
  ownerId: string
  recordId: string
}

export type SharedBasketView = SharedRecordBase & { data: BasketRecordData }
export type SharedReceiptView = SharedRecordBase & {
  data: ReceiptRecordData
  /** Fiş görseli gösterilebilir mi (var ve sahibi gizlemedi). */
  showImage: boolean
}

/**
 * Herkese açık okuma: token → satır, oturum gerektirmez. Arşivlenmiş hesabın
 * paylaşımı görünmez; tür URL'den gelir (sepet token'ı fiş sayfasında açılmaz).
 */
async function sharedRow(kind: RecordShareKind, token: string) {
  if (!isShareToken(token)) return null
  const [row] = await db
    .select({
      title: recordShares.title,
      snapshot: recordShares.snapshot,
      anonymous: recordShares.anonymous,
      hideImages: recordShares.hideImages,
      imageKey: recordShares.imageKey,
      updatedAt: recordShares.updatedAt,
      userId: recordShares.userId,
      basketId: recordShares.basketId,
      receiptId: recordShares.receiptId,
      name: users.name,
    })
    .from(recordShares)
    .innerJoin(
      users,
      and(eq(users.id, recordShares.userId), isNull(users.archivedAt))
    )
    .where(and(eq(recordShares.token, token), eq(recordShares.kind, kind)))
    .limit(1)
  return row ?? null
}

function baseView(
  row: NonNullable<Awaited<ReturnType<typeof sharedRow>>>,
  kind: RecordShareKind
): SharedRecordBase | null {
  const recordId = kind === "basket" ? row.basketId : row.receiptId
  if (!recordId) return null
  return {
    title: sanitizeShareTitle(row.title, RECORD_TITLE_FALLBACK[kind]),
    authorName: row.anonymous ? null : shareAuthorName(row.name),
    sharedAt: row.updatedAt,
    ownerId: row.userId,
    recordId,
  }
}

/** `cache`: generateMetadata ile sayfa aynı istekte tek sorgu yapar. */
export const getSharedBasket = cache(
  async (token: string): Promise<SharedBasketView | null> => {
    const row = await sharedRow("basket", token)
    if (!row) return null
    const base = baseView(row, "basket")
    const data = sanitizeSharedBasket(row.snapshot)
    return base && data ? { ...base, data } : null
  }
)

export const getSharedReceipt = cache(
  async (token: string): Promise<SharedReceiptView | null> => {
    const row = await sharedRow("receipt", token)
    if (!row) return null
    const base = baseView(row, "receipt")
    const data = sanitizeSharedReceipt(row.snapshot)
    if (!base || !data) return null
    return {
      ...base,
      data,
      showImage:
        !row.hideImages &&
        !!row.imageKey &&
        isOwnedReceiptKey(row.imageKey, row.userId),
    }
  }
)

/** Paylaşılan fişin görsel anahtarı; gösterilemiyorsa null (çağıran 404). */
export async function getSharedReceiptImageKey(
  token: string
): Promise<string | null> {
  if (!isShareToken(token)) return null
  const [row] = await db
    .select({
      imageKey: recordShares.imageKey,
      hideImages: recordShares.hideImages,
      userId: recordShares.userId,
    })
    .from(recordShares)
    .innerJoin(
      users,
      and(eq(users.id, recordShares.userId), isNull(users.archivedAt))
    )
    .where(
      and(eq(recordShares.token, token), eq(recordShares.kind, "receipt"))
    )
    .limit(1)
  if (!row || row.hideImages || !row.imageKey) return null
  return isOwnedReceiptKey(row.imageKey, row.userId) ? row.imageKey : null
}
