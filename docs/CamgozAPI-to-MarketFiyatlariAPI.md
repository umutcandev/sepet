# Camgoz → Marketfiyati Geçiş Planı

> Sepet projesinin ürün/fiyat veri kaynağını camgoz.jojapi.net'ten  
> api.marketfiyati.org.tr'ye taşımak için kapsamlı geçiş dokümanı.  
> Tarih: 9 Haziran 2026

---

## 1. Neden Geçiş?

| Kriter | Camgoz | Marketfiyati |
|--------|--------|-------------|
| Maliyet | Kredi bazlı, JOJAPI_KEY gerekli | Ücretsiz, auth yok |
| Kaynak | 3. parti, kapanma/fiyat artış riski | TÜBİTAK + Ticaret Bakanlığı (resmi) |
| Konum | Yok — tüm Türkiye'den tek fiyat | lat/lng ile kullanıcının yakınındaki mağazanın gerçek fiyatı |
| Birim fiyat | Yok | `unitPrice`, `unitPriceValue` (₺/Lt, ₺/Kg) mevcut |
| İndirim bilgisi | Yok | `discount`, `discountRatio`, `promotionText` mevcut |
| Benzer ürün | Yok — hits listesinden elle kesiliyor | Dedike `searchSmilarProduct` endpoint'i |
| Barkod araması | Keyword olarak gönderiliyor | Dedike `searchByIdentity` endpoint'i |
| Market sayısı | ~56 market | 6 market (BİM, A101, Migros, Şok, CarrefourSA, Tarım Kredi) |

---

## 2. Temel Mimari Fark: Ürün Kimliği

Bu geçişin en kritik kararı budur.

**Camgoz:** Her ürün bir EAN barkod numarası ile tanımlanır (`"8697520101021"`). Tüm sistem — DB, cache, LLM match, UI — barkod etrafında dönüyor.

**Marketfiyati:** Keyword aramasında (`/search`) ürünler kısa dahili ID ile tanımlanır (`"1O9J"`, `"0WSU"`). Barkod numarası response'da yer almaz. Ancak `searchByIdentity` endpoint'i barkod → ürün eşleşmesi yapabilir.

### Karar: `productId` Merkezli Sisteme Geçiş

Tüm sistemde `barcode` referansları `productId` ile değiştirilecek. Bu ID marketfiyati'nin döndürdüğü kısa ID olacak (ör. `"1O9J"`).

Barkod tarayıcı akışı şöyle çalışacak:
1. Kullanıcı barkod tarar → `searchByIdentity` çağrılır
2. API ürünü döndürür → dönen ürünün `id`'si artık o ürünün `productId`'si olur
3. Bu eşleşme (`barcode → productId`) Redis'te cache'lenir
4. Sonraki barkod taramalarında önce cache'e bakılır

---

## 3. Etkilenen Dosyalar — Tam Liste

### 3.1 Silinecek Dosyalar

| Dosya | Sebep |
|-------|-------|
| `lib/camgoz/client.ts` | Camgoz fetch katmanı — marketfiyati client ile değiştirilecek |
| `lib/camgoz/types.ts` | Camgoz zod şemaları ve tip tanımları — yeni tipler yazılacak |
| `lib/camgoz/cache.ts` | Camgoz cache mantığı — yeni cache modülü yazılacak |

### 3.2 Yeni Yazılacak Dosyalar

| Dosya | İçerik |
|-------|--------|
| `lib/marketfiyati/client.ts` | HTTP client — 5 endpoint için fetch fonksiyonları |
| `lib/marketfiyati/types.ts` | Zod şemaları + normalize/dönüşüm fonksiyonları |
| `lib/marketfiyati/cache.ts` | Redis cache katmanı (search, product, nearest, barcode-map) |

### 3.3 Değişecek Dosyalar

