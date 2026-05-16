# Sepet — Ürün Gereksinim Dokümanı (PRD)

**Hane Halkı için Akıllı Alışveriş ve Kişisel Enflasyon Asistanı**

| Alan | Değer |
|---|---|
| Doküman Versiyonu | v1.1 |
| Tarih | 10 Mayıs 2026 |
| Durum | Hackathon MVP Scope — Onaylı (Auth: Google OAuth) |
| Yarışma | Hackathon'26 — Finans veya E-Ticaret Temalı AI Uygulamaları |
| Süre | 48 saat |
| Hedef Demo Tarihi | Hackathon Sunum Günü |

---

## 1. Yönetici Özeti

Sepet, Türkiye'deki kullanıcıların market alışverişini **45+ market arasında karşılaştırarak** optimize etmelerini, satın aldıkları ürünlerin fiyat değişimini takip ederek **kişisel enflasyon oranlarını** ölçmelerini ve bir AI asistanla **harcama davranışlarını analiz** etmelerini sağlayan web tabanlı bir uygulamadır.

Ürün, hackathon'un **hem Finans hem E-Ticaret** temalarına aynı anda hizmet eden iki yönlü bir değer önerisi sunar: kullanıcı tarafında somut tasarruf (e-ticaret), zaman içinde ise hane bütçesi şeffaflığı (finans).

Temel teknolojik avantaj: **camgoz.net** API'si üzerinden 162.929 ürün ve 45+ Türkiye marketinin **gerçek, canlı fiyat verisine** erişim. Bu, çoğu hackathon projesinin sahte/mock veri ile demosunu yapmaya çalıştığı bir alanda **çalışır prototip** sunma kabiliyeti demektir.

---

## 2. Problem ve Fırsat

### 2.1 Problem

Türkiye'de hane halkı 2025-2026 döneminde tarihinin en yüksek geçim sıkıntılarından birini yaşıyor. Tüketici bu ortamda üç somut problemle karşı karşıya:

1. **Fiyat opaklığı**: Aynı ürün marketler arasında %30-150 farklı fiyatlanabiliyor; tüketici bunu sistematik olarak takip edemiyor.
2. **Optimizasyon eksikliği**: "Hangi marketten alışveriş yaparsam en ucuzu" sorusu manuel olarak cevaplanamayacak kadar karmaşık (45+ market × 50+ ürün).
3. **Kişisel enflasyon körlüğü**: TÜFE rakamları kullanıcının *kendi* sepetini yansıtmıyor; gerçek harcama artışını ölçecek araç yok.

### 2.2 Fırsat

Türkiye'de **camgoz.net** gibi 162K+ ürünün cross-market fiyat verisini sunan ücretsiz API mevcut. Bu veri kaynağı + Gemini'nin ücretsiz multimodal LLM kapasitesi birleştiğinde, daha önce sadece kurumsal araçlarda mevcut olan **akıllı alışveriş optimizasyonu** son kullanıcıya sunulabilir hale geliyor.

---

## 3. Hedef Kullanıcı

### 3.1 Birincil Persona — "Pragmatik Aile Alışverişçisi"

- **Profil**: 28-50 yaş, hane geliri orta segment, haftalık market alışverişi yapıyor
- **Davranış**: Birden fazla marketin uygulamasını kontrol ediyor, indirim takip ediyor, fiş saklıyor
- **Acı noktası**: "Aynı listeyi her hafta alıyorum ama hangi marketten almam gerektiğine her seferinde sıfırdan karar veriyorum"
- **Teknoloji**: Akıllı telefon kullanıyor, web uygulamalarına aşina, AI'a karşı temkinli ama açık

### 3.2 İkincil Persona — "Bütçe Bilinçli Genç"

- **Profil**: 22-30 yaş, yeni evlenmiş veya bekar, kira + market en büyük gider kalemi
- **Davranış**: Aylık bütçe takibi yapmaya çalışıyor, "ne kadar harcadım?" raporu istiyor
- **Acı noktası**: "Geçen ay neye ne kadar harcadığımı bilmiyorum"

