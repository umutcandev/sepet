# Marketfiyati.org.tr API Dokümantasyonu

> **Kaynak:** T.C. Ticaret Bakanlığı + TÜBİTAK BİLGEM — Fiyat Açık Veri Platformu  
> **Base URL:** `https://api.marketfiyati.org.tr`  
> **Auth:** Yok — API anahtarı gerektirmez  
> **Tarih:** 9 Haziran 2026 — tüm endpoint'ler canlı test edilmiştir

---

## Veri Kaynağı ve Güncelleme Sıklığı

Veriler **marketlerden doğrudan** TÜBİTAK BİLGEM'in "Fiyat Açık Veri Platformu"na iletilir — scraping yoktur. Gelen veriler algoritmalarla temizlenip doğrulandıktan sonra **günlük olarak** yayınlanır.

> **Yasal zorunluluk:** 200+ şubesi olan marketler bu platforma veri göndermek zorundadır. 200'den az şubesi olan marketler için katılım isteğe bağlıdır.

**Fiyatlar şube bazlıdır** — aynı marketteki farklı şubelerde fiyat farklılıkları olabilir. Platformdaki fiyatlar, marketlerin kendi online mağazalarındaki fiyatlardan farklı olabilir.

---

## Zorunlu Header'lar

Her istekte aşağıdaki header'lar **zorunludur** — eksik olursa `403 Forbidden` döner:

```
Content-Type: application/json
Accept: application/json
User-Agent: Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36
Origin: https://marketfiyati.org.tr
Referer: https://marketfiyati.org.tr/
```

> **Not:** `Origin` ve `Referer` olmazsa WAF 403 veriyor. `User-Agent` da bazı endpoint'lerde gerekli.

---

## Desteklenen Marketler

| Market | Depot Prefix | Örnek Depot ID |
|--------|-------------|----------------|
| BİM | `bim-` | `bim-5712` |
| A101 | `a101-` | `a101-6815` |
| Migros | `migros-` | `migros-1991` |
| Şok | `sok-` | `sok-7101` |
| CarrefourSA | `carrefour-` | `carrefour-5254` |
| Tarım Kredi | `tarim_kredi-` | `tarim_kredi-*` |

---

## Endpoint 1: Ürün Arama

```
POST /api/v2/search
```

### Request Body

