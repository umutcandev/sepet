import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { computeOptimization } from "@/lib/ai/optimize"
import type { MarketOption, MatchResult } from "@/lib/ai/schemas"
import {
  buildConversationContext,
  lastBasketItems,
  type ContextMessage,
} from "./conversation-context"

function user(text: string, metadata?: unknown): ContextMessage {
  return { role: "user", parts: [{ type: "text", text }], metadata }
}

function assistant(
  text: string,
  extra: ContextMessage["parts"] = []
): ContextMessage {
  return { role: "assistant", parts: [...extra, { type: "text", text }] }
}

describe("buildConversationContext", () => {
  test("ilk mesajda boş döner", () => {
    assert.equal(buildConversationContext([]), "")
  })

  test("önceki yemeği taşır: listeyi sen hazırla akışı", () => {
    const out = buildConversationContext([
      user("selam canım peynirli börek çekti"),
      assistant("Selam! Peynirli börek harika olur."),
    ])
    assert.equal(
      out,
      "Kullanıcı: selam canım peynirli börek çekti\nAsistan: Selam! Peynirli börek harika olur."
    )
  })

  test("hazırlanan listeyi kalemleriyle özetler", () => {
    const out = buildConversationContext([
      user("peynirli börek"),
      assistant("Peynirli börek için 2 temel malzemeyi hazırladım.", [
        {
          type: "tool-parseShoppingList",
          state: "output-available",
          output: {
            dishName: "peynirli börek",
            items: [
              {
                name: "yufka",
                quantity: 1,
                unit: "paket",
                searchQuery: "yufka",
              },
              {
                name: "beyaz peynir",
                quantity: 250,
                unit: "g",
                searchQuery: "beyaz peynir",
              },
            ],
          },
        },
      ]),
    ])
    assert.match(
      out,
      /\[Hazırlanan liste \(peynirli börek\): yufka 1 paket, beyaz peynir 250 g\]/
    )
  })

  test("onaylanan sepeti onay metni yerine kalemleriyle yazar", () => {
    const out = buildConversationContext([
      user("Sepeti onayladım, en ucuz marketleri göster.", {
        kind: "basketApproval",
        payload: {
          items: [
            { rawName: "süt", searchQuery: "süt", quantity: 1.5, unit: "l" },
          ],
        },
      }),
    ])
    assert.equal(out, "[Kullanıcı sepeti onayladı: süt 1,5 l]")
  })

  test("bozuk onay payload'ında patlamaz", () => {
    const out = buildConversationContext([
      user("x", { kind: "basketApproval", payload: { items: "çöp" } }),
      user("y", {
        kind: "basketApproval",
        payload: { items: [null, 3, { rawName: 5 }] },
      }),
    ])
    assert.equal(out, "")
  })

  test("fotoğraf mesajını işaretler, yemek analizini listeler", () => {
    const out = buildConversationContext([
      {
        role: "user",
        parts: [
          { type: "text", text: "Bu görseli analiz et" },
          { type: "file", mediaType: "image/jpeg" },
        ],
      },
      assistant("Görseldeki yemek menemen gibi görünüyor.", [
        {
          type: "tool-analyzeImage",
          state: "output-available",
          output: {
            analysis: {
              kind: "food",
              food: {
                dishName: "menemen",
                items: [{ name: "yumurta", quantity: 4, unit: "adet" }],
              },
            },
          },
        },
      ]),
    ])
    assert.match(
      out,
      /^Kullanıcı: \(fotoğraf gönderdi\) Bu görseli analiz et\n/
    )
    assert.match(
      out,
      /\[Fotoğraftaki yemek \(menemen\) için hazırlanan liste: yumurta 4 adet\]/
    )
  })

  test("çıktısı gelmemiş kartı ve düşünme metnini yazmaz", () => {
    const out = buildConversationContext([
      {
        role: "assistant",
        parts: [
          { type: "reasoning", text: "iç düşünce" },
          { type: "tool-parseShoppingList", state: "input-available" },
        ],
      },
    ])
    assert.equal(out, "")
  })

  test("uzun sohbette yalnızca son mesajları ve sınırlı uzunluğu tutar", () => {
    const messages = Array.from({ length: 40 }, (_, i) =>
      user(`mesaj ${i} ${"x".repeat(1000)}`)
    )
    const out = buildConversationContext(messages)
    assert.ok(!out.includes("mesaj 0 "))
    assert.ok(out.includes("mesaj 39 "))
    assert.ok(out.length <= 4000)
  })
})

function option(
  market: string,
  price: number,
  productName: string
): MarketOption {
  return {
    market,
    productId: `${productName}-${market}`,
    productName,
    packagePrice: price,
    packsNeeded: 1,
    effectiveCost: price,
    unitPriceLabel: null,
    depotName: null,
    imageUrl: null,
  }
}

