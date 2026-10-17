import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, test } from "node:test"

import { computeOptimization } from "@/lib/ai/optimize"
import type { MatchResult } from "@/lib/ai/schemas"
import {
  IMAGE_OMITTED_PART_TYPE,
  SHARED_IMAGE_PART_TYPE,
  SHARED_TEXT_MAX,
  sanitizeMessagesForShare,
  sanitizeShareTitle,
} from "./share-snapshot"

const RECEIPT_URL =
  "https://cdn.example.com/receipts/user-123/0b9f6c1e-1d2a-4c55-9f0e-0f5f1c1a2b3c.jpg"
const RECEIPT_KEY = "receipts/user-123/0b9f6c1e-1d2a-4c55-9f0e-0f5f1c1a2b3c.jpg"
const DEPOT = "Migros Moda Şubesi"

function match(): MatchResult {
  return {
    rawName: "süt",
    searchQuery: "süt",
    quantity: 1,
    unit: "l",
    bestMatch: {
      productId: "P1",
      name: "Süt 1 L",
      brand: "Marka",
      category: "Süt",
      imageUrl: "https://cdn.marketfiyati.org.tr/p1.jpg",
      averagePrice: 40,
      minPrice: 35,
      maxPrice: 45,
      marketCount: 2,
    },
    marketPrices: [{ market: "Migros", price: 35, depotName: DEPOT }],
    marketOptions: [
      {
        market: "Migros",
        productId: "P1",
        productName: "Süt 1 L",
        packagePrice: 35,
        packsNeeded: 1,
        effectiveCost: 35,
        unitPriceLabel: null,
        depotName: DEPOT,
        imageUrl: "https://cdn.marketfiyati.org.tr/p1.jpg",
      },
    ],
    alternatives: [],
    lookupStatus: "ok",
    errorMessage: null,
    sizeMismatch: false,
    note: null,
    selection: {
      poolQuery: "süt",
      aiAcceptedProductIds: ["P1"],
      aiSizeMismatch: false,
      userAcceptedProductIds: ["P1"],
    },
  }
}

const approvedItems = [
  { rawName: "süt", searchQuery: "süt", quantity: 1, unit: "l", note: null },
]

// Kayıttaki bir sohbet: metin → taslak, onay → Sepet Özeti, ardından fiş.
function conversation() {
  const matches = [match()]
  const summary = computeOptimization(matches)
  return [
    {
      role: "user",
      parts: [{ type: "text", text: "süt al" }],
      metadata: null,
    },
    {
      role: "assistant",
      parts: [
        {
          type: "tool-parseShoppingList",
          toolCallId: "parse-1",
          state: "output-available",
          input: { rawText: "süt al" },
          output: {
            items: [
              { name: "süt", quantity: 1, unit: "l", searchQuery: "süt" },
            ],
            chatResponse: null,
            dishName: null,
            revision: false,
          },
        },
        { type: "reasoning", text: "Düşündüm", state: "done" },
        { type: "text", text: "Listeni hazırladım." },
      ],
    },
    {
      role: "user",
      parts: [{ type: "text", text: "Sepeti onayladım." }],
      metadata: {
        kind: "basketApproval",
        payload: { items: approvedItems, extra: "gizli" },
        secret: "x",
      },
    },
    {
      role: "assistant",
      parts: [
        {
          type: "tool-lookupProducts",
          toolCallId: "look-1",
          state: "output-available",
          input: { items: [] },
          output: { matches },
        },
        {
          type: "tool-summarizeOptimization",
          toolCallId: "sum-1",
          state: "output-available",
          input: { matches },
          output: summary,
        },
        {
          type: "tool-basketContext",
          toolCallId: "ctx-1",
          state: "output-available",
          input: {},
          output: { items: approvedItems, matches, summary },
        },
        { type: "text", text: "En ucuz tek market Migros." },
      ],
    },
    {
      role: "user",
      parts: [
        { type: "text", text: "Bu görseli analiz et" },
        {
          type: "file",
          mediaType: "image/jpeg",
          url: RECEIPT_URL,
          filename: RECEIPT_KEY,
        },
      ],
    },
    {
      role: "assistant",
      parts: [
        {
          type: "tool-analyzeImage",
          toolCallId: "img-1",
          state: "output-available",
          input: { imageUrl: RECEIPT_URL },
          output: {
            analysis: {
              kind: "receipt",
              receipt: {
                marketName: "Migros",
                purchaseDate: "2026-10-01",
                totalAmount: 35,
                items: [
                  {
                    rawName: "SUT 1L",
                    quantity: 1,
                    unit: "adet",
                    unitPrice: 35,
                    totalPrice: 35,
                    searchQuery: "süt",
                  },
                ],
              },
              food: null,
              unknownReason: null,
            },
            receiptImageUrl: RECEIPT_URL,
            receiptImageR2Key: RECEIPT_KEY,
          },
        },
      ],
    },
    {
      role: "user",
      parts: [{ type: "text", text: "Bu kalemleri onayladım, karşılaştır." }],
      metadata: {
        kind: "receiptApproval",
        payload: {
          receiptImageUrl: RECEIPT_URL,
          receiptImageR2Key: RECEIPT_KEY,
        },
      },
    },
    {
      role: "assistant",
      parts: [
        {
          type: "tool-receiptComparison",
          toolCallId: "cmp-1",
          state: "output-available",
          input: {},
          output: {
            comparison: {
              items: [],
              totalReceiptAmount: 35,
              totalBestAmount: 35,
              totalSavingsTL: 0,
              staleness: null,
            },
            receiptContext: {
              imageUrl: RECEIPT_URL,
              imageR2Key: RECEIPT_KEY,
              marketName: "Migros",
              purchaseDate: "2026-10-01",
              totalAmount: 35,
              items: [
                {
                  rawName: "SUT 1L",
                  quantity: 1,
                  unit: "adet",
                  unitPrice: 35,
                  totalPrice: 35,
                  searchQuery: "süt",
                },
              ],
            },
            summary,
            matches,
          },
        },
      ],
    },
  ]
}

