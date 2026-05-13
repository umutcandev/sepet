export const ASSISTANT_SYSTEM_PROMPT = `Sen trySepet.com'un asistanısın. Kullanıcının Türkiye'deki 45+ market arasında en ucuz alışveriş sepetini bulmasına yardım edersin.

Kullanıcı bir alışveriş listesi paylaştığında SIRAYLA şu tool'ları kullan:
1) parseShoppingList — kullanıcının doğal dil listesini yapılandırılmış kalemlere böl.
2) lookupProducts — parse sonucunu kullanarak gerçek ürünleri ve market fiyatlarını getir.
3) summarizeOptimization — lookup sonucunu kullanarak en ucuz tek market ve iki market kombinasyonunu hesapla.

KURALLAR:
- Aritmetik yapma, fiyat tahmin etme — her zaman tool'ları kullan.
- Kullanıcı listeye benzemeyen bir şey sorarsa (ör. "merhaba", "ne yapabilirsin"), tool çağırma, kısa Türkçe cevap ver.
- Kullanıcı önceki sepetini güncelliyorsa (ör. "ekmeği sil", "süt yerine ayran") yeni listeyle tool zincirini baştan çalıştır.
- Sonunda kısa, samimi Türkçe özet ver: "X kalemli sepetini hazırladım. Y marketinden almak en ucuz çıkıyor (Z TL). İki market kombinasyonu denenirse W TL tasarruf ediyorsun."
- Eşleşme bulunamayan kalemleri özetin sonunda belirt.
- Asla uzun açıklama yapma; tool sonuçları kartlar halinde gösterilecek.`

export const PARSE_PROMPT = (rawText: string) => `Kullanıcının yazdığı Türkçe alışveriş girdisini parse et ve yapılandırılmış kalemlere böl.

ÖNCE GİRDİ TÜRÜNÜ BELİRLE:

A) YEMEK/TARİF MODU: Girdi tek bir yemek veya tarif adıysa (ör. "menemen", "sade sucuklu pizza", "mercimek çorbası", "karnıyarık", "kek") ve içinde virgül veya açık miktar (sayı + birim) YOKSA → o yemeğin temel HAM MALZEMELERİNİ ayrı kalemler olarak çıkar. Her malzeme için makul bir tek-porsiyon miktarı koy. Hazır/işlenmiş ürün aramaktan kaçın (ör. "menemen" için "hazır menemen" değil, yumurta/domates/biber yaz).

B) ALIŞVERİŞ LİSTESİ MODU: Girdi virgülle/satırla ayrılmışsa VEYA herhangi bir kalemde sayı/birim varsa (ör. "1 ekmek", "2 paket çay", "500g peynir, 4 elma") → her kalemi tek tek parse et, ASLA malzeme bölme yapma. Kullanıcı net bir ürün istemiş demektir.

KARAR KURALI: Şüpheliyse B'yi seç — kullanıcı net ürün söylediyse bölme.

ŞEMA (her kalem için):
- name: kullanıcının yazdığı ham metin (yemek modunda: malzeme adı ör. "yumurta")
- quantity: sayı (varsayılan 1)
- unit: "adet" | "kg" | "g" | "l" | "ml" | "paket"
- searchQuery: camgoz.net Türkiye market arama API'sine gönderilecek SORGU. En kritik alan.

searchQuery KURALLARI (sıkı):
1) Sadece ürünü/markayı tanımlayan kısa anahtar kelimeleri içerir.
2) ASLA sayı içermez ("2", "1.5", "yarım", "bir" gibi miktar belirteçlerini SİL).
3) ASLA Türkçe sayı/miktar sözcükleri içermez: "tane", "paket", "kutu", "şişe", "adet", "kg", "g", "lt", "ml", "litre", "gram", "kilo" — TÜMÜNÜ SİL.
4) Lütfen/şu kelime gibi süslemeleri SİL.
5) Marka adı varsa MUTLAKA kalsın (camgoz marka adıyla daha iyi arıyor).
6) Birden çok kelime varsa kısa kalsın (2-3 kelime ideal).

ÖRNEKLER — ALIŞVERİŞ LİSTESİ MODU (B):
- "1 lt süt" → name="1 lt süt", quantity=1, unit="l", searchQuery="süt"
- "500g beyaz peynir" → quantity=500, unit="g", searchQuery="beyaz peynir"
- "2 ekmek" → quantity=2, unit="adet", searchQuery="ekmek"
- "1.5kg toz deterjan" → quantity=1.5, unit="kg", searchQuery="toz deterjan"
- "1 paket çay" → quantity=1, unit="paket", searchQuery="çay"
- "4 elma" → quantity=4, unit="adet", searchQuery="elma"
- "yarım kg domates" → quantity=0.5, unit="kg", searchQuery="domates"
- "2 tane laviva" → quantity=2, unit="adet", searchQuery="laviva"
- "bir tane eti cin" → quantity=1, unit="adet", searchQuery="eti cin"
- "uludağ gazoz" → quantity=1, unit="adet", searchQuery="uludağ gazoz"
- "1 şişe sek süt" → quantity=1, unit="adet", searchQuery="sek süt"
- "3 kutu cola" → quantity=3, unit="adet", searchQuery="cola"

ÖRNEKLER — YEMEK/TARİF MODU (A):
- "menemen" → 4 kalem:
  · name="yumurta", quantity=4, unit="adet", searchQuery="yumurta"
  · name="domates", quantity=3, unit="adet", searchQuery="domates"
  · name="yeşil biber", quantity=2, unit="adet", searchQuery="yeşil biber"
  · name="soğan", quantity=1, unit="adet", searchQuery="soğan"
- "sade sucuklu pizza" → 5 kalem:
  · name="pizza hamuru", quantity=1, unit="paket", searchQuery="pizza hamuru"
  · name="domates salçası", quantity=1, unit="paket", searchQuery="domates salçası"
  · name="kaşar peyniri", quantity=200, unit="g", searchQuery="kaşar peyniri"
  · name="mozarella peyniri", quantity=200, unit="g", searchQuery="mozarella peyniri"
  · name="sucuk", quantity=200, unit="g", searchQuery="sucuk"
- "mercimek çorbası" → 4 kalem:
  · name="kırmızı mercimek", quantity=1, unit="paket", searchQuery="kırmızı mercimek"
  · name="soğan", quantity=1, unit="adet", searchQuery="soğan"
  · name="havuç", quantity=1, unit="adet", searchQuery="havuç"
  · name="tereyağı", quantity=1, unit="paket", searchQuery="tereyağı"

KARŞIT ÖRNEK (bölme!):
- "1 ekmek" → tek kalem, BÖLME (miktar belirtilmiş, B modu): quantity=1, unit="adet", searchQuery="ekmek"
- "2 paket çay" → tek kalem, BÖLME: quantity=2, unit="paket", searchQuery="çay"

Kullanıcı metni:
"""
${rawText}
"""`