function basketMatch(
  rawName: string,
  options: MarketOption[],
  userPicked = false
): MatchResult {
  return {
    rawName,
    searchQuery: rawName,
    quantity: 1,
    unit: "paket",
    bestMatch: null,
    marketPrices: [],
    marketOptions: options,
    alternatives: [],
    lookupStatus: "ok",
    errorMessage: null,
    sizeMismatch: false,
    selection: {
      poolQuery: rawName,
      aiAcceptedProductIds: [],
      aiSizeMismatch: false,
      userAcceptedProductIds: userPicked ? [options[0].productId] : null,
    },
  }
}

function summaryTurn(matches: MatchResult[]): ContextMessage {
  return assistant("Sepet Özeti hazır.", [
    {
      type: "tool-basketContext",
      state: "output-available",
      output: { items: [], matches, summary: computeOptimization(matches) },
    },
  ])
}

describe("Sepet Özeti ürünleri", () => {
  test("önerilen plandaki ürünleri kalem kalem yazar", () => {
    // Ekran görüntüsündeki vaka: model hangi ürüne itiraz edildiğini ancak
    // burada görür.
    const out = buildConversationContext([
      summaryTurn([
        basketMatch("kuru fasulye", [
          option("A101", 71.5, "Yurt Kuru Fasulye 400 Gr"),
        ]),
        basketMatch("soğan", [option("A101", 25.15, "Soğan 1 Kg")]),
      ]),
    ])
    assert.match(
      out,
      /\[Sepet Özeti'nde seçilen ürünler: kuru fasulye → Yurt Kuru Fasulye 400 Gr \(A101\); soğan → Soğan 1 Kg \(A101\)\]/
    )
  })

  test("kullanıcının elle seçtiği ürünü işaretler", () => {
    const out = buildConversationContext([
      summaryTurn([
        basketMatch(
          "kuru fasulye",
          [option("CarrefourSA", 99.9, "Carrefour Dermason Kuru Fasulye 1 Kg")],
          true
        ),
      ]),
    ])
    assert.match(out, /\(CarrefourSA, kullanıcı seçti\)/)
  })

  test("bozuk özet bağlamı düşürmez", () => {
    const out = buildConversationContext([
      assistant("Sepet Özeti hazır.", [
        {
          type: "tool-basketContext",
          state: "output-available",
          output: { summary: 5 },
        },
      ]),
    ])
    assert.equal(out, "Asistan: Sepet Özeti hazır.")
  })

  test("kalem notu dökümde görünür", () => {
    const out = buildConversationContext([
      user("Sepeti onayladım.", {
        kind: "basketApproval",
        payload: {
          items: [
            {
              rawName: "kuru fasulye",
              quantity: 1,
              unit: "paket",
              note: "konserve olmasın",
            },
          ],
        },
      }),
    ])
    assert.match(out, /kuru fasulye 1 paket \(not: konserve olmasın\)/)
  })
})

describe("lastBasketItems", () => {
  test("ilk mesajda liste yok", () => {
    assert.equal(lastBasketItems([]), null)
  })

  test("en son onaylanan sepeti döndürür", () => {
    const items = lastBasketItems([
      assistant("Hazırladım.", [
        {
          type: "tool-parseShoppingList",
          state: "output-available",
          output: {
            items: [
              { name: "süt", searchQuery: "süt", quantity: 1, unit: "l" },
            ],
          },
        },
      ]),
      user("Sepeti onayladım.", {
        kind: "basketApproval",
        payload: {
          items: [
            {
              rawName: "süt",
              searchQuery: "süt",
              quantity: 2,
              unit: "l",
              note: "cam şişe",
            },
          ],
        },
      }),
      summaryTurn([]),
    ])
    assert.deepEqual(items, [
      {
        name: "süt",
        searchQuery: "süt",
        quantity: 2,
        unit: "l",
        note: "cam şişe",
      },
    ])
  })

  test("onaydan sonra yeni taslak geldiyse taslağı döndürür", () => {
    const items = lastBasketItems([
      user("Sepeti onayladım.", {
        kind: "basketApproval",
        payload: {
          items: [
            { rawName: "süt", searchQuery: "süt", quantity: 1, unit: "l" },
          ],
        },
      }),
      assistant("Güncelledim.", [
        {
          type: "tool-parseShoppingList",
          state: "output-available",
          output: {
            items: [
              {
                name: "ayran",
                searchQuery: "ayran",
                quantity: 1,
                unit: "adet",
              },
            ],
          },
        },
      ]),
    ])
    assert.equal(items?.[0].name, "ayran")
    assert.equal(items?.[0].note, null)
  })
})
