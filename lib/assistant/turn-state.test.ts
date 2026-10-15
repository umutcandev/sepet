import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  STOPPED_PART_TYPE,
  hasApprovalCard,
  hasStoppedMarker,
  resolveApprovalCard,
  statusAfterStop,
  type MessageLike,
  type PartLike,
} from "./turn-state"

const parseCard: PartLike = {
  type: "tool-parseShoppingList",
  state: "output-available",
  output: { items: [{ name: "süt" }], chatResponse: null },
}
const pendingLookup: PartLike = {
  type: "tool-lookupProducts",
  state: "input-available",
}
const summary: PartLike = {
  type: "tool-summarizeOptimization",
  state: "output-available",
  output: { totalItems: 1 },
}
const stopped: PartLike = { type: STOPPED_PART_TYPE }

let seq = 0
const user = (metadata?: unknown): MessageLike => ({
  id: `u${seq++}`,
  role: "user",
  parts: [{ type: "text" }],
  metadata,
})
const assistant = (...parts: PartLike[]): MessageLike => ({
  id: `a${seq++}`,
  role: "assistant",
  parts,
})
const approval = () => user({ kind: "basketApproval", payload: { items: [] } })

const byMarker = (m: MessageLike) => hasStoppedMarker(m.parts)

describe("resolveApprovalCard", () => {
  test("son mesajdaki kart açıktır", () => {
    const messages = [user(), assistant(parseCard)]
    assert.deepEqual(
      resolveApprovalCard(messages, 1, { busy: false, isStopped: byMarker }),
      { locked: false, approval: null }
    )
  })

  test("onay turu sürerken kart kilitlidir", () => {
    const a = approval()
    const messages = [user(), assistant(parseCard), a]
    const r = resolveApprovalCard(messages, 1, {
      busy: true,
      isStopped: byMarker,
    })
    assert.equal(r.locked, true)
    assert.equal(r.approval, a)
  })

  test("onay turu cevaplanınca kart kilitlenir", () => {
    const messages = [
      user(),
      assistant(parseCard),
      approval(),
      assistant(summary),
    ]
    const r = resolveApprovalCard(messages, 1, {
      busy: false,
      isStopped: byMarker,
    })
    assert.equal(r.locked, true)
  })

  test("onay turu ilk chunk'tan önce durdurulursa kart yeniden açılır", () => {
    const a = approval()
    const messages = [user(), assistant(parseCard), a]
    const r = resolveApprovalCard(messages, 1, {
      busy: false,
      isStopped: byMarker,
    })
    assert.equal(r.locked, false)
    assert.equal(r.approval, a, "açılan kart son gönderilen kalemleri gösterir")
  })

  test("onay turu sonuç üretmeden durdurulursa kart yeniden açılır", () => {
    const messages = [
      user(),
      assistant(parseCard),
      approval(),
      assistant(pendingLookup, stopped),
    ]
    const r = resolveApprovalCard(messages, 1, {
      busy: false,
      isStopped: byMarker,
    })
    assert.equal(r.locked, false)
  })

  test("canlı oturumda durdurulan mesaj işaret yerine id ile tanınır", () => {
    const cut = assistant(pendingLookup)
    const messages = [user(), assistant(parseCard), approval(), cut]
    const r = resolveApprovalCard(messages, 1, {
      busy: false,
      isStopped: (m) => m.id === cut.id,
    })
    assert.equal(r.locked, false)
  })

  test("Sepet Özeti geldikten sonra durdurulan tur cevaplanmış sayılır", () => {
    const messages = [
      user(),
      assistant(parseCard),
      approval(),
      assistant(summary, stopped),
    ]
    const r = resolveApprovalCard(messages, 1, {
      busy: false,
      isStopped: byMarker,
    })
    assert.equal(r.locked, true)
  })

  test("durdurulup yeniden onaylanan kart son onayla kilitlenir", () => {
    const second = approval()
    const messages = [
      user(),
      assistant(parseCard),
      approval(),
      assistant(pendingLookup, stopped),
      second,
      assistant(summary),
    ]
    const r = resolveApprovalCard(messages, 1, {
      busy: false,
      isStopped: byMarker,
    })
    assert.equal(r.locked, true)
    assert.equal(r.approval, second)
  })

  test("kullanıcı arada başka bir şey yazdıysa kart kilitli kalır", () => {
    const messages = [
      user(),
      assistant(parseCard),
      approval(),
      assistant(pendingLookup, stopped),
      user(),
    ]
    const r = resolveApprovalCard(messages, 1, {
      busy: false,
      isStopped: byMarker,
    })
    assert.equal(r.locked, true)
  })
})

describe("statusAfterStop", () => {
  test("liste okunurken durdurulan tur tamamlanmış sayılır", () => {
    assert.equal(
      statusAfterStop(
        [{ type: "tool-parseShoppingList", state: "input-available" }],
        false
      ),
      "completed"
    )
  })

  test("onay kartı gösterildikten sonra durdurulan tur onay bekler", () => {
    assert.equal(statusAfterStop([parseCard], false), "awaiting")
  })

  test("sonuç üretmeden durdurulan onay turu onay bekler", () => {
    assert.equal(statusAfterStop([pendingLookup], true), "awaiting")
    assert.equal(statusAfterStop([], true), "awaiting")
  })

  test("Sepet Özeti geldikten sonra durdurulan tur tamamlanmıştır", () => {
    assert.equal(statusAfterStop([summary], true), "completed")
  })
})

describe("hasApprovalCard", () => {
  test("boş liste ve tanınmayan görsel kart sayılmaz", () => {
    assert.equal(
      hasApprovalCard([
        {
          type: "tool-parseShoppingList",
          state: "output-available",
          output: { items: [] },
        },
      ]),
      false
    )
    assert.equal(
      hasApprovalCard([
        {
          type: "tool-analyzeImage",
          state: "output-available",
          output: { analysis: { kind: "unknown", receipt: null, food: null } },
        },
      ]),
      false
    )
  })

  test("fiş ve yemek analizi kalem çıkardıysa kart sayılır", () => {
    assert.equal(
      hasApprovalCard([
        {
          type: "tool-analyzeImage",
          state: "output-available",
          output: { analysis: { kind: "food", food: { items: [{}] } } },
        },
      ]),
      true
    )
  })
})
