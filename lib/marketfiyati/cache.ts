import { createHash } from "node:crypto"
import { eq } from "drizzle-orm"
import {
  redis,
  MF_SEARCH_TTL,
  MF_PRODUCT_TTL,
  MF_BARCODE_TTL,
  MF_NEAREST_TTL,
} from "@/lib/redis"
import { db, barcodeMap } from "@/lib/db"
import {
  search,
  searchByIdentity,
  nearest,
  MF_DEFAULT_LOCATION,
  type LocationContext,
} from "./client"
import {
  toProductDetail,
  toProductHit,
  type ProductDetail,
  type ProductHit,
} from "./types"

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Seçili depo ID'lerinden kısa, stabil bir cache anahtarı parçası. Sıralanır →
 * seçim sırası anahtarı etkilemez. Boş liste = "auto" (depolar koordinat+mesafe
 * ile /nearest'tan çözülür; bunlar zaten anahtarda olduğundan paylaşımlı).
 */
function depotsHash(depots: string[]): string {
  if (depots.length === 0) return "auto"
  const sorted = [...depots].sort()
  // sha1: fiyat cache anahtarı olduğundan çakışma yanlış-market fiyatı servis
  // eder; kriptografik hash ile bu risk pratikte sıfırlanır. İlk 12 hex yeterli.
  const h = createHash("sha1").update(sorted.join(",")).digest("hex").slice(0, 12)
  return `${sorted.length}-${h}`
}

// Aynı keyword farklı konum/şube setinde farklı fiyat döndürür → konum cache
// key'ine dahil. Koordinatlar 2 ondalığa yuvarlanır (~1.1 km hassasiyet): hem
// cache hit oranını artırır hem gizliliği korur.
const locKey = (loc: LocationContext) =>
  `${round2(loc.latitude)}:${round2(loc.longitude)}:${loc.distance}:${depotsHash(loc.depots)}`

// v3: cache key'leri artık kullanıcı konumuna (koordinat + mesafe + seçili
// depolar) bağlı. v2 anahtarları tek bir env-sabit konuma kilitliydi; sürüm
// artışı eski kayıtları TTL beklemeden geçersiz kılar.
const SEARCH_KEY = (q: string, loc: LocationContext) =>
  `mf:search:v3:${q}:${locKey(loc)}`
const PRODUCT_KEY = (productId: string, loc: LocationContext) =>
  `mf:product:v3:${locKey(loc)}:${productId}`
const BARCODE_KEY = (barcode: string) => `mf:barcode:${barcode}`
const NEAREST_KEY = (loc: LocationContext) =>
  `mf:nearest:${round2(loc.latitude)}:${round2(loc.longitude)}:${loc.distance}`

export function normalizeQuery(input: string): string {
  return input.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ")
}

const isBarcode = (s: string) => /^\d{8,14}$/.test(s.trim())

/**
 * Aramaya verilecek depo (şube) ID'leri. Kullanıcı belirli şubeler seçtiyse
 * (`loc.depots`) doğrudan onlar kullanılır — search-time'da /nearest çağrısı
 * yapılmaz. Seçim yoksa koordinat+mesafeden /nearest ile çözülür (24 saat Redis
 * cache). marketfiyati /search ve /searchByIdentity lat/lng'yi konum FİLTRESİ
 * olarak kullanmaz; bu ID'ler `depots` alanında verilmezse rastgele (çoğunlukla
 * İstanbul) depo fiyatları döner. Çözülemezse boş liste döner (çağıran
 * depots'suz devam eder; eski yanlış-konum davranışına düşer ama patlamaz).
 */
async function getNearbyDepotIds(loc: LocationContext): Promise<string[]> {
  if (loc.depots.length > 0) return loc.depots

  const key = NEAREST_KEY(loc)
  try {
    const cached = await redis.get<string[]>(key)
    if (cached && cached.length > 0) return cached
  } catch (err) {
    console.error("[marketfiyati] nearest cache read failed", err)
  }
  try {
    const depots = await nearest(loc.latitude, loc.longitude, loc.distance)
    const ids = depots.map((d) => d.id)
    if (ids.length > 0) {
      await redis.set(key, ids, { ex: MF_NEAREST_TTL })
    }
    return ids
  } catch (err) {
    console.error("[marketfiyati] nearest depot resolve failed", err)
    return []
  }
}

async function readProducts(
  ids: string[],
  loc: LocationContext,
): Promise<ProductDetail[]> {
  if (ids.length === 0) return []
  const keys = ids.map((id) => PRODUCT_KEY(id, loc))
  const raw = (await redis.mget<(ProductDetail | null)[]>(...keys)) ?? []
  return raw.filter((p): p is ProductDetail => p !== null)
}

async function writeProducts(
  details: ProductDetail[],
  loc: LocationContext,
): Promise<void> {
  if (details.length === 0) return
  const pipe = redis.pipeline()
  for (const d of details) {
    pipe.set(PRODUCT_KEY(d.productId, loc), d, { ex: MF_PRODUCT_TTL })
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

async function fetchAndCacheSearch(
  rawQuery: string,
  loc: LocationContext,
): Promise<ProductDetail[]> {
  const depots = await getNearbyDepotIds(loc)
  const resp = await search(rawQuery, {
    latitude: loc.latitude,
    longitude: loc.longitude,
    distance: loc.distance,
    depots,
  })
  const details = resp.content.map((p) => toProductDetail(p))
  await writeProducts(details, loc)
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
  loc: LocationContext = MF_DEFAULT_LOCATION,
): Promise<{ details: ProductDetail[]; cached: boolean }> {
  const q = normalizeQuery(rawQuery)
  if (q.length < 2) return { details: [], cached: false }

  if (isBarcode(q)) {
    const detail = await getProductByBarcode(q, loc)
    return { details: detail ? [detail] : [], cached: false }
  }

  const cachedIds = await redis.get<string[]>(SEARCH_KEY(q, loc))
  if (cachedIds && cachedIds.length > 0) {
    const cachedDetails = await readProducts(cachedIds, loc)
    if (cachedDetails.length === cachedIds.length) {
      return { details: cachedDetails, cached: true }
    }
  }

  const details = await fetchAndCacheSearch(rawQuery, loc)
  await redis.set(
    SEARCH_KEY(q, loc),
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
  loc: LocationContext = MF_DEFAULT_LOCATION,
): Promise<{ hits: ProductHit[]; cached: boolean }> {
  const { details, cached } = await searchProductDetails(rawQuery, loc)
  return { hits: details.map(toProductHit), cached }
}

/**
 * Ürün detayı (productId ile). Redis'de varsa direkt döner; yoksa
 * searchByIdentity(id) ile tek istek atar ve önbelleğe alır.
 */
export async function getProductById(
  productId: string,
  loc: LocationContext = MF_DEFAULT_LOCATION,
): Promise<ProductDetail | null> {
  const id = productId.trim()
  if (!id) return null

  const cached = await redis.get<ProductDetail>(PRODUCT_KEY(id, loc))
  if (cached) return cached

  const depots = await getNearbyDepotIds(loc)
  const resp = await searchByIdentity(id, "id", {
    latitude: loc.latitude,
    longitude: loc.longitude,
    distance: loc.distance,
    depots,
  })
  if (resp.content.length === 0) return null
  const details = resp.content.map((p) => toProductDetail(p))
  await writeProducts(details, loc)
  return details.find((d) => d.productId === id) ?? details[0]
}

/**
 * Barkod ile ürün detayı. Sıra: Redis barkod→id → DB barcode_map → API
 * searchByIdentity(barcode). Çözülen eşleşme kalıcı cache'lenir.
 */
export async function getProductByBarcode(
  barcode: string,
  loc: LocationContext = MF_DEFAULT_LOCATION,
): Promise<ProductDetail | null> {
  const code = barcode.trim()
  if (!isBarcode(code)) return null

  const mappedId = await redis.get<string>(BARCODE_KEY(code))
  if (mappedId) {
    const detail = await getProductById(mappedId, loc)
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
      const detail = await getProductById(row.productId, loc)
      if (detail) return detail
    }
  } catch (err) {
    console.error("[marketfiyati] barcode_map read failed", err)
  }

  const depots = await getNearbyDepotIds(loc)
  const resp = await searchByIdentity(code, "barcode", {
    latitude: loc.latitude,
    longitude: loc.longitude,
    distance: loc.distance,
    depots,
  })
  if (resp.content.length === 0) return null
  const details = resp.content.map((p) => toProductDetail(p))
  await writeProducts(details, loc)
  const detail = details[0]
  await persistBarcode(code, detail.productId)
  return detail
}

export { isBarcode }
