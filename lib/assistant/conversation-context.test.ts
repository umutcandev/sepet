import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  buildConversationContext,
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
