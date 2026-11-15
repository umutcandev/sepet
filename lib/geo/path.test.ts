import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { cumulativeLengths, curveBetween, pathUntil, pointAt, type LatLngTuple } from "./path"

const PATH: LatLngTuple[] = [
  [0, 0],
  [0, 1],
  [0, 3],
]
const CUM = cumulativeLengths(PATH)

describe("pathUntil", () => {
  test("uzunluklar birikir", () => {
    assert.deepEqual(CUM, [0, 1, 3])
  })

  test("yarısı ikinci kenarın içinde biter", () => {
    assert.deepEqual(pathUntil(PATH, CUM, 0.5), [
      [0, 0],
      [0, 1],
      [0, 1.5],
    ])
  })

  test("uçlarda boş ya da tam yol", () => {
    assert.deepEqual(pathUntil(PATH, CUM, 0), [])
    assert.equal(pathUntil(PATH, CUM, 1), PATH)
  })

  test("sıfır uzunluklu yol olduğu gibi döner", () => {
    const still: LatLngTuple[] = [
      [1, 1],
      [1, 1],
    ]
    assert.equal(pathUntil(still, cumulativeLengths(still), 0.5), still)
  })

  test("orta nokta", () => {
    assert.deepEqual(pointAt(PATH, CUM, 0.5), [0, 1.5])
  })
})

describe("curveBetween", () => {
  test("uçlar tam, orta düz çizgiden sapar", () => {
    const a: LatLngTuple = [0, 0]
    const b: LatLngTuple = [0, 2]
    const curve = curveBetween(a, b)
    assert.equal(curve[0], a)
    assert.equal(curve.at(-1), b)
    const mid = curve[curve.length >> 1]
    assert.ok(Math.abs(mid[1] - 1) < 1e-9)
    assert.ok(Math.abs(mid[0]) > 0.2)
  })
})
