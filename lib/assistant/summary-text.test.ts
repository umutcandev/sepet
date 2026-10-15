import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { computeOptimization } from "@/lib/ai/optimize"
import type { MarketOption, MatchResult } from "@/lib/ai/schemas"
import { buildSummaryText } from "./summary-text"

function option(market: string, price: number): MarketOption {
  return {
    market,
    productId: `${market}-p`,
    productName: `${market} ürünü`,
    packagePrice: price,
    packsNeeded: 1,
    effectiveCost: price,
    unitPriceLabel: null,
    depotName: null,
    imageUrl: null,
  }
}

function match(
  rawName: string,
  options: MarketOption[],
  extra: Partial<MatchResult> = {}
): MatchResult {
  const ok = options.length > 0
  return {
    rawName,
    searchQuery: rawName,
    quantity: 1,
    unit: "adet",
    bestMatch: ok
      ? {
          productId: options[0].productId,
          name: `${rawName} ürünü`,
          brand: null,
          category: null,
          imageUrl: null,
          averagePrice: null,
          minPrice: null,
          maxPrice: null,
          marketCount: options.length,
        }
      : null,
    marketPrices: [],
    marketOptions: options,
    alternatives: [],
    lookupStatus: ok ? "ok" : "no_match",
    errorMessage: null,
    sizeMismatch: false,
    ...extra,
  }
}

function text(matches: MatchResult[]): string {
  return buildSummaryText(computeOptimization(matches), matches)
}

describe("buildSummaryText", () => {
  test("Sepet Özeti'ndeki öneriyle açılır ve bölme tasarrufunu söyler", () => {
    const out = text([
      match("süt", [option("A101", 30), option("BİM", 25)]),
      match("ekmek", [option("A101", 10), option("BİM", 16)]),
    ])
    assert.equal(
      out,
      "Sepet Özeti hazır. En ucuz tek market A101: 2 kalemin tamamı 40,00 TL. Alışverişi A101 ve BİM arasında bölersen 5,00 TL (%13) daha az ödersin."
    )
  })

  test("bölmek kazandırmıyorsa bunu açıkça söyler", () => {
    const out = text([
      match("süt", [option("A101", 10), option("BİM", 20)]),
      match("ekmek", [option("A101", 5), option("BİM", 30)]),
    ])
    assert.equal(
      out,
      "Sepet Özeti hazır. En ucuz tek market A101: 2 kalemin tamamı 15,00 TL. İki markete bölmek daha ucuza gelmiyor."
    )
  })

  test("tek market eksik kalınca kombinasyonla konuşur", () => {
    const out = text([
      match("süt", [option("A101", 10)]),
      match("ekmek", [option("BİM", 40)]),
    ])
    assert.equal(
      out,
      "Sepet Özeti hazır. 2 kalemin tamamını tek bir market karşılamıyor; A101 ve BİM ikilisiyle sepetin tamamı 50,00 TL."
    )
  })

  test("eşleştirilemeyen kalemlerin toplama girmediğini söyler", () => {
    const out = text([
      match("süt", [option("A101", 10)]),
      match("ejder meyvesi reçeli", []),
      match("kinoa", [], { lookupStatus: "api_error" }),
    ])
    assert.match(
      out,
      /^Sepet Özeti hazır\. En ucuz tek market A101: 1 kalemin tamamı 10,00 TL\./
    )
    assert.match(
      out,
      / Ejder meyvesi reçeli ve Kinoa eşleştirilemedi, toplama dahil değil\.$/
    )
  })

  test("farklı boyutu Sepet Özeti'ndeki işarete bağlar", () => {
    const out = text([
      match("yoğurt", [option("A101", 40)], { sizeMismatch: true }),
    ])
    assert.match(
      out,
      / Yoğurt için istediğin boyutu bulamadım; en yakın boyutla hesapladım ve Sepet Özeti'nde farklı boyut olarak işaretledim\.$/
    )
  })

  test("hiçbir kalem eşleşmezse özet yerine yönlendirir", () => {
    const out = text([match("süt", []), match("ekmek", [])])
    assert.equal(
      out,
      "Listendeki kalemlerin hiçbiri için market fiyatı bulamadım, bu yüzden Sepet Özeti çıkaramadım. Kalemleri farklı bir adla yazıp tekrar deneyebilirsin."
    )
  })
})
