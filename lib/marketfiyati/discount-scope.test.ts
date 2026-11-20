import assert from "node:assert/strict"
import { describe, test } from "node:test"

import type { MarketOption, MatchResult } from "@/lib/ai/schemas"
import {
  annotateDiscountScopes,
  chainOfDepot,
  MAX_SCOPE_CHECKS,
  referenceDepot,
  scopeFromReference,
  type CachedScope,
} from "./discount-scope"
import { regularPriceOf } from "./types"

function option(
  market: string,
  depotId: string,
  price: number,
  regularPrice: number | null,
  productId = `${depotId}-p`
): MarketOption {
  return {
    market,
    productId,
    productName: "ürün",
    packagePrice: price,
    packsNeeded: 1,
    effectiveCost: price,
    unitPriceLabel: null,
    depotName: depotId,
    depotId,
    regularPrice,
    imageUrl: null,
  }
}

function match(options: MarketOption[]): MatchResult {
  return {
    rawName: "kalem",
    searchQuery: "kalem",
    quantity: 1,
    unit: "adet",
    bestMatch: null,
    marketPrices: [],
    marketOptions: options,
    alternatives: [],
    lookupStatus: "ok",
    errorMessage: null,
    sizeMismatch: false,
  }
}

const NEARBY = [
  "a101-L213",
  "bim-P546",
  "a101-C345",
  "bim-Q941",
  "migros-6499",
  "migros-5089",
]

describe("regularPriceOf", () => {
  test("indirim oranından normal fiyat kuruşu kuruşuna çıkar (ölçülen değerler)", () => {
    assert.equal(
      regularPriceOf({ price: 30, discount: true, discountRatio: 0.20948619 }),
      37.95
    )
    assert.equal(
      regularPriceOf({ price: 250, discount: true, discountRatio: 0.3420187 }),
      379.95
    )
  })
  test("kampanya yoksa ya da oran anlamsızsa null", () => {
    assert.equal(
      regularPriceOf({ price: 30, discount: false, discountRatio: 0.2 }),
      null
    )
    assert.equal(
      regularPriceOf({ price: 30, discount: true, discountRatio: null }),
      null
    )
    assert.equal(
      regularPriceOf({ price: 30, discount: true, discountRatio: 0 }),
      null
    )
    assert.equal(
      regularPriceOf({ price: 30, discount: true, discountRatio: 1 }),
      null
    )
  })
})

describe("şube yardımcıları", () => {
  test("zincir öneki", () => {
    assert.equal(chainOfDepot("a101-K709"), "a101")
    assert.equal(chainOfDepot("tarim_kredi-6474"), "tarim_kredi")
  })
  test("karşılaştırma şubesi aynı zincirin başka bir şubesi", () => {
    assert.equal(referenceDepot("a101-L213", NEARBY), "a101-C345")
    assert.equal(referenceDepot("bim-Q941", NEARBY), "bim-P546")
    assert.equal(referenceDepot("sok-1", NEARBY), null)
  })
  test("kapsam: aynı fiyat zincir, farklı fiyat şube, ürün yoksa bilinmiyor", () => {
    assert.equal(scopeFromReference(21.5, 21.5), "chain")
    assert.equal(scopeFromReference(21.5, 26), "branch")
    assert.equal(scopeFromReference(21.5, null), null)
  })
})

describe("annotateDiscountScopes", () => {
  test("yalnız kampanyalı ulusal-zincir seçenekleri sorulur", async () => {
    const asked: string[] = []
    const out = await annotateDiscountScopes(
      [
        match([
          option("BİM", "bim-P546", 21.5, 26, "makarna"),
          option("A101", "a101-L213", 30, null, "makarna-a"),
          option("Migros", "migros-6499", 19.9, 35.5, "sut"),
        ]),
        match([option("A101", "a101-C345", 58, 65, "peynir")]),
      ],
      {
        nearby: async () => NEARBY,
        fetchReferencePrice: async (productId, depotId) => {
          asked.push(`${productId}@${depotId}`)
          return productId === "makarna" ? 21.5 : 65
        },
      }
    )
    assert.deepEqual(asked.sort(), ["makarna@bim-Q941", "peynir@a101-L213"])
    assert.equal(out[0].marketOptions[0].discountScope, "chain")
    assert.equal(out[0].marketOptions[1].discountScope, undefined)
    assert.equal(out[0].marketOptions[2].discountScope, undefined)
    assert.equal(out[1].marketOptions[0].discountScope, "branch")
  })

  test("kampanyalı seçenek yoksa hiçbir istek atılmaz", async () => {
    const input = [match([option("A101", "a101-L213", 30, null)])]
    const out = await annotateDiscountScopes(input, {
      nearby: async () => {
        throw new Error("çağrılmamalı")
      },
      fetchReferencePrice: async () => {
        throw new Error("çağrılmamalı")
      },
    })
    assert.equal(out, input)
  })

  test("istek hatası eşleşmeyi düşürmez, kapsam boş kalır", async () => {
    const out = await annotateDiscountScopes(
      [match([option("BİM", "bim-P546", 21.5, 26)])],
      {
        nearby: async () => NEARBY,
        fetchReferencePrice: async () => {
          throw new Error("WAF")
        },
      }
    )
    assert.equal(out[0].marketOptions[0].discountScope, undefined)
    assert.equal(out[0].marketOptions.length, 1)
  })

  test("cache'teki sonuç kullanılır, bilinmeyen de cache'lenir", async () => {
    const store = new Map<string, CachedScope>([
      ["cached|bim-P546|bim-Q941", "branch"],
    ])
    let fetched = 0
    const cache = {
      get: async (p: string, d: string, r: string) =>
        store.get(`${p}|${d}|${r}`) ?? null,
      set: async (p: string, d: string, r: string, v: CachedScope) => {
        store.set(`${p}|${d}|${r}`, v)
      },
    }
    const out = await annotateDiscountScopes(
      [
        match([option("BİM", "bim-P546", 21.5, 26, "cached")]),
        match([option("BİM", "bim-P546", 10, 12, "yeni")]),
      ],
      {
        nearby: async () => NEARBY,
        fetchReferencePrice: async () => {
          fetched++
          return null
        },
        cache,
      }
    )
    assert.equal(fetched, 1)
    assert.equal(out[0].marketOptions[0].discountScope, "branch")
    assert.equal(out[1].marketOptions[0].discountScope, undefined)
    assert.equal(store.get("yeni|bim-P546|bim-Q941"), "unknown")
  })

  test("tur başına istek tavanı", async () => {
    let fetched = 0
    const many = Array.from({ length: MAX_SCOPE_CHECKS + 5 }, (_, i) =>
      match([option("BİM", "bim-P546", 10, 12, `p${i}`)])
    )
    await annotateDiscountScopes(many, {
      nearby: async () => NEARBY,
      fetchReferencePrice: async () => {
        fetched++
        return 10
      },
    })
    assert.equal(fetched, MAX_SCOPE_CHECKS)
  })
})