| Dosya | Değişiklik Kapsamı |
|-------|-------------------|
| `lib/redis.ts` | `CAMGOZ_CACHE_TTL_SECONDS` → yeni TTL sabitleri. Cache prefix'leri `camgoz:` → `mf:` |
| `lib/db/schema.ts` | `products.barcode` → `products.productId`. `receiptItems.matchedBarcode` → `receiptItems.matchedProductId`. `basketItems.matchedBarcode` → `basketItems.matchedProductId`. Unique index güncellenmeli |
| `lib/ai/tools.ts` | `findFirstHit`, `matchCacheKey`, `toMatchedProduct`, `lookupProducts` — tüm `barcode` referansları `productId` olacak. `getProductByBarcode` → `getProductById`. Import yolları değişecek |
| `lib/ai/optimize.ts` | `ItemMarketPrice.productBarcode` → `productId`. `MarketAllocationSchema.productBarcode` → `productId` |
| `lib/ai/schemas.ts` | `MatchedProductSchema.barcode` → `productId`. `MarketPriceEntrySchema.sourceUrl` kaldırılacak (marketfiyati sourceUrl dönmüyor). `ParsedItemSchema.searchQuery` açıklamasındaki "camgoz" referansları temizlenecek. `ReceiptOCRItemSchema.searchQuery` açıklaması güncellenmeli. `ReceiptComparisonItemSchema.matchedBarcode` → `matchedProductId`. `ReceiptComparisonItemSchema.bestUrl` kaldırılacak |
| `lib/ai/prompts.ts` | 10+ yerde "camgoz", "camgöz", "camgoz.net" referansı var — hepsi "marketfiyati" veya nötr bir ifadeyle değiştirilecek |
| `lib/markets/registry.ts` | Camgoz'un 56 marketli registry'si kalkacak. Marketfiyati'nin 6 marketi için küçültülmüş registry. Logo URL'leri `file.camgoz.net`'ten bağımsız bir kaynağa taşınmalı (kendi CDN'inize veya statik asset olarak) |
| `lib/actions/baskets.ts` | `matchedBarcode` → `matchedProductId` (satır 106) |
| `lib/actions/receipts.ts` | `matchedBarcode` referansları → `matchedProductId` |
| `lib/security/headers.ts` | CSP `img-src`'den `camgoz.net`, `file.camgoz.net`, `cdn.camgoz.net` kaldırılacak. `cdn.marketfiyati.org.tr` eklenecek |
| `next.config.mjs` | `images.remotePatterns`'dan `camgoz.net` ve `**.camgoz.net` kaldırılacak. `cdn.marketfiyati.org.tr` eklenecek |
| `.env.example` | `CAMGOZ_API_BASE`, `JOJAPI_KEY`, `CAMGOZ_PREFERRED_MARKETS` kaldırılacak. Gerekirse `MARKETFIYATI_DEFAULT_LAT`, `MARKETFIYATI_DEFAULT_LNG` eklenecek |
| `app/api/products/[barcode]/route.ts` | Rota yapısı değişecek: `[barcode]` → `[id]` veya barkod geldiğinde önce barcode→id çözümleme yapılacak. Her iki durumu da desteklemeli (kullanıcı barkod tarar vs. keyword aramasından tıklar) |
| `app/api/products/search/route.ts` | Import yolları `lib/camgoz/` → `lib/marketfiyati/`. `CamgozError` → yeni hata sınıfı |
| `app/api/assistant/chat/route.ts` | Import yolları değişecek. Dolaylı etki — `lookupProducts` ve `computeOptimization` aynı arayüzü sunmaya devam edecekse doğrudan değişiklik minimal |
| `components/product-detail-panel.tsx` | `ProductDetail` tipi import yolu değişecek. `detail.barcode` → `detail.productId`. Barkod badge'i: eğer barkod biliniyorsa göster, bilinmiyorsa productId göster veya gizle |
| `components/product-search-page.tsx` | `ProductHit` tipi import yolu değişecek. `hit.barcode` → `hit.productId`. `key={hit.barcode}` → `key={hit.productId}`. `onSelect(hit.barcode)` → `onSelect(hit.productId)` |
| `components/barcode-scanner-dialog.tsx` | Değişiklik yok — bu bileşen sadece ham barkod stringi döndürüyor. Ama `onDetected` sonrası akış değişecek: barkod → `searchByIdentity` → productId çözümleme |
| `components/assistant/receipt-comparison-card.tsx` | `matchedBarcode` referansları → `matchedProductId` |