---

## 4. Ürün Hedefleri ve Başarı Kriterleri

### 4.1 Hedefler (Goals)

- **G1**: Kullanıcı 30 saniye içinde haftalık sepetinin en ucuz market kombinasyonunu görebilmeli
- **G2**: Kullanıcı bir fiş fotoğrafından ürün listesini otomatik girebilmeli (manuel girişi sıfıra indirmek)

### 4.2 Hackathon Başarı Metrikleri (Demo Esnasında)

| Metrik | Hedef |
|---|---|
| Doğal dil sepet parse doğruluğu | %85+ ürün eşleşme |
| Cross-market optimizasyon sorgu süresi | < 2 saniye |
| Fiş OCR doğruluğu | %80+ kalem doğru |
| Demo akışında çökme/hata | 0 |
| Sunum süresine sığma | 4 dakika içinde tamamlanabilir |

### 4.3 Hedef Olmayanlar (Non-Goals)

- Native mobil uygulama (sadece responsive web)
- Gerçek zamanlı fiyat anlık bildirim sistemi
- Yurtdışı pazarlar / multi-currency
- Sosyal özellikler, paylaşım, beğeni

---

## 5. Kullanıcı Hikayeleri

### Çekirdek (Must Have)

- **US-1**: Kullanıcı olarak, ürün adı veya barkod ile arama yaparak o ürünün **45+ markette güncel fiyatlarını** karşılaştırılabilir bir tabloda görmek istiyorum.
- **US-2**: Kullanıcı olarak, "2 ekmek, 1 lt süt, 500g peynir" gibi **doğal dilde haftalık sepetimi yazmak**, sistemin bu kalemleri otomatik olarak ürünlerle eşleştirmesini istiyorum.
- **US-3**: Kullanıcı olarak, sepet oluşturduğumda "tek marketten en ucuz" ve "iki marketten optimal kombinasyon" senaryolarını **somut TL tasarruf rakamıyla** görmek istiyorum.
- **US-4**: Kullanıcı olarak, oluşturduğum sepetleri **kaydedebilmek** ve sonradan tekrar açmak istiyorum.

### Görünür Değer (Should Have)

- **US-5**: Kullanıcı olarak, **market fişimin fotoğrafını yükleyerek** alışverişimi otomatik kayda geçirmek istiyorum.

### Stretch (Nice to Have)

- **US-8**: Kullanıcı olarak, pahalı bir ürünün **daha ucuz alternatiflerini** AI yorumuyla görmek istiyorum.
- **US-9**: Kullanıcı olarak, **telefon kameramı kullanarak barkod okutarak** ürünleri sepete eklemek istiyorum.

---

## 6. Fonksiyonel Gereksinimler

### 6.1 Auth & Hesap Yönetimi

| ID | Gereksinim | Öncelik |
|---|---|---|
| F1.1 | Google OAuth ile tek tıklamalı giriş ("Sign in with Google") | P0 |
| F1.2 | Oturum yönetimi (NextAuth v5 + httpOnly cookie + Drizzle adapter) | P0 |
| F1.3 | Google profil resmi ve isminin otomatik gösterimi (header/menü) | P0 |
| F1.4 | Çıkış yapma (signOut) | P0 |
| F1.5 | Korumalı route'lar — auth gerektiren sayfalarda redirect | P0 |


### 6.2 Ürün Arama ve Fiyat Karşılaştırma

