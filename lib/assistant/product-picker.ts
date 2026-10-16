import { computeOptimization } from "@/lib/ai/optimize"
import {
  buildMatchResult,
  resolveUserSelection,
  type Candidate,
} from "@/lib/ai/match-result"
import { searchAlias } from "@/lib/ai/normalize"
import type { MatchResult, OptimizationSummary } from "@/lib/ai/schemas"

// Sepet Özeti'ndeki ürün değiştirme ekranının saf mantığı. Ekran önizlemeyi
// sunucunun kayıtta kullandığı AYNI fonksiyonlarla (buildMatchResult,
// computeOptimization) hesaplar; "Uygula"dan sonra kartta görülen toplam
// önizlemede görülenle aynı olsun.

/** Aday havuzunu getiren sorgu (bkz. findFirstHit). Eski kayıtlarda yok. */
export function pickerPoolQuery(match: MatchResult): string {
  return (
    match.selection?.poolQuery ??
    searchAlias(match.searchQuery) ??
    match.searchQuery
  )
}

/**
 * Asistanın kabul ettiği ürünler. Seçim bilgisinden önce kaydedilmiş
 * eşleşmelerde kabul listesi yok; o zaman eşleşmede görünen ürünler (market
 * seçenekleri, temsilci, alternatifler) asistanın seçimi sayılır.
 */
export function aiAcceptedIds(match: MatchResult): string[] {
  if (match.selection) return match.selection.aiAcceptedProductIds
  const ids = [
    ...match.marketOptions.map((o) => o.productId),
    ...(match.bestMatch ? [match.bestMatch.productId] : []),
    ...match.alternatives.map((a) => a.productId),
  ]
  return [...new Set(ids)]
}

/** Ekran açıldığında işaretli gelen ürünler: kullanıcının son seçimi ya da asistanınki. */
export function initialSelection(match: MatchResult): string[] {
  return match.selection?.userAcceptedProductIds ?? aiAcceptedIds(match)
}

export function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

/** Adayın en ucuz market fiyatı; sıralama için. */
export function cheapestPrice(c: Pick<Candidate, "markets">): number {
  return c.markets.reduce((min, m) => Math.min(min, m.price), Infinity)
}

/**
 * Bu kalemin Sepet Özeti'nde şu an hangi ürünle, hangi marketten alındığı:
 * productId → market adları. Ekran bu ürünlere "Sepette" rozeti koyar.
 * Kalem sırası taşımayan eski dökümlerde ham adla eşlenir.
 */
export function planProductsFor(
  summary: OptimizationSummary,
  itemIndex: number,
  rawName: string
): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const hasCombo = summary.twoMarketCombo.markets.length === 2
  const entries = [
    ...summary.singleMarket.allocation,
    ...(hasCombo ? summary.twoMarketCombo.allocation : []),
  ]
  for (const a of entries) {
    const mine =
      a.itemIndex != null ? a.itemIndex === itemIndex : a.rawName === rawName
    if (!mine) continue
    const markets = out.get(a.productId) ?? []
    if (!markets.includes(a.market)) markets.push(a.market)
    out.set(a.productId, markets)
  }
  return out
}

/**
 * Seçim uygulanırsa Sepet Özeti ne olur. Seçimden fiyatlı hiçbir ürün
 * kalmıyorsa null (Uygula kapalı kalır).
 */
export function previewSelection({
  match,
  matches,
  itemIndex,
  products,
  selectedIds,
}: {
  match: MatchResult
  matches: MatchResult[]
  itemIndex: number
  products: Candidate[]
  selectedIds: readonly string[]
}): { summary: OptimizationSummary; match: MatchResult } | null {
  const aiSizeMismatch = match.selection?.aiSizeMismatch ?? match.sizeMismatch
  const selection = resolveUserSelection(selectedIds, products, {
    previousPrimaryId: match.bestMatch?.productId ?? null,
    aiSizeMismatch,
  })
  if (selection.acceptedProductIds.length === 0) return null
  const updated = buildMatchResult({
    item: {
      name: match.rawName,
      searchQuery: match.searchQuery,
      quantity: match.quantity,
      unit: match.unit,
      note: match.note ?? null,
    },
    outcome: { kind: "hit", hits: products, query: pickerPoolQuery(match) },
    selection,
    ai: {
      primaryProductId: null,
      acceptedProductIds: aiAcceptedIds(match),
      sizeMismatch: aiSizeMismatch,
    },
    userAcceptedProductIds: selection.acceptedProductIds,
  })
  const next = matches.map((m, i) => (i === itemIndex ? updated : m))
  return { summary: computeOptimization(next), match: updated }
}
