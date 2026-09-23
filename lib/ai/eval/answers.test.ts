import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { deriveAssertions, parseAnswer, parseSheet } from "./answers"
import type { FrozenGrouping } from "./types"

const grouping: FrozenGrouping = {
  term: "peynir",
  category: "Süt ürünleri",
  split: "train",
  candidateCount: 9,
  groups: [
    { id: "A", label: "Beyaz peynir", members: ["a1", "a2", "a3"] },
    { id: "B", label: "Süzme peynir", members: ["b1", "b2"] },
    { id: "C", label: "Krem peynir", members: ["c1", "c2"] },
    { id: "D", label: "Özel diyet varyant (organik / laktozsuz)", members: ["d1", "d2"] },
  ],
  ungrouped: ["u1"],
}

const names: Record<string, string> = {
  a1: "Torku Beyaz Peynir 500 Gr",
  a2: "İçim Beyaz Peynir 500 Gr",
  a3: "Sütaş Beyaz Peynir 700 Gr",
  b1: "Sütaş Süzme Peynir 500 Gr",
  b2: "İçim Süzme Peynir 250 Gr",
  c1: "Pınar Krem Peynir 300 Gr",
  c2: "Aktek Krem Peynir 500 Gr",
  d1: "Pınar Organik Beyaz Peynir 500 Gr",
  d2: "İçim Laktozsuz Peynir 180 Gr",
  u1: "Primavera Peynir 4 Adet",
}
const nameOf = (id: string) => names[id] ?? ""

const answer = (accept: string, primary = "", note = "") =>
  parseAnswer(grouping, { accept, primary, note })

describe("parseAnswer — kabul biçimleri", () => {
  test("A+B → iki grup kabul, gerisi red", () => {
    const a = answer("A+B")
    assert.deepEqual(a.accept, ["A", "B"])
    assert.deepEqual(a.reject, ["C", "D"])
  })

  test("virgül de artı gibi çalışır", () => {
    assert.deepEqual(answer("A, B, C").accept, ["A", "B", "C"])
  })

  test("HEPSİ tüm grupları kabul eder (Türkçe İ dahil)", () => {
    const a = answer("HEPSİ")
    assert.deepEqual(a.accept, ["A", "B", "C", "D"])
    assert.deepEqual(a.reject, [])
  })

  test("HİÇBİRİ boş küme bekler", () => {
    const a = answer("HİÇBİRİ")
    assert.equal(a.expectEmpty, true)
    assert.deepEqual(a.accept, [])
  })

  test("'C+D hariç HEPSİ' → kalan gruplar kabul", () => {
    const a = answer("C+D hariç HEPSİ")
    assert.deepEqual(a.accept, ["A", "B"])
    assert.deepEqual(a.reject, ["C", "D"])
  })

  test("ATLA bu gıdayı taksonomi dışında bırakır", () => {
    assert.equal(answer("ATLA").skip, true)
  })

  test("A? kararsız — hiçbir listeye girmez", () => {
    const a = answer("A+B?")
    assert.deepEqual(a.accept, ["A"])
    assert.deepEqual(a.unsure, ["B"])
    assert.deepEqual(a.reject, ["C", "D"])
  })

  test("tekrar eden harf sorun olarak raporlanır ama küme bozulmaz", () => {
    const a = answer("A+B+A")
    assert.deepEqual(a.accept, ["A", "B"])
    assert.ok(a.issues.some((i) => i.includes("tekrar")))
  })

  test("olmayan harf sorun üretir", () => {
    assert.ok(answer("A+Z").issues.some((i) => i.includes("olmayan harf")))
  })
})

describe("parseAnswer — PRIMARY", () => {
  test("boş ve 'farketmez' ölçülmez", () => {
    assert.deepEqual(answer("A", "").primaryGroups, [])
    assert.deepEqual(answer("A", "farketmez").primaryGroups, [])
  })

  test("HEPSİ primary olamaz, sorulur", () => {
    assert.ok(answer("A", "HEPSİ").issues.some((i) => i.includes("farketmez")))
  })

  test("kabul edilmemiş grubu primary yapmak sorun üretir", () => {
    assert.ok(answer("A", "C").issues.some((i) => i.includes("KABUL'da değil")))
  })

  test("yarım kalmış primary yakalanır", () => {
    assert.ok(answer("A", "A+").issues.some((i) => i.includes("yarım")))
  })
})

