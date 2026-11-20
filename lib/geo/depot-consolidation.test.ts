import assert from "node:assert/strict"
import { describe, test } from "node:test"

import type { MarketAllocation } from "@/lib/ai/schemas"
import { consolidateDepots } from "./depot-consolidation"
import { depotStops, type GeoPoint } from "./trip"

const HOME: GeoPoint = { lat: 37, lng: 35.3 }
const at = (steps: number): GeoPoint => ({ lat: 37 + steps * 0.01, lng: 35.3 })

function row(
  market: string,
  depot: string,
  steps: number,
  extra: Partial<MarketAllocation> = {}
): MarketAllocation {
  return {
    market,
    rawName: `kalem-${depot}`,
    productId: `p-${depot}-${steps}`,
    productName: "ürün",
    unitPrice: 10,
    quantity: 1,
    lineTotal: 10,
    sizeMismatch: false,
    depotName: depot,
    depotId: `${market.toLowerCase()}-${depot}`,
    depotCoords: at(steps),
    imageUrl: null,
    ...extra,
  }
}

describe("consolidateDepots", () => {
  test("A101'in üç şubesine dağılan kalemler eve en yakın şubede toplanır", () => {
    const out = consolidateDepots(
      [row("A101", "uzak", 3), row("A101", "yakin", 1), row("A101", "orta", 2)],
      HOME
    )
    assert.deepEqual(
      out.map((a) => a.depotName),
      ["yakin", "yakin", "yakin"]
    )
    assert.deepEqual(
      out.map((a) => a.relocated ?? false),
      [true, false, true]
    )
    assert.equal(out[0].productId, "p-uzak-3")
    assert.equal(out[0].lineTotal, 10)
    assert.equal(depotStops(out)?.length, 1)
  })

  test("konum yoksa en çok kalemi taşıyan şube seçilir", () => {
    const out = consolidateDepots([
      row("BİM", "tek", 1),
      row("BİM", "cok", 5),
      row("BİM", "cok", 5),
    ])
    assert.deepEqual(
      out.map((a) => a.depotName),
      ["cok", "cok", "cok"]
    )
  })

  test("fiyatı şubeye göre değişen marketlere dokunulmaz", () => {
    const input = [
      row("Migros", "a", 1),
      row("CarrefourSA", "b", 2),
      row("Migros", "c", 3),
    ]
    const out = consolidateDepots(input, HOME)
    assert.deepEqual(out, input)
  })

  test("kombinasyonda her ulusal market kendi şubesinde toplanır", () => {
    const out = consolidateDepots(
      [
        row("A101", "a-yakin", 1),
        row("Şok", "s-uzak", 4),
        row("A101", "a-uzak", 3),
        row("Şok", "s-yakin", 2),
      ],
      HOME
    )
    assert.deepEqual(
      out.map((a) => a.depotName),
      ["a-yakin", "s-yakin", "a-yakin", "s-yakin"]
    )
    assert.equal(depotStops(out)?.length, 2)
  })

  test("şubeye özel kampanyalı kalem kendi şubesinde kalır, diğerleri ona eklenir", () => {
    const out = consolidateDepots(
      [
        row("A101", "yakin", 1),
        row("A101", "kampanya", 3, {
          regularPrice: 15,
          discountScope: "branch",
        }),
        row("A101", "orta", 2),
      ],
      HOME
    )
    assert.deepEqual(
      out.map((a) => a.depotName),
      ["kampanya", "kampanya", "kampanya"]
    )
    assert.equal(out[1].relocated, undefined)
  })

  test("iki ayrı kampanya şubesi: ikisi de durak, diğerleri en yakınına", () => {
    const out = consolidateDepots(
      [
        row("A101", "k-uzak", 4, { regularPrice: 15, discountScope: "branch" }),
        row("A101", "serbest", 1),
        row("A101", "k-yakin", 2, {
          regularPrice: 15,
          discountScope: "branch",
        }),
        row("A101", "k-uzak", 4),
      ],
      HOME
    )
    assert.deepEqual(
      out.map((a) => a.depotName),
      ["k-uzak", "k-yakin", "k-yakin", "k-uzak"]
    )
    assert.equal(depotStops(out)?.length, 2)
  })

  test("zincir genelinde kampanya (chain) kalemi serbest sayılır", () => {
    const out = consolidateDepots(
      [
        row("BİM", "kampanya", 3, { regularPrice: 15, discountScope: "chain" }),
        row("BİM", "yakin", 1),
      ],
      HOME
    )
    assert.deepEqual(
      out.map((a) => a.depotName),
      ["yakin", "yakin"]
    )
  })

  test("koordinatı olmayan satır olduğu gibi kalır", () => {
    const noCoords = row("A101", "x", 1, { depotCoords: null, depotId: null })
    const out = consolidateDepots([noCoords, row("A101", "y", 2)], HOME)
    assert.equal(out[0], noCoords)
    assert.equal(out[1].depotName, "y")
  })
})
