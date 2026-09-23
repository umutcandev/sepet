import assert from "node:assert/strict"
import { test, describe } from "node:test"

import {
  aggregateRuns,
  diffBaseline,
  scoreCase,
  summarize,
  toBaseline,
} from "./score"
import type { AggregatedCase, GoldenCase, SelectionOutput } from "./types"

function goldenCase(expect: GoldenCase["expect"] = {}): GoldenCase {
  return {
    id: "peynir-01",
    rule: 1,
    split: "train",
    source: "taxonomy:peynir · KABUL='A+B'",
    note: "test",
    capturedAt: "2026-09-20T00:00:00.000Z",
    location: { lat: 41.06495, lng: 28.983262, distance: 10, depotCount: 35 },
    input: { rawName: "peynir", quantity: 1, unit: "paket" },
    candidates: [],
    expect,
  }
}

function output(over: Partial<SelectionOutput> = {}): SelectionOutput {
  return {
    primaryProductId: "p1",
    acceptedProductIds: ["p1", "p2"],
    sizeMismatch: false,
    ...over,
  }
}

describe("scoreCase", () => {
  test("belirtilmemiş assertion vakayı düşürmez", () => {
    // K2: vaka "kabul edilen küme tam olarak şu olsun" DEMEZ.
    const r = scoreCase(goldenCase(), output({ acceptedProductIds: ["p9"] }))
    assert.equal(r.passed, true)
  })

  test("mustAccept alt küme olarak aranır, fazlası serbesttir", () => {
    const r = scoreCase(
      goldenCase({ mustAccept: ["p1"] }),
      output({ acceptedProductIds: ["p1", "p5", "p7"] }),
    )
    assert.equal(r.checks.recall, true)
    assert.equal(r.passed, true)
  })

  test("kaçırılan mustAccept id'leri tek tek raporlanır", () => {
    const r = scoreCase(
      goldenCase({ mustAccept: ["p1", "p2", "p3"] }),
      output({ acceptedProductIds: ["p1"] }),
    )
    assert.deepEqual(r.missed, ["p2", "p3"])
    assert.equal(r.checks.recall, false)
    assert.equal(r.passed, false)
  })

  test("mustReject'ten sızan id yanlış kabul sayılır", () => {
    const r = scoreCase(
      goldenCase({ mustReject: ["p7", "p8"] }),
      output({ acceptedProductIds: ["p1", "p7"] }),
    )
    assert.deepEqual(r.wronglyAccepted, ["p7"])
    assert.equal(r.checks.precision, false)
  })

  test("primary verilmemişse ölçülmez, verilmişse eşitlik aranır", () => {
    assert.equal(scoreCase(goldenCase(), output({ primaryProductId: "pX" })).checks.primary, true)
    assert.equal(scoreCase(goldenCase({ primary: "p1" }), output()).checks.primary, true)
    assert.equal(
      scoreCase(goldenCase({ primary: "p2" }), output()).checks.primary,
      false,
    )
  })

  test("sizeMismatch=false beklentisi true dönüşü yakalar", () => {
    const r = scoreCase(goldenCase({ sizeMismatch: false }), output({ sizeMismatch: true }))
    assert.equal(r.checks.size, false)
  })

  test("nonEmpty yalnızca true verildiğinde boş kabulü düşürür", () => {
    assert.equal(
      scoreCase(goldenCase({ nonEmpty: true }), output({ acceptedProductIds: [] })).checks
        .nonEmpty,
      false,
    )
    assert.equal(
      scoreCase(goldenCase({ nonEmpty: false }), output({ acceptedProductIds: [] })).checks
        .nonEmpty,
      true,
    )
  })
})

describe("aggregateRuns", () => {
  const pass = () => scoreCase(goldenCase({ mustAccept: ["p1"] }), output())
  const fail = () =>
    scoreCase(goldenCase({ mustAccept: ["p1"] }), output({ acceptedProductIds: [] }))

  test("3/3 geçen vaka geçmiş ve kararlıdır", () => {
    const a = aggregateRuns([pass(), pass(), pass()])
    assert.equal(a.passed, true)
    assert.equal(a.unstable, false)
  })

  test("2/3 geçen vaka geçmemiş ve KARARSIZ'dır", () => {
    const a = aggregateRuns([pass(), fail(), pass()])
    assert.equal(a.passed, false)
    assert.equal(a.unstable, true)
    assert.equal(a.passCount, 2)
  })

  test("hepsi kaldıysa kararsız değildir", () => {
    const a = aggregateRuns([fail(), fail()])
    assert.equal(a.unstable, false)
  })

  test("örnek koşu olarak başarısız olan seçilir", () => {
    // Rapor hatayı basacak; geçen koşuyu göstermek işe yaramaz.
    assert.equal(aggregateRuns([pass(), fail()]).sample.passed, false)
  })
})

describe("summarize", () => {
  test("iki hata tipini ayrı sayar", () => {
    const leak = aggregateRuns([
      scoreCase(goldenCase({ mustReject: ["p1"] }), output()),
    ])
    const miss = aggregateRuns([
      scoreCase(goldenCase({ mustAccept: ["p9"] }), output()),
    ])
    const s = summarize([leak, miss])
    assert.equal(s.failed, 2)
    assert.equal(s.wrongAccept, 1)
    assert.equal(s.missed, 1)
  })
})

describe("diffBaseline", () => {
  const agg = (id: string, passed: boolean): AggregatedCase => ({
    id,
    split: "train",
    passed,
    unstable: false,
    passCount: passed ? 1 : 0,
    runCount: 1,
    sample: scoreCase(goldenCase(), output()),
  })

  test("geçerken kalan vaka gerileme, kalırken geçen düzelme sayılır", () => {
    const base = toBaseline([agg("a", true), agg("b", false), agg("c", true)], {
      promptVersion: "abc",
      model: "m",
    })
    const d = diffBaseline([agg("a", false), agg("b", true), agg("d", true)], base)!
    assert.deepEqual(d.regressed, ["a"])
    assert.deepEqual(d.improved, ["b"])
    assert.deepEqual(d.added, ["d"])
    assert.deepEqual(d.removed, ["c"])
  })

  test("baseline yoksa fark yoktur", () => {
    assert.equal(diffBaseline([agg("a", true)], null), null)
  })
})
