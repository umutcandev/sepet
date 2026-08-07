import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { billingPeriod, currentPeriod, nextPeriodStart } from "./period"

const at = (iso: string) => new Date(iso)

describe("currentPeriod / nextPeriodStart", () => {
  test("takvim ayı anahtarını UTC'ye göre üretir", () => {
    assert.equal(currentPeriod(at("2026-06-15T12:00:00Z")), "2026-06")
    assert.equal(currentPeriod(at("2026-01-01T00:00:00Z")), "2026-01")
  })

  test("ayın son anında bile içinde bulunulan ayı döner", () => {
    assert.equal(currentPeriod(at("2026-06-30T23:59:59Z")), "2026-06")
  })

  test("sonraki periyot bir sonraki ayın ilk günüdür", () => {
    assert.equal(
      nextPeriodStart(at("2026-06-15T12:00:00Z")).toISOString(),
      "2026-07-01T00:00:00.000Z",
    )
  })

  test("aralıkta yıl sınırını doğru geçer", () => {
    assert.equal(
      nextPeriodStart(at("2026-12-31T23:00:00Z")).toISOString(),
      "2027-01-01T00:00:00.000Z",
    )
  })
})

describe("billingPeriod", () => {
  test("yenileme gününe ulaşıldıysa pencere bu ayın anchor'ında başlar", () => {
    const { key, resetAt } = billingPeriod(15, at("2026-03-20T10:00:00Z"))
    assert.equal(key, "2026-03-15")
    assert.equal(resetAt.toISOString(), "2026-04-15T00:00:00.000Z")
  })

  test("yenileme gününe ulaşılmadıysa pencere önceki ayın anchor'ında başlar", () => {
    const { key, resetAt } = billingPeriod(15, at("2026-03-10T10:00:00Z"))
    assert.equal(key, "2026-02-15")
    assert.equal(resetAt.toISOString(), "2026-03-15T00:00:00.000Z")
  })

  test("anchor günü tam bugünse pencere bugün başlar", () => {
    const { key } = billingPeriod(15, at("2026-03-15T00:00:00Z"))
    assert.equal(key, "2026-03-15")
  })

  test("31'inde abone olan kullanıcı için Şubat ayın son gününe clamp'lenir", () => {
    // 2026 artık yıl değil → Şubat 28 çeker.
    const { key, resetAt } = billingPeriod(31, at("2026-02-20T10:00:00Z"))
    assert.equal(key, "2026-01-31")
    assert.equal(resetAt.toISOString(), "2026-02-28T00:00:00.000Z")
  })

  test("clamp'lenmiş pencereden sonraki ay tekrar 31'e döner", () => {
    const { key, resetAt } = billingPeriod(31, at("2026-03-01T10:00:00Z"))
    assert.equal(key, "2026-02-28")
    assert.equal(resetAt.toISOString(), "2026-03-31T00:00:00.000Z")
  })

  test("artık yılda Şubat 29'a clamp'lenir", () => {
    const { resetAt } = billingPeriod(31, at("2028-02-10T10:00:00Z"))
    assert.equal(resetAt.toISOString(), "2028-02-29T00:00:00.000Z")
  })

  test("Ocak'ta geriye sarma bir önceki yılın Aralık'ına gider", () => {
    const { key, resetAt } = billingPeriod(20, at("2026-01-10T00:00:00Z"))
    assert.equal(key, "2025-12-20")
    assert.equal(resetAt.toISOString(), "2026-01-20T00:00:00.000Z")
  })

  test("pencere anahtarı free planın YYYY-MM anahtarıyla çakışmaz", () => {
    // Aynı text PK'yı paylaştıkları için biçimlerin ayrışması şart.
    const pro = billingPeriod(1, at("2026-06-15T00:00:00Z")).key
    assert.equal(pro, "2026-06-01")
    assert.notEqual(pro, currentPeriod(at("2026-06-15T00:00:00Z")))
  })

  test("pencere her zaman AYLIKTIR (yıllık abonede de)", () => {
    const { key, resetAt } = billingPeriod(5, at("2026-07-09T00:00:00Z"))
    assert.equal(key, "2026-07-05")
    // Bir ay sonrası — yıllık abonelikte bile kota aylık sıfırlanır.
    assert.equal(resetAt.toISOString(), "2026-08-05T00:00:00.000Z")
  })
})
