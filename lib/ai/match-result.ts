import type { ProductDetail } from "@/lib/marketfiyati/types"
import { buildMarketOptions, sizeFit } from "./effective-cost"
import type {
  MatchResult,
  MatchSelection,
  MatchSelectionState,
  ParsedItem,
} from "./schemas"

// Saf modül: sunucu (lookupProducts, Sepet Özeti'nden ürün değiştirme) ve
// istemci (değiştirme ekranındaki canlı önizleme) aynı kuralla eşleşme
// kursun diye Redis/LLM bağımlılığı olmadan burada duruyor.

/** Eşleştirmeye giren aday: arama sonucundaki ürün ve market fiyatları. */
export type Candidate = Pick<
  ProductDetail,
  | "productId"
  | "name"
  | "brand"
  | "category"
  | "imageUrl"
  | "averagePrice"
  | "minPrice"
  | "maxPrice"
  | "marketCount"
  | "markets"
>

export type PoolOutcome =
  | { kind: "hit"; hits: Candidate[]; query: string }
  | { kind: "no_match" }
  | { kind: "api_quota"; message: string }
  | { kind: "api_error"; message: string }

/**
 * Kullanıcının önceki bir turda Sepet Özeti'nden seçtiği ürünler (bkz.
 * collectUserSelections). Aynı kalem yeni bir sepette yeniden geçerse
 * asistan bu kalemi yeniden seçmez; kullanıcının açık seçimi geçerlidir.
 */
export type CarriedSelection = {
  state: MatchSelectionState & { userAcceptedProductIds: string[] }
  primaryProductId: string | null
  quantity: number
  unit: ParsedItem["unit"]
}

/** Bir kalem için optimizasyona girecek ürün kümesi. */
export type ItemSelection = {
  primaryProductId: string | null
  acceptedProductIds: string[]
  sizeMismatch: boolean
}

export function toMatchedProduct(h: Candidate) {
  return {
    productId: h.productId,
    name: h.name,
    brand: h.brand,
    category: h.category,
    imageUrl: h.imageUrl,
    averagePrice: h.averagePrice,
    minPrice: h.minPrice,
    maxPrice: h.maxPrice,
    marketCount: h.marketCount,
  }
}

/**
 * LLM seçimini (ya da yokluğunu) normalize bir ItemSelection'a çevirir:
 * - Sadece gerçekten aday listesinde olan productId'leri tutar (halüsinasyon ele).
 * - acceptedProductIds'in primary'yi içermesini garanti eder.
 * - LLM yok/başarısızsa en üst adaya geri düşer.
 */
export function resolveSelection(
  sel: MatchSelection["selections"][number] | null | undefined,
  hits: Candidate[]
): ItemSelection {
  const validIds = new Set(hits.map((h) => h.productId))

  if (!sel) {
    const top = hits[0]?.productId ?? null
    return {
      primaryProductId: top,
      acceptedProductIds: top ? [top] : [],
      sizeMismatch: false,
    }
  }

  // LLM aynı productId'yi birden çok kez döndürebiliyor (ölçümde tek kalemde 72
  // adaya karşılık 153 id geldi). Fiyat hesabını bozmuyor — buildMarketOptions
  // market başına en ucuzu tuttuğundan idempotent — ama cache'e ve prompt'a
  // şişmiş liste taşımamak için tekilleştiriyoruz.
  const accepted = [
    ...new Set((sel.acceptedProductIds ?? []).filter((id) => validIds.has(id))),
  ]
  let primary =
    sel.primaryProductId && validIds.has(sel.primaryProductId)
      ? sel.primaryProductId
      : null
  if (primary && !accepted.includes(primary)) accepted.unshift(primary)
  if (!primary) primary = accepted[0] ?? null

  return {
    primaryProductId: primary,
    acceptedProductIds: accepted,
    sizeMismatch: sel.sizeMismatch,
  }
}

/**
 * Kullanıcının seçtiği ürünleri bir ItemSelection'a çevirir. Havuzda olmayan
 * ya da hiçbir markette fiyatı olmayan id düşer; sıra korunur. Temsilci,
 * önceki temsilci hâlâ seçiliyse odur, değilse ilk seçilen. Boyut işareti
 * asistanınkidir: kullanıcı ürünü değiştirdi, istediği miktarı değil.
 */
export function resolveUserSelection(
  productIds: readonly string[],
  hits: Candidate[],
  opts: { previousPrimaryId?: string | null; aiSizeMismatch: boolean }
): ItemSelection {
  const priced = new Set(
    hits.filter((h) => h.markets.length > 0).map((h) => h.productId)
  )
  const accepted = [...new Set(productIds)].filter((id) => priced.has(id))
  const primary =
    opts.previousPrimaryId && accepted.includes(opts.previousPrimaryId)
      ? opts.previousPrimaryId
      : (accepted[0] ?? null)
  return {
    primaryProductId: primary,
    acceptedProductIds: accepted,
    sizeMismatch: opts.aiSizeMismatch,
  }
}

