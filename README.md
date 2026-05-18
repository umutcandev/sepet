<div align="center">
<img src="./public/github-banner.png" alt="Sepet — Yapay Zekâ Destekli Akıllı Alışveriş Asistanı" width="100" height="100" />
<h2>Sepet</h2>

[Canlı (trysepet.com)](https://www.trysepet.com) · [GitHub](https://github.com/umutcandev/sepet) · [Sorun Bildir](https://github.com/umutcandev/sepet/issues)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-6-000000?logo=vercel&logoColor=white)](https://sdk.vercel.ai)
[![Google Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![NextAuth.js](https://img.shields.io/badge/Auth.js-5-000000?logo=auth0&logoColor=white)](https://authjs.dev)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Neon](https://img.shields.io/badge/Neon_Postgres-00E599?logo=postgresql&logoColor=white)](https://neon.tech)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-00E9A3?logo=redis&logoColor=white)](https://upstash.com)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/products/r2/)
[![Zod](https://img.shields.io/badge/Zod-4-3068B7?logo=zod&logoColor=white)](https://zod.dev)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

</div>

## İçindekiler

- [Proje Hakkında](#proje-hakkında)
- [Çözülen Problem](#çözülen-problem)
- [Temel Yetenekler](#temel-yetenekler)
- [Agentic Mimari](#agentic-mimari)
- [Mimari Genel Bakış](#mimari-genel-bakış)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Performans ve Doğruluk Stratejisi](#performans-ve-doğruluk-stratejisi)
- [Veri Modeli](#veri-modeli)
- [Yerel Geliştirme](#yerel-geliştirme)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Proje Yapısı](#proje-yapısı)
- [Lisans](#lisans)

---

## Proje Hakkında

**Sepet**, Türkiye'deki 45'ten fazla zincir ve sanal marketin canlı fiyatlarını tek bir yapay zekâ asistanı arkasına toplayan üretken AI tabanlı bir alışveriş optimizasyon platformudur. Kullanıcı doğal dilde bir alışveriş listesi yazdığında, bir market fişinin fotoğrafını yüklediğinde veya yapmak istediği yemeğin görselini paylaştığında; Sepet bu girdiyi yapılandırılmış kalemlere dönüştürür, gerçek market kataloglarıyla eşleştirir, fiyatları çapraz karşılaştırır ve en uygun tek market ile en uygun iki market kombinasyonunu hesaplar.

Proje, kullanıcı için bir tarayıcı eklentisi veya elle fiyat takibi yerine, **doğal dil → yapılandırılmış sepet → fiyat optimizasyonu** akışını uçtan uca otomatikleştiren bir agentic sistem olarak tasarlanmıştır.

**Canlı sürüm:** <https://www.trysepet.com>

---

## Çözülen Problem

Türk tüketicisi, market enflasyonunun en yüksek olduğu kategorilerden birinde alışveriş yapıyor. Aynı marka çay veya zeytinyağı, üç farklı zincir markette yüzde otuza varan fiyat farkıyla satılabiliyor. Kullanıcının her ürünü tek tek farklı sitelerden taraması pratik değil; mevcut karşılaştırma siteleri ise yalnızca tek ürün üzerinden çalışıyor ve sepet bütününü optimize etmiyor.

**Sepet**, bu boşluğu üç temel yetenekle dolduruyor:

1. Doğal dil veya görsel girdiden yapılandırılmış sepet üretmek.
2. Sepetin tamamını bir bütün olarak en uygun market kombinasyonuna yerleştirmek.
3. Gerçek harcamayı (fiş) bugünün en iyi fiyatıyla karşılaştırarak ölçülebilir tasarruf rakamı üretmek.

---

## Temel Yetenekler

### Doğal Dil Sepeti

Kullanıcı `"2 ekmek, 1 lt süt, 500g beyaz peynir"` gibi serbest metin yazar. Sistem bu metni `ParsedItem` şemasına bölerek miktar, birim ve normalize edilmiş arama sorgusunu çıkarır. Yalın yemek veya tarif adları (`"menemen"`, `"limonata için malzemeler"`) algılandığında ise asistan ham malzeme listesini otomatik türetir.

### Fiş Fotoğrafından Otomatik OCR

Kullanıcı bir market fişinin fotoğrafını yükler. Görsel, Google Gemini 2.5 Flash'in çok modlu yeteneğiyle analiz edilir; market adı, satın alma tarihi, toplam tutar ve tek tek ürün satırları yapılandırılmış JSON olarak çıkarılır. Sistem; KDV satırları, indirim kalemleri, kasa bilgileri gibi ürün olmayan satırları filtreler ve `unitPrice × quantity ≈ totalPrice` tutarlılık kontrolü uygular.

### Yemek Görselinden Tarif Çıkarımı

Yüklenen görselde tabakta bir yemek tespit edilirse model `food.dishName` ve evde yapmak için gerekli temel malzeme listesini döner. Bu liste doğrudan sepet akışına aktarılır; kullanıcı tek tıkla bu malzemelerin en ucuz marketini görür.

### Sepet Optimizasyonu

`computeOptimization` modülü, eşleşen ürünlerin market başına fiyat matrisini gezerek iki ayrı çıkarım yapar:

- **Tek market en ucuz:** Sepetin tamamını karşılayan en düşük toplamlı tek market.
- **İki market kombinasyonu:** Olası market çiftleri üzerinde lineer arama; her kalem için iki market arasından ucuz olanı seçilerek minimum toplam üretilir, tek market sonucuna göre TL ve yüzde tasarruf hesaplanır.

### Fiş Karşılaştırma ve Eskime Tespiti

Yüklenen fişin tutarı, aynı sepetin bugünkü en iyi fiyatıyla karşılaştırılır. Tarih çok eskiyse veya tutar oranı `STALE_RATIO_THRESHOLD` üstündeyse `staleness` bayrağı işaretlenir; kullanıcıya rakamlar bilgi amaçlı sunulur, asılsız bir tasarruf vaadi yapılmaz.

### Sesli Komut Girişi

Mikrofon kaydı `audio/webm` olarak alınıp `/api/transcribe` endpoint'inde Gemini Flash Lite ile Türkçe metne çevrilir; ardından aynı doğal dil akışına beslenir.

### Barkod Tarayıcı ve Ürün Arama

`@zxing/library` ile tarayıcı içinde çalışan barkod okuyucu ve 45+ market kataloğunda canlı arama yapan bir ürün sayfası mevcuttur.

### Sepetlerim ve Fiş Geçmişi

Kullanıcının onayladığı her sepet ve analiz edilen her fiş Postgres'te kalıcı olarak saklanır; özet tutarlar (`bestSingleTotal`, `twoMarketSavingsTL`) listede önizleme olarak sunulur.

### Aylık Tasarruf ve Sepet Grafikleri

`/sepetlerim` ve `/fis-gecmisi` sayfalarında son altı ayın sepet toplamları ve tasarruf rakamları **recharts** tabanlı `MonthlyBarChart` ile görselleştirilir. Sepet detay sayfasındaki `MarketSplitDonut` ise iki market kombinasyonunda hangi alışverişin hangi markete dağıldığını donut grafikle gösterir. Toplama işlemleri `lib/charts/aggregate-monthly.ts` içindeki saf yardımcı fonksiyonla deterministik şekilde yapılır.

### Karanlık Tema

`next-themes` ile **system / light / dark** tema desteği. Tüm sayfa, kart ve grafik tokenları `globals.css` üzerinden CSS değişkenlerine bağlıdır; arka plan görselleri AVIF + WebP olarak hem aydınlık hem karanlık varyantlarda servis edilir. Tema değişimi `HeaderUserMenu`, `NavUser` ve mobil menüden yapılabilir; Sonner bildirimleri ve grafik renkleri seçilen temaya otomatik uyarlanır.

### Onboarding Akışı

Yeni kullanıcı ilk girişte 5 adımlı video destekli bir onboarding modalıyla karşılanır (doğal dil sepeti, fiş okuma, yemek görseli, barkod tarayıcı, sepet/fiş geçmişi). Tamamlama zaman damgası `users.onboardingCompletedAt` alanında saklanır; `completeOnboarding` server action'ı bu alanı güncelleyerek modalın bir daha açılmamasını sağlar. Masaüstünde `Dialog`, mobilde `Drawer` olarak responsive şekilde sunulur.

---

## Agentic Mimari

Sepet, klasik bir prompt-yanıt LLM uygulaması değildir. Asistan, **rolleri ayrılmış birden çok yapay zekâ ajanının** orkestra edildiği bir tool-calling pipeline'ı üzerinde çalışır.

```
Kullanıcı girdisi (metin / fiş / yemek görseli / ses)
            │
            ▼
   ┌────────────────────┐
   │  Mod Tespit Katmanı│  ← receiptApproval / receiptImage / basketApproval / text
   └────────┬───────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │  Ajan 1 — Parse / Vision                 │
   │  Gemini 2.5 Flash (görsel)               │
   │  Gemini 2.5 Flash Lite (metin)           │
   │  generateObject + thinkingConfig         │
   │  → BasketDraft | ImageAnalysis           │
   └────────┬─────────────────────────────────┘
            │
            ▼  (kullanıcı onayı — human-in-the-loop)
            │
   ┌──────────────────────────────────────────┐
   │  Ajan 2 — Product Lookup                 │
   │  camgöz API + Upstash Redis cache        │
   │  → her kalem için aday ürünler           │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │  Ajan 3 — Match Selection                │
   │  Gemini 2.5 Flash Lite                   │
   │  Batch LLM seçimi + sha1 cache key       │
   │  → doğru ürün + sizeMismatch bayrağı     │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │  Ajan 4 — Optimization (deterministik)   │
   │  computeOptimization()                   │
   │  → single & two-market kombinasyonu      │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │  Ajan 5 — Title & Summary                │
   │  Gemini 2.5 Flash Lite                   │
   │  → sohbet başlığı + Türkçe özet          │
   └──────────────────────────────────────────┘
```

### Agentic Tasarım Kararları

- **Model seçiminde maliyet optimizasyonu.** Görsel analizi gibi yüksek bilişsel yük gerektiren adımlar için `gemini-2.5-flash`, hızlı yapılandırma adımları (parse, match selection, başlık, transkripsiyon) için ucuz `gemini-2.5-flash-lite` kullanılır.
- **Reasoning streaming.** Parse ve görsel analizi adımlarında `thinkingConfig.includeThoughts: true` ile Gemini'nin düşünce özeti istemciye `reasoning-delta` chunk'ları olarak akıtılır; kullanıcı, modelin sepetini hangi mantıkla çıkardığını gerçek zamanlı okuyabilir.
- **Human-in-the-loop onay.** Hiçbir sepet, kullanıcı parse edilen kalemleri görüp onaylamadan fiyat aramasına gönderilmez. Bu hem maliyeti düşürür hem de yanlış yorumlanmış kalemlerin düzeltilmesini sağlar.
- **LLM seçim cache'i.** Aynı ham ad + miktar + aday kümesi tekrar geldiğinde LLM'i yeniden çağırmak yerine `sha1(payload)` anahtarıyla Redis'ten okunur (12 saatlik TTL).
- **Deterministik optimizasyon.** Asistanın "kaç TL tasarruf edersin" cevabını LLM aritmetiğine bırakmıyoruz; tek market ve iki market kombinasyonu saf TypeScript ile hesaplanır, model sadece sonucu Türkçeleştirir. Bunun başlıca sebebi, `Gemini 2.5 Flash Lite` gibi bazı güç bakımından zayıf modellerin matematik hesaplamaları yönünüdeki olası hatalarından etkilenmemektir. 
- **UI akışında transient event'ler.** Yeni bir sohbet açıldığında `data-conversation-id` ve `data-conversation-title` chunk'ları transient olarak gönderilir; sidebar, RSC refresh beklemeden anında güncellenir.

---

## Mimari Genel Bakış

```
┌──────────────────────────────────────────────────────────────────┐
│                       Next.js 16 (App Router)                    │
│                        React 19 · Turbopack                      │
├──────────────────────────────────────────────────────────────────┤
│ /                Doğal dil prompt + market avatarları            │
│ /asistan         AI Elements ile stream chat arayüzü             │
│ /asistan/[id]    Geçmiş sohbet                                   │
│ /sepetlerim      Kaydedilmiş sepetler                            │
│ /fis-gecmisi     Analiz edilmiş fişler                           │
│ /urun-ara        Barkod / metin ile katalog araması              │
├──────────────────────────────────────────────────────────────────┤
│ /api/assistant/chat   UIMessageStream — multi-agent pipeline     │
│ /api/transcribe       Gemini Flash Lite ile ses → metin          │
│ /api/receipts/upload  Cloudflare R2'ye direkt upload             │
│ /api/products/...     camgöz arama proxy + cache                 │
│ /api/auth/...         NextAuth.js v5 (Google OAuth)              │
└──────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌────────────────┐      ┌────────────────┐       ┌────────────────┐
│  Neon Postgres │      │ Upstash Redis  │       │ Cloudflare R2  │
│  Drizzle ORM   │      │ Cache + RL     │       │ Fiş görselleri │
└────────────────┘      └────────────────┘       └────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 ▼
                  ┌────────────────────────────┐
                  │  Vercel AI Gateway         │
                  │  Google Gemini 2.5 Flash   │
                  │  Google Gemini 2.5 F. Lite │
                  └────────────────────────────┘
                                 │
                                 ▼
                  ┌────────────────────────────┐
                  │   camgöz / JoJAPI          │
                  │   45+ Türk market kataloğu │
                  └────────────────────────────┘
```

---

## Teknoloji Yığını

### Çekirdek Framework

| Katman | Teknoloji | Kullanım Amacı |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | RSC, route handler, streaming UI |
| UI | **React 19** | Server / client component ayrımı |
| Dil | **TypeScript 5.9** | Uçtan uca tip güvenliği |
| Stil | **Tailwind CSS 4** + `tw-animate-css` | Utility-first, tema sistemi |
| Bileşen | **shadcn/ui** + Radix UI + Base UI | Erişilebilir primitives |
| Animasyon | **Motion** (`motion/react`) | Heading rotasyonu, onboarding step geçişleri |
| Tema | **next-themes** | System / light / dark mod, SSR uyumlu |
| Grafikler | **Recharts** | Aylık tasarruf bar grafiği, market dağılım donut grafiği |
| Form / Şema | **Zod 4** | Tüm LLM çıktılarının doğrulanması |

### Yapay Zekâ Katmanı

| Bileşen | Teknoloji |
|---|---|
| AI SDK | **Vercel AI SDK 6** (`ai`, `@ai-sdk/react`) |
| Gateway | **Vercel AI Gateway** |
| Vision + Reasoning Modeli | **Google Gemini 2.5 Flash** |
| Hafif Yapılandırma Modeli | **Google Gemini 2.5 Flash Lite** |
| Sohbet UI Primitives | **AI Elements** (`components/ai-elements/*`) |
| Markdown Stream Render | **Streamdown** + Shiki + Mermaid + CJK + Math |

### Veri Katmanı

| Servis | Rol |
|---|---|
| **Neon Postgres** (`@neondatabase/serverless`) | Birincil veritabanı — sohbet geçmişi, sepetler, fişler, ürün cache, fiyat snapshot'ları |
| **Drizzle ORM** + Drizzle Kit | Şema, migration, type-safe query |
| **Upstash Redis** (`@upstash/redis`) | camgöz cevap cache'i (12s TTL), LLM seçim cache'i, rate limit |
| **Upstash Ratelimit** | Asistan burst (10/dk) + günlük (50/gün), auth (10/dk), ürün arama (60/dk) |
| **Cloudflare R2** (`@aws-sdk/client-s3`) | Fiş görsellerinin saklanması, public CDN |

### Kimlik ve Güvenlik

| Bileşen | Teknoloji |
|---|---|
| Kimlik Doğrulama | **NextAuth.js v5 (Auth.js)** + Drizzle Adapter |
| Sağlayıcı | Google OAuth |
| Oturum | JWT strategy |
| Güvenlik Başlıkları | `lib/security/headers.ts` |

### Üçüncü Taraf Servisler

| Servis | Kullanım |
|---|---|
| **camgöz / JoJAPI** | 45+ Türk market için canlı ürün ve fiyat verisi |
| **Google Gemini API** (Vercel AI Gateway üzerinden) | LLM çağrıları |

### Geliştirme Araçları

| Araç | Rol |
|---|---|
| **pnpm** | Paket yönetimi |
| **ESLint 9** + `eslint-config-next` | Lint |
| **Prettier 3** + `prettier-plugin-tailwindcss` | Format |
| **drizzle-kit** | Migration |
| **tsx** | TypeScript script runner |

### Dağıtım

| Bileşen | Yapılandırma |
|---|---|
| Hosting | **Vercel** (Edge / Node runtime, Fluid Compute, AI Gateway entegrasyonu) |
| Asistan endpoint runtime | `nodejs`, `maxDuration: 60s` |
| Görsel formatları | AVIF + WebP fallback, `image-set()` |

---

## Performans ve Doğruluk Stratejisi

### Maliyet ve Hız

- **İki katmanlı cache.** Aynı arama sorgusu önce Redis'te aranır (`camgoz:search:...`), miss durumunda Postgres'te ürün ve fiyat snapshot'ları kontrol edilir, son çare olarak JoJAPI çağrısı yapılır. Bunun sebebi camgoz.net API servisinin credit bazlı ücretlendirmeleridir.
- **Batch LLM seçimi.** N kalem için N çağrı yerine tek bir `generateObject` çağrısında prompt'a tüm kalemler verilir; aday başına yalnızca barkod, ad, marka ve kategori gönderilerek token tüketimi minimize edilir.
- **Selektif preferred markets.** `CAMGOZ_PREFERRED_MARKETS` ile API'den dönecek market sayısı kasıtlı olarak kısılır (A101, Şok, Migros, Carrefour); 45+ market kataloğu desteklense de varsayılan optimizasyon en yaygın olanları kapsar. Bunun sebebi yine camgoz.net API servisinin credit kullanımlarını ekonomik hale getirmek içindir. Güçlü bir pricing paketi alımından sonra bu katalog tüm marketleri destekleyecek şekilde güncellenebilir.
- **Image preload.** Login arka planı, marka avatarları ve hero görselleri `<link rel="preload">` ile öncelendirilir; AVIF + WebP fallback ile bant genişliği düşürülür.
- **Cache-Control immutable.** Tüm statik medya dosyaları `public, max-age=31536000, immutable` ile servis edilir.

### Doğruluk

- **Zod-validated LLM çıktıları.** Her `generateObject` çağrısı Zod şemasına bağlıdır; şema dışı çıktı runtime hatasına döner, halüsinasyon UI'ya sızmaz.
- **Tutarlılık kontrolü.** Fiş OCR'da `unitPrice × quantity ≈ totalPrice` invariantı uygulanır; sapma olursa quantity sıfırlanır.
- **sizeMismatch bayrağı.** Aynı üründen farklı boyutla eşleşildiğinde tasarruf hesabı bilinçli olarak yapılmaz; kullanıcı yanıltılmaz.
- **Staleness algılama.** Eski tarihli fişlerde tasarruf vaat edilmez, rakamlar yalnızca bilgi amaçlı sunulur.
- **Boyut ve varyant esnekliği.** "yumurta" gibi jenerik girdilerde eşleşen 10'lu veya 30'lu paketler boyut farkı olarak işaretlenir, ama eşleştirme yine de yapılır — null dönmek yerine en yakın paket seçilir.

### Erişilebilirlik ve Mobil

- Tüm interaktif bileşenler Radix UI tabanlıdır; klavye navigasyonu ve ARIA tam desteklidir.
- Sesli giriş hem masaüstü hem mobil için ayrı bileşenlerle uyarlanır, PC'de voice-input bileşeni yerleşik ses tanıma API'ı kullanır. Ancak mobilde LLM ile desteklenir. (`voice-input-desktop`, `voice-input-mobile`).
- Barkod tarayıcı `Permissions-Policy: camera=*` başlığıyla birlikte çalışır; WASM tabanlı `zxing_reader.wasm` özel `Content-Type` ile servis edilir.

---

## Veri Modeli

Drizzle ORM ile tanımlanan ana tablolar:

| Tablo | Rol |
|---|---|
| `user`, `account`, `session`, `verificationToken` | NextAuth tabloları (`user.onboardingCompletedAt` onboarding tamamlanma zamanını tutar) |
| `product` | Barkod bazlı ürün cache (`uniqueIndex` barkod) |
| `price_snapshot` | Market bazlı fiyat geçmişi (product + market + tarih indeksli) |
| `receipt` | OCR'lanmış fiş başlıkları (en iyi market, potansiyel tasarruf, R2 key) |
| `receipt_item` | Fişin satır kalemleri (matched barcode, best price) |
| `basket` | Doğal dilden üretilip kaydedilen sepetler |
| `basket_item` | Sepet kalemleri |
| `conversation` | Asistan sohbet oturumları |
| `conversation_message` | Sohbet mesajları (parts `jsonb`, sequence indeksli) |

---

## Yerel Geliştirme

### Gereksinimler

- Node.js 20 veya üzeri
- pnpm 9 veya üzeri
- Aşağıdaki ücretsiz katmanlı servislerden hesaplar:
  - Neon (Postgres)
  - Upstash (Redis)
  - Cloudflare R2 (opsiyonel, fiş özelliği için)
  - Google Cloud (OAuth client)
  - Vercel AI Gateway
  - Camgoz.net JoJAPI (`jojapi.com/hub/api/product-barcode-api/pricing`) API anahtarı

### Kurulum

```bash
git clone https://github.com/umutcandev/sepet.git
cd sepet
pnpm install
cp .env.example .env.local
# .env.local dosyasını aşağıdaki tablodaki değerlerle doldur

pnpm db:push           # Drizzle şemasını Neon'a uygula
pnpm dev               # http://localhost:3000
```

### Komutlar

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Turbopack ile geliştirme sunucusu |
| `pnpm dev:https` | HTTPS üzerinden (kamera ve mikrofon testi için) |
| `pnpm build` | Üretim derlemesi |
| `pnpm start` | Üretim sunucusu |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier |
| `pnpm db:generate` | Migration üret |
| `pnpm db:migrate` | Migration çalıştır |
| `pnpm db:push` | Şemayı doğrudan veritabanına it |
| `pnpm db:studio` | Drizzle Studio |

---

## Ortam Değişkenleri

`.env.example` dosyasındaki tüm değerlerin doldurulması gereklidir.

| Değişken | Servis | Açıklama |
|---|---|---|
| `DATABASE_URL` | Neon Postgres | `postgres://...?sslmode=require` |
| `AUTH_SECRET` | NextAuth.js | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth | Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth | Client Secret |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway | Gemini erişimi |
| `UPSTASH_REDIS_REST_URL` | Upstash | Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Redis REST Token |
| `CAMGOZ_API_BASE` | JoJAPI | Varsayılan `https://camgoz.jojapi.net/api/external` |
| `JOJAPI_KEY` | JoJAPI | API anahtarı |
| `CAMGOZ_PREFERRED_MARKETS` | JoJAPI | Virgülle ayrılmış market listesi |
| `R2_ACCOUNT_ID` | Cloudflare R2 | Hesap ID |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 | Access Key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | Secret Key |
| `R2_BUCKET` | Cloudflare R2 | Bucket adı |
| `R2_PUBLIC_BASE_URL` | Cloudflare R2 | Public base URL (sondaki `/` olmadan) |

---

## Proje Yapısı

```
sepet/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── assistant/chat/       # Multi-agent UIMessageStream pipeline
│   │   ├── transcribe/           # Ses → metin (Gemini Flash Lite)
│   │   ├── receipts/upload/      # R2'ye direkt yükleme
│   │   ├── products/             # camgöz arama proxy + cache
│   │   └── auth/                 # NextAuth.js handler
│   ├── asistan/                  # Asistan arayüzü ve geçmiş
│   ├── sepetlerim/               # Kaydedilmiş sepetler
│   ├── fis-gecmisi/              # Analiz edilmiş fişler
│   ├── urun-ara/                 # Ürün katalog araması
│   └── page.tsx                  # Ana giriş / prompt
├── components/
│   ├── ai-elements/              # Stream chat primitives
│   ├── assistant/                # Asistan UI (kartlar, prompt, ses, dialog)
│   ├── auth/                     # Login dialog + Şartlar & Gizlilik dialogları
│   ├── charts/                   # Aylık bar chart, market split donut
│   ├── onboarding/               # Video destekli onboarding modal + host
│   ├── providers/                # ThemeProvider (next-themes)
│   ├── theme-toggle.tsx          # Tema değiştirici menü
│   ├── ui/                       # shadcn/ui bileşenleri
│   └── app-sidebar.tsx
├── lib/
│   ├── ai/
│   │   ├── models.ts             # Gemini gateway tanımları
│   │   ├── prompts.ts            # PARSE, IMAGE, MATCH, TITLE promptları
│   │   ├── schemas.ts            # Tüm Zod şemaları
│   │   ├── tools.ts              # analyzeImage, parseShoppingList, lookupProducts
│   │   └── optimize.ts           # Tek ve iki market optimizasyonu
│   ├── camgoz/                   # JoJAPI client + Redis cache
│   ├── charts/                   # aggregate-monthly toplama yardımcısı
│   ├── db/                       # Drizzle şema ve bağlantı
│   ├── markets/registry.ts       # 45+ market logo + URL registry
│   ├── storage/r2.ts             # Cloudflare R2 client
│   ├── security/                 # rate-limit, headers
│   ├── auth/                     # NextAuth session helper (onboarding flag dahil)
│   ├── actions/                  # Server actions (baskets, receipts, conversations, onboarding)
│   ├── hooks/                    # Client hooks
│   └── stores/                   # Client store'lar
├── drizzle/                      # Migration çıktıları
├── public/                       # Statik medya
├── auth.ts / auth.config.ts      # NextAuth.js v5 konfigürasyonu
├── drizzle.config.ts
├── next.config.mjs
└── package.json
```

---

## Lisans

Bu proje hackathon süresince geliştirilmiş açık kaynak bir prototiptir. Lisans detayları için depodaki ilgili dosyaya bakınız.

---

<div align="center">

**Sepet** — Türkiye'nin en uygun fiyatlı alışveriş sepeti, bir cümle uzağınızda.

<a href="https://www.trysepet.com">www.trysepet.com</a>

</div>