---

## 4. Veritabanı Migration

### 4.1 Kolon Yeniden Adlandırma

```
products tablosu:
  barcode (text, unique) → productId (text, unique)

receipt_items tablosu:
  matchedBarcode (text) → matchedProductId (text)

basket_items tablosu:
  matchedBarcode (text) → matchedProductId (text)
```

### 4.2 Yeni Tablo: Barkod Eşleşme Tablosu

Barkod tarayıcıdan gelen istekleri productId'ye çevirmek için kalıcı bir mapping tablosu gerekiyor:

```
barcode_map tablosu:
  barcode (text, primary key) — EAN barkod numarası
  productId (text, not null) — marketfiyati'deki ürün ID'si
  resolvedAt (timestamp) — ilk çözümlenme zamanı
```

Bu tablo organik olarak büyüyecek: her `searchByIdentity` çağrısında dönen sonuç buraya yazılır. Zamanla sık taranan barkodlar API'ye gitmeden çözümlenebilir.

### 4.3 Migration Stratejisi

- Mevcut `products` tablosundaki veriler invalidate edilecek — marketfiyati ID'leri camgoz barkodlarıyla uyuşmuyor
- Migration sırasında mevcut `products` tablosu truncate edilebilir (cache niteliğinde veri, kayıp değil)
- `receipts` ve `baskets` tablosundaki geçmiş veriler: `matchedBarcode` → `matchedProductId` rename'i yapılacak ama mevcut değerler (eski barkodlar) olduğu gibi kalacak. Geçmiş kayıtlarda bu alan artık "o dönemki ürün tanımlayıcısı" anlamına gelecek

### 4.4 Konum Bilgisi

Marketfiyati konum bazlı çalıştığı için kullanıcının konumunu saklamak değerli olabilir:

```
users tablosu (mevcut):
  + defaultLatitude (numeric, nullable)
  + defaultLongitude (numeric, nullable)
```

Veya bu bilgi client-side'da tutulup her istekte gönderilir — DB'ye yazmak opsiyonel.

---

## 5. Redis Cache Yeniden Tasarımı

### 5.1 Mevcut Yapı (Camgoz)

```
camgoz:search:{query}        → string[] (barkod listesi)     TTL: 12 saat
camgoz:product:{barcode}     → ProductDetail                  TTL: 12 saat
camgoz:match:v2:{sha1}       → CachedSelection                TTL: 12 saat
```

### 5.2 Yeni Yapı (Marketfiyati)

```
mf:search:{query}:{lat}:{lng}    → string[] (productId listesi)   TTL: 1 saat
mf:product:{productId}           → ProductDetail                   TTL: 3 saat
mf:nearest:{lat}:{lng}           → DepotInfo[]                     TTL: 24 saat
mf:barcode:{barcode}             → string (productId)              TTL: 30 gün
mf:match:v1:{sha1}               → CachedSelection                TTL: 3 saat
```

### 5.3 TTL Kararları

Marketfiyati ücretsiz olduğu için "kredi koruma" amacıyla uzun TTL tutmaya gerek yok. Daha kısa TTL = daha güncel fiyat.

