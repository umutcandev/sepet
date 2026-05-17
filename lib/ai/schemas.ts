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
      "Bu ürün için camgoz aramasına gönderilecek normalize Türkçe sorgu. Marka, birim ve miktar bilgisi içermez. Ör. 'beyaz peynir', 'toz deterjan', 'uht süt'.",
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
})

export const MarketAllocationSchema = z.object({
  market: z.string(),
  productBarcode: z.string(),
  productName: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  lineTotal: z.number(),
})

export const SingleMarketResultSchema = z.object({
  market: z.string(),
  total: z.number(),
  itemCount: z.number(),
  missingItemCount: z.number(),
  missingItemNames: z.array(z.string()).default([]),
  isFullCoverage: z.boolean(),
})

export const TwoMarketComboResultSchema = z.object({
  markets: z.array(z.string()),
  total: z.number(),
  savingsTL: z.number(),
  savingsPct: z.number(),
  allocation: z.array(MarketAllocationSchema),
})

export const OptimizationSummarySchema = z.object({
  singleMarket: SingleMarketResultSchema,
  twoMarketCombo: TwoMarketComboResultSchema,
  currency: z.literal("TRY"),
  totalItems: z.number(),
})

export const MatchedProductSchema = z.object({
  barcode: z.string(),
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
  sourceUrl: z.string().nullable(),
})

export const MatchResultSchema = z.object({
  rawName: z.string(),
  searchQuery: z.string(),
  quantity: z.number(),
  unit: z.enum(UNIT_VALUES),
  bestMatch: MatchedProductSchema.nullable(),
  marketPrices: z.array(MarketPriceEntrySchema),
  alternatives: z.array(MatchedProductSchema),
  lookupStatus: z.enum(["ok", "no_match", "api_quota", "api_error"]),
  errorMessage: z.string().nullable(),
  // Eşleşti ama ham isimde belirtilen boyut/varyant API'de yoktu — farklı
  // boyutlu aynı ürünle eşleştirildi. Bu kalemde tasarruf hesabı yapılmaz.
  sizeMismatch: z.boolean(),
})

// lookupProducts içindeki LLM seçim adımının batch çıktısı.
export const MatchSelectionSchema = z.object({
  selections: z.array(
    z.object({
      itemIndex: z.number(),
      matchedBarcode: z.string().nullable(),
      sizeMismatch: z.boolean(),
      reason: z.string(),
    }),
  ),
})

export type ParsedItem = z.infer<typeof ParsedItemSchema>
export type BasketDraft = z.infer<typeof BasketDraftSchema>
export type MatchResult = z.infer<typeof MatchResultSchema>
export type MatchSelection = z.infer<typeof MatchSelectionSchema>
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
      "Bu ürün için camgöz aramasına gönderilecek normalize Türkçe sorgu. Marka, birim, miktar İÇERMEZ. Ör. 'beyaz peynir', 'uht süt'. 2-3 kelime ideal.",
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

export const ReceiptComparisonItemSchema = z.object({
  rawName: z.string(),
  receiptUnitPrice: z.number().nullable(),
  receiptTotalPrice: z.number().nullable(),
  matchedBarcode: z.string().nullable(),
  matchedName: z.string().nullable(),
  bestMarket: z.string().nullable(),
  bestPrice: z.number().nullable(),
  bestUrl: z.string().nullable(),
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
  totalReceiptAmount: z.number(),
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
