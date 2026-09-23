import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { groupCandidates, groupingWarnings, norm, type GroupRule } from "./taxonomy"
import { GROUPING } from "./grouping"
import { TERMS, termSlug } from "./terms"
import type { CapturedCandidate } from "./types"

const cand = (productId: string, name: string): CapturedCandidate => ({
  productId,
  name,
  brand: null,
  category: null,
  marketCount: 1,
  minPrice: null,
  maxPrice: null,
  markets: [],
})

const input = (candidates: CapturedCandidate[]) => ({
  term: "test",
  category: "Test",
  split: "train" as const,
  candidates,
})

describe("groupCandidates", () => {
  const rules: GroupRule[] = [
    { label: "Light varyant", match: /l[iı]ght/ },
    { label: "Beyaz peynir", match: /beyaz peynir/ },
    { label: "Sade peynir", match: /peynir/ },
  ]

  test("aday eşleşen İLK kurala girer — özel kural genelin önünde", () => {
    const g = groupCandidates(
      input([cand("p1", "Sütaş Light Beyaz Peynir 500 Gr")]),
      rules,
    )
    assert.equal(g.groups[0].label, "Light varyant")
    assert.deepEqual(g.groups[0].members, ["p1"])
  })

  test("harfler aday sayısına göre büyükten küçüğe dağıtılır", () => {
    const g = groupCandidates(
      input([
        cand("p1", "Light Peynir"),
        cand("p2", "Torku Beyaz Peynir"),
        cand("p3", "İçim Beyaz Peynir"),
        cand("p4", "Mis Beyaz Peynir"),
      ]),
      rules,
    )
    assert.equal(g.groups[0].id, "A")
    assert.equal(g.groups[0].label, "Beyaz peynir")
    assert.equal(g.groups[0].members.length, 3)
    assert.equal(g.groups[1].id, "B")
  })

  test("boş gruplar harf almaz", () => {
    const g = groupCandidates(input([cand("p1", "Torku Beyaz Peynir")]), rules)
    assert.equal(g.groups.length, 1)
  })

  test("hiçbir kurala uymayan aday GRUPLANAMAYAN kovasına düşer", () => {
    const g = groupCandidates(input([cand("p9", "Pınar Süt 1 L")]), rules)
    assert.deepEqual(g.ungrouped, ["p9"])
    assert.equal(g.groups.length, 0)
  })

  test("Türkçe küçük harf normalizasyonu uygulanır", () => {
    // "İçim" → "içim"; regex'ler küçük harfe göre yazılır.
    assert.equal(norm("İÇİM Beyaz Peynir"), "içim beyaz peynir")
    const g = groupCandidates(input([cand("p1", "İÇİM BEYAZ PEYNİR")]), rules)
    assert.equal(g.groups[0].label, "Beyaz peynir")
  })
})

describe("groupingWarnings", () => {
  const base = { term: "t", category: "c", split: "train" as const }

  test("gruplanamayan kova %25'i aşarsa uyarır", () => {
    const w = groupingWarnings({
      ...base,
      candidateCount: 10,
      groups: [
        { id: "A", label: "x", members: ["1", "2", "3"] },
        { id: "B", label: "y", members: ["4"] },
      ],
      ungrouped: ["5", "6", "7", "8", "9", "10"],
    })
    assert.ok(w.some((m) => m.includes("gruplanamayan")))
  })

  test("tek gruplu terim uyarı verir", () => {
    const w = groupingWarnings({
      ...base,
      candidateCount: 3,
      groups: [{ id: "A", label: "x", members: ["1", "2", "3"] }],
      ungrouped: [],
    })
    assert.ok(w.some((m) => m.includes("2'den az grup")))
  })

  test("sağlıklı gruplama uyarı vermez", () => {
    const w = groupingWarnings({
      ...base,
      candidateCount: 4,
      groups: [
        { id: "A", label: "x", members: ["1", "2"] },
        { id: "B", label: "y", members: ["3", "4"] },
      ],
      ungrouped: [],
    })
    assert.deepEqual(w, [])
  })
})

describe("GROUPING tablosu", () => {
  test("84 terimin tamamı için kural var", () => {
    const missing = TERMS.filter((t) => !GROUPING[t.term]).map((t) => t.term)
    assert.deepEqual(missing, [])
  })

  test("tablo fazladan terim içermez", () => {
    const known = new Set(TERMS.map((t) => t.term))
    assert.deepEqual(Object.keys(GROUPING).filter((k) => !known.has(k)), [])
  })

  test("her terimin en az 1 kuralı ve benzersiz etiketleri var", () => {
    for (const [term, rules] of Object.entries(GROUPING)) {
      assert.ok(rules.length >= 1, `${term}: kural yok`)
      const labels = rules.map((r) => r.label)
      assert.equal(new Set(labels).size, labels.length, `${term}: tekrar eden etiket`)
    }
  })

  test("termSlug dosya adı olarak güvenli", () => {
    assert.equal(termSlug("galeta unu"), "galeta-unu")
    assert.equal(termSlug("çamaşır suyu"), "camasir-suyu")
    assert.equal(termSlug("tereyağı"), "tereyagi")
    for (const t of TERMS) assert.match(termSlug(t.term), /^[a-z0-9-]+$/)
  })
})