- **Search cache:** 1 saat. Fiyatlar `indexTime`'a göre ~8 saatte bir güncelleniyor, 1 saatlik cache hem güncelliği korur hem gereksiz istek önler
- **Product cache:** 3 saat. Ürün detay bilgisi (ad, marka, kategori) nadiren değişir ama fiyatlar güncellenebilir
- **Nearest cache:** 24 saat. Mağaza konumları neredeyse hiç değişmez
- **Barcode map cache:** 30 gün. Barkod → productId eşleşmesi değişmez. Ayrıca DB'de de tutuluyor
- **Match cache:** 3 saat. LLM seçim sonuçları product cache ile senkron kalmalı

### 5.4 Cache Key'de Konum

Search cache'e konum dahil edilmeli çünkü aynı keyword farklı konumlarda farklı fiyatlar döndürür. Koordinatlar yuvarlama ile normalize edilmeli (ör. 2 ondalık basamak → ~1.1 km hassasiyet) yoksa her mikro-konum farkı cache miss yaratır.

---

## 6. Client Modülü Tasarımı

### 6.1 Zorunlu Header'lar

Her istekte gönderilmesi gereken header'lar:

```
Content-Type: application/json
Accept: application/json
User-Agent: Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36
Origin: https://marketfiyati.org.tr
Referer: https://marketfiyati.org.tr/
```

Bu header'lar olmadan API 403 dönüyor. Bu kırılgan bir bağımlılık — header kontrolü değişirse uygulama kırılır. Client modülünde bu header'lar merkezi bir fonksiyonda tutulmalı, değiştirilmesi kolay olmalı.

### 6.2 Fonksiyonlar

Client modülü şu 5 public fonksiyonu sunmalı:

1. **`search(keywords, options?)`** — Keyword ile ürün arama
2. **`searchByIdentity(identity, type, options?)`** — Barkod veya ID ile arama
3. **`searchSimilar(productId, keywords, options?)`** — Benzer ürünler
4. **`nearest(lat, lng, distance?)`** — Yakın mağazaları bul
5. **`getCategories()`** — Kategori listesi

Her fonksiyon `lat`/`lng` parametresini opsiyonel almalı. Verilmezse env'den default koordinat okunmalı, o da yoksa koordinatsız istek atılmalı.

### 6.3 Hata Yönetimi

Üç hata senaryosu var:

1. **403 Forbidden** — Header eksik veya IP bloğu. Retry anlamsız, hemen hata döndür
2. **500 Internal Server Error** — Sunucu hatası. Exponential backoff ile 2 kez retry
3. **HTML response (WAF bloğu)** — Response JSON değil, HTML. "Your Access To This Page Has Been Blocked!" mesajı. IP geçici olarak bloklanmış — 5 dakika beklemek gerekir. Kullanıcıya "geçici hata" mesajı göster

Response'un JSON olup olmadığı kontrol edilmeli — WAF bloğunda `res.json()` patlar.

### 6.4 Rate Limiting (Self-Imposed)

API'nin resmi rate limit'i belgelenmemiş ama agresif kullanımda WAF devreye giriyor. İstekler arası minimum 200ms beklemek için basit bir in-memory throttle mekanizması eklenmeli. Özellikle `lookupProducts` fonksiyonunda `Promise.all` ile paralel atılan search istekleri kontrol altına alınmalı.

---

## 7. Tip Sistemi Dönüşümü

### 7.1 Mevcut Tipler (Kaldırılacak)

```
CamgozRawProduct, CamgozRawMarketPrice → silinecek
camgozProductSchema, camgozSearchResponseSchema → silinecek
```

### 7.2 Yeni Tipler

**API Response Tipleri (Zod şemaları ile):**

- `MFSearchResponse` — `{ numberOfFound, searchResultType, content, facetMap }`
- `MFProduct` — `{ id, title, brand, imageUrl, refinedVolumeOrWeight, categories, main_category, menu_category, productDepotInfoList }`
- `MFDepotPrice` — `{ depotId, depotName, price, unitPrice, unitPriceValue, marketAdi, percentage, longitude, latitude, indexTime, discount, discountRatio, promotionText }`
- `MFNearestDepot` — `{ id, sellerName, location, marketName, distance }`
- `MFCategory` — `{ name, subcategories }`

