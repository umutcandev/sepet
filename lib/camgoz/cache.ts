import { redis, CAMGOZ_CACHE_TTL_SECONDS } from "@/lib/redis"
import { camgozSearch } from "./client"
import {
  toProductDetail,
  toProductHit,
  type ProductDetail,
  type ProductHit,
} from "./types"

const SEARCH_KEY = (q: string) => `camgoz:search:${q}`
const PRODUCT_KEY = (barcode: string) => `camgoz:product:${barcode}`

export function normalizeQuery(input: string): string {
  return input
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
}

const isBarcode = (s: string) => /^\d{8,14}$/.test(s.trim())

async function readProducts(barcodes: string[]): Promise<ProductDetail[]> {
  if (barcodes.length === 0) return []
  const keys = barcodes.map(PRODUCT_KEY)
  const raw = (await redis.mget<(ProductDetail | null)[]>(...keys)) ?? []
  return raw.filter((p): p is ProductDetail => p !== null)
}

async function writeProducts(details: ProductDetail[]): Promise<void> {
  if (details.length === 0) return
  const pipe = redis.pipeline()
  for (const d of details) {
    pipe.set(PRODUCT_KEY(d.barcode), d, { ex: CAMGOZ_CACHE_TTL_SECONDS })
  }
  await pipe.exec()
}

async function fetchAndCache(rawQuery: string): Promise<ProductDetail[]> {
  const fresh = await camgozSearch({ query: rawQuery, withMarketPrices: true })
  const details = fresh.map((p) => toProductDetail(p))
  await writeProducts(details)
  return details
}

/**
 * Komut paleti aramaları. Önce Redis search-cache → product cache pipeline,
 * miss durumunda tek bir camgoz isteği. Kredi koruma için: aynı q için
 * 12 saat boyunca tekrar istek atmaz.
 */
export async function searchProducts(
  rawQuery: string,
): Promise<{ hits: ProductHit[]; cached: boolean }> {
  const q = normalizeQuery(rawQuery)
  if (q.length < 2) return { hits: [], cached: false }

  const cachedBarcodes = await redis.get<string[]>(SEARCH_KEY(q))
  if (cachedBarcodes && cachedBarcodes.length > 0) {
    const cachedDetails = await readProducts(cachedBarcodes)
    if (cachedDetails.length === cachedBarcodes.length) {
      return { hits: cachedDetails.map(toProductHit), cached: true }
    }
  }

  const details = await fetchAndCache(rawQuery)
  await redis.set(
    SEARCH_KEY(q),
    details.map((d) => d.barcode),
    { ex: CAMGOZ_CACHE_TTL_SECONDS },
  )
  return { hits: details.map(toProductHit), cached: false }
}

/**
 * Ürün detayı. Redis'de varsa direkt döner — kredi harcanmaz. Yoksa barkod
 * ile camgoz'a tek istek atar, tüm dönen ürünleri (genellikle 1) önbelleğe alır.
 */
export async function getProductByBarcode(
  barcode: string,
): Promise<ProductDetail | null> {
  const code = barcode.trim()
  if (!isBarcode(code)) return null

  const cached = await redis.get<ProductDetail>(PRODUCT_KEY(code))
  if (cached) return cached

  const fresh = await camgozSearch({ query: code, withMarketPrices: true })
  if (fresh.length === 0) return null
  const details = fresh.map((p) => toProductDetail(p))
  await writeProducts(details)
  return details.find((d) => d.barcode === code) ?? details[0]
}

export { isBarcode }
