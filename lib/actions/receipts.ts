"use server"

import { revalidatePath } from "next/cache"
import { and, asc, count, desc, eq, exists, ilike, inArray, or, sql } from "drizzle-orm"
import { auth } from "@/auth"
import { db, receipts, receiptItems } from "@/lib/db"
import { deleteReceiptObject, isOwnedReceiptKey } from "@/lib/storage/r2"
import { escapeLike, isUuid } from "@/lib/utils"
import { getUserPlan } from "@/lib/usage/usage"
import { planLimit } from "@/lib/usage/limits"
import { type ReceiptSort, DEFAULT_RECEIPT_SORT } from "@/lib/receipt-sort"
import type {
  MatchResult,
  OptimizationSummary,
  ReceiptComparison,
  ReceiptOCRItem,
} from "@/lib/ai/schemas"

const RECEIPTS_PAGE_SIZE = 20
const BULK_DELETE_CHUNK = 100

// Liste satırı için gereken alanlar (tablo + arama + infinite scroll ortak tipi).
export type ReceiptListItem = {
  id: string
  marketName: string | null
  purchaseDate: Date | null
  createdAt: Date
  totalAmount: string | null
  bestSingleMarket: string | null
  bestSingleTotal: string | null
  potentialSavingsTL: string | null
}

const receiptListColumns = {
  id: receipts.id,
  marketName: receipts.marketName,
  purchaseDate: receipts.purchaseDate,
  createdAt: receipts.createdAt,
  totalAmount: receipts.totalAmount,
  bestSingleMarket: receipts.bestSingleMarket,
  bestSingleTotal: receipts.bestSingleTotal,
  potentialSavingsTL: receipts.potentialSavingsTL,
} as const

function orderByForReceiptSort(sort: ReceiptSort) {
  const lowerMarket = sql`lower(${receipts.marketName})`
  switch (sort) {
    case "date_asc":
      return [asc(receipts.createdAt), asc(receipts.id)]
    case "market_asc":
      return [asc(lowerMarket), asc(receipts.id)]
    case "market_desc":
      return [desc(lowerMarket), asc(receipts.id)]
    case "date_desc":
    default:
      return [desc(receipts.createdAt), asc(receipts.id)]
  }
}

type SaveItem = ReceiptOCRItem

// Depolama limiti kullanıcıya gösterilecek beklenen bir sonuç olduğu için
// (exception değil) ayrık bir union dönülür — bkz. saveBasket.
export type SaveReceiptResult =
  | { ok: true; id: string }
  | { ok: false; reason: "storage_limit_reached" }

