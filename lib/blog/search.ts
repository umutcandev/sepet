// İstemci tarafı blog arama çekirdeği. Veri build-time'da hazır (Velite); arama
// tamamen tarayıcıda, ağ gecikmesi olmadan çalışır → tek harfte bile anında.
// Burada framework yok: saf eşleştirme + highlight aralıkları. UI render'ı
// blog-toolbar.tsx'te.
import { type CategoryId } from "@/lib/blog/categories"

// Aramaya/sonuç kartına giren hafif belge. Post'un ağır alanları (derlenmiş MDX
// content, ham gövde, toc) İSTEMCİYE TAŞINMAZ; yalnız bu alanlar gönderilir.
export type SearchDoc = {
  slug: string
  title: string
  description: string
  permalink: string
  category: CategoryId
  categoryLabel: string
  dateLabel: string
  publishedAt: string
  tags: string[]
}

// [başlangıç, bitiş) — ham metin üzerindeki eşleşme aralığı (highlight için).
export type Highlight = [start: number, end: number]

export type SearchResult = {
  doc: SearchDoc
  titleHl: Highlight[]
  descHl: Highlight[]
}

// Türkçe-dostu harf katlama. Aksanı ve i/ı–s/ş gibi ayrımları siler ki "saglik"
// → "Sağlık", "kesisim" → "Kesişim" eşleşsin. KRİTİK: her giriş kod birimi tek
// kod birimine eşlenir (uzunluk korunur) → katlanmış metindeki eşleşme indeksi
// HAM metne birebir uyar, böylece highlight kayması olmaz.
const FOLD: Record<string, string> = {
  ı: "i",
  İ: "i",
  I: "i",
  i: "i",
  ş: "s",
  Ş: "s",
  ğ: "g",
  Ğ: "g",
  ü: "u",
  Ü: "u",
  ö: "o",
  Ö: "o",
  ç: "c",
  Ç: "c",
}

function foldChar(ch: string): string {
  const mapped = FOLD[ch]
  if (mapped) return mapped
  const lower = ch.toLowerCase()
  // toLowerCase Latin harfler için 1:1; tek çok-birimli istisna (İ) yukarıda.
  return lower.length === 1 ? lower : ch
}

/** Metni eşleştirme için normalize eder (uzunluk korunur). */
export function fold(text: string): string {
  let out = ""
  for (let i = 0; i < text.length; i++) out += foldChar(text[i])
  return out
}

/** Sorguyu katlanmış terimlere böler (boşlukla ayrılmış, boşlar atılır). */
function tokenize(query: string): string[] {
  return fold(query.trim()).split(/\s+/).filter(Boolean)
}

// Bir belgeyi puanlar; terimlerin TÜMÜ bir yerde geçmeli (AND), yoksa null
// (eşleşme yok). Başlık eşleşmesi açıklamadan, açıklama meta'dan ağır basar.
function scoreDoc(doc: SearchDoc, terms: string[]): number | null {
  const title = fold(doc.title)
  const desc = fold(doc.description)
  const meta = fold(`${doc.categoryLabel} ${doc.tags.join(" ")}`)
  let score = 0
  for (const term of terms) {
    const inTitle = title.includes(term)
    const inDesc = desc.includes(term)
    const inMeta = meta.includes(term)
    if (!inTitle && !inDesc && !inMeta) return null
    if (inTitle) score += title.startsWith(term) ? 6 : 4
    if (inDesc) score += 2
    if (inMeta) score += 1
  }
  return score
}

// Verilen terimlerin katlanmış metindeki tüm geçişlerini bulur, çakışanları
// birleştirir → highlight aralıkları.
function rangesFor(folded: string, terms: string[]): Highlight[] {
  const ranges: Highlight[] = []
  for (const term of terms) {
    let from = 0
    let idx = folded.indexOf(term, from)
    while (idx !== -1) {
      ranges.push([idx, idx + term.length])
      from = idx + term.length
      idx = folded.indexOf(term, from)
    }
  }
  if (ranges.length <= 1) return ranges
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Highlight[] = [ranges[0]]
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1]
    const cur = ranges[i]
    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1])
    else merged.push(cur)
  }
  return merged
}

/** Belgeleri sorguya göre filtreler, puanlar ve highlight aralıklarıyla döner. */
export function searchDocs(
  docs: SearchDoc[],
  query: string,
  limit = 8,
): SearchResult[] {
  const terms = tokenize(query)
  if (terms.length === 0) return []
  const scored: { doc: SearchDoc; score: number }[] = []
  for (const doc of docs) {
    const score = scoreDoc(doc, terms)
    if (score !== null) scored.push({ doc, score })
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      +new Date(b.doc.publishedAt) - +new Date(a.doc.publishedAt),
  )
  return scored.slice(0, limit).map(({ doc }) => ({
    doc,
    titleHl: rangesFor(fold(doc.title), terms),
    descHl: rangesFor(fold(doc.description), terms),
  }))
}
