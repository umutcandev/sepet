import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { computeOptimization } from "@/lib/ai/optimize"
import type { MarketOption, MatchResult } from "@/lib/ai/schemas"
import { computeReceiptComparison } from "./receipt-comparison"

function option(
  market: string,
  price: number,
  productId: string,
  productName = productId
): MarketOption {
  return {
    market,
    productId,
    productName,
    packagePrice: price,
    packsNeeded: 1,
    effectiveCost: price,
    unitPriceLabel: null,
    depotName: null,
    imageUrl: null,
  }
}

// Temsilci ürün (bestMatch) kasıtlı olarak en ucuz kabul edilen ürün DEĞİL:
// "İçim Süt" Migros'ta 40 TL, aynı markette kabul edilmiş "Pınar Süt" 35 TL.
function sut(): MatchResult {
  return {
    rawName: "süt",
    searchQuery: "süt",
    quantity: 1,
    unit: "l",
    bestMatch: {
      productId: "icim",
      name: "İçim Süt 1 Lt",
      brand: "İçim",
      category: null,
      imageUrl: null,
      averagePrice: 42,
      minPrice: 40,
      maxPrice: 44,
      marketCount: 2,
    },
    marketPrices: [
      { market: "Migros", price: 40, depotName: null },
      { market: "Şok", price: 44, depotName: null },
    ],
    marketOptions: [
      option("Migros", 35, "pinar", "Pınar Süt 1 Lt"),
      option("Şok", 38, "sek", "Sek Süt 1 Lt"),
    ],
    alternatives: [],
    lookupStatus: "ok",
    errorMessage: null,
    sizeMismatch: false,
  }
}

function bulunamayan(): MatchResult {
  return {
    rawName: "ejder meyvesi",
    searchQuery: "ejder meyvesi",
    quantity: 1,
    unit: "adet",
    bestMatch: null,
    marketPrices: [],
    marketOptions: [],
    alternatives: [],
    lookupStatus: "no_match",
    errorMessage: null,
    sizeMismatch: false,
  }
}

const fis = (rawName: string, unitPrice: number) => ({
  rawName,
  quantity: 1,
  unitPrice,
  totalPrice: unitPrice,
})

describe("computeReceiptComparison", () => {
  test("en iyi fiyat temsilci üründen değil, kabul edilen en ucuz üründen", () => {
    const comp = computeReceiptComparison([fis("SUT 1L", 45)], [sut()], null)
    const row = comp.items[0]
    assert.equal(row.bestMarket, "Migros")
    assert.equal(row.bestPrice, 35)
    assert.equal(row.matchedProductId, "pinar")
    assert.equal(row.matchedName, "Pınar Süt 1 Lt")
    assert.equal(row.savingsTL, 10)
    assert.equal(comp.totalBestAmount, 35)
  })

  test("tablonun gösterdiği ürün ve fiyat, Sepet Özeti'nin aynı marketteki satırıyla aynı", () => {
    const matches = [sut()]
    const comp = computeReceiptComparison([fis("SUT 1L", 45)], matches, null)
    const summary = computeOptimization(matches)
    const row = comp.items[0]
    const inSummary = summary.singleMarket.allocation.find(
      (a) => a.market === row.bestMarket
    )
    assert.ok(inSummary, "Sepet Özeti'nde aynı market satırı var")
    assert.equal(inSummary.productId, row.matchedProductId)
    assert.equal(inSummary.unitPrice, row.bestPrice)
  })

  test("eşleşmeyen kalem fiyatsız kalır ve toplama girmez", () => {
    const comp = computeReceiptComparison(
      [fis("SUT 1L", 45), fis("EJDER MEYVESI", 90)],
      [sut(), bulunamayan()],
      null
    )
    const row = comp.items[1]
    assert.equal(row.bestMarket, null)
    assert.equal(row.bestPrice, null)
    assert.equal(row.matchedProductId, null)
    assert.equal(row.savingsTL, null)
    assert.equal(comp.totalBestAmount, 35)
    assert.equal(comp.totalSavingsTL, 10)
  })

  test("farklı boyutlu eşleşmede tasarruf yazılmaz", () => {
    const match = { ...sut(), sizeMismatch: true }
    const comp = computeReceiptComparison([fis("SUT 2L", 80)], [match], null)
    assert.equal(comp.items[0].bestPrice, 35)
    assert.equal(comp.items[0].savingsTL, null)
  })
})
