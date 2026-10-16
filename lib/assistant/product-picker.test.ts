import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { buildMatchResult, type Candidate } from "@/lib/ai/match-result"
import { computeOptimization } from "@/lib/ai/optimize"
import type { MatchResult } from "@/lib/ai/schemas"
import {
  aiAcceptedIds,
  initialSelection,
  pickerPoolQuery,
  planProductsFor,
  previewSelection,
  sameIds,
} from "./product-picker"

function candidate(
  productId: string,
  name: string,
  prices: Record<string, number>
): Candidate {
  const markets = Object.entries(prices).map(([market, price]) => ({
    market,
    price,
    priceModifiedAt: null,
    depotName: null,
    unitPrice: null,
    unitPriceValue: null,
    unitBase: null,
  }))
  return {
    productId,
    name,
    brand: null,
    category: null,
    imageUrl: null,
    averagePrice: null,
    minPrice: Math.min(...Object.values(prices)),
    maxPrice: Math.max(...Object.values(prices)),
    marketCount: markets.length,
    markets,
  }
}

function aiMatch(
  name: string,
  unit: MatchResult["unit"],
  hits: Candidate[],
  accepted: string[]
): MatchResult {
  const sel = {
    primaryProductId: accepted[0] ?? null,
    acceptedProductIds: accepted,
    sizeMismatch: false,
  }
  return buildMatchResult({
    item: { name, searchQuery: name, quantity: 1, unit, note: null },
    outcome: { kind: "hit", hits, query: name },
    selection: sel,
    ai: sel,
  })
}

// Ekran görüntüsündeki sepet: A101 131,65 TL (konserve fasulyeyle).
const yurt = candidate("1YA7", "Yurt Kuru Fasulye 400 Gr", {
  A101: 71.5,
  Migros: 82.95,
})
const migrosDry = candidate("0FUQ", "Migros Dermason Kuru Fasulye 1 Kg", {
  Migros: 104.95,
})
const carrefourDry = candidate("0J59", "Carrefour Dermason Kuru Fasulye 1 Kg", {
  CarrefourSA: 99.9,
})
const beanPool = [yurt, migrosDry, carrefourDry]
const onion = candidate("ON1", "Soğan 1 Kg", {
  A101: 25.15,
  CarrefourSA: 29.9,
  Migros: 31,
})
const paste = candidate("PS1", "Tukaş Domates Salçası 700 Gr", {
  A101: 35,
  CarrefourSA: 39.95,
  Migros: 42,
})

const matches = [
  aiMatch("kuru fasulye", "paket", beanPool, ["1YA7", "0FUQ", "0J59"]),
  aiMatch("soğan", "adet", [onion], ["ON1"]),
  aiMatch("domates salçası", "paket", [paste], ["PS1"]),
]
const summary = computeOptimization(matches)

describe("previewSelection", () => {
  test("başlangıç durumu ekran görüntüsündeki plan", () => {
    assert.equal(summary.singleMarket.market, "A101")
    assert.equal(summary.singleMarket.total, 131.65)
    assert.deepEqual(summary.twoMarketCombo.markets, ["Migros", "CarrefourSA"])
    assert.equal(summary.twoMarketCombo.total, 152.8)
  })

  test("konserve çıkarılınca A101 fasulyeyi karşılamaz, plan değişir", () => {
    const preview = previewSelection({
      match: matches[0],
      matches,
      itemIndex: 0,
      products: beanPool,
      selectedIds: ["0FUQ", "0J59"],
    })
    assert.ok(preview)
    // A101'de kuru fasulye kalmadı: tam karşılayan tek market CarrefourSA
    // (99,90 + 29,90 + 39,95) ve Migros (104,95 + 31 + 42); ucuzu CarrefourSA.
    assert.equal(preview.summary.singleMarket.market, "CarrefourSA")
    assert.equal(preview.summary.singleMarket.total, 169.75)
    assert.equal(preview.summary.singleMarket.isFullCoverage, true)
    assert.deepEqual(preview.match.selection?.userAcceptedProductIds, [
      "0FUQ",
      "0J59",
    ])
    // Döküm satırları hangi kaleme ait olduğunu bilir.
    const beanRow = preview.summary.singleMarket.allocation.find(
      (a) => a.rawName === "kuru fasulye"
    )
    assert.equal(beanRow?.itemIndex, 0)
    assert.equal(beanRow?.productId, "0J59")
  })

  test("seçimde fiyatlı ürün kalmazsa önizleme yok", () => {
    assert.equal(
      previewSelection({
        match: matches[0],
        matches,
        itemIndex: 0,
        products: beanPool,
        selectedIds: [],
      }),
      null
    )
    assert.equal(
      previewSelection({
        match: matches[0],
        matches,
        itemIndex: 0,
        products: beanPool,
        selectedIds: ["BILINMEYEN"],
      }),
      null
    )
  })
})

describe("planProductsFor", () => {
  test("kalemin iki plandaki ürünlerini ve marketlerini döndürür", () => {
    // Tek market A101'den, iki market planı Migros'tan aynı konserveyi alıyor.
    const plan = planProductsFor(summary, 0, "kuru fasulye")
    assert.deepEqual(plan.get("1YA7"), ["A101", "Migros"])
    assert.equal(plan.has("ON1"), false)
  })

  test("kalem sırası olmayan eski dökümde ham adla eşler", () => {
    const legacy = {
      ...summary,
      singleMarket: {
        ...summary.singleMarket,
        allocation: summary.singleMarket.allocation.map(
          ({ itemIndex: _drop, ...rest }) => rest
        ),
      },
    }
    assert.deepEqual(planProductsFor(legacy, 0, "kuru fasulye").get("1YA7"), [
      "A101",
      "Migros",
    ])
  })
})

describe("seçim yardımcıları", () => {
  test("kullanıcı seçimi varsa ekran onunla açılır, yoksa asistanınkiyle", () => {
    assert.deepEqual(initialSelection(matches[0]), ["1YA7", "0FUQ", "0J59"])
    const edited: MatchResult = {
      ...matches[0],
      selection: { ...matches[0].selection!, userAcceptedProductIds: ["0J59"] },
    }
    assert.deepEqual(initialSelection(edited), ["0J59"])
  })

  test("seçim bilgisi olmayan eski eşleşmede görünen ürünler asistanın seçimi sayılır", () => {
    const legacy: MatchResult = { ...matches[0], selection: undefined }
    assert.deepEqual(aiAcceptedIds(legacy).sort(), ["0FUQ", "0J59", "1YA7"])
    assert.equal(pickerPoolQuery(legacy), "kuru fasulye")
  })

  test("takma adlı terimin havuzu takma adla açılır", () => {
    const legacy: MatchResult = {
      ...matches[0],
      searchQuery: "yağ",
      selection: undefined,
    }
    assert.equal(pickerPoolQuery(legacy), "ayçiçek yağı")
  })

  test("sameIds sırayı önemsemez", () => {
    assert.equal(sameIds(["a", "b"], ["b", "a"]), true)
    assert.equal(sameIds(["a"], ["a", "b"]), false)
  })
})
