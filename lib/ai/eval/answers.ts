import type { FrozenGrouping } from "./types"

/**
 * taxonomy-sheet.md'ye yazılan serbest cevabın ayrıştırılmış hali. Sözleşme
 * groups.json olduğu için burada yalnızca GRUP HARFLERİ çözülür; harflerin
 * hangi productId'lere karşılık geldiği donmuş dosyadan okunur (§6.2).
 */
export type ParsedAnswer = {
  term: string
  raw: { accept: string; primary: string; note: string }
  /** Kabul edilen grup id'leri. "hiçbiri" cevabında boş. */
  accept: string[]
  /** `A?` ile kararsız işaretlenenler — hiçbir listeye girmez. */
  unsure: string[]
  /** Açıkça reddedilenler (accept ∪ unsure dışındaki tüm gruplar). */
  reject: string[]
  /** "hiçbiri" cevabı: eval boş küme bekler. */
  expectEmpty: boolean
  /** "ATLA": bu gıda taksonomiye girmez. */
  skip: boolean
  /** PRIMARY: kart hangi gruptan seçilmeli. Boşsa ölçülmez. */
  primaryGroups: string[]
  /** PRIMARY serbest kural ("en ucuz beyaz peynir") — build zamanında çözülür. */
  primaryRule: string | null
  /** Ayrıştırılamayan / şüpheli noktalar; sorulmadan koda dökülmez. */
  issues: string[]
}

const low = (s: string) => s.toLocaleLowerCase("tr-TR")
const letters = (s: string): string[] => s.match(/\b[A-Z]\b/g) ?? []

/** `A?` işaretli harfler — kararsız. */
const unsureLetters = (s: string) =>
  [...s.matchAll(/\b([A-Z])\s*\?/g)].map((m) => m[1])

export function parseAnswer(
  grouping: FrozenGrouping,
  raw: { accept: string; primary: string; note: string },
): ParsedAnswer {
  const all = grouping.groups.map((g) => g.id)
  const known = new Set(all)
  const issues: string[] = []

  const a = raw.accept.trim()
  const la = low(a)
  const unsure = [...new Set(unsureLetters(a))]

  let accept: string[] = []
  let expectEmpty = false
  const skip = la === "atla"

  if (skip || a === "") {
    accept = []
  } else if (la.includes("hiçbiri")) {
    expectEmpty = true
  } else if (la.includes("hariç")) {
    // "E+F+G hariç HEPSİ" — hariç'ten ÖNCEKİ harfler elenir.
    const excluded = letters(a.split(/hariç/i)[0])
    accept = all.filter((id) => !excluded.includes(id))
  } else if (la.includes("hepsi")) {
    accept = [...all]
  } else {
    const picked = letters(a).filter((l) => !unsure.includes(l))
    const dup = picked.filter((l, i) => picked.indexOf(l) !== i)
    if (dup.length > 0) issues.push(`KABUL'da tekrar eden harf: ${[...new Set(dup)].join(", ")}`)
    accept = [...new Set(picked)]
  }

  const unknown = [...accept, ...unsure].filter((l) => !known.has(l))
  if (unknown.length > 0) {
    issues.push(`KABUL'da bu terimde olmayan harf: ${[...new Set(unknown)].join(", ")}`)
  }
  accept = accept.filter((l) => known.has(l) && !unsure.includes(l))

  const reject = all.filter((id) => !accept.includes(id) && !unsure.includes(id))

  // ─── PRIMARY ───
  const p = raw.primary.trim()
  const lp = low(p)
  let primaryGroups: string[] = []
  let primaryRule: string | null = null

  if (p === "" || lp === "farketmez" || lp === "-") {
    // ölçülmez
  } else if (lp.includes("hepsi") || lp.includes("hiçbiri")) {
    issues.push(
      `PRIMARY="${p}" tek bir tür seçimi değil; "farketmez" mi kastedildi?`,
    )
  } else {
    const pl = [...new Set(letters(p))].filter((l) => known.has(l))
    const pUnknown = [...new Set(letters(p))].filter((l) => !known.has(l))
    if (pUnknown.length > 0) {
      issues.push(`PRIMARY'de bu terimde olmayan harf: ${pUnknown.join(", ")}`)
    }
    // Harf DIŞINDA anlamlı metin varsa kural olarak taşınır.
    const rest = p.replace(/\b[A-Z]\b|[+,\s]/g, "").trim()
    if (rest.length > 0) primaryRule = p
    primaryGroups = pl
    const notAccepted = pl.filter((l) => !accept.includes(l))
    if (notAccepted.length > 0 && !expectEmpty) {
      issues.push(
        `PRIMARY ${notAccepted.join(", ")} grubunu gösteriyor ama o grup KABUL'da değil`,
      )
    }
    if (/\+\s*$/.test(p)) issues.push(`PRIMARY yarım kalmış: "${p}"`)
  }

  return {
    term: grouping.term,
    raw,
    accept,
    unsure,
    reject,
    expectEmpty,
    skip,
    primaryGroups,
    primaryRule,
    issues,
  }
}

