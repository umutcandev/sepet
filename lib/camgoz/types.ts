import { z } from "zod"

const priceHistoryEntrySchema = z.object({
  date: z.string(),
  newPrice: z.number(),
  oldPrice: z.number(),
})

const marketPriceSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  // camgöz bu opsiyonel string alanları bazen null gönderiyor — null'ı da kabul et.
  priceModified: z.string().nullish(),
  market: z.string(),
  sourceUrl: z.string().nullish(),
  location: z.string().nullish(),
  history: z.array(priceHistoryEntrySchema).nullish(),
})

export const camgozProductSchema = z.object({
  barcode: z.string(),
  brand: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  name: z.string(),
  price: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  salesUnit: z.string().nullable().optional(),
  tax: z.number().nullable().optional(),
  taxRate: z.number().nullable().optional(),
  marketCount: z.number().nullable().optional(),
  markets: z.array(marketPriceSchema).default([]),
})

export const camgozSearchResponseSchema = z.array(camgozProductSchema)

export type CamgozRawProduct = z.infer<typeof camgozProductSchema>
export type CamgozRawMarketPrice = z.infer<typeof marketPriceSchema>

export type MarketPrice = {
  market: string
  price: number
  priceModifiedAt: string | null
  sourceUrl: string | null
}

export type ProductHit = {
  barcode: string
  name: string
  brand: string | null
  category: string | null
  imageUrl: string | null
  averagePrice: number | null
  marketCount: number
  minPrice: number | null
  maxPrice: number | null
}

export type ProductDetail = ProductHit & {
  markets: MarketPrice[]
  cachedAt: string
}

const dmYHmsToIso = (input: string | undefined | null): string | null => {
  if (!input) return null
  // "17-01-2026 02:14:47" → ISO
  const m = input.match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/,
  )
  if (!m) return null
  const [, dd, mm, yyyy, hh, mi, ss] = m
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`).toISOString()
}

export function normalizeMarket(raw: CamgozRawMarketPrice): MarketPrice {
  return {
    market: raw.market,
    price: raw.price,
    priceModifiedAt: dmYHmsToIso(raw.priceModified),
    sourceUrl: raw.sourceUrl ?? null,
  }
}

export function toProductDetail(
  raw: CamgozRawProduct,
  cachedAt = new Date().toISOString(),
): ProductDetail {
  const markets = (raw.markets ?? []).map(normalizeMarket)
  markets.sort((a, b) => a.price - b.price)
  const prices = markets.map((m) => m.price)
  return {
    barcode: raw.barcode,
    name: raw.name,
    brand: raw.brand ?? null,
    category: raw.category ?? null,
    imageUrl: raw.imageUrl ?? null,
    averagePrice: raw.total ?? raw.price ?? null,
    marketCount: markets.length,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    markets,
    cachedAt,
  }
}

export function toProductHit(detail: ProductDetail): ProductHit {
  return {
    barcode: detail.barcode,
    name: detail.name,
    brand: detail.brand,
    category: detail.category,
    imageUrl: detail.imageUrl,
    averagePrice: detail.averagePrice,
    marketCount: detail.marketCount,
    minPrice: detail.minPrice,
    maxPrice: detail.maxPrice,
  }
}
