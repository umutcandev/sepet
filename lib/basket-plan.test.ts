import assert from "node:assert/strict"
import { describe, test } from "node:test"

import type { MarketAllocation } from "@/lib/ai/schemas"
import { planItemProduct, type PlanItemProduct } from "./basket-plan"

const matched: PlanItemProduct = {
  productId: "icim",
  name: "İçim Süt 1 Lt",
  brand: "İçim",
  imageUrl: "https://cdn/icim.png",
}

function alloc(
  productId: string,
  productName: string,
  imageUrl: string | null
): MarketAllocation {
  return {
    market: "Migros",
    rawName: "süt",
    productId,
    productName,
    unitPrice: 35,
    quantity: 1,
    lineTotal: 35,
    sizeMismatch: false,
    depotName: null,
    imageUrl,
  }
}

describe("planItemProduct", () => {
  test("plan başka ürünü aldıysa satır o ürünü gösterir", () => {
    const p = planItemProduct(
      matched,
      alloc("pinar", "Pınar Süt 1 Lt", "https://cdn/pinar.png")
    )
    assert.deepEqual(p, {
      productId: "pinar",
      name: "Pınar Süt 1 Lt",
      // Marka yalnızca temsilci üründe biliniyor; başka ürüne yapıştırılmaz.
      brand: null,
      imageUrl: "https://cdn/pinar.png",
    })
  })

  test("aynı ürünse marka ve kayıttaki görsel korunur", () => {
    const p = planItemProduct(matched, alloc("icim", "İçim Süt 1 Lt", null))
    assert.deepEqual(p, matched)
  })

  test("eski planda görsel yoksa eşlemeden tamamlanır, bulunamazsa boş kalır", () => {
    const old = alloc("pinar", "Pınar Süt 1 Lt", null)
    assert.equal(
      planItemProduct(matched, old, { pinar: "https://cdn/pinar.png" })
        .imageUrl,
      "https://cdn/pinar.png"
    )
    // Temsilcinin fotoğrafı başka bir ürünün satırına düşmez.
    assert.equal(planItemProduct(matched, old).imageUrl, null)
  })

  test("planda olmayan kalem kayıttaki eşleşen ürünle kalır", () => {
    assert.deepEqual(planItemProduct(matched, null), matched)
  })
})
