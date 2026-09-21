import type { CapturedCandidate, FrozenGroup, FrozenGrouping, Split } from "./types"

/**
 * Bir terimin ürün türü kuralı. Sıra ÖNEMLİ: bir aday eşleşen İLK kurala
 * girer, yani özel kural (light varyant, rende) genel kuralın (beyaz peynir)
 * ÜSTÜNDE yazılır.
 */
export type GroupRule = { label: string; match: RegExp }

/** Regex'ler Türkçe küçük harfe göre yazılır ("İçim" → "içim"). */
export const norm = (s: string) => s.toLocaleLowerCase("tr-TR")

const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/**
 * Adayları kurallara göre kümeler ve harfleri ADAY SAYISINA göre (büyükten
 * küçüğe) dağıtır — kararı belirleyen grup şablonda hep üstte olur. Hiçbir
 * kurala uymayanlar "_" (GRUPLANAMAYAN) kovasına düşer ve assertion üretmez.
 */
export function groupCandidates(
  input: {
    term: string
    category: string
    split: Split
    candidates: CapturedCandidate[]
  },
  rules: GroupRule[],
): FrozenGrouping {
  const buckets = rules.map(() => [] as string[])
  const ungrouped: string[] = []

  for (const c of input.candidates) {
    const name = norm(c.name)
    const idx = rules.findIndex((r) => r.match.test(name))
    if (idx === -1) ungrouped.push(c.productId)
    else buckets[idx].push(c.productId)
  }

  const groups: FrozenGroup[] = rules
    .map((r, i) => ({ label: r.label, members: buckets[i], order: i }))
    .filter((g) => g.members.length > 0)
    .sort((a, b) => b.members.length - a.members.length || a.order - b.order)
    .map((g, i) => ({
      id: GROUP_LETTERS[i] ?? `G${i}`,
      label: g.label,
      members: g.members,
    }))

  return {
    term: input.term,
    category: input.category,
    split: input.split,
    candidateCount: input.candidates.length,
    groups,
    ungrouped,
  }
}

/** Gruplamanın sağlık kontrolü — §6.2'deki dört kontrolden ikisi otomatik. */
export function groupingWarnings(g: FrozenGrouping): string[] {
  const warnings: string[] = []
  const ratio = g.candidateCount > 0 ? g.ungrouped.length / g.candidateCount : 0
  if (ratio > 0.25) {
    warnings.push(
      `gruplanamayan ${g.ungrouped.length}/${g.candidateCount} (%${Math.round(ratio * 100)}) — gruplama zayıf`,
    )
  }
  if (g.groups.length < 2) warnings.push("2'den az grup — kararı anlamsızlaştırır")
  if (g.groups.length > 12) warnings.push(`${g.groups.length} grup — şablon okunmaz`)
  return warnings
}
