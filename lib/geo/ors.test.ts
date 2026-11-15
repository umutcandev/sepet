import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { coarsen, parseOrsRoute } from "./ors"

describe("parseOrsRoute", () => {
  test("GeoJSON cevabından süre, mesafe ve [lat, lng] yolu çıkarır", () => {
    const route = parseOrsRoute({
      features: [
        {
          geometry: {
            coordinates: [[29.0123456, 41.0012345], [29.02, 41.01], [29.0123456, 41.0012345]],
          },
          properties: {
            summary: { distance: 4120.4, duration: 845.6 },
            segments: [
              { distance: 2000, duration: 400 },
              { distance: 2120.4, duration: 445.6 },
            ],
            way_points: [0, 1, 2],
          },
        },
      ],
    })
    assert.deepEqual(route, {
      distanceM: 4120,
      durationS: 846,
      path: [
        [41.00123, 29.01235],
        [41.01, 29.02],
        [41.00123, 29.01235],
      ],
      legs: [
        { distanceM: 2000, durationS: 400, start: 0, end: 1 },
        { distanceM: 2120, durationS: 446, start: 1, end: 2 },
      ],
    })
  })

  test("rota yoksa null döner", () => {
    assert.equal(parseOrsRoute({ features: [] }), null)
    assert.equal(parseOrsRoute(null), null)
  })
})

describe("coarsen", () => {
  test("ev konumunu ~100 m'ye yuvarlar", () => {
    assert.deepEqual(coarsen({ lat: 41.012345, lng: 29.098765 }), {
      lat: 41.012,
      lng: 29.099,
    })
  })
})
