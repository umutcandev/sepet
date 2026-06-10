import { eq } from "drizzle-orm"
import {
  redis,
  MF_SEARCH_TTL,
  MF_PRODUCT_TTL,
  MF_BARCODE_TTL,
} from "@/lib/redis"
import { db, barcodeMap } from "@/lib/db"
import { search, searchByIdentity, MF_DEFAULT_COORDS } from "./client"
import {
  toProductDetail,
  toProductHit,
  type ProductDetail,
  type ProductHit,
} from "./types"

const round2 = (n: number) => Math.round(n * 100) / 100

// Aynı keyword farklı konumlarda farklı fiyat döndürür → konum cache key'ine
// dahil. Koordinatlar 2 ondalığa yuvarlanır (~1.1 km hassasiyet): hem cache hit
// oranını artırır hem gizliliği korur. Bu fazda yalnızca env default kullanılıyor.
const COORDS_KEY = `${round2(MF_DEFAULT_COORDS.latitude)}:${round2(MF_DEFAULT_COORDS.longitude)}`

const SEARCH_KEY = (q: string) => `mf:search:${q}:${COORDS_KEY}`
const PRODUCT_KEY = (productId: string) => `mf:product:${productId}`
const BARCODE_KEY = (barcode: string) => `mf:barcode:${barcode}`

export function normalizeQuery(input: string): string {
  return input.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ")
}

const isBarcode = (s: string) => /^\d{8,14}$/.test(s.trim())

async function readProducts(ids: string[]): Promise<ProductDetail[]> {
  if (ids.length === 0) return []
  const keys = ids.map(PRODUCT_KEY)
  const raw = (await redis.mget<(ProductDetail | null)[]>(...keys)) ?? []
  return raw.filter((p): p is ProductDetail => p !== null)
}

async function writeProducts(details: ProductDetail[]): Promise<void> {
  if (details.length === 0) return
  const pipe = redis.pipeline()
  for (const d of details) {
    pipe.set(PRODUCT_KEY(d.productId), d, { ex: MF_PRODUCT_TTL })
  }
  await pipe.exec()
}

/** Barkod → productId eşleşmesini kalıcı yaz (Redis + DB). Eşleşme değişmez. */
async function persistBarcode(barcode: string, productId: string): Promise<void> {
  await redis.set(BARCODE_KEY(barcode), productId, { ex: MF_BARCODE_TTL })
  try {
    await db.insert(barcodeMap).values({ barcode, productId }).onConflictDoNothing()
  } catch (err) {
    console.error("[marketfiyati] barcode_map write failed", err)
  }
}

async function fetchAndCacheSearch(rawQuery: string): Promise<ProductDetail[]> {
  const resp = await search(rawQuery)
  const details = resp.content.map((p) => toProductDetail(p))
  await writeProducts(details)
  return details
}

/**
 * Keyword araması — TAM ürün detaylarını (her aday için market kırılımı dahil)
 * döndürür. Barkod gibi görünen sorguları searchByIdentity'ye yönlendirir.
 * Redis search-cache → product cache pipeline, miss'te API. Optimizasyonun
 * market-bilinçli aday seçimi için aday başına `markets[]` gerektiğinden
 * `searchProducts`'tan ayrı bir detay döndürür (ekstra API çağrısı yapmaz —
 * /search zaten tüm depo fiyatlarını getiriyor).
 */
export async function searchProductDetails(
  rawQuery: string,
): Promise<{ details: ProductDetail[]; cached: boolean }> {
  const q = normalizeQuery(rawQuery)
  if (q.length < 2) return { details: [], cached: false }

  if (isBarcode(q)) {
    const detail = await getProductByBarcode(q)
    return { details: detail ? [detail] : [], cached: false }
  }

  const cachedIds = await redis.get<string[]>(SEARCH_KEY(q))
  if (cachedIds && cachedIds.length > 0) {
    const cachedDetails = await readProducts(cachedIds)
    if (cachedDetails.length === cachedIds.length) {
      return { details: cachedDetails, cached: true }
    }
  }

  const details = await fetchAndCacheSearch(rawQuery)
  await redis.set(
    SEARCH_KEY(q),
    details.map((d) => d.productId),
    { ex: MF_SEARCH_TTL },
  )
  return { details, cached: false }
}

/**
 * Komut paleti / ürün arama. `searchProductDetails`'in özet (ProductHit)
 * görünümü — market kırılımına ihtiyaç duymayan UI tüketicileri için.
 */
export async function searchProducts(
  rawQuery: string,
): Promise<{ hits: ProductHit[]; cached: boolean }> {
  const { details, cached } = await searchProductDetails(rawQuery)
  return { hits: details.map(toProductHit), cached }
}

/**
 * Ürün detayı (productId ile). Redis'de varsa direkt döner; yoksa
 * searchByIdentity(id) ile tek istek atar ve önbelleğe alır.
 */
export async function getProductById(
  productId: string,
): Promise<ProductDetail | null> {
  const id = productId.trim()
  if (!id) return null

  const cached = await redis.get<ProductDetail>(PRODUCT_KEY(id))
  if (cached) return cached

  const resp = await searchByIdentity(id, "id")
  if (resp.content.length === 0) return null
  const details = resp.content.map((p) => toProductDetail(p))
  await writeProducts(details)
  return details.find((d) => d.productId === id) ?? details[0]
}

/**
 * Barkod ile ürün detayı. Sıra: Redis barkod→id → DB barcode_map → API
 * searchByIdentity(barcode). Çözülen eşleşme kalıcı cache'lenir.
 */
export async function getProductByBarcode(
  barcode: string,
): Promise<ProductDetail | null> {
  const code = barcode.trim()
  if (!isBarcode(code)) return null

  const mappedId = await redis.get<string>(BARCODE_KEY(code))
  if (mappedId) {
    const detail = await getProductById(mappedId)
    if (detail) return detail
  }

  try {
    const [row] = await db
      .select({ productId: barcodeMap.productId })
      .from(barcodeMap)
      .where(eq(barcodeMap.barcode, code))
      .limit(1)
    if (row?.productId) {
      await redis.set(BARCODE_KEY(code), row.productId, { ex: MF_BARCODE_TTL })
      const detail = await getProductById(row.productId)
      if (detail) return detail
    }
  } catch (err) {
    console.error("[marketfiyati] barcode_map read failed", err)
  }

  const resp = await searchByIdentity(code, "barcode")
  if (resp.content.length === 0) return null
  const details = resp.content.map((p) => toProductDetail(p))
  await writeProducts(details)
  const detail = details[0]
  await persistBarcode(code, detail.productId)
  return detail
}

export { isBarcode }
