import { z } from "zod"

export const UNIT_VALUES = ["adet", "kg", "g", "l", "ml", "paket"] as const
export type Unit = (typeof UNIT_VALUES)[number]

export const ParsedItemSchema = z.object({
  name: z
    .string()
    .describe("Kullanıcının yazdığı ham ürün adı, ör. '500g beyaz peynir'"),
  quantity: z.number().describe("Miktar. '1.5kg' için 1.5, '2 paket' için 2."),
  unit: z
    .enum(UNIT_VALUES)
    .describe("Birim. Belirsizse 'adet' kullan."),
  searchQuery: z
    .string()
    .describe(
      "Bu ürün için market arama API'sine gönderilecek normalize Türkçe sorgu. Marka, birim ve miktar bilgisi içermez. Ör. 'beyaz peynir', 'toz deterjan', 'uht süt'.",
    ),
  // Aramaya GİRMEYEN tercih: "konserve olmasın", "cam şişe olsun". Arama
  // sorgusuna yazılsa marketfiyati kelimeleri AND'lediği için sonuç sıfıra
  // düşerdi; bu yüzden yalnızca eşleştirme modeline ayrı satır olarak gider.
  // Sonradan eklendi: eski taslaklarda ve fiş kalemlerinde yok.
  note: z
    .string()
    .nullish()
    .describe(
      "Kullanıcının bu kalem için arama terimi OLMAYAN tercihi ya da itirazı, kısa Türkçe (ör. 'konserve olmasın', 'cam şişe olsun'). Yoksa null.",
    ),
})

export const BasketDraftSchema = z.object({
  items: z.array(ParsedItemSchema),
  chatResponse: z
    .string()
    .nullable()
    .describe(
      "items boşsa kullanıcıya bağlama uygun kısa Türkçe cevap (selam ver, yetenekleri söyle, yönlendir). items doluysa null.",
    ),
  // Asistanın kalemlerin üstüne yazdığı cümle için ("Peynirli börek için 5
  // malzeme hazırladım"). Bu iki alan sonradan eklendi; eski kayıtlarda
  // yoklar ama yalnızca o turun metni üretilirken okunuyorlar.
  dishName: z
    .string()
    .nullable()
    .describe(
      "Malzemeleri çıkarılan yemeğin/içeceğin küçük harfle adı (ör. 'peynirli börek'). Yemek modu dışında null.",
    ),
  revision: z
    .boolean()
    .describe(
      "Kalemler önceki konuşmada hazırlanan listenin güncellenmiş hali ise true, aksi halde false.",
    ),
})

export const MarketAllocationSchema = z.object({
  market: z.string(),
  // Kullanıcının yazdığı ham kalem adı (ör. "tavuk göğüs") — döküm gösterimi için.
  rawName: z.string().default(""),
  productId: z.string(),
  productName: z.string(),
  // Tek paketin gerçek raf fiyatı.
  unitPrice: z.number(),
  // Alınacak tam paket sayısı (≥1).
  quantity: z.number(),
  // unitPrice × quantity — gerçek tutar (oran-orantı yok).
  lineTotal: z.number(),
  // İstenen boyut/miktar bulunamadı, farklı boyutlu ürünle eşleşti. Eski
  // kayıtlarda yok → default. UI'da "Farklı Boyut" rozeti için.
  sizeMismatch: z.boolean().default(false),
  // Bu kalemin fiyatının alındığı şube (depo) adı — UI'da "fiyat kaynağı" bilgi
  // balonu için. Eski kayıtlarda yok → nullable + default.
  depotName: z.string().nullable().default(null),
  // Bu markette alınan ürünün görseli — Sepet Özeti dökümündeki küçük resim.
  // Kalem marketten markete farklı ürüne çözülebildiği için görsel de kaleme
  // değil bu satırın ürününe aittir. Eski kayıtlarda yok → nullable + default.
  imageUrl: z.string().nullable().default(null),
  // Satırın ait olduğu kalemin `matches` içindeki sırası. Ham ad tekil değil
  // (iki ayrı "süt" olabilir); Sepet Özeti'nden ürün değiştirirken hangi
  // kalemin düzenlendiğini bu söyler. Eski kayıtlarda yok.
  itemIndex: z.number().optional(),
})

export const SingleMarketResultSchema = z.object({
  market: z.string(),
  total: z.number(),
  itemCount: z.number(),
  missingItemCount: z.number(),
  missingItemNames: z.array(z.string()).default([]),
  isFullCoverage: z.boolean(),
  // Bu markette karşılanan kalemlerin dökümü (UI'da "hangi kalemler" listesi).
  allocation: z.array(MarketAllocationSchema).default([]),
})

