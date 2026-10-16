import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { selectionKey } from "@/lib/ai/match-result"
import { collectUserSelections } from "./user-selections"

function contextMessage(
  matches: unknown[],
  role = "assistant",
  type = "tool-basketContext"
) {
  return {
    role,
    parts: [
      { type, state: "output-available", output: { items: [], matches } },
    ],
  }
}

function match(
  searchQuery: string,
  user: string[] | null,
  extra: Record<string, unknown> = {}
) {
  return {
    rawName: searchQuery,
    searchQuery,
    quantity: 1,
    unit: "paket",
    bestMatch: { productId: user?.[0] ?? "AI1" },
    selection: {
      poolQuery: searchQuery,
      aiAcceptedProductIds: ["AI1", "AI2"],
      aiSizeMismatch: false,
      userAcceptedProductIds: user,
    },
    ...extra,
  }
}

describe("collectUserSelections", () => {
  test("kullanıcının seçtiği kalemleri anahtarıyla toplar", () => {
    const out = collectUserSelections([
      contextMessage([
        match("kuru fasulye", ["0FUQ", "0J59"]),
        match("soğan", null),
      ]),
    ])
    assert.equal(out.size, 1)
    const carried = out.get(selectionKey("kuru fasulye", null))
    assert.deepEqual(carried?.state.userAcceptedProductIds, ["0FUQ", "0J59"])
    assert.deepEqual(carried?.state.aiAcceptedProductIds, ["AI1", "AI2"])
    assert.equal(carried?.primaryProductId, "0FUQ")
    assert.equal(carried?.unit, "paket")
  })

  test("sonraki turda asistan seçtiyse eski seçim düşer", () => {
    const out = collectUserSelections([
      contextMessage([match("kuru fasulye", ["0FUQ"])]),
      contextMessage([match("kuru fasulye", null)]),
    ])
    assert.equal(out.size, 0)
  })

  test("not anahtarın parçası", () => {
    const out = collectUserSelections([
      contextMessage([
        match("kuru fasulye", ["0FUQ"], { note: "konserve olmasın" }),
      ]),
    ])
    assert.equal(out.has(selectionKey("kuru fasulye", null)), false)
    assert.equal(
      out.has(selectionKey("kuru fasulye", "konserve olmasın")),
      true
    )
  })

  test("kullanıcı mesajlarını ve başka part'ları okumaz", () => {
    const out = collectUserSelections([
      contextMessage([match("süt", ["S1"])], "user"),
      contextMessage(
        [match("süt", ["S1"])],
        "assistant",
        "tool-lookupProducts"
      ),
    ])
    assert.equal(out.size, 0)
  })

  test("geçersiz id ya da bozuk kayıt sessizce atlanır", () => {
    const out = collectUserSelections([
      contextMessage([
        match("süt", ["../../etc"]),
        match(
          "ekmek",
          Array.from({ length: 81 }, (_, i) => `E${i}`)
        ),
        { searchQuery: "yumurta" },
        null,
        match("çay", ["C1"]),
      ]),
    ])
    assert.deepEqual([...out.keys()], [selectionKey("çay", null)])
  })
})
