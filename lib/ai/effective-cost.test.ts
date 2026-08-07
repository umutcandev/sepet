import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { effectiveLineCost, hasBaseMismatch, hasSizeMismatch } from "./effective-cost"
import type { MarketPrice } from "@/lib/marketfiyati/types"

function price(overrides: Partial<MarketPrice> = {}): MarketPrice {
  return {
    market: "A101",
    price: 100,
    priceModifiedAt: null,
    depotName: null,
    unitPrice: null,
    unitPriceValue: null,
    unitBase: null,
    ...overrides,
  }
}

describe("effectiveLineCost", () => {
  test("istenen miktar fiyatı ETKİLEMEZ — tek paketin raf fiyatı döner", () => {
    // Ürünün özü: "6 adet limon" + "1 Kg Limon" → 1 kg paketin fiyatı, 6× değil.
    const cost = effectiveLineCost(price({ price: 49.9 }))
    assert.equal(cost.packsNeeded, 1)
    assert.equal(cost.packagePrice, 49.9)
    assert.equal(cost.total, 49.9)
  })

  test("toplam 2 ondalığa yuvarlanır", () => {
    assert.equal(effectiveLineCost(price({ price: 10.005 })).total, 10.01)
  })
})

describe("hasSizeMismatch", () => {
  test("paket boyutu istenenden %10'dan fazla BÜYÜKSE işaretler", () => {
    // 500 g istendi, 750 g bulundu → 1,5×.
    assert.equal(hasSizeMismatch(500, "g", { name: "Sütaş Süzme Yoğurt 750 Gr" }), true)
  })

  test("paket boyutu istenenden %10'dan fazla KÜÇÜKSE işaretler", () => {
    // 1,5 kg istendi, 1 kg bulundu — eksiklik de "farklı boyut"tur.
    assert.equal(hasSizeMismatch(1.5, "kg", { name: "Pınar Yoğurt 1 Kg" }), true)
  })

  test("±%10 bandındaki etiket gürültüsünü yutar", () => {
    // 1 kg ↔ 950 g: gerçek bir fark değil, uyarı verilmemeli.
    assert.equal(hasSizeMismatch(1, "kg", { name: "Pınar Yoğurt 950 Gr" }), false)
  })

  test("ml ↔ l ve g ↔ kg normalizasyonu yapılır", () => {
    assert.equal(hasSizeMismatch(1, "l", { name: "İçim Süt 1000 Ml" }), false)
    assert.equal(hasSizeMismatch(1000, "g", { name: "Un 1 Kg" }), false)
  })

  test("adet ve paket için sessiz kalır", () => {
    // "1 adet" istendiğinde gramajlı bir ürünü 1 paket almak doğal yorumdur.
    assert.equal(hasSizeMismatch(2, "adet", { name: "Yumurta 10 Adet" }), false)
    assert.equal(hasSizeMismatch(1, "paket", { name: "Çay 500 Gr" }), false)
  })

  test("adında boyut yazmayan açık/tartılan üründe sessiz kalır", () => {
    // Tartıyla tam istenen miktar alınabilir → yanlış uyarı verme.
    assert.equal(hasSizeMismatch(500, "g", { name: "Domates" }), false)
    assert.equal(hasSizeMismatch(1, "kg", { name: "Kaşar Peyniri" }), false)
  })

  test("farklı bazdaki boyutu mismatch saymaz", () => {
    // kg istendi ama adında yalnızca adet var → bu hasBaseMismatch'in işi.
    assert.equal(hasSizeMismatch(200, "g", { name: "Tavuk Göğsü 1 Adet" }), false)
  })
})

describe("hasBaseMismatch", () => {
  test("gramaj istenip adetle satılan ürünle eşleşince işaretler", () => {
    const product = {
      name: "Tavuk Göğsü 1 Adet",
      markets: [price({ unitBase: "adet", unitPriceValue: 120 })],
    }
    assert.equal(hasBaseMismatch(200, "g", product), true)
  })

  test("API istenen bazda birim fiyat veriyorsa uyumludur", () => {
    const product = {
      name: "Tavuk Göğsü",
      markets: [price({ unitBase: "kg", unitPriceValue: 250 })],
    }
    assert.equal(hasBaseMismatch(200, "g", product), false)
  })

  test("ürün adından istenen bazda boyut çıkarılabiliyorsa uyumludur", () => {
    const product = { name: "Tavuk Göğsü 500 Gr", markets: [price()] }
    assert.equal(hasBaseMismatch(200, "g", product), false)
  })

  test("yalnızca sürekli ölçüler (kg/l) için anlamlıdır", () => {
    const product = { name: "Ekmek 250 Gr", markets: [price()] }
    assert.equal(hasBaseMismatch(1, "adet", product), false)
    assert.equal(hasBaseMismatch(1, "paket", product), false)
  })

  test("birim fiyatı olmayan ve adında boyut geçmeyen üründe işaretler", () => {
    const product = { name: "Kıyma", markets: [price()] }
    assert.equal(hasBaseMismatch(250, "g", product), true)
  })
})