```json
{
  "keywords": "coca cola",
  "pages": 0,
  "size": 24,
  "latitude": 41.0082,
  "longitude": 28.9784,
  "distance": 5,
  "depots": ["bim-5712", "a101-6815"],
  "menuCategory": false
}
```

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `keywords` | string | ✅ | — | Arama terimi |
| `pages` | int | ❌ | `0` | Sayfa numarası (0-indexed) |
| `size` | int | ❌ | `24` | Sayfa başına sonuç (1-100) |
| `latitude` | float | ❌ | — | Enlem (konum bazlı fiyat için) |
| `longitude` | float | ❌ | — | Boylam |
| `distance` | int | ❌ | `1` | Arama yarıçapı (km) |
| `depots` | string[] | ❌ | — | Belirli depolarda ara (nearest'tan alınır) |
| `menuCategory` | bool | ❌ | `false` | `true` ise keywords'ü kategori adı olarak yorumlar |

> **Not:** `latitude`/`longitude` olmadan da çalışır — bu durumda tüm Türkiye'den sonuç döner.  
> **Not:** `menuCategory: true` agresif rate-limit'e takılabiliyor, dikkatli kullanın.

### Response (200 OK)

```json
{
  "numberOfFound": 44,
  "searchResultType": 1,
  "content": [
    {
      "id": "1O9J",
      "title": "Coca-Cola 1 Lt",
      "brand": "Coca-Cola",
      "imageUrl": "https://cdn.marketfiyati.org.tr/sokimages/8010700.png",
      "refinedVolumeOrWeight": "1 LT",
      "categories": ["Gazlı İçecekler", "Kola"],
      "main_category": "Gazlı İçecekler",
      "menu_category": "İçecek",
      "productDepotInfoList": [
        {
          "depotId": "a101-6815",
          "depotName": "Kostak Ümraniye",
          "price": 60.0,
          "unitPrice": "60,00 ₺/Lt",
          "unitPriceValue": 60.0,
          "marketAdi": "a101",
          "percentage": 11.11,
          "longitude": 29.014442,
          "latitude": 41.01188,
          "indexTime": "08.06.2026 08:19",
          "discount": false,
          "discountRatio": null,
          "promotionText": null
        }
      ]
    }
  ],
  "facetMap": { ... }
}
```

### Sonuç bulunamazsa (200 OK)

```json
{
  "numberOfFound": 0,
  "searchResultType": 1,
  "content": [],
  "facetMap": { "main_category": [] }
}
```

---

## Endpoint 2: Barkod / ID ile Arama

```
POST /api/v2/searchByIdentity
```

### Request Body

```json
{
  "identity": "8697520101021",
  "identityType": "barcode",
  "latitude": 41.0082,
  "longitude": 28.9784,
  "distance": 5
}
```

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `identity` | string | ✅ | — | Barkod numarası veya ürün ID'si |
| `identityType` | string | ❌ | `"id"` | `"barcode"` veya `"id"` |
| `latitude` | float | ❌ | — | Enlem |
| `longitude` | float | ❌ | — | Boylam |
| `distance` | int | ❌ | — | Yarıçap (km) |

### Response (200 OK) — Ürün bulundu

```json
{
  "numberOfFound": 1,
  "searchResultType": 0,
  "content": [
    {
      "id": "0WSU",
      "title": "Cola Turka Kola 2.5 Lt",
      "brand": "Cola Turka",
      "imageUrl": "https://cdn.marketfiyati.org.tr/a101/13002841.jpg",
      "refinedVolumeOrWeight": "2.5 LT",
      "categories": ["Gazlı Içecek Kola"],
      "main_category": "Gazlı İçecekler",
      "menu_category": "İçecek",
      "productDepotInfoList": [
        {
          "depotId": "a101-6815",
          "depotName": "Kostak Ümraniye",
          "price": 70.0,
          "unitPrice": "28,00 ₺/Lt",
          "unitPriceValue": 28.0,
          "marketAdi": "a101",
          "percentage": 0.0,
          "longitude": 29.014442,
          "latitude": 41.01188,
          "indexTime": "08.06.2026 08:18",
          "discount": false,
          "discountRatio": null,
          "promotionText": null
        }
      ]
    }
  ],
  "facetMap": null
}
```

### Response (200 OK) — Ürün bulunamadı

```json
{
  "numberOfFound": 0,
  "searchResultType": 2,
  "content": [],
  "facetMap": null
}
```

> **`searchResultType` değerleri:**  
> `0` = barkod/ID ile tam eşleşme  
> `1` = keyword ile arama sonucu  
> `2` = sonuç yok

---

## Endpoint 3: Benzer Ürünler

```
POST /api/v2/searchSmilarProduct
```

> ⚠️ Endpoint adındaki typo ("Smilar") resmi API'de böyle — düzeltmeyin.

### Request Body

```json
{
  "id": "1O9J",
  "keywords": "cola",
  "latitude": 41.0082,
  "longitude": 28.9784,
  "distance": 5
}
```

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `id` | string | ✅ | — | Referans ürün ID'si |
| `keywords` | string | ✅ | — | Benzerlik için anahtar kelime |
| `latitude` | float | ❌ | — | Enlem |
| `longitude` | float | ❌ | — | Boylam |
| `distance` | int | ❌ | — | Yarıçap (km) |

### Response

Search endpoint ile aynı formatta döner. `facetMap` genellikle `null` gelir.

---

## Endpoint 4: Yakın Marketleri Bul

```
POST /api/v2/nearest
```

### Request Body

```json
{
  "latitude": 41.0082,
  "longitude": 28.9784,
  "distance": 1
}
```

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `latitude` | float | ✅ | — | Enlem |
| `longitude` | float | ✅ | — | Boylam |
| `distance` | int | ❌ | `1` | Yarıçap (km) |

### Response (200 OK)

```json
[
  {
    "id": "sok-7101",
    "sellerName": "Cemberlıtas",
    "location": {
      "lon": 28.973377,
      "lat": 41.00597
    },
    "marketName": "sok",
    "distance": 488.77
  },
  {
    "id": "migros-4453",
    "sellerName": "Mjet Cağaloğlu Istanbul",
    "location": {
      "lon": 28.9752,
      "lat": 41.01202
    },
    "marketName": "migros",
    "distance": 502.03
  }
]
```

> **Kullanım:** Dönen `id` değerlerini `/search` endpoint'ine `depots` array olarak vererek o marketlere özel fiyat alabilirsiniz.

---

## Endpoint 5: Kategori Listesi

```
GET /api/v1/info/categories
```

> ⚠️ Bu endpoint **v1** — diğerleri v2.  
> Body gerekmez, GET isteği yeterli.

### Response (200 OK)

```json
{
  "content": [
    {
      "name": "Meyve ve Sebze",
      "subcategories": ["Meyve", "Sebze"]
    },
    {
      "name": "Et, Tavuk ve Balık",
      "subcategories": ["Kırmızı Et", "Beyaz Et", "Deniz Ürünleri", "Şarküteri", "Sakatat"]
    },
    {
      "name": "Süt Ürünleri ve Kahvaltılık",
      "subcategories": ["Süt", "Yumurta", "Peynir", "Yoğurt", "Zeytin", "Tereyağı ve Margarin", "Sürülebilir Ürünler ve Kahvaltılık Soslar", "Helva Tahin ve Pekmez", "Bal ve Reçel", "Kahvaltılık Gevrek Bar ve Granola", "Kaymak ve Krema"]
    },
    {
      "name": "Temel Gıda",
      "subcategories": ["Ekmek ve Unlu Mamüller", "Sıvı Yağlar", "Bakliyat", "Şeker ve Tatlandırıcılar", "Pasta Malzemeleri", "Un ve İrmik", "Mantı Makarna ve Erişte", "Ketçap Mayonez Sos ve Sirkeler", "Tuz Baharat ve Harçlar", "Salça", "Turşu", "Konserve", "Hazır Gıda", "Bebek Mamaları"]
    },
    {
      "name": "İçecek",
      "subcategories": ["Su", "Meyve Suyu", "Gazlı İçecekler", "Gazsız İçecekler", "Ayran ve Kefir", "Maden Suyu", "Çay ve Bitki Çayları", "Kahve"]
    },
    {
      "name": "Atıştırmalık ve Tatlı",
      "subcategories": ["Çikolata", "Gofret", "Bisküvi ve Kraker", "Kek", "Cips", "Kuruyemiş ve Kuru Meyve", "Sakız ve Şekerleme", "Tatlılar", "Dondurmalar"]
    },
    {
      "name": "Temizlik ve Kişisel Bakım Ürünleri",
      "subcategories": ["Bulaşık Temizlik Ürünleri", "Çamaşır Temizlik Ürünleri", "Genel Temizlik Ürünleri", "Mutfak Sarf Malzemeleri", "Tuvalet Kağıdı", "Kağıt Havlu", "Kağıt Peçete ve Mendil", "Islak Mendil", "Saç Bakım", "Duş Banyo ve Sabun", "Ağız Bakım", "Hijyenik Ped", "Bebek ve Hasta Bezi", "Parfüm Deodorant Kolonya ve Kokular", "Cilt Bakımı", "Makyaj", "Diğer Temizlik ve Kişisel Bakım Ürünleri"]
    }
  ]
}
```

---

## Facet Map Yapısı

Search response'undaki `facetMap` alanı filtreleme/facet bilgisi içerir:

```json
{
  "facetMap": {
    "offer_market": [
      { "name": "migros", "count": 22 },
      { "name": "carrefour", "count": 22 },
      { "name": "a101", "count": 14 },
      { "name": "sok", "count": 3 }
    ],
    "sub_category": [
      { "name": "Kola Zero&light", "count": 29 }
    ],
    "main_category": [
      { "name": "Gazlı İçecekler", "count": 44 }
    ],
    "refined_volume_weight": [
      { "name": "1.5 LT", "count": 11 },
      { "name": "1 LT", "count": 7 }
    ],
    "brand": [
      { "name": "Coca-Cola", "count": 44 }
    ],
    "market_names": [
      { "name": "migros", "count": 22 }
    ],
    "offer_price": [
      { "name": "40-60", "count": 17 },
      { "name": "60-80", "count": 11 }
    ]
  }
}
```

---

## Sepet Projesi İçin Entegrasyon Notları

### Camgoz → Marketfiyati Mapping

| Camgoz Alanı | Marketfiyati Karşılığı | Not |
|-------------|----------------------|-----|
| `barcode` | `id` | Marketfiyati kendi kısa ID'sini kullanır, barkod yok |
| `name` | `title` | — |
| `brand` | `brand` | — |
| `category` | `main_category` / `menu_category` | İki seviye kategori var |
| `imageUrl` | `imageUrl` | CDN: `cdn.marketfiyati.org.tr` |
| `price` (ortalama) | Hesaplanmalı | `productDepotInfoList`'ten avg alınır |
| `markets[].market` | `productDepotInfoList[].marketAdi` | — |
| `markets[].price` | `productDepotInfoList[].price` | — |
| `markets[].sourceUrl` | **Yok** | Marketfiyati kaynak URL vermiyor |
| `markets[].priceModified` | `productDepotInfoList[].indexTime` | Format: `"DD.MM.YYYY HH:mm"` |

### Kritik Fark: Barkod Verisi

**Camgoz** her ürün için EAN/barkod numarası döndürür.  
**Marketfiyati** barkod numarasını **response'da döndürmez** — sadece `searchByIdentity` ile barkod araması yapabilirsiniz.

Bu şu anlama gelir:
- Barkod tarayıcıdan gelen sorgular → `searchByIdentity` ile çalışır ✅
- Keyword aramasından dönen ürünlerin barkodunu bilmezsiniz ❌
- Barkod-bazlı cache key (`camgoz:product:{barcode}`) yerine `id`-bazlı cache key kullanılmalı

### Kritik Fark: Kaynak URL (sourceUrl) Yok

Camgoz'da her market fiyatında `sourceUrl` alanı vardı ve ürünün market sitesindeki sayfasına link veriyordu. **Marketfiyati'nda bu alan bulunmuyor.** UI'daki "markette görüntüle" / ExternalLink butonları kaldırılmalı veya alternatif bir çözüm düşünülmeli.

### Alternatif Ürün Mekanizması

Marketfiyati platformunda bir ürün seçilen konumdaki markette **stokta yoksa** "Mevcut Değil" uyarısı gösterilir ve **"Alternatif Seç"** butonu sunulur. Bu buton, aynı kategoriden **3 alternatif ürün** önerir.

Bu mekanizma teknik olarak `searchSmilarProduct` endpoint'i ile sağlanabilir:

```
POST /api/v2/searchSmilarProduct { id: "<ürün_id>", keywords: "<ürün_adı>", lat, lng }
```

**Sepet projesi için fırsat:**
- Optimizasyon sırasında bir markette ürün bulunamazsa, `searchSmilarProduct` ile alternatif öner
- Kullanıcıya "Bu ürün bu markette yok, alternatifler:" şeklinde UI göster
- LLM eşleştirmesinde "en yakın alternatif" seçimi için kullanılabilir

Ayrıca bir market seçilen konumda hiç yoksa (örneğin kullanıcının yakınında hiç CarrefourSA şubesi yoksa) "Market Mevcut Değil" durumu oluşur — bu durumda o marketten fiyat bilgisi döndürülmez.

### Liste Limitleri

Marketfiyati platformunda alışveriş listeleri için limitler mevcuttur:

| Limit | Değer |
|-------|-------|
| Aynı üründen maksimum adet | **50** |
| Farklı ürün sayısı (toplam kalem) | **100** |

Bu limitler doğrudan API'ye değil web arayüzüne ait olsa da, Sepet projesi için benzer mantıksal sınırlar konmalı:
- Basket/sepet başına 100 farklı ürün üst sınırı makul
- Aynı üründen 50 adet sınırı optimizasyon hesaplamalarında göz önünde bulundurulmalı

### Konum Stratejisi

Camgoz konum bağımsızdır, marketfiyati konum bazlıdır. İki yaklaşım:

1. **Kullanıcı konumu kullan:** Sepet'te zaten konum bilgisi varsa doğrudan `latitude`/`longitude` gönderin
2. **Konum olmadan ara:** `latitude`/`longitude` göndermezseniz tüm Türkiye'den sonuç döner — ama `productDepotInfoList` boş gelebilir veya rastgele depolar gelir

### Önerilen Akış

```
Kullanıcı "coca cola" arar
    ↓
POST /api/v2/search { keywords: "coca cola", lat, lng, distance: 5 }
    ↓
Sonuçları göster (id, title, brand, imageUrl, fiyatlar)
    ↓
Ürün markette mevcut değilse
    ↓
POST /api/v2/searchSmilarProduct { id: "<id>", keywords: "coca cola", lat, lng }
    ↓
Alternatif ürünleri göster (3 öneri)
    ↓
Kullanıcı barkod tarar (8697520101021)
    ↓
POST /api/v2/searchByIdentity { identity: "8697520101021", identityType: "barcode", lat, lng }
    ↓
Ürün detayını göster
    ↓
Benzer ürünler isterse
    ↓
POST /api/v2/searchSmilarProduct { id: "0WSU", keywords: "cola", lat, lng }
```

### Cache Stratejisi

```
Redis key pattern:
  mf:search:{normalized_query}:{lat}:{lng}  → ProductID[]  (TTL: 4 saat)
  mf:product:{id}:{lat}:{lng}               → ProductDetail (TTL: 6 saat)
  mf:nearest:{lat}:{lng}                    → DepotInfo[]   (TTL: 24 saat)
```

Veriler **günlük olarak** güncellenir (marketler → TÜBİTAK BİLGEM → platform). API ücretsiz olduğu için agresif cache'e gerek yok ama gereksiz istek de atılmamalı — yukarıdaki TTL'ler makul bir denge sağlar.

### Rate Limiting

- Belgelenmiş resmi limit yok
- Agresif istek atılırsa WAF devreye giriyor (IP bazlı blok, "Your Access To This Page Has Been Blocked!" HTML response)
- Önerilen: istekler arası minimum 200ms bekleyin, burst yapmayın
- `menuCategory: true` parametresi daha agresif rate-limit tetikliyor

### Hata Durumları

| HTTP Kodu | Sebep | Çözüm |
|-----------|-------|-------|
| `200` + boş content | Sonuç yok | Normal — UI'da "sonuç bulunamadı" göster |
| `403` | Eksik header veya IP bloğu | Header'ları kontrol et, rate-limit'e uygun bekle |
| `500` | Geçersiz endpoint veya sunucu hatası | Retry (exponential backoff) |
| HTML response | WAF bloğu | IP geçici olarak bloklanmış, 5-10 dk bekle |

### `indexTime` Format Dönüşümü

Marketfiyati `"DD.MM.YYYY HH:mm"` formatında zaman döndürür. Mevcut Camgoz `dmYHmsToIso` fonksiyonuna benzer bir dönüştürücü gerekir:

```typescript
// "08.06.2026 08:19" → ISO string
function indexTimeToIso(input: string | null): string | null {
  if (!input) return null
  const m = input.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!m) return null
  const [, dd, mm, yyyy, hh, mi] = m
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00Z`).toISOString()
}
```

---

## cURL Test Komutları

### Ürün Arama
```bash
curl -s -X POST "https://api.marketfiyati.org.tr/api/v2/search" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36" \
  -H "Origin: https://marketfiyati.org.tr" \
  -H "Referer: https://marketfiyati.org.tr/" \
  -d '{"keywords":"coca cola","pages":0,"size":5,"latitude":41.0082,"longitude":28.9784,"distance":5}' | jq .
