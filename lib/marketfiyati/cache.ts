import { eq } from "drizzle-orm"
import {
  redis,
  MF_SEARCH_TTL,
  MF_PRODUCT_TTL,
  MF_BARCODE_TTL,
  MF_NEAREST_TTL,
} from "@/lib/redis"
import { db, barcodeMap } from "@/lib/db"
import { search, searchByIdentity, nearest, MF_DEFAULT_COORDS } from "./client"
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

// v2: `depots` filtresi eklendi → fiyatlar artık konum-doğru. v1 anahtarları
// konum filtresiz (yanlış/İstanbul) fiyat tutuyor; sürüm artışı eski kayıtları
// TTL beklemeden geçersiz kılar. PRODUCT_KEY koordinat içermez ama tek
// deployment tek konuma bağlı olduğundan COORDS_KEY ile konuma sabitlenir.
const SEARCH_KEY = (q: string) => `mf:search:v2:${q}:${COORDS_KEY}`
const PRODUCT_KEY = (productId: string) => `mf:product:v2:${COORDS_KEY}:${productId}`
const BARCODE_KEY = (barcode: string) => `mf:barcode:${barcode}`
const NEAREST_KEY = `mf:nearest:${COORDS_KEY}:${MF_DEFAULT_COORDS.distance}`

export function normalizeQuery(input: string): string {
  return input.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ")
}

const isBarcode = (s: string) => /^\d{8,14}$/.test(s.trim())

/**
 * Yapılandırılmış varsayılan konuma yakın depo ID'leri. marketfiyati /search ve
 * /searchByIdentity, lat/lng'yi konum FİLTRESİ olarak kullanmıyor — bu ID'ler
 * `depots` alanında verilmezse rastgele (çoğunlukla İstanbul) depo fiyatları
 * döner. Depolar nadiren değişir → 24 saat Redis cache. Çözülemezse boş liste
 * döner (çağıran depots'suz devam eder; eski yanlış-konum davranışına düşer ama
 * patlamaz).
 */
async function getNearbyDepotIds(): Promise<string[]> {
  try {
    const cached = await redis.get<string[]>(NEAREST_KEY)
    if (cached && cached.length > 0) return cached
  } catch (err) {
    console.error("[marketfiyati] nearest cache read failed", err)
  }
  try {
    const depots = await nearest(
      MF_DEFAULT_COORDS.latitude,
      MF_DEFAULT_COORDS.longitude,
      MF_DEFAULT_COORDS.distance,
    )
    const ids = depots.map((d) => d.id)
    if (ids.length > 0) {
      await redis.set(NEAREST_KEY, ids, { ex: MF_NEAREST_TTL })
    }
    return ids
  } catch (err) {
    console.error("[marketfiyati] nearest depot resolve failed", err)
    return []
  }
}

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
  const depots = await getNearbyDepotIds()
  const resp = await search(rawQuery, { depots })
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

  const depots = await getNearbyDepotIds()
  const resp = await searchByIdentity(id, "id", { depots })
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

  const depots = await getNearbyDepotIds()
  const resp = await searchByIdentity(code, "barcode", { depots })
  if (resp.content.length === 0) return null
  const details = resp.content.map((p) => toProductDetail(p))
  await writeProducts(details)
  const detail = details[0]
  await persistBarcode(code, detail.productId)
  return detail
}

export { isBarcode }
