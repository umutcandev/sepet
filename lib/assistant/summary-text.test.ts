import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { computeOptimization } from "@/lib/ai/optimize"
import type { MarketOption, MatchResult } from "@/lib/ai/schemas"
import { buildDraftText, buildSummaryText, diffDraft } from "./summary-text"

function option(market: string, price: number): MarketOption {
  return {
    market,
    productId: `${market}-p`,
    productName: `${market} ürünü`,
    packagePrice: price,
    packsNeeded: 1,
    effectiveCost: price,
    unitPriceLabel: null,
    depotName: null,
    imageUrl: null,
  }
}

function match(
  rawName: string,
  options: MarketOption[],
  extra: Partial<MatchResult> = {}
): MatchResult {
  const ok = options.length > 0
  return {
    rawName,
    searchQuery: rawName,
    quantity: 1,
    unit: "adet",
    bestMatch: ok
      ? {
          productId: options[0].productId,
          name: `${rawName} ürünü`,
          brand: null,
          category: null,
          imageUrl: null,
          averagePrice: null,
          minPrice: null,
          maxPrice: null,
          marketCount: options.length,
        }
      : null,
    marketPrices: [],
    marketOptions: options,
    alternatives: [],
    lookupStatus: ok ? "ok" : "no_match",
    errorMessage: null,
    sizeMismatch: false,
    ...extra,
  }
}

function text(matches: MatchResult[]): string {
  return buildSummaryText(computeOptimization(matches), matches)
}

describe("buildSummaryText", () => {
  test("Sepet Özeti'ndeki öneriyle açılır ve bölme tasarrufunu söyler", () => {
    const out = text([
      match("süt", [option("A101", 30), option("BİM", 25)]),
      match("ekmek", [option("A101", 10), option("BİM", 16)]),
    ])
    assert.equal(
      out,
      "Sepet Özeti hazır. En ucuz tek market A101: 2 kalemin tamamı 40,00 TL. Alışverişi A101 ve BİM arasında bölersen 5,00 TL (%13) daha az ödersin."
    )
  })

  test("bölmek kazandırmıyorsa bunu açıkça söyler", () => {
    const out = text([
      match("süt", [option("A101", 10), option("BİM", 20)]),
      match("ekmek", [option("A101", 5), option("BİM", 30)]),
    ])
    assert.equal(
      out,
      "Sepet Özeti hazır. En ucuz tek market A101: 2 kalemin tamamı 15,00 TL. İki markete bölmek daha ucuza gelmiyor."
    )
  })

  test("tek market eksik kalınca kombinasyonla konuşur", () => {
    const out = text([
      match("süt", [option("A101", 10)]),
      match("ekmek", [option("BİM", 40)]),
    ])
    assert.equal(
      out,
      "Sepet Özeti hazır. 2 kalemin tamamını tek bir market karşılamıyor; A101 ve BİM ikilisiyle sepetin tamamı 50,00 TL."
    )
  })

  test("eşleştirilemeyen kalemlerin toplama girmediğini söyler", () => {
    const out = text([
      match("süt", [option("A101", 10)]),
      match("ejder meyvesi reçeli", []),
      match("kinoa", [], { lookupStatus: "api_error" }),
    ])
    assert.match(
      out,
      /^Sepet Özeti hazır\. En ucuz tek market A101: 1 kalemin tamamı 10,00 TL\./
    )
    assert.match(
      out,
      / Ejder meyvesi reçeli ve Kinoa eşleştirilemedi, toplama dahil değil\. İstersen aşağıdan başka bir adla yeniden aratabilirsin\.$/
    )
  })

  test("yalnız servis hatası varsa yeniden aratmayı önermez", () => {
    const out = text([
      match("süt", [option("A101", 10)]),
      match("kinoa", [], { lookupStatus: "api_error" }),
    ])
    assert.match(out, / Kinoa eşleştirilemedi, toplama dahil değil\.$/)
  })

  test("farklı boyutu Sepet Özeti'ndeki işarete bağlar", () => {
    const out = text([
      match("yoğurt", [option("A101", 40)], { sizeMismatch: true }),
    ])
    assert.match(
      out,
      / Yoğurt için istediğin boyut her markette yok; o marketlerde en yakın boyutu aldım ve Sepet Özeti'nde farklı boyut olarak işaretledim\.$/
    )
  })

  test("farklı boyutu dökümde seçilen ürüne göre söyler", () => {
    // Kalemin temsilcisi boyutu tutsa da bir markette farklı boyut alındıysa
    // rozet orada çıkar; metin de onu söylemeli.
    const out = text([
      match("su", [
        { ...option("A101", 4), sizeMismatch: true },
        { ...option("BİM", 8), sizeMismatch: false },
      ]),
      match("ekmek", [option("A101", 10), option("BİM", 30)]),
    ])
    assert.match(out, / Su için istediğin boyut her markette yok;/)
  })

  test("hiçbir kalem eşleşmezse özet yerine yönlendirir", () => {
    const out = text([match("süt", []), match("ekmek", [])])
    assert.equal(
      out,
      "Listendeki kalemlerin hiçbiri için market fiyatı bulamadım, bu yüzden Sepet Özeti çıkaramadım. Kalemleri farklı bir adla yazıp tekrar deneyebilirsin."
    )
  })
})

