"use server"

import { revalidatePath } from "next/cache"
import { and, desc, eq } from "drizzle-orm"
import { auth } from "@/auth"
import { db, baskets, basketItems } from "@/lib/db"
import type {
  MatchResult,
  OptimizationSummary,
  ParsedItem,
} from "@/lib/ai/schemas"

type SaveBasketInput = {
  name: string | null
  items: Array<{
    rawName: string
    searchQuery: string
    quantity: number
    unit: ParsedItem["unit"]
  }>
  matches: MatchResult[]
  summary: OptimizationSummary
}

function autoBasketName(): string {
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
  return `Sepet · ${fmt.format(new Date())}`
}

export async function saveBasket(input: SaveBasketInput): Promise<{ id: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const trimmedName = input.name?.trim()
  const name = trimmedName && trimmedName.length > 0 ? trimmedName : autoBasketName()

  const bestSingle =
    input.summary.singleMarket.itemCount > 0
      ? input.summary.singleMarket
      : null
  const twoMarketSavings =
    input.summary.twoMarketCombo.markets.length === 2
      ? input.summary.twoMarketCombo.savingsTL
      : null

  const [inserted] = await db
    .insert(baskets)
    .values({
      userId: session.user.id,
      name,
      bestSingleMarket: bestSingle?.market ?? null,
      bestSingleTotal: bestSingle ? bestSingle.total.toFixed(2) : null,
      twoMarketSavingsTL:
        twoMarketSavings != null ? twoMarketSavings.toFixed(2) : null,
      summaryJson: input.summary,
    })
    .returning({ id: baskets.id })

  if (!inserted) throw new Error("insert_failed")

  if (input.items.length > 0) {
    await db.insert(basketItems).values(
      input.items.map((it, idx) => {
        const match = input.matches[idx]
        const best = match?.bestMatch ?? null
        const minPrice = best?.minPrice ?? null
        const marketWithMin = best
          ? match.marketPrices.find((mp) => mp.price === minPrice) ?? null
          : null
        return {
          basketId: inserted.id,
          rawName: it.rawName,
          searchQuery: it.searchQuery,
          quantity: it.quantity.toString(),
          unit: it.unit,
          matchedBarcode: best?.barcode ?? null,
          matchedName: best?.name ?? null,
          bestMarket: marketWithMin?.market ?? null,
          bestPrice: minPrice != null ? minPrice.toFixed(2) : null,
        }
      }),
    )
  }

  revalidatePath("/sepetlerim")
  return { id: inserted.id }
}

export async function deleteBasket(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  await db
    .delete(baskets)
    .where(and(eq(baskets.id, id), eq(baskets.userId, session.user.id)))

  revalidatePath("/sepetlerim")
}

export async function listBaskets(userId: string) {
  return db
    .select()
    .from(baskets)
    .where(eq(baskets.userId, userId))
    .orderBy(desc(baskets.createdAt))
}

export async function getBasketDetail(id: string, userId: string) {
  const [basket] = await db
    .select()
    .from(baskets)
    .where(and(eq(baskets.id, id), eq(baskets.userId, userId)))
    .limit(1)
  if (!basket) return null
  const items = await db
    .select()
    .from(basketItems)
    .where(eq(basketItems.basketId, id))
  return { basket, items }
}
