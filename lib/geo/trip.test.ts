import assert from "node:assert/strict"
import { describe, test } from "node:test"

import type { MarketAllocation } from "@/lib/ai/schemas"
import {
  compareDuration,
  depotStops,
  formatDistance,
  formatDuration,
  haversineKm,
  MAX_ROUTE_STOPS,
  orderStops,
  type GeoPoint,
} from "./trip"

const HOME: GeoPoint = { lat: 41, lng: 29 }
const north = (steps: number): GeoPoint => ({ lat: 41 + steps * 0.01, lng: 29 })

function row(coords: GeoPoint | null, market = "A101"): MarketAllocation {
  return {
    market,
    rawName: "kalem",
    productId: "p",
    productName: "ürün",
    unitPrice: 10,
    quantity: 1,
    lineTotal: 10,
    sizeMismatch: false,
    depotName: null,
    depotCoords: coords,
    imageUrl: null,
  }
}

describe("haversineKm", () => {
  test("ekvatorda bir boylam derecesi ~111 km", () => {
    const km = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })
    assert.ok(Math.abs(km - 111.19) < 0.1)
  })
})

describe("depotStops", () => {
  test("aynı şubeyi bir kez sayar, marketi taşır", () => {
    const stops = depotStops([row(north(1)), row(north(1)), row(north(2), "BİM")])
    assert.deepEqual(stops?.map((s) => s.market), ["A101", "BİM"])
  })

  test("koordinatı eksik satır varsa tahmin etmez", () => {
    assert.equal(depotStops([row(north(1)), row(null)]), null)
  })

  test("aynı koordinattaki farklı marketleri ayrı tutar", () => {
    const stops = depotStops([row(north(1), "Migros"), row(north(1), "CarrefourSA")])
    assert.deepEqual(stops?.map((s) => s.market), ["Migros", "CarrefourSA"])
  })

  test("rota sınırını aşan şube sayısında null döner", () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => row(north(i + 1)))
    assert.equal(depotStops(rows(MAX_ROUTE_STOPS))?.length, MAX_ROUTE_STOPS)
    assert.equal(depotStops(rows(MAX_ROUTE_STOPS + 1)), null)
  })

  test("şubeden alınan kalemlerin görsellerini toplar", () => {
    const withImage = { ...row(north(1)), imageUrl: "a.webp" }
    const fallback = { ...row(north(1)), productId: "q" }
    const stops = depotStops([withImage, fallback, row(north(2))], { q: "q.webp" })
    assert.deepEqual(stops?.map((s) => s.products), [["a.webp", "q.webp"], [null]])
  })
})

describe("orderStops", () => {
  test("birbirine yakın iki şubeyi art arda gezer", () => {
    const east = { lat: 41, lng: 29.05 }
    const order = orderStops(HOME, [north(1), east, north(2)])
    const gap = Math.abs(
      order.findIndex((p) => p.lat === north(1).lat) -
        order.findIndex((p) => p.lat === north(2).lat)
    )
    assert.equal(gap, 1)
  })

  test("eşit uzunluktaki iki yönden yakın şubeye önce gideni seçer", () => {
    const far = { lat: 41.02, lng: 29.03 }
    assert.deepEqual(orderStops(HOME, [far, north(1)])[0], north(1))
    assert.deepEqual(orderStops(HOME, [north(1), far])[0], north(1))
  })
})

describe("biçimlendirme", () => {
  test("süre dakika ve saatle yazılır", () => {
    assert.equal(formatDuration(20), "1 dk")
    assert.equal(formatDuration(14 * 60), "14 dk")
    assert.equal(formatDuration(65 * 60), "1 sa 5 dk")
    assert.equal(formatDuration(120 * 60), "2 sa")
  })

  test("mesafe 1 km altında metreyle yazılır", () => {
    assert.equal(formatDistance(847), "850 m")
    assert.equal(formatDistance(4120), "4,1 km")
  })

  test("kombinasyon süresi tek markete göre sade cümleyle söylenir", () => {
    assert.equal(compareDuration(14 * 60, 8 * 60), "Tek markete göre 6 dk daha uzun")
    assert.equal(compareDuration(8 * 60, 10 * 60), "Tek markete göre 2 dk daha kısa")
    assert.equal(compareDuration(600, 590), "Tek marketle neredeyse aynı süre")
  })

  test("saati aşan fark saat ve dakikayla yazılır", () => {
    assert.equal(compareDuration(300 * 60, 73 * 60), "Tek markete göre 3 sa 47 dk daha uzun")
  })
})