**Normalize Edilmiş Uygulama Tipleri (mevcut yapıyı koruyacak şekilde):**

- `ProductHit` — `barcode` → `productId` olacak, geri kalan alanlar korunacak
- `ProductDetail` — `barcode` → `productId`. `markets` alanı korunacak ama `sourceUrl` kalkacak, yerine `depotName` ve konum bilgisi eklenebilir
- `MarketPrice` — `sourceUrl` kalkacak. `depotId`, `depotName`, `unitPrice` eklenecek. `priceModifiedAt` formatı değişecek (DD.MM.YYYY HH:mm → ISO)

### 7.3 `searchResultType` Değerleri

API'den dönen `searchResultType` alanını yorumlamak gerekiyor:

- `0` → Barkod/ID ile tam eşleşme
- `1` → Keyword ile arama sonucu  
- `2` → Sonuç yok

Bu değer, barkod aramasının başarılı olup olmadığını anlamak için kullanılacak.

---

## 8. Konum Stratejisi

Marketfiyati konum bazlı çalışıyor — bu hem avantaj hem de tasarım kararı gerektiren bir konu.

### 8.1 Konum Nereden Gelecek?

Üç seçenek, birlikte kullanılabilir:

1. **Browser Geolocation API** — `navigator.geolocation.getCurrentPosition()`. Kullanıcıdan izin gerektirir. En doğru sonuç
2. **Kullanıcı profili** — Onboarding'de veya ayarlarda "varsayılan konum" seçtir. DB'de sakla
3. **Env default** — `MARKETFIYATI_DEFAULT_LAT` / `MARKETFIYATI_DEFAULT_LNG`. Hiçbir konum bilgisi yoksa fallback

### 8.2 Önerilen Akış

1. Client-side'da konum izni iste (ilk kullanımda)
2. Kullanıcı izin verdiyse koordinatları API isteklerine ekle
3. İzin vermediyse veya alınamadıysa env default kullan
4. Asistan/fiş/sepet akışlarında konum server-side'a gönderilmeli — ya request header'ı, ya cookie, ya da API route'a query param olarak

### 8.3 Koordinat Hassasiyeti

Kullanıcının tam koordinatını API'ye göndermek gizlilik açısından sakıncalı olabilir. Koordinatları 2 ondalık basamağa yuvarlayarak (~1.1 km hassasiyet) hem gizliliği koruyabilir hem de cache hit oranını artırabilirsiniz.

### 8.4 `distance` Parametresi

API'ye gönderilen `distance` (km) parametresi arama yarıçapını belirliyor. Önerilen değerler:

- Büyükşehir merkezi: `distance: 3` (3 km içinde yeterli market bulunur)
- Kırsal/küçük şehir: `distance: 10` (daha geniş arama gerekir)
- Varsayılan: `distance: 5` makul bir orta yol

---

## 9. Market Registry Dönüşümü

### 9.1 Mevcut Durum

`lib/markets/registry.ts`'de 56 market var. Logo URL'leri `file.camgoz.net`'ten çekiliyor. Marketfiyati'ye geçişte:

- 56 marketten 50'si kaybolacak (marketfiyati sadece 6 market destekliyor)
- Logo URL'leri camgoz CDN'ine bağımlı — bu bağımlılık koparılmalı

### 9.2 Yapılacaklar

1. 6 market için logoları kendi statik asset'lerinize indirin (`public/market-logos/` veya R2/CDN'e)
2. Registry'yi 6 markete küçültün: BİM, A101, Migros, Şok, CarrefourSA, Tarım Kredi
3. Alias mapping'i güncelleyin — marketfiyati `marketAdi` alanında küçük harf kullanıyor (`"bim"`, `"a101"`, `"migros"`, `"sok"`, `"carrefour"`, `"tarim_kredi"`). Normalize fonksiyonu buna göre çalışmalı
4. `findMarket` fonksiyonundaki prefix matching mantığı korunabilir ama alias'lar güncellenmeli