export const TwoMarketComboResultSchema = z.object({
  markets: z.array(z.string()),
  total: z.number(),
  savingsTL: z.number(),
  savingsPct: z.number(),
  // `singleMarket.allocation` ile AYNI kural: alan sonradan eklendi, ondan önce
  // kaydedilmiş sepetlerde yok. Default olmadan zorunlu kalınca `parseSummary`
  // tüm özeti düşürüyordu — kayıtta duran toplamlar, marketler ve tasarruf da
  // beraberinde. Döküm yoksa boş liste; özet ayakta kalır.
  allocation: z.array(MarketAllocationSchema).default([]),
})

export const OptimizationSummarySchema = z.object({
  singleMarket: SingleMarketResultSchema,
  twoMarketCombo: TwoMarketComboResultSchema,
  currency: z.literal("TRY"),
  totalItems: z.number(),
})

export const MatchedProductSchema = z.object({
  productId: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  category: z.string().nullable(),
  imageUrl: z.string().nullable(),
  averagePrice: z.number().nullable(),
  minPrice: z.number().nullable(),
  maxPrice: z.number().nullable(),
  marketCount: z.number(),
})

export const MarketPriceEntrySchema = z.object({
  market: z.string(),
  price: z.number(),
  // Fiyatın alındığı şube (depo) adı. Eski kayıtlarda yok → nullable + default.
  depotName: z.string().nullable().default(null),
})

// Optimizasyonun market-bilinçli girdisi: bir kalem için BİR markette, kabul
// edilen adaylar arasından o markette en hesaplı seçenek. Aynı kalem farklı
// marketlerde farklı ürüne (productId) çözülebilir — tek market / iki market
// kombinasyonlarının doğru kurulabilmesi için kritik.
export const MarketOptionSchema = z.object({
  market: z.string(),
  productId: z.string(),
  productName: z.string(),
  // Seçilen ürünün gerçek raf fiyatı (tek paket).
  packagePrice: z.number(),
  // İstenen miktarı karşılamak için alınacak tam paket sayısı (≥1). Eski
  // kayıtlarda yok → default 1.
  packsNeeded: z.number().default(1),
  // Optimizasyonda kullanılan GERÇEK maliyet: packsNeeded × packagePrice. Oran-
  // orantıyla türetilmiş kesirli bir fiyat değildir.
  effectiveCost: z.number(),
  // "7,08 ₺/Adet" gibi birim fiyat etiketi (varsa).
  unitPriceLabel: z.string().nullable(),
  // Seçilen ürünün fiyatının alındığı şube (depo) adı. Eski kayıtlarda yok.
  depotName: z.string().nullable().default(null),
  // Seçilen ürünün görseli; dökümdeki satıra taşınır. Eski kayıtlarda yok.
  imageUrl: z.string().nullable().default(null),
  // BU ürünün istenen boyuttan farklı olup olmadığı. Kalem marketten markete
  // farklı ürüne çözüldüğü için rozet de ürüne aittir. Eski kayıtlarda yok →
  // tüketici kalemin `sizeMismatch`ine düşer.
  sizeMismatch: z.boolean().optional(),
})

export const MatchSelectionStateSchema = z.object({
  // Aday havuzunu getiren arama (takma ad ya da genelleştirme olabilir, bkz.
  // findFirstHit). Havuz aynı sorguyla yeniden çekilir.
  poolQuery: z.string(),
  // Asistanın kabul ettiği ürünler (market fiyatı olanlar).
  aiAcceptedProductIds: z.array(z.string()),
  // Eşleştirme modelinin kalem düzeyindeki "istenen boyut yok" işareti. Adetli
  // isteklerde boyut kararını bu verir (bkz. sizeFit); kullanıcı ürün
  // değiştirince kararın aynı kalması için saklanır.
  aiSizeMismatch: z.boolean(),
  // Kullanıcının Sepet Özeti'nden seçtiği ürünler. Doluysa optimizasyon bu
  // kümeyle kurulur; null → asistanın seçimi geçerli.
  userAcceptedProductIds: z.array(z.string()).nullable(),
})

