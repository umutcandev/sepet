import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { computeOptimization } from "@/lib/ai/optimize"
import { applySelectionToParts } from "./selection-update"

const update = {
  matches: [],
  summary: computeOptimization([]),
  text: "Sepet Özeti hazır. Yeni metin.",
}

// Sepet onayı turunun kayıttaki part'ları (bkz. route.ts basketApproval kolu).
function turnParts(toolCallId = "ctx-1") {
  return [
    {
      type: "tool-lookupProducts",
      toolCallId: "look-1",
      state: "output-available",
      input: { items: [] },
      output: { matches: ["eski"] },
    },
    {
      type: "tool-summarizeOptimization",
      toolCallId: "sum-1",
      state: "output-available",
      input: { matches: ["eski"] },
      output: { eski: true },
    },
    {
      type: "tool-basketContext",
      toolCallId,
      state: "output-available",
      input: {},
      output: { items: ["kalem"], matches: ["eski"], summary: { eski: true } },
    },
    { type: "text", text: "Sepet Özeti hazır. Eski metin." },
  ]
}

describe("applySelectionToParts", () => {
  test("eşleşmeleri, özeti, bağlamı ve özet cümlesini birlikte günceller", () => {
    const next = applySelectionToParts(turnParts(), "ctx-1", update)
    assert.ok(next)
    assert.deepEqual(next[0].output, { matches: [] })
    assert.deepEqual(next[1].output, update.summary)
    assert.deepEqual(next[1].input, { matches: [] })
    assert.deepEqual(next[2].output, {
      items: ["kalem"],
      matches: [],
      summary: update.summary,
    })
    assert.equal(next[3].text, update.text)
  })

  test("bu bağlamı taşımayan mesaja dokunmaz", () => {
    assert.equal(
      applySelectionToParts(turnParts("başka"), "ctx-1", update),
      null
    )
    assert.equal(
      applySelectionToParts([{ type: "text", text: "selam" }], "ctx-1", update),
      null
    )
  })

  test("girdiyi değiştirmez", () => {
    const parts = turnParts()
    const before = JSON.stringify(parts)
    applySelectionToParts(parts, "ctx-1", update)
    assert.equal(JSON.stringify(parts), before)
  })
})
