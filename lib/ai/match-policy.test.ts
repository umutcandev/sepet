import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { POLICY_TERM_COUNT, POLICY_VERSION, policyFor } from "./match-policy"
import policyFile from "./match-policy.json"
import taxonomy from "./eval/food-taxonomy.json"
import { MATCH_PROMPT } from "./prompts"

describe("match-policy — sınav terimlerinin dondurulması (§13.9)", () => {
  test("holdout terimlerinin HİÇBİRİ üretim dosyasında yok", () => {
    // Bu testin düşmesi ölçümün geçersizleşmesi demektir: sınav terimi
    // prompt'u görürse holdout skoru artık genelleşmeyi ölçmez.
    const holdout = taxonomy.filter((t) => t.split === "holdout").map((t) => t.term)
    const leaked = holdout.filter((t) => policyFor(t) !== null)
    assert.deepEqual(leaked, [], `sınav terimi sızdı: ${leaked.join(", ")}`)
    assert.ok(holdout.length > 0, "sınav grubu boş olmamalı")
  })

  test("train terimlerinin tamamı üretim dosyasında var", () => {
    const train = taxonomy.filter((t) => t.split === "train").map((t) => t.term)
    const missing = train.filter((t) => policyFor(t) === null)
    assert.deepEqual(missing, [])
    assert.equal(POLICY_TERM_COUNT, train.length)
  })
})

describe("policyFor — eşleşme", () => {
  test("tam eşleşme bulur", () => {
    assert.ok(policyFor("süt"))
  })

  test("ham kullanıcı metni anahtar DEĞİLDİR", () => {
    // MatchPromptItem.rawName "1 lt süt" gelir; anahtar searchQuery olmalı.
    assert.equal(policyFor("1 lt süt"), null)
  })

  test("KISMİ eşleşme yapmaz", () => {
    // "laktozsuz süt" isteyene "süt" politikasının "laktozsuz RED" satırını
    // vermek, kullanıcının açık isteğini çürütürdü.
    assert.equal(policyFor("laktozsuz süt"), null)
    assert.equal(policyFor("beyaz peynir"), null)
  })

  test("Türkçe büyük/küçük harf ve boşluk normalize edilir", () => {
    assert.equal(policyFor("SÜT"), policyFor("süt"))
    assert.equal(policyFor("  süt  "), policyFor("süt"))
  })

  test("kapsam dışı terimde null döner — nazik bozulma (§13.6)", () => {
    assert.equal(policyFor("vanilyalı protein tozu"), null)
    assert.equal(policyFor(undefined), null)
    assert.equal(policyFor(""), null)
  })

  test("politika satırı kendiyle çelişmez: organik hem RED hem KABUL yazamaz", () => {
    for (const [term, line] of Object.entries(policyFile.policies)) {
      const redsOrganic = /organ[iı]k[^.]*RED/i.test(line)
      const hasException = /İSTİSNA/.test(line)
      if (redsOrganic) {
        assert.ok(hasException, `${term}: organik RED ama istisna satırı yok`)
      }
    }
  })
})

describe("MATCH_PROMPT enjeksiyonu", () => {
  const item = (searchQuery: string | undefined) => ({
    itemIndex: 0,
    rawName: searchQuery ?? "x",
    quantity: 1,
    unit: "adet",
    searchQuery,
    candidates: [{ productId: "X1", name: "Ürün", brand: null, category: null }],
  })

  /**
   * Yalnız KALEMLER bölümü. Kural bloğu işaretçiyi tırnak içinde açıkladığı
   * için prompt'un tamamında arama yapmak her zaman eşleşir.
   */
  const itemsSection = (searchQuery: string | undefined) => {
    const out = MATCH_PROMPT([item(searchQuery)])
    return out.slice(out.indexOf(`[0] "`))
  }

  test("politikası olan kalemde satır adayların ÜSTÜNE girer", () => {
    const s = itemsSection("süt")
    const policyAt = s.indexOf("POLİTİKA (Sepet kararı):")
    assert.ok(policyAt > 0)
    assert.ok(policyAt < s.indexOf("X1 | Ürün"))
  })

  test("sınav teriminde satır YOKTUR", () => {
    assert.ok(!itemsSection("kaymak").includes("POLİTİKA"))
  })

  test("kapsam dışı terimde satır yoktur, prompt bugünkü haliyle gider", () => {
    assert.ok(!itemsSection("protein tozu").includes("POLİTİKA"))
    assert.ok(!itemsSection(undefined).includes("POLİTİKA"))
  })

  test("kural bloğu politika satırını AÇIKLAR", () => {
    // Model "POLİTİKA" etiketini görüp ne yapacağını bilmeli.
    assert.ok(MATCH_PROMPT([]).includes("POLİTİKA SATIRI:"))
  })

  test("POLICY_VERSION politika metnine bağlıdır", () => {
    assert.match(POLICY_VERSION, /^[0-9a-f]{8}$/)
  })
})