| ID | Gereksinim | Öncelik |
|---|---|---|
| F2.1 | Ürün adı ile metin araması (camgoz `/api/external/search`) | P0 |
| F2.2 | Barkod ile arama | P0 |
| F2.3 | Sonuçları tablo/kart UI'da sergileme — isim, marka, kategori, görsel, ortalama fiyat | P0 |
| F2.4 | Ürün detay sayfasında 45+ marketin canlı fiyat tablosu | P0 |
| F2.5 | "Stokta yok" durumunun market bazında işaretlenmesi | P0 |
| F2.6 | Fiyat tablosunda ucuzdan pahalıya sıralama | P0 |
| F2.7 | Markete yönlendirme (utm parametreli direkt link) | P1 |
| F2.8 | Ürün cache'leme (Drizzle, TTL 12 saat) | P1 |

### 6.3 Sepet Yönetimi

| ID | Gereksinim | Öncelik |
|---|---|---|
| F3.1 | Manuel sepet oluşturma (ürün ara → ekle → adet seç) | P0 |
| F3.2 | Doğal dil sepet parse (Gemini 2.5 Flash-Lite + Zod) | P0 |
| F3.3 | Parse sonrası kullanıcının ürün eşleşmelerini düzeltme/onay ekranı | P0 |
| F3.4 | Sepetten ürün çıkarma, adet düzenleme | P0 |
| F3.5 | Sepeti isimli olarak kaydetme | P0 |
| F3.6 | Kayıtlı sepet listesi ve detay sayfası | P0 |

### 6.4 Cross-Market Optimizasyon

| ID | Gereksinim | Öncelik |
|---|---|---|
| F4.1 | Tek market senaryosu — sepetin hepsini tek marketten alırsa en ucuz market hangisi, ne kadar | P0 |
| F4.2 | İki market senaryosu — en iyi 2 market kombinasyonu, toplam tutar, tasarruf | P0 |
| F4.3 | Teorik minimum (her ürün ayrı marketten) — referans | P1 |
| F4.4 | "Stokta yok" durumlarının optimizasyonda dışlanması | P0 |
| F4.5 | Optimizasyon hesabı: deterministik SQL (LLM **değil**) | P0 |

### 6.5 Fiş OCR (Vision)

| ID | Gereksinim | Öncelik |
|---|---|---|
| F5.1 | Fotoğraf yükleme (drag-drop + dosya seç) | P1 |
| F5.2 | Gemini 2.5 Flash + `generateObject` ile yapılandırılmış çıktı (market, tarih, kalemler, toplam) | P1 |
| F5.3 | Çıkarılan kalemlerin barkod/ürün eşleşmesi (camgoz arama) | P1 |
| F5.4 | Kullanıcı onay/düzeltme ekranı | P1 |
| F5.5 | `purchases` ve `purchase_items` tablolarına kaydetme | P1 |

### 6.6 Kişisel Enflasyon ve Analiz

| ID | Gereksinim | Öncelik |
|---|---|---|
| F6.1 | Kayıtlı sepet/satın alma geçmişine dayalı zaman serisi grafiği | P1 |
| F6.2 | Kategori bazlı enflasyon ayrıştırması (örn. "Süt %X, Deterjan %Y") | P1 |
| F6.3 | "Geçen aya göre" özet kartı (toplam harcama değişimi) | P1 |
| F6.4 | AI Q&A endpoint'i (`/api/assistant`) — Gemini 2.5 Flash | P1 |
| F6.5 | Asistan sohbet UI (basit chat input + cevap) | P1 |

### 6.7 Stretch Özellikler

| ID | Gereksinim | Öncelik |
|---|---|---|
| F7.1 | Akıllı ikame önerici (kategoride ucuz alternatifler + AI yorumu) | P2 |
| F7.2 | Web tabanlı barkod tarayıcı (`@zxing/browser`) | P2 |
| F7.3 | Günlük cron ile favori ürün fiyat güncelleme (Vercel Cron) | P2 |
| F7.4 | Hane içi çoklu kullanıcı paylaşımı | P3 — İptal aday |

---

## 7. Kullanıcı Deneyimi Akışları

### 7.1 Akış: Doğal Dil Sepet → Optimizasyon (Birincil Demo Akışı)

