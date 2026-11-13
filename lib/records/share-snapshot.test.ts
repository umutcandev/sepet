import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, test } from "node:test"

import type { OptimizationSummary } from "@/lib/ai/schemas"
import { clipText } from "@/lib/assistant/share-snapshot"
import {
  basketRecordData,
  receiptRecordData,
  type BasketRecordData,
} from "./record-data"
import {
  publicRecordTitle,
  sanitizeSharedBasket,
  sanitizeSharedReceipt,
} from "./share-snapshot"

const DEPOT = "Migros Moda Şubesi"
const PRODUCT_IMG = "https://cdn.marketfiyati.org.tr/p1.jpg"
const FOREIGN_IMG = "https://tracker.example.com/pixel.gif"

function summary(): OptimizationSummary {
  const alloc = {
    market: "Migros",
    rawName: "süt",
    productId: "P1",
    productName: "Süt 1 L",
    unitPrice: 35,
    quantity: 1,
    lineTotal: 35,
    sizeMismatch: false,
    depotName: DEPOT,
    imageUrl: FOREIGN_IMG,
  }
  return {
    singleMarket: {
      market: "Migros",
      total: 35,
      itemCount: 1,
      missingItemCount: 0,
      missingItemNames: [],
      isFullCoverage: true,
      allocation: [alloc],
    },
    twoMarketCombo: {
      markets: ["Migros", "A101"],
      total: 35,
      savingsTL: 0,
      savingsPct: 0,
      allocation: [{ ...alloc, imageUrl: PRODUCT_IMG }],
    },
    currency: "TRY",
    totalItems: 1,
  }
}

const item = {
  rawName: "süt",
  quantity: "1.000",
  unit: "l",
  matchedProductId: "P1",
  matchedImageUrl: PRODUCT_IMG,
  lookupStatus: "ok",
}

function basket(): BasketRecordData {
  return basketRecordData(
    {
      createdAt: new Date("2026-11-01T10:00:00Z"),
      twoMarketSavingsTL: "4.50",
      summaryJson: summary(),
    },
    [
      { ...item, searchQuery: "süt" },
      {
        ...item,
        rawName: "ekmek",
        searchQuery: "ekmek",
        unit: "kutu",
        matchedProductId: "P2",
        matchedImageUrl: FOREIGN_IMG,
        lookupStatus: null,
      },
    ]
  )
}

describe("sanitizeSharedBasket", () => {
  test("şube adları ve ürün CDN'i dışındaki görseller düşer", () => {
    const out = sanitizeSharedBasket(basket())
    assert.ok(out)
    const json = JSON.stringify(out)
    assert.ok(!json.includes(DEPOT))
    assert.ok(!json.includes(FOREIGN_IMG))
    assert.equal(out.summary?.twoMarketCombo.allocation[0].imageUrl, PRODUCT_IMG)
    assert.deepEqual(out.itemImages, { P1: PRODUCT_IMG })
  })

  test("idempotent: okurken tekrar uygulanması kopyayı değiştirmez", () => {
    const once = sanitizeSharedBasket(basket())
    assert.deepEqual(sanitizeSharedBasket(once), once)
  })

  test("tanınmayan alanlar düşer, bilinmeyen birim adet olur", () => {
    const out = sanitizeSharedBasket({ ...basket(), secret: "x" })
    assert.ok(out)
    assert.equal("secret" in out, false)
    assert.equal(out.items[1].unit, "adet")
    assert.equal(out.items[1].matched, true)
  })

  test("bozuk kopya reddedilir", () => {
    assert.equal(sanitizeSharedBasket({ items: "x" }), null)
    assert.equal(sanitizeSharedBasket(null), null)
  })

  test("okunamayan özet ve görsel haritası yalnız kendini düşürür", () => {
    const out = sanitizeSharedBasket({
      ...basket(),
      summary: { singleMarket: "bozuk" },
      itemImages: "bozuk",
    })
    assert.ok(out)
    assert.equal(out.summary, null)
    assert.deepEqual(out.itemImages, {})
    assert.equal(out.items.length, 2)
  })
})

describe("kayıtlı kopya", () => {
  test("bugünkü kurallardan aynen geçer", () => {
    const fixture = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "lib/records/share-snapshot.fixture.json"),
        "utf8"
      )
    )
    assert.deepEqual(sanitizeSharedBasket(fixture.basket), fixture.basket)
    assert.deepEqual(sanitizeSharedReceipt(fixture.receipt), fixture.receipt)
  })
})

describe("clipText", () => {
  test("emojiyi ortadan bölmez ve idempotent", () => {
    const text = "a".repeat(9) + "😀" + "b"
    const once = clipText(text, 10)
    assert.equal(once, "a".repeat(9) + "…")
    assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(once))
    assert.equal(clipText(once, 10), once)
    assert.equal(clipText("a".repeat(12), 10), "a".repeat(10) + "…")
  })
})

describe("publicRecordTitle", () => {
  test("otomatik addaki kayıt saati düşer, elle verilen ad kalır", () => {
    assert.equal(publicRecordTitle("Sepet · 05 Oca 12:07"), "Sepet · 05 Oca")
    assert.equal(publicRecordTitle("Migros · 30 Eyl 03:00"), "Migros · 30 Eyl")
    assert.equal(publicRecordTitle("İskender sepeti"), "İskender sepeti")
    assert.equal(publicRecordTitle("Saat 12:07 alışverişi"), "Saat 12:07 alışverişi")
  })
})

describe("sanitizeSharedReceipt", () => {
  test("kalem görseli ve özet temizlenir, uzun ad kırpılır", () => {
    const data = receiptRecordData(
      {
        createdAt: new Date("2026-11-01T10:00:00Z"),
        marketName: "Migros",
        purchaseDate: null,
        totalAmount: "0.00",
        bestSingleMarket: "A101",
        bestSingleTotal: "30.00",
        potentialSavingsTL: "5.00",
        summaryJson: summary(),
      },
      [
        {
          ...item,
          rawName: "x".repeat(500),
          matchedImageUrl: FOREIGN_IMG,
          searchQuery: null,
          matchedName: null,
          matchedBrand: null,
          bestMarket: "A101",
          bestPrice: "30.00",
          receiptUnitPrice: null,
          savingsTL: "5.00",
        },
      ]
    )
    const out = sanitizeSharedReceipt(data)
    assert.ok(out)
    assert.equal(out.totalAmount, 0)
    assert.equal(out.items[0].matchedImageUrl, null)
    assert.equal(out.items[0].rawName.length, 201)
    assert.ok(!JSON.stringify(out).includes(DEPOT))
    assert.deepEqual(sanitizeSharedReceipt(out), out)
  })
})
