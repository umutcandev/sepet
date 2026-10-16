import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  buildMatchResult,
  resolveSelection,
  resolveUserSelection,
  selectionKey,
  type Candidate,
} from "./match-result"
import type { ParsedItem } from "./schemas"

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
    category: "Bakliyat",
    imageUrl: `https://img/${productId}.jpg`,
    averagePrice: null,
    minPrice: Math.min(...Object.values(prices)),
    maxPrice: Math.max(...Object.values(prices)),
    marketCount: markets.length,
    markets,
  }
}

const item: ParsedItem = {
  name: "kuru fasulye",
  searchQuery: "kuru fasulye",
  quantity: 1,
  unit: "paket",
  note: null,
}

// Ekran görüntüsündeki havuzun özü: adında "konserve" yazmayan konserve
// (Yurt) her iki markette de kuru fasulyeden ucuz.
const yurt = candidate("1YA7", "Yurt Kuru Fasulye 400 Gr", {
  A101: 71.5,
  Migros: 82.95,
})
const dermason = candidate("0FUQ", "Migros Dermason Kuru Fasulye 1 Kg", {
  Migros: 104.95,
})
const carrefour = candidate("0J59", "Carrefour Dermason Kuru Fasulye 1 Kg", {
  CarrefourSA: 99.9,
})
const unpriced: Candidate = {
  ...candidate("XXXX", "Fiyatsız", { A101: 1 }),
  markets: [],
}
const pool = [yurt, dermason, carrefour, unpriced]

describe("buildMatchResult", () => {
  test("asistanın seçimi: her markette kabul edilenin en ucuzu, seçim bilgisi kayıtlı", () => {
    const ai = resolveSelection(
      {
        itemIndex: 0,
        primaryProductId: yurt.productId,
        acceptedProductIds: [
          yurt.productId,
          dermason.productId,
          carrefour.productId,
        ],
        sizeMismatch: false,
        reason: "",
      },
      pool
    )
    const m = buildMatchResult({
      item,
      outcome: { kind: "hit", hits: pool, query: "kuru fasulye" },
      selection: ai,
      ai,
    })
    assert.equal(m.lookupStatus, "ok")
    assert.deepEqual(
      Object.fromEntries(m.marketOptions.map((o) => [o.market, o.productId])),
      { A101: "1YA7", Migros: "1YA7", CarrefourSA: "0J59" }
    )
    assert.deepEqual(m.selection, {
      poolQuery: "kuru fasulye",
      aiAcceptedProductIds: ["1YA7", "0FUQ", "0J59"],
      aiSizeMismatch: false,
      userAcceptedProductIds: null,
    })
    assert.equal(m.note, null)
  })

  test("kullanıcı konserveyi çıkarınca kalan ürünler yarışır, asistanın seçimi korunur", () => {
    const ai = {
      primaryProductId: yurt.productId,
      acceptedProductIds: [
        yurt.productId,
        dermason.productId,
        carrefour.productId,
      ],
      sizeMismatch: false,
    }
    const user = resolveUserSelection(
      [dermason.productId, carrefour.productId],
      pool,
      {
        previousPrimaryId: yurt.productId,
        aiSizeMismatch: false,
      }
    )
    const m = buildMatchResult({
      item,
      outcome: { kind: "hit", hits: pool, query: "kuru fasulye" },
      selection: user,
      ai,
      userAcceptedProductIds: user.acceptedProductIds,
    })
    assert.equal(m.bestMatch?.productId, dermason.productId)
    assert.deepEqual(m.marketOptions.map((o) => o.productId).sort(), [
      "0FUQ",
      "0J59",
    ])
    // A101 artık bu kalemi karşılamıyor.
    assert.equal(
      m.marketOptions.some((o) => o.market === "A101"),
      false
    )
    assert.deepEqual(m.selection?.aiAcceptedProductIds, [
      "1YA7",
      "0FUQ",
      "0J59",
    ])
    assert.deepEqual(m.selection?.userAcceptedProductIds, ["0FUQ", "0J59"])
  })

  test("not sonuca taşınır, boşluk notu yok sayılır", () => {
    const base = {
      outcome: { kind: "no_match" } as const,
      selection: null,
      ai: null,
    }
    assert.equal(
      buildMatchResult({
        ...base,
        item: { ...item, note: " konserve olmasın " },
      }).note,
      "konserve olmasın"
    )
    assert.equal(
      buildMatchResult({ ...base, item: { ...item, note: "  " } }).note,
      null
    )
  })

  test("havuz yoksa seçim bilgisi de yok; hata durumu korunur", () => {
    const m = buildMatchResult({
      item,
      outcome: { kind: "api_error", message: "503" },
      selection: null,
      ai: null,
    })
    assert.equal(m.lookupStatus, "api_error")
    assert.equal(m.errorMessage, "503")
    assert.equal(m.selection, null)
  })

  test("havuz var ama asistan hiçbirini kabul etmediyse no_match, havuz sorgusu yine kayıtlı", () => {
    const empty = {
      primaryProductId: null,
      acceptedProductIds: [],
      sizeMismatch: false,
    }
    const m = buildMatchResult({
      item,
      outcome: { kind: "hit", hits: pool, query: "kuru fasulye" },
      selection: empty,
      ai: empty,
    })
    assert.equal(m.lookupStatus, "no_match")
    assert.equal(m.selection?.poolQuery, "kuru fasulye")
  })
})

describe("resolveUserSelection", () => {
  test("havuzda olmayan ve fiyatsız ürünü düşürür, sırayı ve tekilliği korur", () => {
    const sel = resolveUserSelection(
      ["0J59", "YOK", "XXXX", "0J59", "1YA7"],
      pool,
      { aiSizeMismatch: true }
    )
    assert.deepEqual(sel.acceptedProductIds, ["0J59", "1YA7"])
    assert.equal(sel.primaryProductId, "0J59")
    assert.equal(sel.sizeMismatch, true)
  })

  test("önceki temsilci hâlâ seçiliyse temsilci odur", () => {
    const sel = resolveUserSelection(["0J59", "1YA7"], pool, {
      previousPrimaryId: "1YA7",
      aiSizeMismatch: false,
    })
    assert.equal(sel.primaryProductId, "1YA7")
  })
})

describe("selectionKey", () => {
  test("büyük/küçük harf ve boşluk farkı aynı kalem sayılır", () => {
    assert.equal(
      selectionKey(" Kuru  Fasulye ", "Konserve olmasın"),
      selectionKey("kuru fasulye", "konserve olmasın")
    )
  })

  test("not değişince anahtar da değişir", () => {
    assert.notEqual(
      selectionKey("kuru fasulye", null),
      selectionKey("kuru fasulye", "konserve olmasın")
    )
  })
})