/**
 * Bir kalemin eşleşme sonucunu kurar.
 *
 * @param selection Optimizasyona girecek küme: asistanınki ya da (Sepet
 *   Özeti'nden ürün değiştirildiyse) kullanıcınınki.
 * @param ai Asistanın seçimi. Kullanıcı seçimi yoksa `selection` ile aynıdır;
 *   değiştirme ekranı "asistanın seçtikleri"ni bundan gösterir.
 */
export function buildMatchResult({
  item,
  outcome,
  selection,
  ai,
  userAcceptedProductIds = null,
}: {
  item: ParsedItem
  outcome: PoolOutcome
  selection: ItemSelection | null
  ai: ItemSelection | null
  userAcceptedProductIds?: string[] | null
}): MatchResult {
  const hits = outcome.kind === "hit" ? outcome.hits : []

  // Kabul edilen ve gerçek market fiyatı olan adaylar.
  const acceptedIds = new Set(selection?.acceptedProductIds ?? [])
  const accepted = hits.filter(
    (h) => acceptedIds.has(h.productId) && h.markets.length > 0
  )
  const primary =
    (selection?.primaryProductId
      ? accepted.find((h) => h.productId === selection.primaryProductId)
      : undefined) ??
    accepted[0] ??
    null
  // LLM yalnızca adetli/rawName boyut farklarını (ör. "2 yumurta" → 10'lu
  // viyol) güvenilir işaretler. Sepet onayında ölçülebilir boyut ayrı
  // quantity/unit alanında gelir; kg/l farklarını sizeFit deterministik
  // olarak yakalar (gramajla istenip adetle satılan ürün, ±%10'dan fazla
  // sapan paket boyutu).
  const llmSizeMismatch = selection?.sizeMismatch ?? false
  const fitOf = (h: Candidate) =>
    sizeFit(item.quantity, item.unit, h, llmSizeMismatch)
  // Temsilci istenen boyutu tutmuyorsa ve kabul edilenler arasında tutan bir
  // aday varsa kart onu göstersin; kalemin rozeti de buna göre çıkar.
  const best =
    primary && fitOf(primary).mismatch
      ? (accepted.find((h) => !fitOf(h).mismatch) ?? primary)
      : primary
  const sizeMismatch = best ? fitOf(best).mismatch : false

  const lookupStatus: MatchResult["lookupStatus"] =
    outcome.kind === "hit" ? (best ? "ok" : "no_match") : outcome.kind

  const errorMessage =
    outcome.kind === "api_quota" || outcome.kind === "api_error"
      ? outcome.message
      : null

  // Temsilci ürünün (UI kartı) market fiyatları.
  const marketPrices = best
    ? best.markets.map((m) => ({
        market: m.market,
        price: m.price,
        depotName: m.depotName,
      }))
    : []

  const pricedIds = new Set(
    hits.filter((h) => h.markets.length > 0).map((h) => h.productId)
  )
  const selectionState: MatchSelectionState | null =
    outcome.kind === "hit"
      ? {
          poolQuery: outcome.query,
          aiAcceptedProductIds: (ai?.acceptedProductIds ?? []).filter((id) =>
            pricedIds.has(id)
          ),
          aiSizeMismatch: ai?.sizeMismatch ?? false,
          userAcceptedProductIds,
        }
      : null

  return {
    rawName: item.name,
    searchQuery: item.searchQuery,
    quantity: item.quantity,
    unit: item.unit,
    bestMatch: best ? toMatchedProduct(best) : null,
    marketPrices,
    marketOptions: buildMarketOptions(accepted, item, llmSizeMismatch),
    alternatives: accepted
      .filter((h) => h.productId !== best?.productId)
      .slice(0, 3)
      .map(toMatchedProduct),
    lookupStatus,
    errorMessage,
    sizeMismatch,
    note: item.note?.trim() || null,
    selection: selectionState,
  } satisfies MatchResult
}

/**
 * Kullanıcının bir kalem için yaptığı seçimin sohbet içinde taşınma anahtarı.
 * Aynı arama terimi ve aynı not: kullanıcı aynı ürünü istiyor. Not değiştiyse
 * yeni bir tercih bildirmiştir; o zaman asistan yeniden seçer.
 */
export function selectionKey(
  searchQuery: string,
  note?: string | null
): string {
  const norm = (s: string) =>
    s.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ")
  return `${norm(searchQuery)}\u0000${norm(note ?? "")}`
}
