import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { overlaps, placeLabel, segmentHitsRect, type Pt } from "./label-placement"

const BOUNDS = { x: 0, y: 0, w: 400, h: 300 }
const SIZE = { w: 90, h: 24 }
const vertical: Pt[] = [{ x: 200, y: 20 }, { x: 200, y: 280 }]

describe("placeLabel", () => {
  test("kutu çizginin yanına oturur, çizgiyi kapatmaz", () => {
    const p = placeLabel({ path: vertical, size: SIZE, segments: [vertical], blocked: [], bounds: BOUNDS })
    assert.ok(p)
    assert.equal(segmentHitsRect(vertical[0], vertical[1], p.rect), false)
    // Orta yükseklikte, çizgiye yakın.
    assert.ok(Math.abs(p.rect.y + p.rect.h / 2 - 150) < 1)
    assert.ok(p.rect.x - 200 >= 6 || 200 - (p.rect.x + p.rect.w) >= 6)
  })

  test("sağ taraf doluysa sola geçer ve çizgiyi sağ kenara alır", () => {
    const blocked = [{ x: 205, y: 0, w: 195, h: 300 }]
    const p = placeLabel({ path: vertical, size: SIZE, segments: [vertical], blocked, bounds: BOUNDS })
    assert.ok(p)
    assert.equal(p.barRight, true)
    assert.ok(p.rect.x + p.rect.w <= 200)
  })

  test("işaretçiyi kapatmamak için ortadan kayar", () => {
    const pin = { x: 150, y: 120, w: 110, h: 60 }
    const p = placeLabel({ path: vertical, size: SIZE, segments: [vertical], blocked: [pin], bounds: BOUNDS })
    assert.ok(p)
    assert.equal(overlaps(p.rect, pin), false)
  })

  test("yatay çizgide kutu üstüne ya da altına oturur", () => {
    const horizontal: Pt[] = [{ x: 20, y: 150 }, { x: 380, y: 150 }]
    const p = placeLabel({ path: horizontal, size: SIZE, segments: [horizontal], blocked: [], bounds: BOUNDS })
    assert.ok(p)
    assert.ok(p.rect.y + p.rect.h <= 150 - 6 || p.rect.y >= 150 + 6)
  })
})
