import { z } from "zod"
import {
  mfSearchResponseSchema,
  mfNearestResponseSchema,
  mfCategoriesResponseSchema,
  type MFSearchResponse,
  type MFNearestDepot,
  type MFCategory,
} from "./types"

const MF_BASE = "https://api.marketfiyati.org.tr"

// Konum env'den okunur; yoksa İstanbul (Sultanahmet) fallback. Marketfiyati
// konum bazlı çalışır — lat/lng olmadan productDepotInfoList boş/rastgele gelir.
const DEFAULT_LAT = Number(process.env.MARKETFIYATI_DEFAULT_LAT ?? "41.0082")
const DEFAULT_LNG = Number(process.env.MARKETFIYATI_DEFAULT_LNG ?? "28.9784")
const DEFAULT_DISTANCE = Number(process.env.MARKETFIYATI_DEFAULT_DISTANCE ?? "5")

export const MF_DEFAULT_COORDS = {
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  distance: DEFAULT_DISTANCE,
}

/**
 * Zorunlu header'lar — eksikse WAF 403 veriyor. Origin ve Referer kritik;
 * User-Agent bazı endpoint'lerde gerekli. API kontrolünü değiştirirse burası
 * tek değişiklik noktası.
 */
function mfHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    Origin: "https://marketfiyati.org.tr",
    Referer: "https://marketfiyati.org.tr/",
  }
}

export class MarketfiyatiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "MarketfiyatiError"
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ─── Self-imposed throttle ───
// Tüm istekleri serileştirir ve aralarında min 200ms bekletir. Özellikle
// lookupProducts'taki Promise.all paralel aramalarını WAF'a takılmaktan korur.
const MIN_INTERVAL_MS = 200
let throttleChain: Promise<void> = Promise.resolve()
let lastRequestAt = 0

function throttle(): Promise<void> {
  const next = throttleChain.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now())
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
  })
  // Zincir bir hatayla kırılmasın; throttle hiç reject etmez.
  throttleChain = next.catch(() => {})
  return next
}

type RequestInitLite = { method: "GET" | "POST"; body?: string }
type RequestOptions = { signal?: AbortSignal }

function parseWith<T>(
  schema: z.ZodType<T>,
  json: unknown,
  path: string,
): T {
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new MarketfiyatiError(
      `marketfiyati ${path} response shape mismatch: ${parsed.error.message}`,
      500,
    )
  }
  return parsed.data
}

async function mfRequest<T>(
  path: string,
  init: RequestInitLite,
  parse: (json: unknown) => T,
  opts?: RequestOptions,
  attempt = 0,
): Promise<T> {
  await throttle()

  let res: Response
  try {
    res = await fetch(`${MF_BASE}${path}`, {
      method: init.method,
      body: init.body,
      headers: mfHeaders(),
      cache: "no-store",
      signal: opts?.signal,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Ağ hatası — geçici olabilir, bir kez daha dene.
    if (attempt < 2) {
      await sleep(300 * 2 ** attempt)
      return mfRequest(path, init, parse, opts, attempt + 1)
    }
    throw new MarketfiyatiError(`marketfiyati ${path} network error: ${message}`, 0)
  }

  // 403 = header eksik / IP bloğu. Retry anlamsız.
  if (res.status === 403) {
    throw new MarketfiyatiError(`marketfiyati ${path} 403 (forbidden / IP block)`, 403)
  }
  // 5xx = sunucu hatası. Exponential backoff ile 2 retry.
  if (res.status >= 500) {
    if (attempt < 2) {
      await sleep(300 * 2 ** attempt)
      return mfRequest(path, init, parse, opts, attempt + 1)
    }
    throw new MarketfiyatiError(`marketfiyati ${path} ${res.status}`, res.status)
  }
  if (!res.ok) {
    throw new MarketfiyatiError(`marketfiyati ${path} ${res.status}`, res.status)
  }

  // WAF bloğunda response JSON değil, HTML ("Your Access To This Page Has Been
  // Blocked!"). res.json() patlar — önce text al, content-type'a bak.
  const contentType = res.headers.get("content-type") ?? ""
  const text = await res.text()
  if (
    !contentType.includes("json") ||
    /Access To This Page Has Been Blocked/i.test(text)
  ) {
    throw new MarketfiyatiError(
      `marketfiyati ${path} WAF/HTML block (geçici)`,
      429,
    )
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new MarketfiyatiError(`marketfiyati ${path} invalid JSON`, 429)
  }
  return parse(json)
}

function mfPost<T>(
  path: string,
  body: unknown,
  parse: (json: unknown) => T,
  opts?: RequestOptions,
): Promise<T> {
  return mfRequest(path, { method: "POST", body: JSON.stringify(body) }, parse, opts)
}

type GeoOptions = {
  latitude?: number
  longitude?: number
  distance?: number
  signal?: AbortSignal
}

function geo(opts?: GeoOptions) {
  return {
    latitude: opts?.latitude ?? DEFAULT_LAT,
    longitude: opts?.longitude ?? DEFAULT_LNG,
    distance: opts?.distance ?? DEFAULT_DISTANCE,
  }
}

export type IdentityType = "barcode" | "id"

/** Keyword ile ürün arama. */
export function search(
  keywords: string,
  opts?: GeoOptions & { pages?: number; size?: number },
): Promise<MFSearchResponse> {
  const { latitude, longitude, distance } = geo(opts)
  return mfPost(
    "/api/v2/search",
    {
      keywords,
      pages: opts?.pages ?? 0,
      size: opts?.size ?? 24,
      latitude,
      longitude,
      distance,
    },
    (json) => parseWith(mfSearchResponseSchema, json, "/search"),
    opts,
  )
}

/** Barkod veya ürün ID'si ile arama. */
export function searchByIdentity(
  identity: string,
  identityType: IdentityType = "id",
  opts?: GeoOptions,
): Promise<MFSearchResponse> {
  const { latitude, longitude, distance } = geo(opts)
  return mfPost(
    "/api/v2/searchByIdentity",
    { identity, identityType, latitude, longitude, distance },
    (json) => parseWith(mfSearchResponseSchema, json, "/searchByIdentity"),
    opts,
  )
}

/**
 * Benzer ürünler. (Endpoint adındaki "Smilar" typo'su resmi API'de böyle.)
 * Bu fazda uygulamaya bağlı değil — alternatif ürün önerisi için hazır.
 */
export function searchSimilar(
  id: string,
  keywords: string,
  opts?: GeoOptions,
): Promise<MFSearchResponse> {
  const { latitude, longitude, distance } = geo(opts)
  return mfPost(
    "/api/v2/searchSmilarProduct",
    { id, keywords, latitude, longitude, distance },
    (json) => parseWith(mfSearchResponseSchema, json, "/searchSmilarProduct"),
    opts,
  )
}

/** Yakın marketleri bul. Dönen id'ler /search'e `depots` olarak verilebilir. */
export function nearest(
  latitude: number,
  longitude: number,
  distance = DEFAULT_DISTANCE,
  opts?: RequestOptions,
): Promise<MFNearestDepot[]> {
  return mfPost(
    "/api/v2/nearest",
    { latitude, longitude, distance },
    (json) => parseWith(mfNearestResponseSchema, json, "/nearest"),
    opts,
  )
}

/** Kategori listesi (v1 endpoint, GET). */
export function getCategories(opts?: RequestOptions): Promise<MFCategory[]> {
  return mfRequest(
    "/api/v1/info/categories",
    { method: "GET" },
    (json) => parseWith(mfCategoriesResponseSchema, json, "/categories").content,
    opts,
  )
}
