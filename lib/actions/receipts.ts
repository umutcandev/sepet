"use server"

import { revalidatePath } from "next/cache"
import { and, desc, eq } from "drizzle-orm"
import { auth } from "@/auth"
import { db, receipts, receiptItems } from "@/lib/db"
import { deleteReceiptObject, isOwnedReceiptKey } from "@/lib/storage/r2"
import { isUuid } from "@/lib/utils"
import type {
  MatchResult,
  OptimizationSummary,
  ReceiptComparison,
  ReceiptOCRItem,
} from "@/lib/ai/schemas"

type SaveItem = ReceiptOCRItem

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
}): Promise<{ id: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  // R2 key'i client'tan geliyor — yalnızca bu kullanıcının klasörüne ait bir
  // key kaydedilebilir. Aksi halde başka bir kullanıcının nesnesi bu fişe
  // bağlanıp deleteReceipt ile silinebilir (IDOR).
  if (!isOwnedReceiptKey(input.imageR2Key, session.user.id)) {
    throw new Error("invalid_image_key")
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
  return { id: inserted.id }
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

export async function listReceipts(userId: string) {
  return db
    .select()
    .from(receipts)
    .where(eq(receipts.userId, userId))
    .orderBy(desc(receipts.createdAt))
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
