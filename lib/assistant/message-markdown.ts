import type {
  ImageAnalysis,
  MarketAllocation,
  MatchResult,
  OptimizationSummary,
  ParsedItem,
  ReceiptComparison,
  ReceiptOCR,
} from "@/lib/ai/schemas"
import { formatPercent, formatTL, formatTLOrDash } from "@/lib/format"
import { orderAssistantParts } from "./part-order"
import { STOPPED_PART_TYPE } from "./turn-state"

/**
 * Bir sohbet mesajının ekranda görünen hâlinin markdown karşılığı ("Kopyala").
 * Metin olduğu gibi; kartlar (kalem listesi, Sepet Özeti, fiş, karşılaştırma)
 * tablo olarak. Kartlarla aynı kaynaktan ve aynı sırayla (bkz. part-order)
 * okunur, yani kopya ekrandakiyle aynı ürünü ve fiyatı söyler.
 *
 * Bilerek dışarıda: düşünme metni (kapalı akordiyon, cevabın parçası değil)
 * ve yüklenen görselin adresi (yerine "[Görsel]" yazılır; adres kullanıcının
 * R2 klasörünü taşır, yapıştırılan yerde işe de yaramaz).
 */

type PartLike = {
  type: string
  text?: unknown
  state?: string
  output?: unknown
  errorText?: unknown
  mediaType?: unknown
}

export type ApprovedItemLike = {
  rawName: string
  quantity: number
  unit: string
  note?: string | null
}

export type MessageMarkdownContext = {
  /**
   * Kartın onaylanmış (kilitli) olup olmadığı ve onaylanan liste. Kilitli
   * kart ekranda onaylanan kalemleri gösteriyor; kopya da onları yazar.
   */
  locked?: boolean
  approvedItems?: ApprovedItemLike[]
}

// ─── Yardımcılar ───

function cell(value: string | number): string {
  return String(value).replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim()
}

function table(
  headers: string[],
  rows: Array<Array<string | number>>,
  align: Array<"left" | "right">
): string {
  const head = `| ${headers.map(cell).join(" | ")} |`
  const sep = `| ${align.map((a) => (a === "right" ? "--:" : "---")).join(" | ")} |`
  const body = rows.map((r) => `| ${r.map(cell).join(" | ")} |`)
  return [head, sep, ...body].join("\n")
}

function qty(n: number): string {
  return Number.isInteger(n)
    ? String(n)
    : n.toLocaleString("tr-TR", { maximumFractionDigits: 3 })
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1) : s
}

function itemsTable(items: ApprovedItemLike[]): string {
  const withNotes = items.some((it) => it.note?.trim())
  return table(
    withNotes ? ["Ürün", "Adet", "Birim", "Not"] : ["Ürün", "Adet", "Birim"],
    items.map((it) =>
      withNotes
        ? [it.rawName, qty(it.quantity), it.unit, it.note?.trim() ?? ""]
        : [it.rawName, qty(it.quantity), it.unit]
    ),
    withNotes ? ["left", "right", "left", "left"] : ["left", "right", "left"]
  )
}

function basketItems(
  draft: Pick<ParsedItem, "name" | "quantity" | "unit" | "note">[],
  ctx: MessageMarkdownContext
): string {
  const items: ApprovedItemLike[] =
    ctx.locked && ctx.approvedItems && ctx.approvedItems.length > 0
      ? ctx.approvedItems
      : draft.map((it) => ({
          rawName: it.name,
          quantity: it.quantity,
          unit: it.unit,
          note: it.note,
        }))
  if (items.length === 0) return ""
  const title = ctx.locked
    ? "**Sepetindeki Kalemler** (onaylandı)"
    : "**Sepetindeki Kalemler**"
  return `${title}\n\n${itemsTable(items)}`
}

function allocationTable(
  allocation: MarketAllocation[],
  withMarket: boolean
): string {
  const rows = allocation.map((a) => {
    const product = a.sizeMismatch
      ? `${a.productName} (farklı boyut)`
      : a.productName
    const base = [
      capitalize(a.rawName || a.productName),
      product,
      qty(a.quantity),
      formatTL(a.lineTotal),
    ]
    return withMarket ? [base[0], a.market, ...base.slice(1)] : base
  })
  return withMarket
    ? table(["Kalem", "Market", "Ürün", "Adet", "Tutar"], rows, [
        "left",
        "left",
        "left",
        "right",
        "right",
      ])
    : table(["Kalem", "Ürün", "Adet", "Tutar"], rows, [
        "left",
        "left",
        "right",
        "right",
      ])
}

