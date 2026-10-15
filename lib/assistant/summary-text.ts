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
  // Eşleşme yoksa kart yeniden aratmayı sunuyor (bkz. UnmatchedProductList);
  // servis hatasında yeni bir ad işe yaramayacağı için o cümle eklenmez.
  const canRename = matches.some((m) => m.lookupStatus === "no_match")
  const unmatchedPart = unmatched.length
    ? ` ${joinTr(unmatched.map(capitalizeTr))} eşleştirilemedi, toplama dahil değil.` +
      (canRename
        ? " İstersen aşağıdan başka bir adla yeniden aratabilirsin."
        : "")
    : ""

  // Rozetle aynı kaynak: Sepet Özeti'nde gösterilen dökümlerde farklı boyutlu
  // satırı olan kalemler. Kalemin temsilcisine bakmak yetmiyor; ürün marketten
  // markete değişiyor.
  const shown = [
    ...single.allocation,
    ...(hasFullCombo ? combo.allocation : []),
  ]
  const mismatched = [
    ...new Set(shown.filter((a) => a.sizeMismatch).map((a) => a.rawName)),
  ]
  const mismatchPart = mismatched.length
    ? ` ${joinTr(mismatched.map(capitalizeTr))} için istediğin boyut her markette yok; o marketlerde en yakın boyutu aldım ve Sepet Özeti'nde farklı boyut olarak işaretledim.`
    : ""

  return `Sepet Özeti hazır. ${plan}${unmatchedPart}${mismatchPart}`
}

/**
 * Metin turunda kalemler çıkınca onay kartının üstüne yazılan cümle.
 *
 * Eskiden sabit bir buyruktu ("Kontrol edip düzeltmelerini yap, ardından
 * karşılaştırma için onayla.") ve kullanıcıya sert, yönetir gibi geliyordu.
 * Artık neyin hazırlandığını söyler (yemek adı ya da listenin güncellendiği)
 * ve kalan adımı öneri diliyle bırakır.
 */
export function buildDraftText(draft: {
  items: readonly unknown[]
  dishName?: string | null
  revision?: boolean
}): string {
  const n = draft.items.length
  const dish = draft.dishName?.trim()
  const lead = draft.revision
    ? `Listeni güncelledim, şimdi ${n} kalem var.`
    : dish
      ? `${capitalizeTr(dish)} için ${n} temel malzemeyi hazırladım.`
      : `Listendeki ${n} kalemi hazırladım.`
  return `${lead} Dilersen miktarları değiştirebilir, kalem ekleyip çıkarabilirsin. Hazır olduğunda Onayla'ya basman yeterli, en uygun marketleri bulayım.`
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