export async function saveReceipt(input: {
  imageUrl: string
  imageR2Key: string
  marketName: string | null
  purchaseDate: string | null
  totalAmount: number | null
  items: SaveItem[]
  summary: OptimizationSummary
  matches: MatchResult[]
  comparison: ReceiptComparison
}): Promise<SaveReceiptResult> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  // R2 key'i client'tan geliyor — yalnızca bu kullanıcının klasörüne ait bir
  // key kaydedilebilir. Aksi halde başka bir kullanıcının nesnesi bu fişe
  // bağlanıp deleteReceipt ile silinebilir (IDOR).
  if (!isOwnedReceiptKey(input.imageR2Key, session.user.id)) {
    throw new Error("invalid_image_key")
  }

  // Depolama kotası: kayıt öncesi sert tavan (kullanıcının açık "Kaydet"
  // aksiyonu). Görsel analizi kotası ayrıdır ve asistan turunda sayılır.
  //
  // Eşzamanlılık notu: count→insert statement-düzeyinde atomik değil; ama gerçek
  // çift-gönderim UI kilidiyle engelli (kart kaydederken/kaydedince butonu
  // kilitler). Kalan tek yarış "aynı anda iki FARKLI fiş" — ardışık insan
  // tıklamasıyla ulaşılamaz, en kötü 1 fazla satır (AI/maliyet/güvenlik etkisi
  // yok). neon-http transaction desteklemediğinden daha sıkı serileştirme,
  // jsonb/numeric'i ham SQL'de elle kodlayıp çalışan kayıt yolunu riske atmayı
  // gerektirir — bu denge için gereksiz. Bkz. saveBasket aynı gerekçe.
  const receiptLimit = planLimit(await getUserPlan(session.user.id), "savedReceipts")
  if (receiptLimit !== null) {
    const [row] = await db
      .select({ value: count() })
      .from(receipts)
      .where(eq(receipts.userId, session.user.id))
    if ((row?.value ?? 0) >= receiptLimit) {
      return { ok: false, reason: "storage_limit_reached" }
    }
  }

  const bestSingle =
    input.summary.singleMarket.itemCount > 0
      ? input.summary.singleMarket
      : null

  const totalAmount =
    input.totalAmount ?? input.comparison.totalReceiptAmount ?? null

  const isStale = !!input.comparison.staleness?.isStale
  const persistedSavings = isStale ? 0 : input.comparison.totalSavingsTL

  const [inserted] = await db
    .insert(receipts)
    .values({
      userId: session.user.id,
      marketName: input.marketName,
      purchaseDate: input.purchaseDate
        ? new Date(input.purchaseDate)
        : null,
      totalAmount: totalAmount != null ? totalAmount.toFixed(2) : null,
      imageUrl: input.imageUrl,
      imageR2Key: input.imageR2Key,
      ocrModel: "gemini-2.5-flash",
      bestSingleMarket: bestSingle?.market ?? null,
      bestSingleTotal: bestSingle ? bestSingle.total.toFixed(2) : null,
      potentialSavingsTL: persistedSavings.toFixed(2),
      summaryJson: input.summary,
    })
    .returning({ id: receipts.id })

  if (!inserted) throw new Error("insert_failed")

  if (input.items.length > 0) {
    await db.insert(receiptItems).values(
      input.items.map((it, idx) => {
        const comp = input.comparison.items[idx]
        const lineTotal =
          it.totalPrice ??
          (it.unitPrice != null ? it.unitPrice * it.quantity : null)
        return {
          receiptId: inserted.id,
          rawName: it.rawName,
          searchQuery: it.searchQuery,
          quantity: it.quantity.toString(),
          unit: it.unit,
          receiptUnitPrice:
            it.unitPrice != null ? it.unitPrice.toFixed(2) : null,
          receiptTotalPrice:
            lineTotal != null ? lineTotal.toFixed(2) : null,
          matchedProductId: comp?.matchedProductId ?? null,
          matchedName: comp?.matchedName ?? null,
          bestMarket: comp?.bestMarket ?? null,
          bestPrice:
            comp?.bestPrice != null ? comp.bestPrice.toFixed(2) : null,
          savingsTL: isStale
            ? null
            : comp?.savingsTL != null
              ? comp.savingsTL.toFixed(2)
              : null,
        }
      }),
    )
  }

  revalidatePath("/fis-gecmisi")
  return { ok: true, id: inserted.id }
}

export async function deleteReceipt(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")
  if (!isUuid(id)) throw new Error("not_found")

  const [existing] = await db
    .select({ imageR2Key: receipts.imageR2Key })
    .from(receipts)
    .where(and(eq(receipts.id, id), eq(receipts.userId, session.user.id)))
    .limit(1)

  if (!existing) throw new Error("not_found")

  await db
    .delete(receipts)
    .where(and(eq(receipts.id, id), eq(receipts.userId, session.user.id)))

  try {
    await deleteReceiptObject(existing.imageR2Key)
  } catch (err) {
    console.error("[deleteReceipt] R2 delete failed", err)
  }

  revalidatePath("/fis-gecmisi")
}