```
1. Kullanıcı dashboard → "Yeni Sepet"
2. Textarea'ya alışveriş listesini yazar:
   "2 ekmek, 1 lt süt, 500g beyaz peynir, 1.5kg toz deterjan, 4 elma, 1 paket çay"
3. [Loading 2-3sn] AI parse → her kaleme en iyi ürün eşleşmesi
4. Onay ekranı: "Süt → Pınar UHT 1L mi?" yes/edit
5. Sonuç ekranı:
   - Tek market en ucuz: A101 → 287 TL
   - 2 market kombinasyonu: A101 + Şok → 248 TL (%14 tasarruf)
   - "A101'e git" / "Şok'a git" butonları (utm linkler)
6. [Sepeti kaydet] butonu → modal "Sepet adı?"
```

### 7.2 Akış: Fiş OCR (Demo Wow Anı)

```
1. Dashboard → "Fiş Yükle"
2. Fotoğraf seç/drag-drop
3. [Loading 3-5sn] Gemini Vision parse
4. Sonuç: "Migros — 28 kalem, toplam 412.50 TL"
5. Kalem listesi + barkod eşleşmesi yan yana
6. "Kaydet" → satın alma kaydedildi
7. CTA: "Aynı sepeti A101'den alsaydın 67 TL daha az ödüyordun"
```

### 7.3 Akış: AI Asistan Sorgusu

```
1. Dashboard → Asistan tab
2. Input: "Bu ay neden daha fazla harcadım?"
3. Stream cevap (Gemini Flash):
   "Bu ay 1.840 TL harcadın, geçen ay 1.620 TL. Fark 220 TL.
   En çok artan kategori süt ürünleri (+%18). Pınar Süzme Peynir
   geçen ay 109 TL idi, bu ay 135 TL aldın. Daha ucuz alternatif
   olarak Tahsildaroğlu 500g 95 TL'den..."
```

---

## 8. Teknik Mimari

### 8.1 Stack Özeti

| Katman | Teknoloji | Sürüm |
|---|---|---|
| Frontend | Next.js (App Router) | 16 |
| UI | Tailwind CSS + shadcn/ui | v4 |
| ORM | Drizzle | latest |
| DB | Neon Postgres (serverless) | - |
| Auth | NextAuth v5 (Auth.js) + Google Provider + Drizzle Adapter | latest |
| LLM SDK | Vercel AI SDK + `@ai-sdk/google` | latest |
| LLM | Gemini 2.5 Flash + Flash-Lite (free tier) | - |
| Cache | Upstash Redis (camgoz API) | - |
| Hosting | Vercel (Hobby + Fluid Compute) | - |
| Paket Yöneticisi | pnpm | - |

### 8.2 Yüksek Seviye Mimari

```
┌─────────────────────┐
│   Browser (Next.js) │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Vercel Edge/Node   │
│  - Server Actions   │
│  - Route Handlers   │
└──┬─────┬─────┬──────┘
   │     │     │
   │     │     ├──────► Gemini API (Flash, Flash-Lite)
   │     │     │
   │     │     └──────► camgoz.net API
   │     │              (cache: Upstash Redis)
   │     │
   │     └────────────► Neon Postgres
   │                    (Drizzle ORM)
   │
   └──────────────────► NextAuth v5 (Google OAuth)
                        Sessions in Neon (Drizzle adapter)
```

### 8.3 Runtime Stratejisi

| Endpoint | Runtime | Sebep |
|---|---|---|
| Ürün arama, fiyat karşılaştırma | Edge | Düşük gecikme, neon-http edge'de çalışır |
| Sepet CRUD | Edge | Hafif DB sorgular |
| LLM çağrıları (AI SDK) | Node.js | Streaming + AI SDK Node'da daha stabil |
| Fiş OCR | Node.js (300s timeout) | Vision çağrıları uzun sürebilir |
| Cron — fiyat senkronizasyonu | Node.js | Batch işlem |

---

## 9. Veri Modeli

