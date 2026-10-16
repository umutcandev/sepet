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

type DraftItem = {
  name: string
  searchQuery: string
  quantity: number
  unit: string
  note?: string | null
}

const norm = (s: string | null | undefined) =>
  (s ?? "").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ")

/** Kalemi notu HARİÇ tanımlayan anahtar: ad, sorgu, miktar, birim. */
const itemKey = (it: DraftItem) =>
  [norm(it.name), norm(it.searchQuery), it.quantity, it.unit].join("\u0000")

/**
 * Yeni taslağı bir önceki listeyle kıyaslar.
 * - `sameItems`: notlar dışında kalemler birebir aynı (sıra önemsiz).
 * - `notes`: yeni taslakta notu olan ve önceki listede aynı notu taşımayan
 *   kalemler, yani bu turda eklenen ya da değişen tercihler.
 */
export function diffDraft(
  prev: readonly DraftItem[],
  next: readonly DraftItem[]
): { sameItems: boolean; notes: Array<{ name: string; note: string }> } {
  const counts = new Map<string, number>()
  for (const it of prev)
    counts.set(itemKey(it), (counts.get(itemKey(it)) ?? 0) + 1)
  let sameItems = prev.length === next.length
  for (const it of next) {
    const k = itemKey(it)
    const left = counts.get(k) ?? 0
    if (left === 0) {
      sameItems = false
      break
    }
    counts.set(k, left - 1)
  }

  const prevNotes = new Map<string, string>()
  for (const it of prev) {
    if (it.note?.trim())
      prevNotes.set(norm(it.searchQuery) || norm(it.name), norm(it.note))
  }
  const notes = next.flatMap((it) => {
    const note = it.note?.trim()
    if (!note) return []
    const before = prevNotes.get(norm(it.searchQuery) || norm(it.name))
    return before === norm(note) ? [] : [{ name: it.name.trim(), note }]
  })
  return { sameItems, notes }
}

const EDIT_HINT =
  "Ürün adında yazmayan bir özelliği her zaman ayırt edemeyebilirim. Öyle olursa Sepet Özeti'nde o satırdaki Değiştir ile ürünü kendin seçebilirsin."

const APPROVE_TAIL =
  "Hazır olduğunda Onayla'ya basman yeterli, en uygun marketleri bulayım."

/** "Kuru fasulye için notunu ekledim: konserve olmasın." */
function notesSentence(notes: Array<{ name: string; note: string }>): string {
  if (notes.length === 0) return ""
  if (notes.length === 1) {
    const [n] = notes
    return `${capitalizeTr(n.name)} için notunu ekledim: ${n.note}.`
  }
  return `Notlarını ekledim: ${joinTr(notes.map((n) => `${n.name} için ${n.note}`))}.`
}

/**
 * Metin turunda kalemler çıkınca onay kartının üstüne yazılan cümle.
 *
 * Eskiden sabit bir buyruktu ("Kontrol edip düzeltmelerini yap, ardından
 * karşılaştırma için onayla.") ve kullanıcıya sert, yönetir gibi geliyordu.
 * Artık neyin hazırlandığını söyler (yemek adı ya da listenin güncellendiği)
 * ve kalan adımı öneri diliyle bırakır.
 *
 * `previous` sohbetteki son liste (bkz. lastBasketItems). Verildiğinde metin
 * gerçekte ne değiştiğini söyler: kullanıcı bir ürüne itiraz etti ama liste
 * aynı kaldıysa "Listeni güncelledim" demek onu yanıltırdı.
 */
export function buildDraftText(
  draft: {
    items: readonly DraftItem[]
    dishName?: string | null
    revision?: boolean
  },
  previous?: readonly DraftItem[] | null
): string {
  const n = draft.items.length
  const dish = draft.dishName?.trim()
  const diff = previous ? diffDraft(previous, draft.items) : null
  const notes = diff
    ? diff.notes
    : draft.items.flatMap((it) =>
        it.note?.trim() ? [{ name: it.name.trim(), note: it.note.trim() }] : []
      )

  if (draft.revision && diff?.sameItems) {
    if (notes.length > 0) {
      return `${notesSentence(notes)} Onayladığında ürünleri buna göre seçeceğim. ${EDIT_HINT}`
    }
    return `Listende bir değişiklik yapmadım, kalemler aynı. Sepet Özeti'nde seçilen bir ürünü beğenmediysen o satırdaki Değiştir ile başka bir ürün seçebilirsin. Listeyi değiştirmek istersen ne değişeceğini yazman yeterli.`
  }

  const lead = draft.revision
    ? `Listeni güncelledim, şimdi ${n} kalem var.`
    : dish
      ? `${capitalizeTr(dish)} için ${n} temel malzemeyi hazırladım.`
      : `Listendeki ${n} kalemi hazırladım.`
  const notePart = notes.length > 0 ? ` ${notesSentence(notes)}` : ""
  return `${lead}${notePart} Dilersen miktarları değiştirebilir, kalem ekleyip çıkarabilirsin. ${APPROVE_TAIL}`
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
