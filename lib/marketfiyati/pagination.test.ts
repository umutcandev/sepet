import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { computeHasMore, mergeUniqueById } from "./pagination"

describe("computeHasMore", () => {
  test("dolu sayfa ve devamı varsa true", () => {
    // 220 sonuç, 24'lük ilk sayfa → 24 < 220, devamı var.
    assert.equal(computeHasMore(220, 0, 24, 24), true)
  })

  test("eksik sayfa her zaman sondur", () => {
    // Sayfa istenen boyuttan az geldi — total ne derse desin liste bitti.
    assert.equal(computeHasMore(220, 5, 24, 11), false)
    assert.equal(computeHasMore(null, 0, 24, 3), false)
  })

  test("son tam sayfada devamı yoktur", () => {
    // 48 sonuç, 2. sayfa (index 1) tam doldu → (1+1)*24 = 48, 48 < 48 değil.
    assert.equal(computeHasMore(48, 1, 24, 24), false)
  })

  test("total bilinmiyorsa dolu sayfa devam sayılır", () => {
    // marketfiyati numberOfFound vermezse eksik sayfa döndürmektense
    // kullanıcıya bir tık fazla verdiriyoruz.
    assert.equal(computeHasMore(null, 3, 24, 24), true)
  })

  test("total 0 ise devam yoktur", () => {
    assert.equal(computeHasMore(0, 0, 24, 24), false)
  })

  test("çok sayfalık havuzda son sayfa indeksine göre hesaplar", () => {
    // AI havuzu: 3 sayfa çekildi, son sayfa index 2. 240 sonuçtan 72 görüldü.
    assert.equal(computeHasMore(240, 2, 24, 24), true)
    // 72 sonucun tamamı görüldüyse devamı yok.
    assert.equal(computeHasMore(72, 2, 24, 24), false)
  })

  test("total görülenden küçükse devam yoktur", () => {
    // Upstream tutarsızlığına karşı: total küçülse bile taşma üretmemeli.
    assert.equal(computeHasMore(10, 2, 24, 24), false)
  })
})

describe("mergeUniqueById", () => {
  const p = (id: string) => ({ productId: id })

  test("sayfaları sırayı bozmadan birleştirir", () => {
    const out = mergeUniqueById([[p("a"), p("b")], [p("c")]])
    assert.deepEqual(
      out.map((x) => x.productId),
      ["a", "b", "c"],
    )
  })

  test("sayfa sınırındaki tekrarı atar, ilk görülen kazanır", () => {
    // Upstream sıralaması istekler arasında oynayınca aynı ürün iki sayfada
    // birden gelebiliyor.
    const out = mergeUniqueById([
      [p("a"), p("b")],
      [p("b"), p("c")],
      [p("a"), p("d")],
    ])
    assert.deepEqual(
      out.map((x) => x.productId),
      ["a", "b", "c", "d"],
    )
  })

  test("aynı sayfa içindeki tekrarı da atar", () => {
    const out = mergeUniqueById([[p("a"), p("a"), p("b")]])
    assert.deepEqual(
      out.map((x) => x.productId),
      ["a", "b"],
    )
  })

  test("boş sayfalar sonucu bozmaz", () => {
    const out = mergeUniqueById([[], [p("a")], []])
    assert.deepEqual(
      out.map((x) => x.productId),
      ["a"],
    )
    assert.deepEqual(mergeUniqueById([]), [])
  })

  test("ilk görülen nesneyi korur, sonrakiyle değiştirmez", () => {
    const first = { productId: "a", name: "ilk" }
    const later = { productId: "a", name: "sonraki" }
    const out = mergeUniqueById([[first], [later]])
    assert.equal(out.length, 1)
    assert.equal(out[0].name, "ilk")
  })
})
