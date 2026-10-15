import type { MatchResult, ReceiptComparison } from "@/lib/ai/schemas"
import { STALE_DAY_THRESHOLD } from "@/lib/receipt-staleness"

function formatTL(n: number) {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Fiş ile bugünü kıyaslarken YALNIZCA bugün fiyatı bulunabilen kalemler
 * sayılmalı. `totalReceiptAmount` kalemlerin tamamını, `totalBestAmount` ise
 * sadece eşleşenleri topladığından ikisini doğrudan çıkarmak, bulunamayan her
 * kalemi "bugün 0 TL" saymak demektir; uçta hiçbir kalem eşleşmezse "207,15 TL
 * harcadın, bugün 0,00 TL'ye gelir, 207,15 TL tasarruf" gibi tamamen yanlış
 * bir sonuç çıkar.
 *
 * Toplananlar paket fiyatlarıdır, satır tutarları değil (bkz.
 * ReceiptComparison) — cümledeki tabanla ekrandaki taban aynı olmalı.
 */
function comparableTotals(items: ReceiptComparison["items"]): {
  count: number
  receiptTotal: number
} {
  const matched = items.filter(
    (i) => i.bestPrice != null && i.receiptUnitPrice != null
  )
  return {
    count: matched.length,
    // Paket başına — `totalBestAmount` ile aynı taban (bkz. ReceiptComparison).
    receiptTotal: matched.reduce((s, i) => s + (i.receiptUnitPrice ?? 0), 0),
  }
}

export function buildReceiptComparisonText(comp: ReceiptComparison): string {
  if (comp.items.length === 0) {
    return "Fişindeki kalemleri çıkardım ama eşleşen ürün bulamadım."
  }

  const comparable = comparableTotals(comp.items)
  // Kalemler okundu ama hiçbirine bugünden fiyat bulunamadı → kıyaslanacak bir
  // şey yok. Tutar cümlesi kurmak burada yanlış sayı üretir.
  if (comparable.count === 0) {
    return `Fişindeki ${comp.items.length} kalemi okudum ama hiçbiri için güncel market fiyatı bulamadım. Bu yüzden bir karşılaştırma yapamadım.`
  }
  // Kısmi eşleşmede hangi kümeden konuştuğumuz açık olmalı; okuyucu aksi halde
  // rakamları fişin tamamı sanır.
  const scopeNote =
    comparable.count < comp.items.length
      ? ` (${comp.items.length} kalemden ${comparable.count} tanesi için fiyat bulunabildi)`
      : ""

  if (comp.staleness?.isStale) {
    // İşaretli fark: pozitif → bugün daha ucuz (tasarruf mümkün), negatif →
    // bugün daha pahalı. comp.totalSavingsTL kalem bazında Math.max(0, …) ile
    // toplandığı için her zaman ≥ 0; "iki tutar neredeyse aynı" mı yoksa
    // "bugün çok daha pahalı" mı ayrımı için ham farkı kullanmamız şart.
    const diff = comparable.receiptTotal - comp.totalBestAmount
    const tolerance = Math.max(
      1,
      Math.max(comparable.receiptTotal, comp.totalBestAmount) * 0.02
    )
    const figuresPart = (() => {
      const head = `Yine de bilgi amaçlı: fişteki paket fiyatlarının toplamı ${formatTL(comparable.receiptTotal)} TL, aynı ürünlerin bugünkü en iyi paket fiyatları ${formatTL(comp.totalBestAmount)} TL${scopeNote}.`
      if (Math.abs(diff) <= tolerance) {
        return `${head} İki tutar neredeyse aynı.`
      }
      if (diff > 0) {
        return `${head} Bugüne kıyasla yaklaşık ${formatTL(diff)} TL tasarruf mümkün olurdu.`
      }
      return `${head} Bugün aynı sepeti almak yaklaşık ${formatTL(Math.abs(diff))} TL daha pahalıya geliyor.`
    })()
    if (comp.staleness.reason === "date" && comp.staleness.ageLabel) {
      return `Bu fiş ${comp.staleness.ageLabel} öncesine ait. O dönemin fiyatları bugünkü piyasayla birebir karşılaştırılamaz, bu yüzden tasarruf hesabı tam olarak anlamlı değil. ${figuresPart}`
    }
    return `Fişindeki tutar bugünkü fiyatlarla kıyaslanamayacak kadar düşük görünüyor. Büyük olasılıkla farklı bir döneme ait, tasarruf hesabı birebir anlamlı değil. ${figuresPart}`
  }
  if (comp.totalSavingsTL <= 0) {
    return `Fişteki paket fiyatlarının toplamı ${formatTL(comparable.receiptTotal)} TL; bulduğumuz en iyi fiyatlar buna zaten yakın, ek bir kazanç çıkmadı${scopeNote}.`
  }
  // Karşılaştırmanın tabanı cümlede geçmezse okuyucu rakamı fişin genel
  // toplamıyla kıyaslar ve tutarsız bulur — taban paket başınadır.
  return `Fişteki paket fiyatlarının toplamı ${formatTL(comparable.receiptTotal)} TL. Aynı ürünlerin bugünkü en iyi paket fiyatları ${formatTL(comp.totalBestAmount)} TL, aradaki fark ${formatTL(comp.totalSavingsTL)} TL${scopeNote}. Karşılaştırma paket başına yapılır, aldığın adet fiyatı çarpmaz.`
}

const STALE_RATIO_THRESHOLD = 3

function formatAgeLabel(days: number): string {
  if (days < 30) return `~${Math.max(1, Math.round(days / 7))} hafta`
  if (days < 365) return `~${Math.round(days / 30)} ay`
  return `~${Math.round(days / 365)} yıl`
}

function computeStaleness(input: {
  purchaseDate: string | null
  totalReceiptAmount: number
  totalBestAmount: number
  itemCount: number
}): ReceiptComparison["staleness"] {
  if (input.itemCount === 0) return null

  let ageDays: number | null = null
  let ageLabel: string | null = null
  if (input.purchaseDate) {
    const d = new Date(input.purchaseDate)
    if (!Number.isNaN(d.getTime())) {
      ageDays = Math.floor((Date.now() - d.getTime()) / 86_400_000)
      if (ageDays >= 0) ageLabel = formatAgeLabel(ageDays)
    }
  }

  const priceRatio =
    input.totalReceiptAmount > 0
      ? input.totalBestAmount / input.totalReceiptAmount
      : null

  let reason: "date" | "ratio" | null = null
  if (ageDays != null && ageDays >= STALE_DAY_THRESHOLD) reason = "date"
  else if (priceRatio != null && priceRatio >= STALE_RATIO_THRESHOLD)
    reason = "ratio"

  return { isStale: reason !== null, reason, ageDays, ageLabel, priceRatio }
}

/** Onaylanan fiş kalemi (onay kartından gelen, doğrulanmış payload). */
export type ReceiptComparisonInputItem = {
  rawName: string
  quantity: number
  unitPrice: number | null
  totalPrice: number | null
}

/**
 * Kalemin bugünkü en iyi paket fiyatı: kabul edilen ürünlerin her marketteki
 * en ucuzu arasından en düşüğü (`marketOptions`). Sepet Özeti de aynı kümeyi
 * kullanır, yani tablo "Migros ₺X" dediğinde Sepet Özeti'nin Migros satırı
 * aynı ürün ve aynı fiyattır.
 *
 * Eskiden temsilci ürünün (`bestMatch`) en düşük fiyatı alınıyordu: aynı
 * markette daha ucuz kabul edilmiş başka bir ürün varsa tablo bir ürünü, Sepet
 * Özeti başka bir ürünü daha ucuza gösteriyordu.
 */
export function cheapestOption(match: MatchResult | undefined) {
  // Boyutu tutan seçenek önce: fişteki 1 l'lik ürün başka bir markette daha
  // ucuz diye 500 ml'likle kıyaslanmasın (bkz. buildMarketOptions). Eski
  // kayıtlarda seçenek işareti yok → kalemin işareti, yani yalnız fiyat.
  const fits = (opt: MatchResult["marketOptions"][number]) =>
    !(opt.sizeMismatch ?? match?.sizeMismatch ?? false)
  let best: MatchResult["marketOptions"][number] | null = null
  for (const opt of match?.marketOptions ?? []) {
    if (
      !best ||
      (fits(opt) !== fits(best)
        ? fits(opt)
        : opt.packagePrice < best.packagePrice)
    ) {
      best = opt
    }
  }
  return best
}

export function computeReceiptComparison(
  payloadItems: ReceiptComparisonInputItem[],
  matches: MatchResult[],
  purchaseDate: string | null
): ReceiptComparison {
  const items = payloadItems.map((it, idx) => {
    const match = matches[idx]
    const best = cheapestOption(match)
    // Rozet tabloda gösterilen ürüne ait (Sepet Özeti'ndeki gibi).
    const sizeMismatch = best?.sizeMismatch ?? match?.sizeMismatch ?? false
    const bestMarket = best?.market ?? null
    const bestPrice = best?.packagePrice ?? null
    // Fişte o satır için ödenen gerçek para (bağlam; karşılaştırmaya girmez).
    const receiptTotal =
      it.totalPrice ??
      (it.unitPrice != null ? it.unitPrice * it.quantity : null)
    // Karşılaştırma PAKET BAŞINA: `bestPrice` tek paketin raf fiyatı olduğu
    // için fiş tarafı da tek paket olmalı. Adetle çarpmak "3 ekmeğe ödenen
    // para"yı "1 ekmeğin fiyatı"yla kıyaslar ve tasarrufu şişirirdi; ayrıca
    // aynı karttaki `summary` toplamları da çarpımsız (bkz. effective-cost.ts).
    // OCR birim fiyatı okuyamadıysa satır toplamından türet.
    const receiptUnit =
      it.unitPrice ??
      (it.totalPrice != null && it.quantity > 0
        ? it.totalPrice / it.quantity
        : null)
    // Farklı boyutlu ürünle eşleşmişse fiyatlar kıyaslanamaz — tasarruf yazma.
    const savingsTL =
      !sizeMismatch && receiptUnit != null && bestPrice != null
        ? Math.max(0, receiptUnit - bestPrice)
        : null
    return {
      rawName: it.rawName,
      receiptUnitPrice: receiptUnit,
      receiptTotalPrice: receiptTotal,
      matchedProductId: best?.productId ?? null,
      matchedName: best?.productName ?? null,
      bestMarket,
      bestPrice,
      savingsTL,
      sizeMismatch,
    }
  })

  // Kartın altındaki iki toplam da PAKET BAŞINA. Fişin basılı genel toplamı
  // buraya girmez: farklı tabandaki iki sayıyı yan yana koymak karşılaştırmayı
  // anlamsız kılardı. Basılı toplam ayrı taşınır (`receipt.totalAmount`) ve
  // onay ekranında kalem silinse bile bu toplamlar güncel listeyi yansıtır.
  const totalReceiptAmount = items.reduce(
    (sum, i) => sum + (i.receiptUnitPrice ?? 0),
    0
  )
  const totalBestAmount = items.reduce((sum, i) => sum + (i.bestPrice ?? 0), 0)
  const totalSavingsTL = items.reduce((sum, i) => sum + (i.savingsTL ?? 0), 0)

  // Bayatlık oranı yalnızca KARŞILAŞTIRILABİLİR kalemler üzerinden anlamlıdır:
  // bugün fiyatı bulunamayan kalem totalBestAmount'a 0 katkı yapar, oysa fişteki
  // tutarı totalReceiptAmount'ta durur. İkisini bölmek, eşleşme oranı düştükçe
  // oranı yapay olarak küçültür.
  const comparable = comparableTotals(items)
  const staleness = computeStaleness({
    purchaseDate,
    totalReceiptAmount: comparable.receiptTotal,
    totalBestAmount,
    itemCount: comparable.count,
  })

  return {
    items,
    totalReceiptAmount,
    totalBestAmount,
    totalSavingsTL,
    staleness,
  }
}