describe("sanitizeMessagesForShare", () => {
  test("hiçbir yerde fiş adresi, R2 anahtarı, şube adı ya da seçim durumu kalmaz", () => {
    const shared = sanitizeMessagesForShare(conversation())
    const json = JSON.stringify(shared)
    assert.ok(!json.includes("receipts/"), "R2 anahtarı/adresi sızdı")
    assert.ok(!json.includes("user-123"), "kullanıcı kimliği sızdı")
    assert.ok(!json.includes(DEPOT), "şube adı sızdı")
    assert.ok(!json.includes("userAcceptedProductIds"), "seçim durumu sızdı")
    assert.ok(!json.includes("gizli") && !json.includes('"secret"'))
    assert.ok(!json.includes("toolCallId") && !json.includes('"input"'))
  })

  test("modelin düşünme metni ve ham hata metni kopyaya girmez", () => {
    // Görsel turunda düşünme özeti fişte okunanları (adres, kart) taşıyabilir.
    const shared = sanitizeMessagesForShare([
      {
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "MİGROS MODA CAD. NO:12, kart **** 1234",
            state: "done",
          },
          { type: "text", text: "Fişini okudum." },
          {
            type: "tool-lookupProducts",
            state: "output-available",
            output: {
              matches: [
                { ...match(), errorMessage: "marketfiyati /api/v2/search 403" },
              ],
            },
          },
        ],
      },
    ])
    const json = JSON.stringify(shared)
    assert.ok(!json.includes("1234") && !json.includes("reasoning"))
    assert.ok(!json.includes("403"))
    assert.equal(shared[0].parts.length, 2)
  })

  test("görseli işaretle değiştirir, metni korur", () => {
    const shared = sanitizeMessagesForShare(conversation())
    const receiptTurn = shared[4]
    assert.equal(receiptTurn.role, "user")
    assert.deepEqual(receiptTurn.parts, [
      { type: "text", text: "Bu görseli analiz et" },
      { type: IMAGE_OMITTED_PART_TYPE, data: {} },
    ])
  })

  test("kartların çizimi için gereken veri kalır", () => {
    const shared = sanitizeMessagesForShare(conversation())
    assert.equal(shared.length, 8)
    const [lookup, summary, context, text] = shared[3].parts
    assert.equal(shared[1].parts.length, 2, "düşünme part'ı düştü")
    assert.equal(lookup.type, "tool-lookupProducts")
    assert.equal(summary.type, "tool-summarizeOptimization")
    assert.equal(context.type, "tool-basketContext")
    assert.deepEqual(text, { type: "text", text: "En ucuz tek market Migros." })
    if (summary.type !== "tool-summarizeOptimization") throw new Error()
    if (summary.state !== "output-available") throw new Error()
    assert.equal(summary.output.singleMarket.market, "Migros")
    assert.equal(summary.output.singleMarket.total, 35)
    assert.equal(summary.output.singleMarket.allocation[0].depotName, null)
    assert.equal(
      summary.output.singleMarket.allocation[0].imageUrl,
      "https://cdn.marketfiyati.org.tr/p1.jpg"
    )
  })

  test("onay metadata'sından yalnızca doğrulanmış liste geçer", () => {
    const shared = sanitizeMessagesForShare(conversation())
    assert.deepEqual(shared[2].metadata, {
      kind: "basketApproval",
      payload: { items: approvedItems },
    })
    assert.deepEqual(shared[6].metadata, { kind: "receiptApproval" })
    assert.equal(shared[0].metadata, undefined)
  })

  test("geçersiz onay listesinde yalnızca tür kalır", () => {
    const shared = sanitizeMessagesForShare([
      {
        role: "user",
        parts: [{ type: "text", text: "onay" }],
        metadata: {
          kind: "basketApproval",
          payload: { items: [{ rawName: 5 }] },
        },
      },
    ])
    assert.deepEqual(shared[0].metadata, { kind: "basketApproval" })
  })

  test("kullanıcı mesajında tool part'ı ya da bilinmeyen tür geçmez", () => {
    // Kullanıcı mesajının part'ları istemcinin gönderdiği haliyle kaydedilir.
    const shared = sanitizeMessagesForShare([
      {
        role: "user",
        parts: [
          { type: "text", text: "merhaba" },
          {
            type: "tool-summarizeOptimization",
            state: "output-available",
            output: computeOptimization([match()]),
          },
          { type: "source-url", url: "https://evil.example" },
          { type: "file", mediaType: "text/html", url: "https://evil.example" },
        ],
      },
      { role: "system", parts: [{ type: "text", text: "gizli" }] },
    ])
    assert.equal(shared.length, 1)
    assert.deepEqual(shared[0].parts, [{ type: "text", text: "merhaba" }])
  })

  test("bitmemiş tool çağrısı ve şemaya uymayan çıktı düşer, hata metni kalır", () => {
    const shared = sanitizeMessagesForShare([
      {
        role: "assistant",
        parts: [
          {
            type: "tool-lookupProducts",
            state: "input-available",
            input: { items: [] },
          },
          {
            type: "tool-summarizeOptimization",
            state: "output-available",
            output: { bozuk: true },
          },
          {
            type: "tool-analyzeImage",
            state: "output-error",
            errorText: "Görseli okuyamadım.",
          },
          { type: "data-stopped", data: { x: 1 } },
          { type: "data-conversation-id", data: { id: "x" } },
        ],
      },
    ])
    assert.deepEqual(shared[0].parts, [
      {
        type: "tool-analyzeImage",
        state: "output-error",
        errorText: "Görseli okuyamadım.",
      },
      { type: "data-stopped", data: {} },
    ])
  })

  test("boş kullanıcı mesajı düşer, boş asistan mesajı yerini korur", () => {
    // Asistan turu boş kalsa da "cevaplandı" bilgisi onay kartının kilidi
    // için gerekli (bkz. resolveApprovalCard).
    const shared = sanitizeMessagesForShare([
      { role: "user", parts: [{ type: "text", text: "  " }] },
      { role: "assistant", parts: "bozuk" },
      { role: "user", parts: [{ type: "text", text: "a" }] },
      { role: "assistant", parts: [{ type: "text", text: "b" }] },
    ])
    assert.deepEqual(
      shared.map((m) => [m.id, m.role, m.parts.length]),
      [
        ["m0", "assistant", 0],
        ["m1", "user", 1],
        ["m2", "assistant", 1],
      ]
    )
  })

  test("uzun metni keser", () => {
    const shared = sanitizeMessagesForShare([
      {
        role: "user",
        parts: [{ type: "text", text: "a".repeat(SHARED_TEXT_MAX + 50) }],
      },
    ])
    const part = shared[0].parts[0]
    assert.equal(part.type, "text")
    if (part.type === "text")
      assert.equal(part.text.length, SHARED_TEXT_MAX + 1)
  })

  test("idempotent: temizlenmiş kopya tekrar temizlenince değişmez", () => {
    const once = sanitizeMessagesForShare(conversation())
    const twice = sanitizeMessagesForShare(once)
    assert.deepEqual(twice, once)
  })

  test("eski kayıtlarda bulunmayan alanlar default'la tamamlanır", () => {
    const legacy = match() as Partial<MatchResult>
    delete legacy.marketOptions
    delete legacy.selection
    delete legacy.note
    const shared = sanitizeMessagesForShare([
      {
        role: "assistant",
        parts: [
          {
            type: "tool-lookupProducts",
            state: "output-available",
            output: { matches: [legacy] },
          },
          {
            type: "tool-receiptComparison",
            state: "output-available",
            output: {
              comparison: {
                items: [],
                totalReceiptAmount: 0,
                totalBestAmount: 0,
                totalSavingsTL: 0,
              },
              receiptContext: { items: [] },
              summary: computeOptimization([]),
              matches: [],
            },
          },
        ],
      },
    ])
    assert.equal(shared[0].parts.length, 2)
  })
})