### 9.1 Drizzle Şema Taslağı

```typescript
// ─── NextAuth v5 (Auth.js) Drizzle Adapter Tabloları ───
// Bu 4 tablo @auth/drizzle-adapter tarafından zorunlu kılınır.

users: {
  id: text (PK)             // NextAuth UUID üretir
  name: text?
  email: text (UNIQUE)
  emailVerified: timestamp?
  image: text?              // Google profil resmi
}

accounts: {
  userId: text (FK → users.id, CASCADE)
  type: text                // 'oauth'
  provider: text            // 'google'
  providerAccountId: text
  refresh_token: text?
  access_token: text?
  expires_at: integer?
  token_type: text?
  scope: text?
  id_token: text?
  session_state: text?
  // PK: (provider, providerAccountId)
}

sessions: {
  sessionToken: text (PK)
  userId: text (FK → users.id, CASCADE)
  expires: timestamp
}

verificationTokens: {
  identifier: text
  token: text
  expires: timestamp
  // PK: (identifier, token)
}

// ─── Sepet Custom Tabloları ───

households: {
  id: uuid (PK)
  name: text                // "Çalış Ailesi"
  ownerId: text (FK → users.id)
  createdAt: timestamp
}

// camgoz cache
products: {
  id: uuid (PK)
  barcode: text (UNIQUE, INDEX)
  name: text
  brand: text?
  category: text?
  imageUrl: text?
  lastFetchedAt: timestamp
}

price_snapshots: {
  id: uuid (PK)
  productId: uuid (FK)
  marketName: text
  price: numeric(10,2)
  inStock: boolean
  marketUrl: text?
  capturedAt: timestamp (INDEX)
}

// kullanıcı sepetleri
baskets: {
  id: uuid (PK)
  userId: text (FK → users.id)
  householdId: uuid (FK)
  name: text
  createdAt: timestamp
}

basket_items: {
  id: uuid (PK)
  basketId: uuid (FK)
  productId: uuid (FK)
  quantity: numeric(8,3)
  unit: enum('adet', 'kg', 'g', 'l', 'ml', 'paket')
  // optimizasyon zamanı snapshot
  bestPriceAtCreation: numeric(10,2)?
  bestMarketAtCreation: text?
}

// fiş OCR'dan gelen alışveriş kayıtları
purchases: {
  id: uuid (PK)
  userId: text (FK → users.id)
  householdId: uuid (FK)
  marketName: text
  purchaseDate: date
  totalAmount: numeric(10,2)
  receiptImageUrl: text?
  ocrSourceModel: text  // "gemini-2.5-flash"
  createdAt: timestamp
}

purchase_items: {
  id: uuid (PK)
  purchaseId: uuid (FK)
  productId: uuid? (FK — eşleşme bulunamayabilir)
  rawName: text  // OCR'dan ham gelen
  quantity: numeric(8,3)
  unitPrice: numeric(10,2)
  totalPrice: numeric(10,2)
}
```

### 9.2 İndeks Stratejisi

- `products.barcode` UNIQUE INDEX — arama için
- `price_snapshots.productId, capturedAt DESC` — son fiyatları çekmek
- `price_snapshots.marketName, productId` — market filtresi
- `purchases.userId, purchaseDate DESC` — kullanıcı geçmişi

---

## 10. Dış Servis Entegrasyonları

### 10.1 camgoz.net API

- **Base URL**: `https://camgoz.net/api/external/`
- **Endpoint kullanımı**: `/search` — barkod veya isim ile sorgu
- **Auth**: Bireysel kullanım için ücretsiz (key gerekiyorsa demo öncesi al)
- **Rate limit**: Belirtilmemiş — savunmacı yaklaşım: Upstash Redis ile **TTL 12 saat** cache
- **Hata yönetimi**: 429/timeout durumunda cache'den eski veriyi serv et + UI'da "veri X saat önce güncellenmiş" rozeti

### 10.2 Gemini API