describe("deriveAssertions", () => {
  test("düz küme birleşimi — gruplanamayan hiçbir listeye girmez", () => {
    const a = deriveAssertions(grouping, answer("A+B"), nameOf)
    assert.deepEqual(a.mustAccept.sort(), ["a1", "a2", "a3", "b1", "b2"])
    assert.ok(!a.mustAccept.includes("u1"))
    assert.ok(!a.mustReject.includes("u1"))
  })

  test("kararsız grup ne kabul ne red listesine girer", () => {
    const a = deriveAssertions(grouping, answer("A+C?"), nameOf)
    assert.ok(!a.mustAccept.includes("c1"))
    assert.ok(!a.mustReject.includes("c1"))
  })

  test("primaryIn yalnız İLK primary grubunun üyelerini alır", () => {
    const a = deriveAssertions(grouping, answer("A+B", "A+B"), nameOf)
    assert.deepEqual(a.primaryIn.sort(), ["a1", "a2", "a3"])
  })

  test("HİÇBİRİ → boş kabul, tüm adaylar red, nonEmpty false", () => {
    const a = deriveAssertions(grouping, answer("HİÇBİRİ"), nameOf)
    assert.deepEqual(a.mustAccept, [])
    assert.equal(a.nonEmpty, false)
    assert.ok(a.mustReject.includes("a1"))
  })
})

describe("deriveAssertions — küresel organik kuralı", () => {
  test("diyet grubundaki organik ürün kabule taşınır", () => {
    const a = deriveAssertions(grouping, answer("A"), nameOf, () => "A")
    assert.ok(a.mustAccept.includes("d1"), "organik beyaz peynir kabul olmalı")
    assert.deepEqual(a.organicMoved, ["d1"])
  })

  test("laktozsuz ürün red'de kalır — karar yalnız organik içindi", () => {
    const a = deriveAssertions(grouping, answer("A"), nameOf, () => "A")
    assert.ok(a.mustReject.includes("d2"))
  })

  test("asıl tipi reddedilmiş organik ürün taşınmaz", () => {
    // "organik süzme peynir": diyetsiz evi B, ama B kabul edilmemiş.
    const a = deriveAssertions(grouping, answer("A"), nameOf, () => "B")
    assert.ok(a.mustReject.includes("d1"))
    assert.deepEqual(a.organicMoved, [])
  })

  test("diyet grubu dışındaki organik ürüne dokunulmaz", () => {
    const g2: FrozenGrouping = {
      ...grouping,
      groups: [
        { id: "A", label: "Taze domates", members: ["a1"] },
        { id: "B", label: "Domates salçası", members: ["s1"] },
      ],
    }
    const nm = (id: string) =>
      id === "s1" ? "Tat Organik Domates Salçası 500 Gr" : "Domates 1 Kg"
    const a = deriveAssertions(g2, parseAnswer(g2, { accept: "A", primary: "", note: "" }), nm, () => "A")
    assert.ok(a.mustReject.includes("s1"), "organik salça yine de salçadır")
  })
})

describe("parseSheet", () => {
  test("blok başlığından terimi ve üç alanı okur", () => {
    const md = [
      "## 3/84 · peynir   ·   72 aday · 35 depo",
      "",
      "KABUL   : A+B",
      "PRIMARY : A",
      "NOT     : beyaz peynir tercih",
      "",
      "## 4/84 · ayran   ·   72 aday · 35 depo",
      "KABUL   : A",
      "PRIMARY : farketmez",
      "NOT     :",
    ].join("\n")
    const rows = parseSheet(md)
    assert.equal(rows.length, 2)
    assert.deepEqual(rows[0], {
      term: "peynir",
      accept: "A+B",
      primary: "A",
      note: "beyaz peynir tercih",
    })
    assert.equal(rows[1].term, "ayran")
    assert.equal(rows[1].note, "")
  })
})