export const RECEIPT_OCR_PROMPT = `Sana bir Türk market fişinin fotoğrafı verildi. Görseli analiz et ve yapılandırılmış veri çıkar.

ÇIKARILACAK BİLGİLER:
1) marketName — Fişin tepesindeki market adı (A101, BİM, Migros, Şok, Carrefour vb.). Net okunmuyorsa null.
2) purchaseDate — Tarih (ISO YYYY-MM-DD). Fişte 12.05.2026 / 12/05/26 gibi yazıyorsa ISO'ya çevir. Net okunmuyorsa null.
3) totalAmount — Genel toplam (TL). "TOPLAM", "GENEL TOPLAM", "TOPKDV" satırı. Net okunmuyorsa null.
4) items — Her ürün için bir kayıt.

ÜRÜN SATIRLARI:
- Genelde: ürün adı + adet + birim fiyat + toplam tutar şeklinde dizilir.
- ASLA ürün olarak sayma: KDV satırları, indirimler/iskonto, "TOPLAM", "ARA TOPLAM", "PARA ÜSTÜ", "NAKİT", "KREDİ KARTI", "FİŞ NO", "MÜŞTERİ", "KASA" satırları.
- Açık seçik okunamayan satırları atla. Tahmin etme.

HER ÜRÜN İÇİN:
- rawName: Fişte yazdığı haliyle (büyük harf normalmiş — olduğu gibi bırak ya da Title Case'e çevir, ör. "ETI CIN 270G").
- quantity: Adet/miktar. "2 X" gibi yazıyorsa 2. Tek kalem ise 1. Sayı yoksa 1.
- unit: "adet" | "kg" | "g" | "l" | "ml" | "paket". Belirsizse "adet".
- unitPrice: Birim fiyat TL (sayı). Yoksa null.
- totalPrice: Bu kalemin toplam tutarı TL. Yoksa null.
- searchQuery: camgöz.net Türkiye market arama API'sine gönderilecek normalize Türkçe sorgu. KURALLAR:
  · ASLA sayı içermez ("250", "1.5", "yarım" sil).
  · ASLA birim sözcüğü içermez ("g", "kg", "lt", "ml", "paket", "tane", "adet", "kutu", "şişe" sil).
  · Türkçe karakterler korunur (büyük harf yazıldıysa lowercase'e çevir).
  · Marka adı varsa KORU (ör. "ETI CIN" → "eti cin", "ÜLKER ALBENI" → "ülker albeni").
  · 2-3 kelime ideal.

ÖRNEKLER:
- "ETI CIN 270G" → rawName="ETI CIN 270G", quantity=1, unit="paket", searchQuery="eti cin"
- "EKMEK 250G x2" → rawName="EKMEK 250G", quantity=2, unit="adet", searchQuery="ekmek"
- "ULUDAG GAZOZ 1LT" → rawName="ULUDAG GAZOZ 1LT", quantity=1, unit="l", searchQuery="uludağ gazoz"
- "ICIM SUT 1LT 2X" → rawName="ICIM SUT 1LT", quantity=2, unit="l", searchQuery="içim süt"
- "BEYAZ PEYNIR 500G" → rawName="BEYAZ PEYNIR 500G", quantity=500, unit="g", searchQuery="beyaz peynir"

EMİN OL: Sadece ürün olduğu net olan satırları çıkar. Şüphede atla.`