- **SDK**: Vercel AI SDK + `@ai-sdk/google`
- **Auth**: `GOOGLE_GENERATIVE_AI_API_KEY` (Google AI Studio'dan ücretsiz)
- **Model dağılımı**:

| İşlem | Model | Free Tier RPM/RPD |
|---|---|---|
| Sepet parse | `gemini-2.5-flash-lite` | 15 / 1.000 |
| Fiş OCR (vision) | `gemini-2.5-flash` | 10 / 250 |
| AI asistan reasoning | `gemini-2.5-flash` | 10 / 250 |
| Alternatif yorumlama | `gemini-2.5-flash-lite` | 15 / 1.000 |

- **Streaming**: AI SDK `streamText` + `useChat` hook'u
- **Structured output kısıtı**: Zod şemalarında `union`, `discriminatedUnion`, `refine` kullanma — Gemini OpenAPI 3.0 subset destekli
- **Free tier uyarısı**: Promptlar Google tarafından eğitim için kullanılabilir → gizlilik politikasında belirtilecek

### 10.3 Upstash Redis (Cache)

- **Kullanım**: camgoz API yanıtlarını cache'leme
- **Anahtar deseni**: `camgoz:product:{barcode}` ve `camgoz:search:{normalizedQuery}`
- **TTL**: 12 saat
- **Free tier**: 10K request/gün — hackathon için yeter

### 10.4 Google OAuth (NextAuth Provider)

- **Provider**: `next-auth/providers/google`
- **Adapter**: `@auth/drizzle-adapter` — sessions Neon'da tutulur
- **Auth tabloları**: users, accounts, sessions, verificationTokens (Auth.js standardı)
- **Setup**:
  - Google Cloud Console → OAuth 2.0 Client ID oluştur
  - Authorized redirect URI: `https://<vercel-url>/api/auth/callback/google` (prod) ve `http://localhost:3000/api/auth/callback/google` (dev)
  - Scope: `openid email profile` (default)
- **Env değişkenleri**: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `AUTH_URL`
- **Session stratejisi**: Database (adapter ile uyumlu) — JWT alternatifi düşünüldü ama hane verisi paylaşımı senaryosunda DB session daha temiz
- **Edge uyumu**: Auth check'leri middleware'de, `auth()` çağrısı server component'lerde
- **Hackathon avantajı**: Form/şifre/e-mail doğrulama UI'sı yazılmıyor, jüri tek tıkla giriş yapıyor

---

## 11. AI / LLM Stratejisi

### 11.1 Model Yönetim İlkeleri

1. **Hesaplamalar LLM'e yıkılmaz**. Cross-market optimizasyon = SQL. LLM sadece "anlama" ve "açıklama" katmanında kullanılır.
2. **En ucuz model varsayılan**. Flash-Lite default; reasoning veya vision gerekiyorsa Flash'a yükselt.
3. **Structured output zorunlu** parse işlemlerinde — string parse'ı yerine `generateObject` + Zod.
4. **Streaming** kullanıcıya görünen tüm AI yanıtlarında — algılanan gecikme düşürme.
5. **Fallback**: API hatası durumunda kullanıcıya "AI şu an yoğun, manuel devam edebilirsiniz" mesajı, çökmeden devam.

### 11.2 Prompt Mühendisliği Notları

- **Sistem prompt'ları Türkçe** — Gemini multilingual ama Türkçe örnekler verirken Türkçe instruction daha tutarlı sonuç veriyor.
- **Few-shot örnekler** parse promptlarında (özellikle birim dönüşümleri için: "1 lt süt" → quantity=1, unit="l").
- **Sıcaklık (temperature)**: parse işleri için 0.1, asistan sohbeti için 0.7.

---

## 12. Fonksiyonel Olmayan Gereksinimler

### 12.1 Performans

| Metrik | Hedef |
|---|---|
| Ürün arama p95 (cache hit) | < 200ms |
| Ürün arama p95 (cache miss) | < 1.5sn |
| Sepet optimizasyonu p95 | < 500ms |
| Fiş OCR p95 (toplam) | < 8sn |
| AI asistan ilk token | < 1.5sn |

### 12.2 Güvenlik

- Tüm secret'lar Vercel env değişkenlerinde (Git'e asla commit edilmez)
- NextAuth v5 ile httpOnly + secure + sameSite cookie session
- Şifre yönetimi yok — kimlik doğrulama Google'a delege ediliyor (saldırı yüzeyi azaltma)
- Google OAuth `state` ve PKCE NextAuth tarafından otomatik
- API rate limiting — Upstash ile basit IP bazlı throttle (stretch)
- Kullanıcı verisi Neon'da, satır seviyesinde `userId` filtreleme her sorguda
- Vercel env: `AUTH_SECRET` mutlaka rastgele 32+ karakter (üretim ile dev için farklı)

