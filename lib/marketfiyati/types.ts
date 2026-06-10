import { z } from "zod"
import { getMarketDisplayName } from "@/lib/markets/registry"

// ─── API response şemaları (marketfiyati ham) ───

export const mfDepotPriceSchema = z.object({
  depotId: z.string(),
  depotName: z.string().nullish(),
  price: z.number(),
  // "60,00 ₺/Lt" gibi formatlı string; "60.0" gibi sayısal değer ayrı.
  unitPrice: z.string().nullish(),
  unitPriceValue: z.number().nullish(),
  marketAdi: z.string(),
  percentage: z.number().nullish(),
  longitude: z.number().nullish(),
  latitude: z.number().nullish(),
  indexTime: z.string().nullish(),
  discount: z.boolean().nullish(),
  discountRatio: z.number().nullish(),
  promotionText: z.string().nullish(),
})

export const mfProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  brand: z.string().nullish(),
  imageUrl: z.string().nullish(),
  refinedVolumeOrWeight: z.string().nullish(),
  categories: z.array(z.string()).nullish(),
  main_category: z.string().nullish(),
  menu_category: z.string().nullish(),
  productDepotInfoList: z.array(mfDepotPriceSchema).nullish().transform((v) => v ?? []),
})

export const mfSearchResponseSchema = z.object({
  numberOfFound: z.number().nullish(),
  // 0 = barkod/ID tam eşleşme, 1 = keyword sonucu, 2 = sonuç yok
  searchResultType: z.number().nullish(),
  content: z.array(mfProductSchema).nullish().transform((v) => v ?? []),
  facetMap: z.unknown().nullish(),
})

export const mfNearestDepotSchema = z.object({
  id: z.string(),
  sellerName: z.string().nullish(),
  location: z
    .object({ lon: z.number(), lat: z.number() })
    .nullish(),
  marketName: z.string().nullish(),
  distance: z.number().nullish(),
})

export const mfNearestResponseSchema = z.array(mfNearestDepotSchema)

export const mfCategorySchema = z.object({
  name: z.string(),
  subcategories: z.array(z.string()).nullish().transform((v) => v ?? []),
})

export const mfCategoriesResponseSchema = z.object({
  content: z.array(mfCategorySchema).nullish().transform((v) => v ?? []),
})

export type MFDepotPrice = z.infer<typeof mfDepotPriceSchema>
export type MFProduct = z.infer<typeof mfProductSchema>
export type MFSearchResponse = z.infer<typeof mfSearchResponseSchema>
export type MFNearestDepot = z.infer<typeof mfNearestDepotSchema>
export type MFCategory = z.infer<typeof mfCategorySchema>

// ─── Normalize edilmiş uygulama tipleri ───

export type MarketPrice = {
  // marketAdi (ör. "a101", "migros"); registry display adına map'lenir.
  market: string
  price: number
  priceModifiedAt: string | null
  depotName: string | null
  // "60,00 ₺/Lt" gibi birim fiyat etiketi (varsa).
  unitPrice: string | null
  // Birim fiyatın baz birimine (L / kg / adet) normalize edilmiş SAYISAL değeri.
  // Farklı paket boyutlarını adil kıyaslamak için optimizasyonda kullanılır.
  // ör. ₺/Lt → "l", ₺/Kg → "kg", ₺/Adet → "adet". Türetilemezse null.
  unitPriceValue: number | null
  unitBase: "l" | "kg" | "adet" | null
}

export type ProductHit = {
  // marketfiyati'nin kısa opak ID'si (ör. "1O9J"). Eski barcode'un yerine.
  productId: string
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

/** "08.06.2026 08:19" → ISO string. Nokta ayraç, saniye yok. */
export const indexTimeToIso = (input: string | undefined | null): string | null => {
  if (!input) return null
  const m = input.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!m) return null
  const [, dd, mm, yyyy, hh, mi] = m
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00Z`).toISOString()
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * marketfiyati `unitPrice` etiketinden ("60,00 ₺/Lt", "7,08 ₺/Adet") baz birimi
 * ve ham `unitPriceValue`'yu kanonik baza (₺/L, ₺/kg, ₺/adet) çeviren çarpanı
 * çıkarır. ₺/Gr → ₺/kg (×1000), ₺/Ml → ₺/L (×1000). Tanınmayan birimde null.
 */
function parseUnitBasis(
  label: string | null | undefined,
): { base: "l" | "kg" | "adet"; factor: number } | null {
  if (!label) return null
  const slash = label.lastIndexOf("/")
  if (slash < 0) return null
  const unit = label
    .slice(slash + 1)
    .trim()
    .toLocaleLowerCase("tr-TR")
  if (unit === "lt" || unit === "l" || unit === "litre") return { base: "l", factor: 1 }
  if (unit === "ml") return { base: "l", factor: 1000 }
  if (unit === "kg") return { base: "kg", factor: 1 }
  if (unit === "gr" || unit === "g" || unit === "gram") return { base: "kg", factor: 1000 }
  if (unit === "adet") return { base: "adet", factor: 1 }
  return null
}

/**
 * Bir marketfiyati ürününü uygulama ProductDetail'ine çevirir.
 * `productDepotInfoList` aynı `marketAdi` için birden çok depo (şube)
 * içerebilir — her marka için EN UCUZ depoyu seçeriz; böylece optimizasyon
 * "marka başına tek fiyat" varsayımını korur.
 */
export function toProductDetail(
  raw: MFProduct,
  cachedAt = new Date().toISOString(),
): ProductDetail {
  const byMarket = new Map<string, MFDepotPrice>()
  for (const d of raw.productDepotInfoList ?? []) {
    const existing = byMarket.get(d.marketAdi)
    if (!existing || d.price < existing.price) byMarket.set(d.marketAdi, d)
  }

  const markets: MarketPrice[] = Array.from(byMarket.values()).map((d) => {
    const basis = parseUnitBasis(d.unitPrice)
    return {
      // Ham marketAdi ("a101", "sok", "tarim_kredi") → canonical display adı.
      market: getMarketDisplayName(d.marketAdi),
      price: d.price,
      priceModifiedAt: indexTimeToIso(d.indexTime),
      depotName: d.depotName ?? null,
      unitPrice: d.unitPrice ?? null,
      unitPriceValue:
        basis && d.unitPriceValue != null
          ? round2(d.unitPriceValue * basis.factor)
          : null,
      unitBase: basis ? basis.base : null,
    }
  })
  markets.sort((a, b) => a.price - b.price)

  const prices = markets.map((m) => m.price)
  const averagePrice = prices.length
    ? round2(prices.reduce((sum, p) => sum + p, 0) / prices.length)
    : null

  return {
    productId: raw.id,
    name: raw.title,
    brand: raw.brand ?? null,
    category: raw.main_category ?? raw.menu_category ?? null,
    imageUrl: raw.imageUrl ?? null,
    averagePrice,
    marketCount: markets.length,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    markets,
    cachedAt,
  }
}

export function toProductHit(detail: ProductDetail): ProductHit {
  return {
    productId: detail.productId,
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