export const MatchResultSchema = z.object({
  rawName: z.string(),
  searchQuery: z.string(),
  quantity: z.number(),
  unit: z.enum(UNIT_VALUES),
  bestMatch: MatchedProductSchema.nullable(),
  // Temsilci ürünün (bestMatch) market fiyatları — UI gösterimi için.
  marketPrices: z.array(MarketPriceEntrySchema),
  // Market-bilinçli optimizasyon girdisi. Eski kayıtlarda olmayabilir → default.
  marketOptions: z.array(MarketOptionSchema).default([]),
  alternatives: z.array(MatchedProductSchema),
  lookupStatus: z.enum(["ok", "no_match", "api_quota", "api_error"]),
  errorMessage: z.string().nullable(),
  // Eşleşti ama ham isimde belirtilen boyut/varyant API'de yoktu — farklı
  // boyutlu aynı ürünle eşleştirildi. Bu kalemde tasarruf hesabı yapılmaz.
  sizeMismatch: z.boolean(),
  // Eşleşmeyen kalem için marketlerde sonuç verdiği doğrulanmış alternatif
  // arama terimi ("börek yufkası" → "yufka"). Eşleştirilemeyen Ürünler
  // kartındaki "… mı demek istedin?" önerisi. Eski kayıtlarda yok.
  suggestedQuery: z.string().nullable().optional(),
  // Kalemin tercih notu (bkz. ParsedItemSchema.note). Eski kayıtlarda yok.
  note: z.string().nullable().optional(),
  // Ürün kümesinin nasıl seçildiği. Sepet Özeti'nden ürün değiştirme ekranı
  // aday havuzunu bununla yeniden açar ve kullanıcının seçimini asistanınkinden
  // ayırır. Aday havuzu olmayan (eşleşmeyen) kalemlerde ve eski kayıtlarda yok.
  selection: MatchSelectionStateSchema.nullable().optional(),
})

// lookupProducts içindeki LLM seçim adımının batch çıktısı. Tek ürün yerine
// KABUL EDİLEBİLİR aday kümesini döndürür (market konsolidasyonu için), ayrıca
// UI kartı için temsilci (primary) ürünü işaretler.
export const MatchSelectionSchema = z.object({
  selections: z.array(
    z.object({
      itemIndex: z.number(),
      // UI kartı için en uygun temsilci ürün. Hiç uygun aday yoksa null.
      primaryProductId: z.string().nullable(),
      // Optimizasyonda kullanılacak TÜM kabul edilebilir adaylar (primary dahil).
      // Doğru ürün tipinin makul marka/boyut varyantları; yanlış tip/aroma/koli HARİÇ.
      acceptedProductIds: z.array(z.string()).default([]),
      sizeMismatch: z.boolean(),
      reason: z.string(),
    }),
  ),
})

// Eşleşmeyen kalemler için alternatif arama terimi önerileri (doğrulanmamış).
export const QuerySuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      itemIndex: z.number(),
      queries: z
        .array(z.string())
        .describe("En fazla 2 alternatif arama terimi, en iyisi önce. Emin değilsen boş."),
    }),
  ),
})

export type ParsedItem = z.infer<typeof ParsedItemSchema>
export type BasketDraft = z.infer<typeof BasketDraftSchema>
export type MatchResult = z.infer<typeof MatchResultSchema>
export type MarketOption = z.infer<typeof MarketOptionSchema>
export type MatchSelection = z.infer<typeof MatchSelectionSchema>
export type MatchSelectionState = z.infer<typeof MatchSelectionStateSchema>
export type OptimizationSummary = z.infer<typeof OptimizationSummarySchema>
export type MarketAllocation = z.infer<typeof MarketAllocationSchema>

// ─── Fiş OCR (Gemini Vision) ───

export const ReceiptOCRItemSchema = z.object({
  rawName: z
    .string()
    .describe("Fişte yazdığı haliyle ürün adı, ör. 'EKMEK 250G' veya 'BEYAZ PEYNIR 500G'."),
  quantity: z
    .number()
    .describe("Adet/miktar. Fişte yazmıyorsa 1.")
    .default(1),
  unit: z
    .enum(UNIT_VALUES)
    .describe("Birim. Belirsizse 'adet'.")
    .default("adet"),
  unitPrice: z
    .number()
    .nullable()
    .describe("Birim fiyat (TL). Fişte yoksa null."),
  totalPrice: z
    .number()
    .nullable()
    .describe("Bu kalemin toplam tutarı (TL). Fişte yoksa null."),
  searchQuery: z
    .string()
    .describe(
      "Bu ürün için market arama API'sine gönderilecek normalize Türkçe sorgu. Marka, birim, miktar İÇERMEZ. Ör. 'beyaz peynir', 'uht süt'. 2-3 kelime ideal.",
    ),
})

export const ReceiptOCRSchema = z.object({
  marketName: z
    .string()
    .nullable()
    .describe("Marketin adı (A101, Migros, BİM, Şok, Carrefour vb.). Net okunmuyorsa null."),
  purchaseDate: z
    .string()
    .nullable()
    .describe("Alışveriş tarihi ISO formatta YYYY-MM-DD. Net okunmuyorsa null."),
  totalAmount: z
    .number()
    .nullable()
    .describe("Fişin genel toplamı (TL). Net okunmuyorsa null."),
  items: z.array(ReceiptOCRItemSchema),
})

