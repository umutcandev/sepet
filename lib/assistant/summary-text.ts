import type { MatchResult, OptimizationSummary } from "@/lib/ai/schemas"

/**
 * Sepet onayından sonra asistanın yazdığı kapanış metni.
 *
 * Metin kartların özetidir, tekrarı değil: kullanıcının asıl baktığı yer Sepet
 * Özeti olduğu için cümle oradaki öneriyle (bkz. OptimizationCard'ın sıralama
 * kuralı) aynı sırayla konuşur. Eşleştirilemeyen kalemler ve farklı boyut
 * yalnızca toplamı nasıl etkilediği kadar söylenir; ayrıntı kartlarda.
 */
export function buildSummaryText(
  summary: OptimizationSummary,
  matches: MatchResult[]
): string {
  const matchedCount = summary.totalItems
  const unmatched = matches
    .filter((m) => m.lookupStatus !== "ok" || !m.bestMatch)
    .map((m) => m.rawName)

  if (matchedCount === 0) {
    return "Listendeki kalemlerin hiçbiri için market fiyatı bulamadım, bu yüzden Sepet Özeti çıkaramadım. Kalemleri farklı bir adla yazıp tekrar deneyebilirsin."
  }

  const single = summary.singleMarket
  const combo = summary.twoMarketCombo
  const hasFullCombo = combo.markets.length === 2

  let plan: string
  if (single.isFullCoverage) {
    plan = `En ucuz tek market ${single.market}: ${matchedCount} kalemin tamamı ${formatTL(single.total)} TL.`
    plan +=
      hasFullCombo && combo.savingsTL > 0
        ? ` Alışverişi ${joinTr(combo.markets)} arasında bölersen ${formatTL(combo.savingsTL)} TL (%${formatPct(combo.savingsPct)}) daha az ödersin.`
        : " İki markete bölmek daha ucuza gelmiyor."
  } else if (hasFullCombo) {
    plan = `${matchedCount} kalemin tamamını tek bir market karşılamıyor; ${joinTr(combo.markets)} ikilisiyle sepetin tamamı ${formatTL(combo.total)} TL.`
  } else {
    plan = `${matchedCount} kalemin tamamını karşılayan bir market ya da market ikilisi yok; en çok kalemi ${single.market} karşılıyor: ${single.itemCount}/${matchedCount} kalem, ${formatTL(single.total)} TL.`
  }

  // "Eşleştirilemedi" edilgen ve tekil: Türkçede cansız çoğul özne tekil
  // fiil alır, ürün adına ek getirmek de gerekmez ("reçelini" vb.).
  const unmatchedPart = unmatched.length
    ? ` ${joinTr(unmatched.map(capitalizeTr))} eşleştirilemedi, toplama dahil değil.`
    : ""

  const mismatched = matches
    .filter((m) => m.sizeMismatch && m.bestMatch && m.lookupStatus === "ok")
    .map((m) => m.rawName)
  const mismatchPart = mismatched.length
    ? ` ${joinTr(mismatched.map(capitalizeTr))} için istediğin boyutu bulamadım; en yakın boyutla hesapladım ve Sepet Özeti'nde farklı boyut olarak işaretledim.`
    : ""

  return `Sepet Özeti hazır. ${plan}${unmatchedPart}${mismatchPart}`
}

function formatTL(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Yüzde etiketi. Küçük oranlarda tek hane ondalık anlamlı, büyük oranlarda
 * gürültü; her iki durumda da ayırıcı Türkçe virgül olmalı ("%11,4" — "%11.4"
 * değil).
 */
function formatPct(n: number): string {
  return n.toLocaleString("tr-TR", {
    maximumFractionDigits: n < 10 ? 1 : 0,
  })
}

/** "kuru fasulye" → "Kuru fasulye" (Türkçe i/İ kuralına uyar). */
function capitalizeTr(s: string): string {
  if (!s) return s
  return s[0].toLocaleUpperCase("tr-TR") + s.slice(1)
}

/** ["a"] → "a", ["a","b"] → "a ve b", ["a","b","c"] → "a, b ve c". */
function joinTr(parts: string[]): string {
  if (parts.length <= 1) return parts.join("")
  return `${parts.slice(0, -1).join(", ")} ve ${parts[parts.length - 1]}`
}
