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
})

export type ParsedItem = z.infer<typeof ParsedItemSchema>
export type BasketDraft = z.infer<typeof BasketDraftSchema>
export type MatchResult = z.infer<typeof MatchResultSchema>
export type OptimizationSummary = z.infer<typeof OptimizationSummarySchema>
export type MarketAllocation = z.infer<typeof MarketAllocationSchema>