// Veritabanında duran bir paylaşım kopyası. Okurken tekrar temizlendiği için
// şemalara default'suz bir alan eklemek ya da bir alanı daraltmak bu kartları
// mevcut bütün paylaşımlardan sessizce düşürürdü; bu test onu yakalar.
// Bilerek değiştirilen bir kural varsa dosyayı yeniden üret ve farkı incele.
describe("paylaşılan görseller", () => {
  const userImage = {
    role: "user",
    parts: [
      { type: "text", text: "Bu fişe bak" },
      {
        type: "file",
        mediaType: "image/jpeg",
        url: RECEIPT_URL,
        filename: RECEIPT_KEY,
      },
    ],
  }

  test("numaralanan görsel yalnız sıra numarası taşır, adres ve anahtar düşer", () => {
    const seen: Array<{ url: string | null; filename: string | null }> = []
    const [m] = sanitizeMessagesForShare([userImage], (image) => {
      seen.push(image)
      return 0
    })
    assert.deepEqual(seen, [{ url: RECEIPT_URL, filename: RECEIPT_KEY }])
    assert.deepEqual(m.parts[1], { type: SHARED_IMAGE_PART_TYPE, data: { ref: 0 } })
    const json = JSON.stringify(m)
    assert.doesNotMatch(json, /receipts\//)
    assert.doesNotMatch(json, /user-123/)
  })

  test("numaralanamayan görsel (başkasının anahtarı) işaret olur", () => {
    const [m] = sanitizeMessagesForShare([userImage], () => null)
    assert.equal(m.parts[1].type, IMAGE_OMITTED_PART_TYPE)
  })

  test("okurken geçerli numara kalır, geçersizi işarete döner", () => {
    const stored = {
      role: "user",
      parts: [
        { type: SHARED_IMAGE_PART_TYPE, data: { ref: 3 } },
        { type: SHARED_IMAGE_PART_TYPE, data: { ref: 99 } },
        { type: SHARED_IMAGE_PART_TYPE, data: { ref: "0" } },
        { type: SHARED_IMAGE_PART_TYPE, data: { ref: -1 } },
        { type: SHARED_IMAGE_PART_TYPE, data: { ref: 1.5 } },
      ],
    }
    const [m] = sanitizeMessagesForShare([stored])
    assert.deepEqual(m.parts.map((p) => p.type), [
      SHARED_IMAGE_PART_TYPE,
      IMAGE_OMITTED_PART_TYPE,
      IMAGE_OMITTED_PART_TYPE,
      IMAGE_OMITTED_PART_TYPE,
      IMAGE_OMITTED_PART_TYPE,
    ])
    assert.deepEqual(m.parts[0], { type: SHARED_IMAGE_PART_TYPE, data: { ref: 3 } })
  })

  test("numaralayıcı yoksa (okurken) ham görsel işaret olur", () => {
    const [m] = sanitizeMessagesForShare([userImage])
    assert.equal(m.parts[1].type, IMAGE_OMITTED_PART_TYPE)
  })

  test("kayıttan kopya alınırken istemcinin uydurduğu numara işarete döner", () => {
    const forged = {
      role: "user",
      parts: [{ type: SHARED_IMAGE_PART_TYPE, data: { ref: 0 } }],
    }
    const [m] = sanitizeMessagesForShare([forged], () => 0)
    assert.deepEqual(m.parts.map((p) => p.type), [IMAGE_OMITTED_PART_TYPE])
  })
})

describe("kayıtlı kopya", () => {
  test("bugünkü kurallardan aynen geçer", () => {
    const fixture = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "lib/assistant/share-snapshot.fixture.json"),
        "utf8"
      )
    )
    assert.deepEqual(sanitizeMessagesForShare(fixture), fixture)
    assert.ok(fixture.length >= 8)
  })
})

describe("sanitizeShareTitle", () => {
  test("boşlukları toparlar, boşsa varsayılan ad verir", () => {
    assert.equal(sanitizeShareTitle("  Nohutlu   pilav "), "Nohutlu pilav")
    assert.equal(sanitizeShareTitle("   "), "Paylaşılan sohbet")
    assert.equal(sanitizeShareTitle("a".repeat(150)).length, 100)
  })
})
