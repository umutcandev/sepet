import { UNIT_VALUES, type OptimizationSummary, type Unit } from "@/lib/ai/schemas"
import { parseSummary } from "@/lib/basket-plan"
import { formatDate } from "@/lib/format"

// Sepet/fiş detayının görünüm verisi; kayıt sayfası ile paylaşılan sayfa ortak.
// Paylaşılan kopya bunun temizlenmiş hâli, tarihler bu yüzden ISO metin.

export type RecordShareKind = "basket" | "receipt"

export type BasketRecordItem = {
  rawName: string
  searchQuery: string
  quantity: number
  unit: Unit
  matched: boolean
}

export type BasketRecordData = {
  createdAt: string
  items: BasketRecordItem[]
  twoMarketSavings: number
  summary: OptimizationSummary | null
  /** productId → ürün görseli; görselsiz eski dökümleri tamamlar. */
  itemImages: Record<string, string>
}

export type ReceiptRecordItem = {
  rawName: string
  quantity: number
  unit: string
  searchQuery: string | null
  matchedName: string | null
  matchedBrand: string | null
  matchedImageUrl: string | null
  matchedProductId: string | null
  matched: boolean
  bestMarket: string | null
  bestPrice: number | null
  receiptUnitPrice: number | null
  savings: number | null
}

export type ReceiptRecordData = {
  createdAt: string
  marketName: string | null
  purchaseDate: string | null
  totalAmount: number | null
  bestSingleMarket: string | null
  bestSingleTotal: number | null
  potentialSavings: number | null
  items: ReceiptRecordItem[]
  summary: OptimizationSummary | null
  itemImages: Record<string, string>
}

export type SharedRecordSnapshot = BasketRecordData | ReceiptRecordData

type ItemRowBase = {
  matchedProductId: string | null
  matchedImageUrl: string | null
  lookupStatus: string | null
}

/** Eski kayıtlarda lookupStatus yok → eşleşen ürün id'si karar verir. */
function isMatched(it: ItemRowBase): boolean {
  return it.lookupStatus != null
    ? it.lookupStatus === "ok"
    : it.matchedProductId != null
}

function itemImageMap(items: ItemRowBase[]): Record<string, string> {
  return Object.fromEntries(
    items.flatMap((it) =>
      it.matchedProductId && it.matchedImageUrl
        ? [[it.matchedProductId, it.matchedImageUrl]]
        : [],
    ),
  )
}

function num(value: string | null): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toUnit(value: string): Unit {
  return (UNIT_VALUES as readonly string[]).includes(value)
    ? (value as Unit)
    : "adet"
}

export function basketRecordData(
  basket: {
    createdAt: Date
    twoMarketSavingsTL: string | null
    summaryJson: unknown
  },
  items: Array<
    ItemRowBase & {
      rawName: string
      searchQuery: string
      quantity: string
      unit: string
    }
  >,
): BasketRecordData {
  return {
    createdAt: basket.createdAt.toISOString(),
    items: items.map((it) => ({
      rawName: it.rawName,
      searchQuery: it.searchQuery,
      quantity: Number(it.quantity),
      unit: toUnit(it.unit),
      matched: isMatched(it),
    })),
    twoMarketSavings: num(basket.twoMarketSavingsTL) ?? 0,
    summary: parseSummary(basket.summaryJson),
    itemImages: itemImageMap(items),
  }
}

export function receiptRecordData(
  receipt: {
    createdAt: Date
    marketName: string | null
    purchaseDate: Date | null
    totalAmount: string | null
    bestSingleMarket: string | null
    bestSingleTotal: string | null
    potentialSavingsTL: string | null
    summaryJson: unknown
  },
  items: Array<
    ItemRowBase & {
      rawName: string
      quantity: string
      unit: string
      searchQuery: string | null
      matchedName: string | null
      matchedBrand: string | null
      bestMarket: string | null
      bestPrice: string | null
      receiptUnitPrice: string | null
      savingsTL: string | null
    }
  >,
): ReceiptRecordData {
  return {
    createdAt: receipt.createdAt.toISOString(),
    marketName: receipt.marketName,
    purchaseDate: receipt.purchaseDate?.toISOString() ?? null,
    totalAmount: num(receipt.totalAmount),
    bestSingleMarket: receipt.bestSingleMarket,
    bestSingleTotal: num(receipt.bestSingleTotal),
    potentialSavings: num(receipt.potentialSavingsTL),
    items: items.map((it) => ({
      rawName: it.rawName,
      quantity: Number(it.quantity),
      unit: it.unit,
      searchQuery: it.searchQuery,
      matchedName: it.matchedName,
      matchedBrand: it.matchedBrand,
      matchedImageUrl: it.matchedImageUrl,
      matchedProductId: it.matchedProductId,
      matched: isMatched(it),
      bestMarket: it.bestMarket,
      bestPrice: num(it.bestPrice),
      receiptUnitPrice: num(it.receiptUnitPrice),
      savings: num(it.savingsTL),
    })),
    summary: parseSummary(receipt.summaryJson),
    itemImages: itemImageMap(items),
  }
}

export function receiptTitle(receipt: {
  name: string | null
  marketName: string | null
  purchaseDate: Date | null
  createdAt: Date
}): string {
  if (receipt.name?.trim()) return receipt.name.trim()
  const date = receipt.purchaseDate ?? receipt.createdAt
  return `${receipt.marketName ?? "Fiş"} · ${formatDate(date)}`
}
