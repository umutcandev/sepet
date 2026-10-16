import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, test } from "node:test"

import { messageToMarkdown } from "./message-markdown"

// Paylaşılan kopya testindeki sohbet: metin → taslak, onay → Sepet Özeti,
// fiş görseli → fiş kartı, fiş onayı → karşılaştırma. Part'lar kayıttakiyle
// aynı biçimde.
const conversation = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "lib/assistant/share-snapshot.fixture.json"),
    "utf8"
  )
) as Array<{ role: string; parts: Array<{ type: string }> }>

describe("messageToMarkdown", () => {
  test("kullanıcı metni olduğu gibi, görsel adressiz", () => {
    assert.equal(
      messageToMarkdown({
        role: "user",
        parts: [
          { type: "text", text: "Bu görseli analiz et" },
          {
            type: "file",
            mediaType: "image/jpeg",
            url: "https://x/receipts/u1/a.jpg",
          } as {
            type: string
          },
        ],
      }),
      "Bu görseli analiz et\n\n[Görsel]"
    )
  })

  test("taslak kalemleri tablo olur; kilitli kartta onaylanan liste yazılır", () => {
    const draft = conversation[1]
    const open = messageToMarkdown(draft)
    assert.match(open, /^Listeni hazırladım\./)
    assert.match(open, /\*\*Sepetindeki Kalemler\*\*/)
    assert.match(
      open,
      /\| Ürün \| Adet \| Birim \|\n\| --- \| --: \| --- \|\n\| süt \| 1 \| l \|/
    )
    assert.doesNotMatch(open, /Düşündüm/)

    const locked = messageToMarkdown(draft, {
      locked: true,
      approvedItems: [
        { rawName: "ayran", quantity: 2, unit: "adet", note: "küçük | şişe" },
      ],
    })
    assert.match(locked, /\(onaylandı\)/)
    assert.match(locked, /\| ayran \| 2 \| adet \| küçük \\\| şişe \|/)
  })

  test("Sepet Özeti metinden sonra, plan ve kalem dökümüyle", () => {
    const md = messageToMarkdown(conversation[3])
    const [first] = md.split("\n\n")
    assert.equal(first, "En ucuz tek market Migros.")
    assert.match(md, /\*\*Sepet Özeti\*\*/)
    assert.match(
      md,
      /\*\*Tek market en ucuz: Migros — ₺35,00\*\* \(1\/1 kalem\)/
    )
    assert.match(md, /\| Süt \| Süt 1 L \| 1 \| ₺35,00 \|/)
  })

  test("fiş kartı ve karşılaştırma", () => {
    const receipt = messageToMarkdown(conversation[5])
    assert.match(receipt, /\*\*Fişindeki Kalemler\*\*/)
    assert.match(
      receipt,
      /Market: Migros · Tarih: 2026-10-01 · Fiş toplamı: ₺35,00/
    )
    assert.match(receipt, /\| SUT 1L \| 1 \| adet \| ₺35,00 \| ₺35,00 \|/)

    const comparison = messageToMarkdown(conversation[7])
    assert.match(comparison, /\*\*Fiş Karşılaştırması\*\*/)
    assert.match(comparison, /Fişteki paket fiyatları: ₺35,00 · En iyi: ₺35,00/)
  })

  test("hata ve durdurma işaretleri", () => {
    assert.equal(
      messageToMarkdown({
        role: "assistant",
        parts: [
          {
            type: "tool-analyzeImage",
            state: "output-error",
            errorText: "Görseli okuyamadım.",
          } as {
            type: string
          },
          { type: "data-stopped" },
        ],
      }),
      "> Görseli okuyamadım.\n\n_Yanıt durduruldu._"
    )
  })

  test("eşleşmeyen kalemler sebebiyle listelenir", () => {
    const md = messageToMarkdown({
      role: "assistant",
      parts: [
        {
          type: "tool-lookupProducts",
          state: "output-available",
          output: {
            matches: [
              { rawName: "yufka", lookupStatus: "no_match", bestMatch: null },
              { rawName: "süt", lookupStatus: "api_error", bestMatch: null },
            ],
          },
        } as { type: string },
      ],
    })
    assert.equal(
      md,
      "**Eşleştirilemeyen Ürünler**\n\n- Yufka: Bu adla marketlerde bulamadım\n- Süt: Fiyat servisine ulaşılamadı"
    )
  })
})