```

### Barkod ile Arama
```bash
curl -s -X POST "https://api.marketfiyati.org.tr/api/v2/searchByIdentity" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36" \
  -H "Origin: https://marketfiyati.org.tr" \
  -H "Referer: https://marketfiyati.org.tr/" \
  -d '{"identity":"8697520101021","identityType":"barcode","latitude":41.0082,"longitude":28.9784,"distance":5}' | jq .
```

### Yakın Marketler
```bash
curl -s -X POST "https://api.marketfiyati.org.tr/api/v2/nearest" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36" \
  -H "Origin: https://marketfiyati.org.tr" \
  -H "Referer: https://marketfiyati.org.tr/" \
  -d '{"latitude":41.0082,"longitude":28.9784,"distance":1}' | jq .
```

### Benzer Ürünler
```bash
curl -s -X POST "https://api.marketfiyati.org.tr/api/v2/searchSmilarProduct" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36" \
  -H "Origin: https://marketfiyati.org.tr" \
  -H "Referer: https://marketfiyati.org.tr/" \
  -d '{"id":"1O9J","keywords":"cola","latitude":41.0082,"longitude":28.9784,"distance":5}' | jq .
```

### Kategoriler
```bash
curl -s "https://api.marketfiyati.org.tr/api/v1/info/categories" | jq .
```

---

## JavaScript (Tarayıcı Konsolu) Test

```javascript
const HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json"
};

// Ürün Arama
fetch("https://api.marketfiyati.org.tr/api/v2/search", {
  method: "POST", headers: HEADERS,
  body: JSON.stringify({ keywords: "coca cola", pages: 0, size: 5, latitude: 41.0082, longitude: 28.9784, distance: 5 })
}).then(r => r.json()).then(console.log);

// Barkod Arama
fetch("https://api.marketfiyati.org.tr/api/v2/searchByIdentity", {
  method: "POST", headers: HEADERS,
  body: JSON.stringify({ identity: "8697520101021", identityType: "barcode", latitude: 41.0082, longitude: 28.9784, distance: 5 })
}).then(r => r.json()).then(console.log);
```

> **Not:** Tarayıcıdan CORS nedeniyle çalışmayabilir. Bu durumda backend (Next.js API route) üzerinden proxy'leyin.