/**
 * Toplu silme: yalnızca bu kullanıcıya ait satırlar silinir. DB satırları
 * silinirken `imageR2Key`'ler RETURNING ile toplanır, ardından R2 nesneleri
 * best-effort (DB kaynak doğrudur; artık nesne zararsızdır) temizlenir. Sorgu
 * 100'lük parçalara bölünür; `receiptItems` CASCADE ile birlikte silinir.
 */
export async function deleteReceipts(
  ids: string[],
): Promise<{ deleted: number }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const valid = Array.from(new Set(ids)).filter((id) => isUuid(id))
  if (valid.length === 0) return { deleted: 0 }

  const userId = session.user.id
  let deleted = 0
  const keys: string[] = []

  for (let i = 0; i < valid.length; i += BULK_DELETE_CHUNK) {
    const slice = valid.slice(i, i + BULK_DELETE_CHUNK)
    const rows = await db
      .delete(receipts)
      .where(and(inArray(receipts.id, slice), eq(receipts.userId, userId)))
      .returning({ id: receipts.id, imageR2Key: receipts.imageR2Key })
    deleted += rows.length
    for (const r of rows) if (r.imageR2Key) keys.push(r.imageR2Key)
  }

  if (keys.length > 0) {
    const results = await Promise.allSettled(
      keys.map((k) => deleteReceiptObject(k)),
    )
    for (const res of results) {
      if (res.status === "rejected") {
        console.error("[deleteReceipts] R2 delete failed", res.reason)
      }
    }
  }

  if (deleted > 0) revalidatePath("/fis-gecmisi")
  return { deleted }
}

/**
 * Sayfalı fiş listesi (infinite scroll). `PAGE_SIZE + 1` satır çekip fazlasını
 * atarak `hasMore` belirlenir. Sıralama sunucu tarafında uygulanır.
 */
export async function listReceiptsPaginated(
  offset = 0,
  sort: ReceiptSort = DEFAULT_RECEIPT_SORT,
): Promise<{ items: ReceiptListItem[]; hasMore: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { items: [], hasMore: false }

  const items = await db
    .select(receiptListColumns)
    .from(receipts)
    .where(eq(receipts.userId, session.user.id))
    .orderBy(...orderByForReceiptSort(sort))
    .limit(RECEIPTS_PAGE_SIZE + 1)
    .offset(offset)

  const hasMore = items.length > RECEIPTS_PAGE_SIZE
  if (hasMore) items.pop()
  return { items, hasMore }
}

/**
 * Fişlerde arama: market adı veya içindeki kalem adlarında (EXISTS alt sorgu)
 * geçen eşleşmeleri döndürür. Tek seferde gelir (paginate edilmez), tavanla
 * sınırlı.
 */
export async function searchReceipts(
  query: string,
  sort: ReceiptSort = DEFAULT_RECEIPT_SORT,
): Promise<ReceiptListItem[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const q = query.trim()
  if (!q || q.length > 100) return []

  const pattern = `%${escapeLike(q)}%`

  const itemMatch = exists(
    db
      .select({ one: sql`1` })
      .from(receiptItems)
      .where(
        and(
          eq(receiptItems.receiptId, receipts.id),
          or(
            ilike(receiptItems.rawName, pattern),
            ilike(receiptItems.matchedName, pattern),
          ),
        ),
      ),
  )

  return db
    .select(receiptListColumns)
    .from(receipts)
    .where(
      and(
        eq(receipts.userId, session.user.id),
        or(ilike(receipts.marketName, pattern), itemMatch),
      ),
    )
    .orderBy(...orderByForReceiptSort(sort))
    .limit(200)
}

export async function getReceiptDetail(id: string, userId: string) {
  if (!isUuid(id)) return null
  const [receipt] = await db
    .select()
    .from(receipts)
    .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
    .limit(1)
  if (!receipt) return null
  const items = await db
    .select()
    .from(receiptItems)
    .where(eq(receiptItems.receiptId, id))
  return { receipt, items }
}