### 12.3 Kullanılabilirlik

- Tamamen Türkçe UI
- Mobile-first responsive (haftalık alışveriş listesi telefonda yazılır)
- Loading state'ler her async işlem için (skeleton veya spinner)
- Hata mesajları kullanıcı dostu (teknik stacktrace değil)

### 12.4 Erişilebilirlik

- Hackathon için hedef: temel WCAG (klavye navigasyonu, kontrast, alt-text görüntülerde)
- Stretch: ekran okuyucu testi

---

## 13. Risk ve Hafifletme Stratejileri

| Risk | Olasılık | Etki | Hafifletme |
|---|---|---|---|
| camgoz API'si demo gününde down | Düşük | Yüksek | Upstash cache + offline demo data fallback |
| Gemini free tier rate limit demo'da yenir | Orta | Yüksek | Demo öncesi sahne arkasında cache'lenmiş senaryo, çoklu API key |
| Fiş OCR doğruluğu düşük çıkar | Orta | Orta | Her zaman kullanıcı düzeltme adımı; perfeksiyon değil "büyük ölçüde otomatik" pazarlanır |
| Vercel cold start sunum esnasında uzar | Düşük | Düşük | Demo öncesi 2-3 ön ısınma çağrısı |
| Doğal dil parse Türkçe ürünlerde yanılır | Yüksek | Orta | Few-shot promptlar + onay/düzeltme adımı zorunlu UX akışında |
| Ekipte teknik bilgi farkı | Orta | Orta | İlk 6 saatte herkes setup'ı bitirmiş olmalı, pair programming |
| 48 saat scope aşılır | Yüksek | Yüksek | Stretch özelliklere asla 36. saatten sonra başlama |

---

## 14. Zaman Çizelgesi (48 Saat)

| Saat | Aşama | Çıktı |
|---|---|---|
| 0–6 | **Setup** | Repo, Next.js + Drizzle + Neon + AI SDK + NextAuth, Google Cloud OAuth Client ID, deploy edilmiş boş Vercel |
| 6–14 | **Çekirdek 1** | Google sign-in + onboarding (hane adı), ürün arama API hazır, manuel sepet ekleme/silme |
| 14–22 | **Çekirdek 2** | Cross-market optimizasyon SQL'i, sepet kaydetme, kayıtlı sepet listesi |
| 22–30 | **Wow Anı** | Fiş OCR — Gemini Vision entegrasyonu + onay ekranı |
| 30–36 | **Görünür Değer** | Doğal dil sepet parse, kişisel enflasyon grafiği, AI asistan |
| 36–42 | **Polish** | UI temizliği, hata state'leri, loading'ler, demo senaryosu prep |
| 42–48 | **Sunum** | Slayt, demo provası, son düzeltmeler |

**Kontrol noktaları**:
- **24. saat**: En azından Çekirdek özellikleri (1-4) tamamen çalışıyor olmalı
- **36. saat**: Stretch'e bakmaya başlanabilir; aksi halde polish'e geç
- **42. saat**: Yeni özellik **eklenmez**, sadece bug fix

