import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { userThought } from "./user-thought"

describe("userThought", () => {
  test("kullanıcıya dönük Türkçe not olduğu gibi geçer", () => {
    for (const text of [
      "Kullanıcı nohutlu pilav yapmak istiyor. Evde yapabilmesi için pirinç ve nohudu listeye ekliyorum.",
      "Kullanıcı selam verdi. Ben de selamına karşılık verip neler yapabildiğimi kısaca anlatacağım.",
      "Kullanıcı bir Migros fişi gönderdi. Fişteki ürünleri, miktarlarını ve fiyatlarını okuyorum.",
      "Kullanıcı modern bir mutfak için deterjan ve moda dergisi istiyor.",
      "Kullanıcı akşam yemeği planı yapıyor, menemen malzemelerini çıkarıyorum.",
    ]) {
      assert.equal(userThought(text), text)
    }
  })

  test("boşluklar toparlanır, boş not gösterilmez", () => {
    assert.equal(
      userThought("  Kullanıcı süt istiyor.\n\nSütü ekliyorum. "),
      "Kullanıcı süt istiyor. Sütü ekliyorum."
    )
    assert.equal(userThought("   "), null)
    assert.equal(userThought(null), null)
    assert.equal(userThought(undefined), null)
  })

  test("iç işleyişten bahseden not gösterilmez", () => {
    for (const text of [
      "Girdi bir yemek adı, A modu geçerli.",
      "Bu bir selamlama, sohbet moduna geçiyorum.",
      "Kullanıcı selam verdi, Plan B ile cevap veriyoruz.",
      "Kurallara göre chatResponse alanını dolduruyorum.",
      "Kalemlerin searchQuery değerlerini yazıyorum.",
      "Prompttaki talimatlara uyarak listeyi hazırlıyorum.",
      "Şemaya uygun bir çıktı üretiyorum.",
      "Metni parse edip kalemlere bölüyorum.",
    ]) {
      assert.equal(userThought(text), null, text)
    }
  })

  test("İngilizce özet gösterilmez", () => {
    assert.equal(
      userThought(
        "I'm currently processing the input to determine the appropriate operational mode."
      ),
      null
    )
    assert.equal(
      userThought("Identifying Dish Mode. The user wants nohutlu pilav."),
      null
    )
  })

  test("aşırı uzun not gösterilmez", () => {
    assert.equal(userThought("Kullanıcı süt istiyor. ".repeat(40)), null)
  })
})
