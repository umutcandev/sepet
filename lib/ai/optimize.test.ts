import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { computeOptimization } from "./optimize"
import type { MarketOption, MatchResult } from "./schemas"

// computeOptimization yalnızca rawName / sizeMismatch / marketOptions okur;
// kalan alanlar tip uyumu için doldurulur.
function option(
  market: string,
  price: number,
  productId = `${market}-p`,
): MarketOption {
  return {
    market,
    productId,
    productName: `${market} ürünü`,
    packagePrice: price,
    packsNeeded: 1,
    effectiveCost: price,
    unitPriceLabel: null,
    depotName: null,
  }
}

function match(
  rawName: string,
  options: MarketOption[],
  sizeMismatch = false,
): MatchResult {
  return {
    rawName,
    searchQuery: rawName,
    quantity: 1,
    unit: "adet",
    bestMatch: null,
    marketPrices: [],
    marketOptions: options,
    alternatives: [],
    lookupStatus: options.length > 0 ? "ok" : "no_match",
    errorMessage: null,
    sizeMismatch,
  }
}

describe("computeOptimization", () => {
  test("tek market: tüm sepeti karşılayan en ucuz marketi seçer", () => {
    // A101: 30 + 10 = 40 · BİM: 25 + 15 = 40 → beraberlik, ilk bulunan kalır.
    // Asıl iddia: her ikisi de FULL coverage ve toplam doğru hesaplanıyor.
    const summary = computeOptimization([
      match("süt", [option("A101", 30), option("BİM", 25)]),
      match("ekmek", [option("A101", 10), option("BİM", 15)]),
    ])

    assert.equal(summary.totalItems, 2)
    assert.equal(summary.singleMarket.isFullCoverage, true)
    assert.equal(summary.singleMarket.total, 40)
    assert.equal(summary.singleMarket.itemCount, 2)
    assert.equal(summary.singleMarket.missingItemCount, 0)
  })

  test("iki market: kalem başına ucuz olanı seçer ve tasarrufu hesaplar", () => {
    const summary = computeOptimization([
      match("süt", [option("A101", 30), option("BİM", 25)]),
      match("ekmek", [option("A101", 10), option("BİM", 15)]),
    ])

    // süt → BİM (25), ekmek → A101 (10) = 35. Tek market 40 → 5 TL / %12.5.
    assert.deepEqual(summary.twoMarketCombo.markets.sort(), ["A101", "BİM"])
    assert.equal(summary.twoMarketCombo.total, 35)
    assert.equal(summary.twoMarketCombo.savingsTL, 5)
    assert.equal(summary.twoMarketCombo.savingsPct, 12.5)

    const bySource = Object.fromEntries(
      summary.twoMarketCombo.allocation.map((a) => [a.rawName, a.market]),
    )
    assert.deepEqual(bySource, { süt: "BİM", ekmek: "A101" })
  })

  test("bir market her kalemde ucuzsa sahte ikili kombo üretmez", () => {
    // A101 iki kalemde de ucuz → "A101 + BİM" göstermek yanıltıcı olurdu,
    // çünkü BİM'den hiçbir şey alınmıyor.
    const summary = computeOptimization([
      match("süt", [option("A101", 10), option("BİM", 20)]),
      match("ekmek", [option("A101", 5), option("BİM", 30)]),
    ])

    assert.equal(summary.singleMarket.market, "A101")
    assert.equal(summary.singleMarket.total, 15)
    assert.deepEqual(summary.twoMarketCombo.markets, [])
    assert.equal(summary.twoMarketCombo.total, 0)
    // Geçerli kombo yokken tasarruf 0 olmalı — total=0'ı tek market
    // toplamından çıkarıp "15 TL tasarruf" yazmak sepetin tamamı kadar
    // sahte bir rakam üretirdi.
    assert.equal(summary.twoMarketCombo.savingsTL, 0)
    assert.equal(summary.twoMarketCombo.savingsPct, 0)
  })

  test("kısmi kapsama: tek market tüm sepeti karşılayamaz", () => {
    const summary = computeOptimization([
      match("süt", [option("A101", 10)]),
      match("ekmek", [option("BİM", 40)]),
    ])

    assert.equal(summary.singleMarket.isFullCoverage, false)
    assert.equal(summary.singleMarket.itemCount, 1)
    assert.deepEqual(summary.singleMarket.missingItemNames, ["ekmek"])

    // Kombo her iki kalemi de kapsar (50) ama tek market yalnız birini (10).
    // Farklı sepetler kıyaslanmamalı → tasarruf negatife düşmez, 0 kalır.
    assert.deepEqual(summary.twoMarketCombo.markets.sort(), ["A101", "BİM"])
    assert.equal(summary.twoMarketCombo.total, 50)
    assert.equal(summary.twoMarketCombo.savingsTL, 0)
  })

  test("hiç market seçeneği olmayan kalem sepet dışında kalır", () => {
    const summary = computeOptimization([
      match("süt", [option("A101", 10)]),
      match("bulunamayan ürün", []),
    ])

    assert.equal(summary.totalItems, 1)
    assert.equal(summary.singleMarket.itemCount, 1)
    assert.equal(summary.singleMarket.isFullCoverage, true)
  })

  test("hiçbir kalem eşleşmezse sıfırlanmış özet döner", () => {
    const summary = computeOptimization([
      match("süt", []),
      match("ekmek", []),
    ])

    assert.equal(summary.totalItems, 0)
    assert.equal(summary.singleMarket.market, "—")
    assert.equal(summary.singleMarket.total, 0)
    assert.equal(summary.singleMarket.missingItemCount, 2)
    assert.deepEqual(summary.singleMarket.missingItemNames, ["süt", "ekmek"])
    assert.deepEqual(summary.twoMarketCombo.markets, [])
    assert.equal(summary.twoMarketCombo.savingsTL, 0)
  })

  test("aynı markette birden çok seçenek varsa en ucuzu kullanılır", () => {
    const summary = computeOptimization([
      match("süt", [
        option("A101", 30, "pahalı"),
        option("A101", 18, "ucuz"),
      ]),
    ])

    assert.equal(summary.singleMarket.total, 18)
    assert.equal(summary.singleMarket.allocation[0].productId, "ucuz")
  })

  test("sizeMismatch bayrağı allocation satırına taşınır", () => {
    const summary = computeOptimization([
      match("yoğurt", [option("A101", 40)], true),
    ])

    assert.equal(summary.singleMarket.allocation[0].sizeMismatch, true)
  })

  test("para tutarları 2 ondalığa yuvarlanır", () => {
    const summary = computeOptimization([
      match("süt", [option("A101", 10.005), option("BİM", 99)]),
      match("ekmek", [option("A101", 99), option("BİM", 20.004)]),
    ])

    assert.equal(summary.singleMarket.total, 109.01)
    assert.equal(summary.twoMarketCombo.total, 30.01)
  })
})