---

## 15. Demo Senaryosu (4 Dakika)

```
[0:00–0:30] Problem ve ürün tanıtımı
[0:30–1:30] Doğal dil sepet → optimizasyon (canlı)
            "Hane sepetimi yazıyorum, AI ürünleri eşleştiriyor,
             3 saniyede A101+Şok kombinasyonu 64 TL tasarruf
             gösteriyor."
[1:30–2:30] Fiş OCR (canlı, telefon kamerasıyla)
            "Cebimden çıkardığım Migros fişini fotoğraflıyorum,
             3 saniyede 28 kalem otomatik eşleşmiş geliyor."
[2:30–3:15] Kişisel enflasyon grafiği + AI asistan
            "Bu ay neden daha fazla harcadım?" sorusuna
             veriden gelen cevap.
[3:15–3:45] Teknik mimari ve free tier çalıştığının ispatı
[3:45–4:00] Kapanış ve soru-cevap çağrısı
```

---

## 16. Açık Sorular ve Varsayımlar

### 16.1 Açık Sorular

1. camgoz.net rate limit'i nedir? Hackathon öncesi ekibe e-mail atılacak.
2. Gemini Pacific Time gece yarısı reset → demo TR saatiyle 10:00'dan önceyse riskli, sunum saati netleşmeli.
3. Hackathon kuralları kapsamında "user data" ile ilgili kısıt var mı? Free tier eğitim verisi maddesi etkiler mi?

### 16.2 Varsayımlar

- A1: Demo internet bağlantısı yeterli ve stabil olacak
- A2: Jüri Türkçe alışveriş verisi gösteriminden etkilenmesi (Türkiye odaklı yarışma)
- A3: Hackathon süresinde ekip 2-4 kişi (PRD bu varsayıma göre)
- A4: Vercel/Neon/Gemini'de sunum gününde major outage olmayacak

---

## 17. Kapsam Dışı (Açıkça)

Aşağıdakiler **bu hackathon için kapsamı kasıtlı olarak dışında tutulmuştur**:

- ❌ Ödeme entegrasyonu, gerçek satın alma
- ❌ Native mobil uygulama (iOS/Android)
- ❌ Stok takibi, sipariş yönetimi
- ❌ B2B / KOBİ özellikleri
- ❌ Yurtdışı pazarlar
- ❌ Sosyal özellikler (paylaşım, takip)
- ❌ Gerçek zamanlı bildirim (push, sms)
- ❌ Çoklu dil desteği (sadece Türkçe)
- ❌ Beslenme/diyet analizi
- ❌ Reçete oluşturma

---

## 18. Ek — Faydalı Linkler

- camgoz.net Swagger: https://camgoz.net/swagger
- Gemini API Free Tier: https://ai.google.dev/gemini-api/docs/rate-limits
- Vercel AI SDK + Google: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
- Drizzle + Neon Setup: https://neon.com/guides/drizzle-local-vercel
- Auth.js (NextAuth v5) Docs: https://authjs.dev
- Auth.js Drizzle Adapter: https://authjs.dev/getting-started/adapters/drizzle
- Google Cloud OAuth Setup: https://developers.google.com/identity/protocols/oauth2
- Vercel Fluid Compute: https://vercel.com/docs/functions/limitations

---

## 19. Onay ve Versiyonlama

| Versiyon | Tarih | Yazar | Değişiklik |
|---|---|---|---|
| 0.1 | 10 May 2026 | Can | İlk taslak (chat brainstorm) |
| 1.0 | 10 May 2026 | Can | Onaylı hackathon scope |
| 1.1 | 10 May 2026 | Can | Auth: Better Auth → NextAuth v5 + Google OAuth; veri modeli ve gereksinimler güncellendi |

---

**Bu dokümandan sonraki adım**: Drizzle şemasının kodlanması ve auth + ürün arama akışının ilk implementasyonu.