export const FoodIngredientsSchema = z.object({
  dishName: z
    .string()
    .describe(
      "Görselde tespit edilen yemeğin/içeceğin Türkçe adı. Ör. 'döner', 'menemen', 'sade sucuklu pizza', 'mercimek çorbası'.",
    ),
  items: z.array(ParsedItemSchema),
})

export const ImageAnalysisSchema = z.object({
  kind: z
    .enum(["receipt", "food", "unknown"])
    .describe(
      "Görsel türü. 'receipt' = market fişi/fatura. 'food' = bir yemek veya içecek fotoğrafı (hazır tabak, sandviç, içecek vb.). 'unknown' = ne fiş ne de tanınabilir bir yemek (bulanık, alakasız obje, manzara, anlaşılmaz vs.).",
    ),
  receipt: ReceiptOCRSchema.nullable().describe(
    "kind='receipt' ise fiş OCR sonucu, aksi halde null.",
  ),
  food: FoodIngredientsSchema.nullable().describe(
    "kind='food' ise tespit edilen yemek ve onun temel ham malzemeleri, aksi halde null.",
  ),
  unknownReason: z
    .string()
    .nullable()
    .describe(
      "kind='unknown' ise neden tanınmadığına dair 1 kısa Türkçe cümle (ör. 'fotoğraf bulanık', 'görselde bir yemek değil bir kedi var'). Aksi halde null.",
    ),
})

// Fiş karşılaştırması PAKET BAŞINA yapılır: `receiptUnitPrice` ile `bestPrice`
// aynı tabandadır (ikisi de tek paketin fiyatı) ve fark ikisinin arasındadır.
// Adetle çarpmak, sepet tarafındaki kuralla (bkz. lib/ai/effective-cost.ts —
// miktar fiyatı ETKİLEMEZ) ve aynı karttaki `summary` toplamlarıyla çelişirdi.
export const ReceiptComparisonItemSchema = z.object({
  rawName: z.string(),
  // Fişteki tek paket fiyatı — karşılaştırmanın fiş tarafı. OCR birim fiyatı
  // okuyamadıysa satır toplamı adede bölünerek türetilir.
  receiptUnitPrice: z.number().nullable(),
  // O satır için fişte ödenen gerçek tutar (birim × adet). Karşılaştırmaya
  // girmez; yalnızca fişin kendi toplamını kurmak için taşınır.
  receiptTotalPrice: z.number().nullable(),
  matchedProductId: z.string().nullable(),
  matchedName: z.string().nullable(),
  bestMarket: z.string().nullable(),
  // En ucuz marketteki tek paket fiyatı.
  bestPrice: z.number().nullable(),
  // receiptUnitPrice − bestPrice (negatifse 0). Farklı boyut eşleşmesinde null.
  savingsTL: z.number().nullable(),
  sizeMismatch: z.boolean(),
})

export const ReceiptStalenessSchema = z.object({
  isStale: z.boolean(),
  reason: z.enum(["date", "ratio"]).nullable(),
  ageDays: z.number().nullable(),
  ageLabel: z.string().nullable(),
  priceRatio: z.number().nullable(),
})

export const ReceiptComparisonSchema = z.object({
  items: z.array(ReceiptComparisonItemSchema),
  // DİKKAT — fişin basılı genel toplamı DEĞİL: fişteki paket fiyatlarının
  // toplamı. `totalBestAmount` ile aynı tabanda olsun diye böyle; basılı toplam
  // ayrı taşınır (receipt.totalAmount).
  totalReceiptAmount: z.number(),
  // Aynı kalemlerin bugünkü en iyi paket fiyatları toplamı.
  totalBestAmount: z.number(),
  totalSavingsTL: z.number(),
  staleness: ReceiptStalenessSchema.nullable(),
})

export type ReceiptOCR = z.infer<typeof ReceiptOCRSchema>
export type ReceiptOCRItem = z.infer<typeof ReceiptOCRItemSchema>
export type ReceiptComparison = z.infer<typeof ReceiptComparisonSchema>
export type ReceiptComparisonItem = z.infer<typeof ReceiptComparisonItemSchema>
export type ImageAnalysis = z.infer<typeof ImageAnalysisSchema>
export type FoodIngredients = z.infer<typeof FoodIngredientsSchema>

// ─── Sohbet başlığı (AI üretimi) ───

export const ChatTitleSchema = z.object({
  title: z
    .string()
    .describe(
      "3-5 kelimelik kısa Türkçe sohbet başlığı. Cümle değil, başlık. Noktalama/tırnak/emoji yok.",
    ),
})

export type ChatTitle = z.infer<typeof ChatTitleSchema>
