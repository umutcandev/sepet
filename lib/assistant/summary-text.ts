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
  const pair = joinTr(combo.markets)

  const lines: string[] = []
  if (single.isFullCoverage) {
    lines.push(
      bullet("En ucuz tek market", `${single.market}, ${formatTL(single.total)} TL.`),
      bullet(
        "İki markete bölersen",
        hasFullCombo && combo.savingsTL > 0
          ? `${pair} ile ${formatTL(combo.total)} TL, yani ${formatTL(combo.savingsTL)} TL daha az.`
          : "Daha ucuza gelmiyor."
      )
    )
  } else if (hasFullCombo) {
    lines.push(
      bullet("Tek market", "Listenin tamamı hiçbir markette yok."),
      bullet("İki markete bölersen", `${pair} ile listenin tamamı ${formatTL(combo.total)} TL.`)
    )
  } else {
    lines.push(
      bullet(
        "Tek market",
        `Listenin tamamı hiçbir markette yok. ${single.market}, ${matchedCount} kalemden ${single.itemCount} tanesini ${formatTL(single.total)} TL'ye karşılıyor.`
      ),
      bullet("İki markete bölersen", "Listenin tamamını karşılayan iki market de yok.")
    )
  }

  // Rozetle aynı kaynak: gösterilen dökümlerde farklı boyutlu satırı olan kalemler.
  const shown = [
    ...single.allocation,
    ...(hasFullCombo ? combo.allocation : []),
  ]
  const mismatched = [
    ...new Set(shown.filter((a) => a.sizeMismatch).map((a) => a.rawName)),
  ]
  if (mismatched.length) {
    lines.push(
      bullet(
        "Farklı boyut",
        `${names(mismatched)} bazı marketlerde istediğin boyutta yok, yerine en yakın boyutu seçtim.`
      )
    )
  }

  if (unmatched.length) {
    lines.push(
      bullet("Eşleşmeyen", `${names(unmatched)} için fiyat bulamadım, toplama eklemedim.`)
    )
  }

  // Servis hatasında yeni ad işe yaramaz; yeniden aratma yalnız no_match'te.
  const canRename = matches.some((m) => m.lookupStatus === "no_match")
  const tail = canRename
    ? "\n\nİstersen bunları aşağıdan başka bir adla tekrar aratabilirsin."
    : ""

  return `Sepet Özeti hazır.\n\n${lines.join("\n")}${tail}`
}

const bullet = (label: string, body: string) => `- **${label}:** ${body}`

/** ["tavuk göğsü","kaşar"] → "Tavuk göğsü ve kaşar" */
const names = (list: string[]) => capitalizeTr(joinTr(list))

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