### 9.3 UI Etkisi

"45+ markette karşılaştır" ifadesi artık geçersiz. Aşağıdaki yerlerde güncellenmeli:

- `components/product-search-page.tsx:86` — "45+ markette güncel fiyatları karşılaştır"
- `lib/ai/prompts.ts:1` — "45+ market arasında en ucuz alışveriş sepetini bulmasına yardım edersin"
- `lib/ai/prompts.ts:32` — "45+ markette en ucuzunu bulurum"
- `lib/ai/prompts.ts:33` — "45+ market arasında"
- Onboarding modal veya landing page'de benzer ifadeler varsa

Yeni ifade önerisi: "BİM, A101, Migros, Şok, CarrefourSA ve Tarım Kredi marketlerinde fiyatları karşılaştır" veya kısaca "6 büyük markette karşılaştır".

---

## 10. LLM Prompt Güncellemeleri

`lib/ai/prompts.ts` ve `lib/ai/schemas.ts`'de "camgoz" / "camgöz" / "camgoz.net" referansları var. Bunlar hem LLM'e giden prompt'ları hem de kod içi açıklamaları etkiliyor.

### 10.1 Değiştirilecek Referanslar

| Dosya | Konum | Mevcut | Yeni |
|-------|-------|--------|------|
| `lib/ai/schemas.ts:19` | `ParsedItemSchema.searchQuery` describe | "camgoz aramasına gönderilecek" | "market arama API'sine gönderilecek" |
| `lib/ai/schemas.ts:143` | `ReceiptOCRItemSchema.searchQuery` describe | "camgöz aramasına gönderilecek" | "market arama API'sine gönderilecek" |
| `lib/ai/prompts.ts:65` | searchQuery açıklaması | "camgoz.net Türkiye market arama API'sine" | "Türkiye market arama API'sine" |
| `lib/ai/prompts.ts:192` | Fiş searchQuery kuralları | "camgöz.net Türkiye market arama API'sine" | "Türkiye market arama API'sine" |
| `lib/ai/prompts.ts:264` | Match prompt | "camgöz arama API'sinden dönen" | "market arama API'sinden dönen" |

Bu değişiklikler LLM'in davranışını değiştirmez — sadece açıklama metinleri güncellenir.

---

## 11. `sourceUrl` Kaybı ve UI Etkisi

Camgoz her market fiyatı için `sourceUrl` (marketteki ürün sayfasına link) döndürüyordu. Marketfiyati bu veriyi döndürmüyor.

### 11.1 Etkilenen Yerler

- `product-detail-panel.tsx:192-201` — Market fiyatı yanındaki dış link (ExternalLink) butonu
- `lib/ai/schemas.ts:78-80` — `MarketPriceEntrySchema.sourceUrl`
- `lib/ai/tools.ts:349` — `sourceUrl: m.sourceUrl`
- `receipt-comparison-card.tsx` — `bestUrl` alanı

### 11.2 Çözüm

