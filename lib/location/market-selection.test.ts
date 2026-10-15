import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  carrySelection,
  chainCounts,
  effectiveSelection,
  isEverySelected,
  toggleChain,
  type DepotLike,
} from "./market-selection"

const DEPOTS: DepotLike[] = [
  { id: "b1", market: "BİM" },
  { id: "b2", market: "BİM" },
  { id: "a1", market: "A101" },
  { id: "m1", market: "Migros" },
]

const ids = (s: Iterable<string> | null) => (s ? [...s].sort() : s)

describe("effectiveSelection", () => {
  test("empty saved list means every nearby depot", () => {
    assert.deepEqual(ids(effectiveSelection(DEPOTS, [])), [
      "a1",
      "b1",
      "b2",
      "m1",
    ])
  })

  test("drops saved ids that are out of range", () => {
    assert.deepEqual(ids(effectiveSelection(DEPOTS, ["b1", "zz"])), ["b1"])
  })

  test("falls back to every depot when nothing saved is in range", () => {
    assert.equal(effectiveSelection(DEPOTS, ["zz"]).size, DEPOTS.length)
  })
})

describe("chainCounts", () => {
  test("counts total and selected depots per market", () => {
    const counts = chainCounts(DEPOTS, new Set(["b1", "m1"]))
    assert.deepEqual(counts.get("BİM"), { total: 2, selected: 1 })
    assert.deepEqual(counts.get("A101"), { total: 1, selected: 0 })
    assert.deepEqual(counts.get("Migros"), { total: 1, selected: 1 })
  })
})

describe("toggleChain", () => {
  test("removes every depot of a selected market", () => {
    const next = toggleChain(DEPOTS, new Set(["b1", "b2", "a1"]), "BİM")
    assert.deepEqual(ids(next), ["a1"])
  })

  test("removes a partially selected market", () => {
    const next = toggleChain(DEPOTS, new Set(["b1", "a1"]), "BİM")
    assert.deepEqual(ids(next), ["a1"])
  })

  test("adds every depot of an unselected market", () => {
    const next = toggleChain(DEPOTS, new Set(["a1"]), "BİM")
    assert.deepEqual(ids(next), ["a1", "b1", "b2"])
  })

  test("refuses to clear the last market", () => {
    assert.equal(toggleChain(DEPOTS, new Set(["a1"]), "A101"), null)
  })
})

describe("isEverySelected", () => {
  test("is false for an empty list", () => {
    assert.equal(isEverySelected([], new Set()), false)
  })

  test("is true only when every depot is selected", () => {
    assert.equal(isEverySelected(DEPOTS, new Set(["b1", "b2", "a1"])), false)
    assert.equal(
      isEverySelected(DEPOTS, new Set(["b1", "b2", "a1", "m1"])),
      true
    )
  })
})

describe("carrySelection", () => {
  const WIDER: DepotLike[] = [
    ...DEPOTS,
    { id: "b3", market: "BİM" },
    { id: "s1", market: "Şok" },
  ]

  test("everything selected stays everything", () => {
    const prev = { depots: DEPOTS, selected: new Set(DEPOTS.map((d) => d.id)) }
    const res = carrySelection(prev, WIDER, true)
    assert.deepEqual(res.ids.sort(), ["a1", "b1", "b2", "b3", "m1", "s1"])
    assert.equal(res.fellBack, false)
  })

  test("no previous depots selects everything", () => {
    const res = carrySelection({ depots: [], selected: new Set() }, WIDER, true)
    assert.equal(res.ids.length, WIDER.length)
  })

  test("fully selected markets bring their new depots", () => {
    const prev = { depots: DEPOTS, selected: new Set(["b1", "b2"]) }
    const res = carrySelection(prev, WIDER, true)
    assert.deepEqual(res.ids.sort(), ["b1", "b2", "b3"])
  })

  test("partial markets keep their branches on the same center", () => {
    const prev = { depots: DEPOTS, selected: new Set(["b1", "a1"]) }
    const res = carrySelection(prev, WIDER, true)
    assert.deepEqual(res.ids.sort(), ["a1", "b1"])
  })

  test("partial markets are taken whole in a new area", () => {
    const prev = { depots: DEPOTS, selected: new Set(["b1", "a1"]) }
    const res = carrySelection(prev, WIDER, false)
    assert.deepEqual(res.ids.sort(), ["a1", "b1", "b2", "b3"])
  })

  test("falls back to every depot when chosen markets are out of range", () => {
    const prev = { depots: DEPOTS, selected: new Set(["m1"]) }
    const next: DepotLike[] = [{ id: "s1", market: "Şok" }]
    assert.deepEqual(carrySelection(prev, next, true), {
      ids: ["s1"],
      fellBack: true,
    })
  })
})
