# Gemini → Vercel AI Gateway with Gemini Geçiş Raporu

## Araştırma Özeti

### 1. Flash vs Flash Lite — Vision Farkı Gerçek mi?

İkisi de görsel (image) input alabiliyor. Ama fark şu:

| | Gemini 2.5 Flash | Gemini 2.5 Flash Lite |
|---|---|---|
| Vision/OCR kalitesi | Yüksek | Orta |
| Karmaşık görsel analiz | İyi | Sınırlı |
| Hız | Orta | Daha hızlı |
| Fiyat (input) | $0.15/1M token | $0.10/1M token |
| Fiyat (output) | $0.60/1M token | $0.40/1M token |

**Mevcut kullanım doğru:**
- `geminiFlash` → Fiş OCR (`parseReceiptImage`) — baskı kalitesi düşük, eğik yazı, Türkçe karakter içeren görsellerden veri çıkarmak zor bir görev. Flash burada anlamlı fark yaratıyor.
- `geminiFlashLite` → Metin parse + ürün eşleştirme (`parseShoppingList`, `selectMatches`) — saf metin işleme, Lite yeterli.

---

### 2. Neden Vercel AI Gateway?

#### Google AI Studio Free Tier'ın Sorunu
Google'ın ücretsiz tier'ı istek bazlı kısıtlıyor:
- Flash: **10 istek/gün**
- Flash Lite: **20 istek/gün**

Her `generateObject` çağrısı 1 istek sayıldığından hackathon jürisi günde birkaç fiş yüklese bile limit dolabilir.

#### Vercel AI Gateway'in Avantajları

| | Google Free | Google Pay-as-you-go | Vercel AI Gateway |
|---|---|---|---|
| Minimum yükleme | $0 | ~$16 (500₺) | $0 |
| Ücretsiz kredi | — | — | **$5/ay** |
| Rate limit (RPD Flash) | 10 | 10.000 | Vercel limiti yok* |
| Token fiyatı | Ücretsiz | Google liste | Google liste (%0 markup) |
| Token bazlı mı? | Hayır | Evet | **Evet** |

*Vercel kendi rate limiti uygulamıyor. Vercel'in resmi açıklaması: *"We don't place any rate limits on your queries for the AI Gateway itself."* Altta Google'ın enterprise limitleri geçerli — bireysel hesapla kıyaslanamaz ölçekte.

#### Gerçek Maliyet Tahmini (Hackathon)

Bir kullanıcının tipik bir oturumu:
- 3 fiş OCR (Flash): ~3 × $0.00033 = **$0.001**
- 5 alışveriş listesi parse (Flash Lite): ~5 × $0.00006 = **$0.0003**
- Toplam: **~$0.0013/oturum**

$5 ücretsiz kredi ≈ **~3.800 fiş OCR kapasitesi.** Hackathon için harcamanın %1'ini bile kullanmazsın.

---

## Refactoring Rehberi

Değiştirilecek yer **tek bir dosya**: `lib/ai/models.ts`

Başka hiçbir dosyaya dokunmak gerekmiyor — `tools.ts`, route handler, her şey `models.ts`'ten import aldığı için otomatik geçiyor.

---

### Adım 1 — `lib/ai/models.ts`

**Eski:**
```ts
import { createGoogleGenerativeAI } from "@ai-sdk/google"

export const GEMINI_FLASH = "gemini-2.5-flash"
export const GEMINI_FLASH_LITE = "gemini-2.5-flash-lite"

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const geminiFlash = google(GEMINI_FLASH)
export const geminiFlashLite = google(GEMINI_FLASH_LITE)
```

**Yeni:**
```ts
import { gateway } from "ai"

export const geminiFlash = gateway("google/gemini-2.5-flash")
export const geminiFlashLite = gateway("google/gemini-2.5-flash-lite")
```

`gateway` zaten `ai` paketinin (v6+) içinde geliyor — yeni paket yüklemeye gerek yok.

---

### Adım 2 — `.env` Dosyaları

`.env.local` (veya `.env`) içinde:

```bash
# Sil:
GOOGLE_GENERATIVE_AI_API_KEY=...

# Ekle:
AI_GATEWAY_API_KEY=...
```

`.env.example` içinde de aynı değişikliği yap (yorum satırını da güncelle):

```bash
# Vercel AI Gateway
AI_GATEWAY_API_KEY=
```

---

### Adım 3 — API Key Alma

1. [vercel.com/ai-gateway](https://vercel.com/ai-gateway) adresine git
2. Vercel hesabına giriş yap
3. Dashboard'dan **AI Gateway** sekmesini aç
4. API Key oluştur → `.env.local`'a yapıştır
5. İlk isteği yaptığında $5 ücretsiz kredi otomatik aktif oluyor

---

### Adım 4 — `@ai-sdk/google` Bağımlılığını Kaldır (İsteğe Bağlı)

```bash
pnpm remove @ai-sdk/google
```

`@ai-sdk/google`'a başka hiçbir yerde referans yok, güvenle kaldırılabilir.

---

### Adım 5 — Test

```bash
pnpm dev
```

Bir fiş yükle → OCR çalışıyorsa geçiş tamamdır. Vercel Dashboard'dan **AI Gateway → Usage** sekmesinde her isteği token bazlı görebilirsin.

---

## Özet

| | Önce | Sonra |
|---|---|---|
| Provider | `@ai-sdk/google` | `ai` (built-in `gateway`) |
| Auth | `GOOGLE_GENERATIVE_AI_API_KEY` | `AI_GATEWAY_API_KEY` |
| Rate limit riski | Günde 10 istek (free) | Yok |
| Maliyet (hackathon) | Ücretsiz ama kısıtlı | $5 kredi ile sınırsız pratik |
| Değişen dosya sayısı | — | **1** (`lib/ai/models.ts`) |