/**
 * Adım 9'da verilen KÜRESEL karar: organik varyant HER terimde kabul edilir.
 *
 * YALNIZ organik/diyet grubunun üyelerine uygulanır, tüm red listesine değil.
 * Ham ad deseni denendi ve yanlış ürünleri yakaladı: "domates" için organik
 * domates SALÇASI, "salatalık" için organik salatalık TURŞUSU, "ketçap" için
 * organik elma SİRKESİ. Ürün tipi zaten reddedilmişse organik hali de reddedilir.
 *
 * Grup içinde ad deseni gerekiyor çünkü çoğu terimde organik, light/laktozsuz/
 * glutensiz ile aynı kovada; karar "organik kabul" olduğu için diyet ve tıbbi
 * varyantlar (MATCH_PROMPT kural 9) red listesinde kalır.
 */
export const ACCEPT_ORGANIC = /organ[iı]k|\bb[iı]o\b/
const DIET_GROUP = /d[iı]yet|organ[iı]k/i

export type Assertions = {
  mustAccept: string[]
  mustReject: string[]
  primaryIn: string[]
  nonEmpty: boolean
  /** Küresel organik kuralı gereği red'den kabule taşınan adaylar. */
  organicMoved: string[]
}

/**
 * Cevabı 72 adayın her birine uygulanan kesin kurala çevirir. Düz küme
 * birleşimi: "A" harfinin hangi ürünleri ifade ettiği groups.json'da zaten
 * yazılı (§6.2). Kararsız (`?`) gruplar ve GRUPLANAMAYAN kova hiçbir listeye
 * girmez.
 */
export function deriveAssertions(
  grouping: FrozenGrouping,
  ans: ParsedAnswer,
  nameOf: (productId: string) => string,
  /**
   * Bir adayın DİYET kuralı olmasaydı düşeceği grup. Organik aday ancak bu
   * grup da kabul edilmişse taşınır: "irmik" havuzundaki organik UN ya da
   * "makarna"daki organik SEBZELİ makarna, tipi reddedildiği için kalmalı.
   */
  dietFreeGroupOf: (productId: string) => string | null = () => null,
): Assertions {
  const members = (ids: string[]) =>
    ids.flatMap((id) => grouping.groups.find((g) => g.id === id)?.members ?? [])

  const accept = new Set(members(ans.accept))
  const reject = new Set(members(ans.reject))

  const dietMembers = new Set(
    grouping.groups.filter((g) => DIET_GROUP.test(g.label)).flatMap((g) => g.members),
  )
  const organicMoved: string[] = []
  for (const id of [...reject]) {
    if (!dietMembers.has(id)) continue
    if (!ACCEPT_ORGANIC.test(nameOf(id).toLocaleLowerCase("tr-TR"))) continue
    // Asıl evi bilinmiyorsa taşıma YAPILMAZ — kural bilerek opt-in.
    const home = dietFreeGroupOf(id)
    if (home === null || !ans.accept.includes(home)) continue
    reject.delete(id)
    accept.add(id)
    organicMoved.push(id)
  }

  // "hiçbiri": tüm gruplar red, kabul boş, boş küme bekleniyor.
  if (ans.expectEmpty) {
    return {
      mustAccept: [],
      mustReject: grouping.groups.flatMap((g) => g.members),
      primaryIn: [],
      nonEmpty: false,
      organicMoved: [],
    }
  }

  const primaryIn = ans.primaryGroups.length > 0 ? members([ans.primaryGroups[0]]) : []

  return {
    mustAccept: [...accept],
    mustReject: [...reject],
    primaryIn: primaryIn.filter((id) => accept.has(id)),
    nonEmpty: accept.size > 0,
    organicMoved,
  }
}

/** Doldurulmuş şablonu blok blok okur. */
export function parseSheet(markdown: string): Array<{
  term: string
  accept: string
  primary: string
  note: string
}> {
  const out: Array<{ term: string; accept: string; primary: string; note: string }> = []
  let cur: (typeof out)[number] | null = null
  for (const line of markdown.split(/\r?\n/)) {
    const head = line.match(/^## \d+\/\d+ · (.+?)\s{2,}·/)
    if (head) {
      cur = { term: head[1].trim(), accept: "", primary: "", note: "" }
      out.push(cur)
      continue
    }
    if (!cur) continue
    const k = line.match(/^KABUL\s*:\s*(.*)$/)
    if (k) cur.accept = k[1].trim()
    const p = line.match(/^PRIMARY\s*:\s*(.*)$/)
    if (p) cur.primary = p[1].trim()
    const n = line.match(/^NOT\s*:\s*(.*)$/)
    if (n) cur.note = n[1].trim()
  }
  return out
}
