import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { queryGeneralizations, stripQuantityTokens } from "./normalize"

describe("queryGeneralizations", () => {
  test("sondan kelime atarak genelden spesifiğe iner", () => {
    // Ölçülen gerçek vaka: "vanish oxi toz renk" 0 sonuç, "vanish oxi" 1 sonuç.
    assert.deepEqual(queryGeneralizations("vanish oxi toz renk"), [
      "vanish oxi toz",
      "vanish oxi",
      "vanish",
    ])
  })

  test("tam sorgunun kendisini DÖNDÜRMEZ", () => {
    // Çağıran tam sorguyu zaten denemiş olur; tekrar denemek boşa istek.
    const out = queryGeneralizations("omo sivi color")
    assert.ok(!out.includes("omo sivi color"))
    assert.deepEqual(out, ["omo sivi", "omo"])
  })

  test("tek kelimelik sorgunun genellemesi yoktur", () => {
    assert.deepEqual(queryGeneralizations("süt"), [])
  })

  test("iki kelimede tek basamak üretir", () => {
    assert.deepEqual(queryGeneralizations("beyaz peynir"), ["beyaz"])
  })

  test("boş ve boşluklu girdide patlamaz", () => {
    assert.deepEqual(queryGeneralizations(""), [])
    assert.deepEqual(queryGeneralizations("   "), [])
  })

  test("fazla boşlukları yok sayar", () => {
    assert.deepEqual(queryGeneralizations("  bingo   kirec  önleyici "), [
      "bingo kirec",
      "bingo",
    ])
  })

  test("Türkçe karakterleri bozmaz", () => {
    // Upstream zaten normalize ediyor ("kirec" = "kireç"); burada dönüştürmek
    // markalı sorguları bozardı.
    assert.deepEqual(queryGeneralizations("çınar naftalin tablet"), [
      "çınar naftalin",
      "çınar",
    ])
  })
})

describe("stripQuantityTokens", () => {
  test("sayı ve birim sözcüklerini atar", () => {
    assert.equal(stripQuantityTokens("2 lt süt"), "süt")
    assert.equal(stripQuantityTokens("500 gr beyaz peynir"), "beyaz peynir")
  })

  test("marka adını korur", () => {
    assert.equal(stripQuantityTokens("1 paket eti cin"), "eti cin")
  })
})