function missingText(names: string[], market: string): string {
  const c = names.map(capitalize)
  const joined =
    c.length <= 2
      ? c.join(" ve ")
      : `${c.slice(0, -1).join(", ")} ve ${c[c.length - 1]}`
  return `${joined} ${market} stoğunda yok`
}

function summaryMarkdown(summary: OptimizationSummary): string {
  if (!summary || summary.totalItems === 0) return ""
  const { singleMarket: single, twoMarketCombo: combo, totalItems } = summary
  const hasCombo = combo.markets.length === 2
  const comboFirst = !single.isFullCoverage && hasCombo

  const singleTitle = single.isFullCoverage
    ? "En Ucuz Tek Market"
    : "Eksik Kalemli Tek Market"
  const singleSub =
    !single.isFullCoverage && single.missingItemNames.length > 0
      ? missingText(single.missingItemNames, single.market)
      : `${single.itemCount}/${totalItems} kalem`
  const singleBlock = [
    `**${singleTitle}: ${single.market} — ${formatTL(single.total)}** (${singleSub})`,
    single.allocation.length > 0
      ? allocationTable(single.allocation, false)
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const comboBlock = hasCombo
    ? [
        `**${comboFirst ? "Eksiksiz İki Market" : "İki Market Kombinasyonu"}: ${combo.markets.join(" + ")} — ${formatTL(combo.total)}** (${totalItems}/${totalItems} kalem${
          combo.savingsTL > 0
            ? `, ${formatTL(combo.savingsTL)} tasarruf, ${formatPercent(combo.savingsPct)}`
            : ""
        })`,
        combo.allocation.length > 0
          ? allocationTable(combo.allocation, true)
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : ""

  const blocks = comboFirst
    ? [comboBlock, singleBlock]
    : [singleBlock, comboBlock]
  return ["**Sepet Özeti**", ...blocks.filter(Boolean)].join("\n\n")
}

const UNMATCHED_REASON: Record<string, string> = {
  api_quota: "API kotası tükendi",
  api_error: "Fiyat servisine ulaşılamadı",
}

function unmatchedMarkdown(matches: MatchResult[]): string {
  const unmatched = matches.filter(
    (m) => m.lookupStatus !== "ok" || !m.bestMatch
  )
  if (unmatched.length === 0) return ""
  const lines = unmatched.map(
    (m) =>
      `- ${capitalize(m.rawName)}: ${UNMATCHED_REASON[m.lookupStatus] ?? "Bu adla marketlerde bulamadım"}`
  )
  return ["**Eşleştirilemeyen Ürünler**", lines.join("\n")].join("\n\n")
}

function receiptMarkdown(ocr: ReceiptOCR, locked: boolean): string {
  if (ocr.items.length === 0) return ""
  const meta = [
    ocr.marketName ? `Market: ${ocr.marketName}` : null,
    ocr.purchaseDate ? `Tarih: ${ocr.purchaseDate}` : null,
    ocr.totalAmount != null
      ? `Fiş toplamı: ${formatTL(ocr.totalAmount)}`
      : null,
  ].filter(Boolean)
  return [
    locked ? "**Fişindeki Kalemler** (onaylandı)" : "**Fişindeki Kalemler**",
    meta.length > 0 ? meta.join(" · ") : "",
    table(
      ["Ürün", "Adet", "Birim", "B. Fiyat", "Tutar"],
      ocr.items.map((it) => [
        it.rawName,
        qty(it.quantity),
        it.unit,
        formatTLOrDash(it.unitPrice),
        formatTLOrDash(
          it.totalPrice ??
            (it.unitPrice != null ? it.unitPrice * it.quantity : null)
        ),
      ]),
      ["left", "right", "left", "right", "right"]
    ),
  ]
    .filter(Boolean)
    .join("\n\n")
}

function comparisonMarkdown(comparison: ReceiptComparison): string {
  const stale = !!comparison.staleness?.isStale
  const title = stale
    ? "**Fiş Karşılaştırması** (fiş eski, bugünkü fiyatlarla)"
    : comparison.totalSavingsTL > 0
      ? `**Fiş Karşılaştırması** (${formatTL(comparison.totalSavingsTL)} potansiyel tasarruf)`
      : "**Fiş Karşılaştırması**"
  return [
    title,
    table(
      ["Ürün", "Fişteki paket", "En iyi market", "En iyi paket", "Fark"],
      comparison.items.map((it) => [
        it.rawName,
        formatTLOrDash(it.receiptUnitPrice),
        it.bestMarket ?? "eşleşme yok",
        formatTLOrDash(it.bestPrice),
        it.savingsTL != null && it.savingsTL > 0 ? formatTL(it.savingsTL) : "—",
      ]),
      ["left", "right", "left", "right", "right"]
    ),
    `Fişteki paket fiyatları: ${formatTLOrDash(comparison.totalReceiptAmount)} · En iyi: ${formatTLOrDash(comparison.totalBestAmount)}`,
  ].join("\n\n")
}

// ─── Part → markdown ───

function partMarkdown(
  part: PartLike,
  parts: readonly PartLike[],
  ctx: MessageMarkdownContext
): string {
  if (part.type === "text") {
    return typeof part.text === "string" ? part.text.trim() : ""
  }
  if (part.type === "file") {
    return typeof part.mediaType === "string" &&
      part.mediaType.startsWith("image/")
      ? "[Görsel]"
      : ""
  }
  if (part.type === "data-image-omitted") return "[Görsel]"
  if (part.type === STOPPED_PART_TYPE) return "_Yanıt durduruldu._"
  if (!part.type.startsWith("tool-")) return ""
  if (part.state === "output-error") {
    return typeof part.errorText === "string" && part.errorText.trim()
      ? `> ${part.errorText.trim()}`
      : ""
  }
  if (part.state !== "output-available" || part.output == null) return ""

  const out = part.output
  switch (part.type) {
    case "tool-parseShoppingList":
      return basketItems((out as { items: ParsedItem[] }).items ?? [], ctx)
    case "tool-lookupProducts":
      // Fiş turunda karşılaştırma tablosu eşleşmeyenleri zaten listeliyor.
      if (parts.some((p) => p.type === "tool-receiptComparison")) return ""
      return unmatchedMarkdown(
        (out as { matches: MatchResult[] }).matches ?? []
      )
    case "tool-summarizeOptimization": {
      // Sepet onayı turunda kart, kayıt bağlamındaki özeti gösteriyor.
      const context = parts.find(
        (p) => p.type === "tool-basketContext" && p.state === "output-available"
      )
      const summary =
        (context?.output as { summary?: OptimizationSummary } | undefined)
          ?.summary ?? (out as OptimizationSummary)
      return summaryMarkdown(summary)
    }
    case "tool-parseReceipt":
      return receiptMarkdown((out as { ocr: ReceiptOCR }).ocr, !!ctx.locked)
    case "tool-analyzeImage": {
      const analysis = (out as { analysis: ImageAnalysis }).analysis
      if (analysis?.kind === "receipt" && analysis.receipt) {
        return receiptMarkdown(analysis.receipt, !!ctx.locked)
      }
      if (analysis?.kind === "food" && analysis.food) {
        return basketItems(analysis.food.items, ctx)
      }
      return ""
    }
    case "tool-receiptComparison":
      return comparisonMarkdown(
        (out as { comparison: ReceiptComparison }).comparison
      )
    default:
      return ""
  }
}

export function messageToMarkdown(
  message: { role: string; parts: readonly PartLike[] },
  ctx: MessageMarkdownContext = {}
): string {
  const parts =
    message.role === "assistant"
      ? orderAssistantParts([...message.parts])
      : message.parts
  return parts
    .map((p) => {
      try {
        return partMarkdown(p, message.parts, ctx)
      } catch {
        // Beklenmedik biçimdeki eski bir kayıt kopyanın tamamını düşürmesin.
        return ""
      }
    })
    .filter((s) => s.length > 0)
    .join("\n\n")
}