/** Taslak kalemi; adı verilmezse sıradan üretilir. */
function draftItem(
  name: string,
  extra: { quantity?: number; unit?: string; note?: string | null } = {}
) {
  return {
    name,
    searchQuery: name,
    quantity: extra.quantity ?? 1,
    unit: extra.unit ?? "adet",
    note: extra.note ?? null,
  }
}

const items = (n: number) =>
  Array.from({ length: n }, (_, i) => draftItem(`kalem ${i + 1}`))

describe("buildDraftText", () => {
  test("yemek modunda yemeğin adını söyler", () => {
    assert.equal(
      buildDraftText({
        items: items(5),
        dishName: "peynirli börek",
        revision: false,
      }),
      "Peynirli börek için 5 temel malzemeyi hazırladım. Dilersen miktarları değiştirebilir, kalem ekleyip çıkarabilirsin. Hazır olduğunda Onayla'ya basman yeterli, en uygun marketleri bulayım."
    )
  })

  test("liste modunda kalem sayısını söyler", () => {
    assert.match(
      buildDraftText({ items: items(2), dishName: null, revision: false }),
      /^Listendeki 2 kalemi hazırladım\. /
    )
  })

  test("düzenlemede listenin güncellendiğini söyler", () => {
    assert.match(
      buildDraftText({ items: items(3), dishName: "menemen", revision: true }),
      /^Listeni güncelledim, şimdi 3 kalem var\. /
    )
  })

  test("buyruk kipinde konuşmaz", () => {
    // Eski metin "Kontrol edip düzeltmelerini yap, ardından onayla" diyordu.
    const out = buildDraftText({
      items: items(1),
      dishName: null,
      revision: false,
    })
    assert.doesNotMatch(out, /düzeltmelerini yap|karşılaştırma için onayla/)
  })

  test("liste aynı kaldıysa güncelledim demez, Değiştir'i önerir", () => {
    // Ekran görüntüsündeki vaka: kullanıcı "konserve olmamalı" dedi, model
    // aynı listeyi döndürdü ve asistan "Listeni güncelledim" dedi.
    const previous = [
      draftItem("kuru fasulye", { unit: "paket" }),
      draftItem("soğan"),
      draftItem("domates salçası", { unit: "paket" }),
    ]
    const out = buildDraftText(
      { items: [...previous].reverse(), dishName: null, revision: true },
      previous
    )
    assert.doesNotMatch(out, /güncelledim/)
    assert.match(out, /^Listende bir değişiklik yapmadım/)
    assert.match(out, /Değiştir/)
  })

  test("yalnızca not eklendiyse notu söyler ve sınırını belirtir", () => {
    const previous = [
      draftItem("kuru fasulye", { unit: "paket" }),
      draftItem("soğan"),
    ]
    const out = buildDraftText(
      {
        items: [
          draftItem("kuru fasulye", {
            unit: "paket",
            note: "konserve olmasın",
          }),
          draftItem("soğan"),
        ],
        dishName: null,
        revision: true,
      },
      previous
    )
    assert.match(out, /^Kuru fasulye için notunu ekledim: konserve olmasın\. /)
    assert.match(out, /Değiştir/)
    assert.doesNotMatch(out, /güncelledim/)
  })

  test("kalem değiştiyse güncelledim der, yeni notu da ekler", () => {
    const previous = [draftItem("kuru fasulye", { unit: "paket" })]
    const out = buildDraftText(
      {
        items: [
          draftItem("kuru fasulye", {
            unit: "paket",
            note: "konserve olmasın",
          }),
          draftItem("ayran"),
        ],
        dishName: null,
        revision: true,
      },
      previous
    )
    assert.match(
      out,
      /^Listeni güncelledim, şimdi 2 kalem var\. Kuru fasulye için notunu ekledim: konserve olmasın\. /
    )
  })

  test("önceki listede zaten olan not yeniden söylenmez", () => {
    const withNote = draftItem("kuru fasulye", {
      unit: "paket",
      note: "konserve olmasın",
    })
    const out = buildDraftText(
      { items: [withNote, draftItem("ayran")], dishName: null, revision: true },
      [withNote]
    )
    assert.doesNotMatch(out, /notunu ekledim/)
  })
})

describe("diffDraft", () => {
  test("miktar farkı kalemi değişmiş sayar", () => {
    const { sameItems } = diffDraft(
      [draftItem("yumurta", { quantity: 2 })],
      [draftItem("yumurta", { quantity: 10 })]
    )
    assert.equal(sameItems, false)
  })

  test("aynı adlı iki kalemden biri silinince fark görülür", () => {
    const { sameItems } = diffDraft(
      [draftItem("süt"), draftItem("süt")],
      [draftItem("süt")]
    )
    assert.equal(sameItems, false)
  })
})