- `MarketPrice` tipinden `sourceUrl` alanını kaldır
- `ReceiptComparisonItemSchema`'dan `bestUrl` alanını kaldır
- UI'daki ExternalLink butonunu kaldır veya market'in ana sayfasına yönlendir (registry'den `url` alanı kullanılabilir)

---

## 12. `indexTime` Format Dönüşümü

Tarih formatı değişiyor:

- **Camgoz:** `"17-01-2026 02:14:47"` (DD-MM-YYYY HH:mm:ss, tire ayraç)
- **Marketfiyati:** `"08.06.2026 08:19"` (DD.MM.YYYY HH:mm, nokta ayraç, saniye yok)

Mevcut `dmYHmsToIso()` fonksiyonu (`lib/camgoz/types.ts:65-74`) yeni formata uyarlanacak. Regex pattern değişecek:

- Eski: `/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/`
- Yeni: `/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/`

---

## 13. Env Değişkenleri

### Kaldırılacak

```
CAMGOZ_API_BASE=https://camgoz.jojapi.net/api/external
JOJAPI_KEY=...
CAMGOZ_PREFERRED_MARKETS=A101,Şok Market,Migros,...
```

### Eklenecek (opsiyonel)

```
MARKETFIYATI_DEFAULT_LAT=41.0082
MARKETFIYATI_DEFAULT_LNG=28.9784
MARKETFIYATI_DEFAULT_DISTANCE=5
```

API key gerekmiyor — auth yok.

---

## 14. Uygulama Sırası

Geçiş tek seferde yapılabilir (API değişimi, tip değişimi, DB migration birlikte) çünkü hibrit yaklaşım uygulanmayacak. Önerilen adım sırası:

### Faz 1: Altyapı (API erişimi bağımsız test edilebilir)

1. `lib/marketfiyati/client.ts` yaz — 5 endpoint, zorunlu header'lar, hata yönetimi, throttle
2. `lib/marketfiyati/types.ts` yaz — Zod şemaları, normalize fonksiyonları, indexTime parser
3. `lib/marketfiyati/cache.ts` yaz — Redis cache katmanı, barcode→id çözümleme
4. Client'ı bağımsız olarak test et (unit test veya script ile)

### Faz 2: Veritabanı

5. Drizzle migration yaz: kolon rename'leri (`barcode` → `productId`, `matchedBarcode` → `matchedProductId`)
6. `barcode_map` tablosunu oluştur
7. `users` tablosuna konum alanları ekle (opsiyonel)
8. Mevcut `products` tablosundaki cache verilerini truncate et

### Faz 3: İş Mantığı

9. `lib/ai/tools.ts` güncelle — tüm `barcode` → `productId`, import yolları
10. `lib/ai/optimize.ts` güncelle — `productBarcode` → `productId`
11. `lib/ai/schemas.ts` güncelle — tip tanımları, "camgoz" referansları
12. `lib/ai/prompts.ts` güncelle — "camgoz" / "camgöz" referansları
13. `lib/actions/baskets.ts` ve `lib/actions/receipts.ts` güncelle

### Faz 4: API Routes

14. `app/api/products/search/route.ts` güncelle
15. `app/api/products/[barcode]/route.ts` → ya `[id]` olarak yeniden adlandır ya da barkod + id ikisini de destekle
16. `app/api/assistant/chat/route.ts` — import yolları kontrol et

### Faz 5: UI ve Konfigürasyon

17. `components/product-detail-panel.tsx` güncelle — `barcode` → `productId`, ExternalLink kaldır
18. `components/product-search-page.tsx` güncelle — `barcode` → `productId`
19. `components/assistant/receipt-comparison-card.tsx` güncelle
20. `lib/markets/registry.ts` — 6 markete küçült, logo'ları kendi CDN'ine taşı
21. `lib/security/headers.ts` — CSP güncelle
22. `next.config.mjs` — image domain'leri güncelle
23. `.env.example` güncelle
24. `lib/redis.ts` — TTL sabitleri güncelle
25. UI'daki "45+ market" ifadelerini güncelle

### Faz 6: Temizlik

26. `lib/camgoz/` klasörünü sil
27. Redis'teki eski `camgoz:*` key'lerini temizle (TTL'leri dolacaktır ama istersen `SCAN` + `DEL` ile hızlandır)
28. `README.md` ve `docs/Sepet-PRD.md`'deki camgoz referanslarını güncelle

---

## 15. Riskler ve Azaltma Stratejileri

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| API'nin header kontrolünü değiştirmesi (403) | Orta | Kritik — uygulama durur | Header'ları env'den okunan config'e taşı. Monitoring/alert kur. Fallback planı: Open Food Facts'a düş (sadece ürün bilgisi, fiyat yok) |
| Rate limit / WAF bloğu | Orta | Yüksek — geçici kesinti | Self-imposed throttle (200ms). Cache TTL'lerini akıllı tut. Kullanıcıya "geçici hata, tekrar dene" göster |
| Market kapsamının 56'dan 6'ya düşmesi | Kesin | Orta — küçük marketlerde fiyat yok | Kullanıcıya açıkça 6 market olduğunu söyle. İleride marketfiyati kapsamı genişleyebilir |
| API'nin kapanması / erişimin kısıtlanması | Düşük | Kritik | Resmi devlet projesi olduğu için uzun ömürlü olma ihtimali yüksek. Yine de client modülünü soyutla — başka kaynağa geçiş kolay olsun |
| Konum izni reddi | Yüksek | Düşük — fiyatlar yine gelir ama konum bağımsız | Default koordinat fallback. Konum olmadan da çalışan akış |
| `productId` formatının değişmesi | Düşük | Yüksek — cache ve DB uyumsuzluğu | ID'yi opaque string olarak muamele et, formatına bağımlı mantık yazma |

---

## 16. Test Stratejisi

### 16.1 Client Testleri

- Her 5 endpoint için başarılı istek testi (mock veya gerçek API)
- 403 hatası testi (header eksik)
- WAF bloğu testi (HTML response parse)
- Boş sonuç testi (`numberOfFound: 0`)
- Rate limit throttle testi

### 16.2 Cache Testleri

- Search cache hit/miss
- Barcode → productId çözümleme (cache hit, cache miss → API, DB fallback)
- Nearest cache
- Koordinat yuvarlama tutarlılığı

### 16.3 Entegrasyon Testleri

- Barkod tarayıcı → `searchByIdentity` → ürün detay akışı
- Keyword arama → ürün listesi → ürün detay akışı
- Fiş onayı → `lookupProducts` → optimizasyon akışı
- Sepet onayı → `lookupProducts` → optimizasyon akışı
- LLM match → ürün seçimi → market fiyat tablosu

### 16.4 UI Testleri

- Ürün kartlarında görsel yükleniyor mu (`cdn.marketfiyati.org.tr`)
- Market logoları doğru görünüyor mu
- Barkod badge'i doğru bilgi gösteriyor mu (productId vs barkod)
- ExternalLink butonu kaldırıldıysa layout bozulmadı mı
- "X market" sayısı doğru mu

---

## 17. Geri Dönüş Planı

Geçiş başarısız olursa veya marketfiyati erişilemez hale gelirse:

1. `lib/camgoz/` klasörü git history'de mevcut — `git revert` ile geri alınabilir
2. DB migration'ları reversible yazılmalı (`barcode` → `productId` geri alınabilir olmalı)
3. Redis key'leri farklı prefix kullandığı için (`mf:` vs `camgoz:`) çakışma riski yok
4. Env değişkenlerini geri eklemek yeterli — JOJAPI_KEY hâlâ geçerli olduğu sürece

---

## 18. Sonrası: Yeni Özellik Fırsatları

Marketfiyati'ye geçiş tamamlandığında şu özellikler mümkün hale gelir:

1. **Konum bazlı fiyat karşılaştırma** — "Sana en yakın A101'de 60 TL, 500m ötedeki Migros'ta 54 TL"
2. **Yakın market haritası** — `nearest` endpoint'i ile kullanıcıya harita göster
3. **Birim fiyat karşılaştırma** — `unitPriceValue` ile litre/kg başına fiyat göster
4. **İndirim takibi** — `discount`, `discountRatio`, `promotionText` ile indirimli ürünleri vurgula
5. **Benzer ürün önerileri** — `searchSmilarProduct` ile daha akıllı alternatifler
6. **Kategori bazlı keşif** — `categories` endpoint'i ile "Bu hafta en ucuz süt ürünleri" gibi özellikler
