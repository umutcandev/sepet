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
 * Tek bir aramanın konum bağlamı: koordinat + yarıçap + dahil edilecek depo
 * (şube) ID'leri. `depots` doluysa fiyatlar tam o şubelerle sınırlanır; boşsa
 * koordinat+mesafeden /nearest ile çözülür. Kullanıcı konumu yoksa
 * MF_DEFAULT_LOCATION fallback kullanılır.
 */
export type LocationContext = {
  latitude: number
  longitude: number
  distance: number
  depots: string[]
}

export const MF_DEFAULT_LOCATION: LocationContext = {
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  distance: DEFAULT_DISTANCE,
  depots: [],
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

// ─── Bounded concurrency ───
// WAF'ı korumak için tüm istekleri tek seri zincire sokmak yerine, eşzamanlı
// istek sayısını küçük bir tavanla sınırlarız. Böylece lookupProducts'ın paralel
// aramaları WAF'ı tetiklemeden ilerler ama tek tek serileşip (saniyede ~5 istek)
// throughput tavanı yaratmaz. Slot yalnız fetch + body okuma süresince tutulur;
// retry backoff beklemeleri slot dışında olur.
const MAX_CONCURRENT = 4
let active = 0
const waiters: Array<() => void> = []

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++
    return Promise.resolve()
  }
  // Slot dolu — sıraya gir. release() bir bekleyeni uyandırırken slot sahipliğini
  // ona devreder (active sabit kalır), bu yüzden burada tekrar artırmıyoruz.
  return new Promise<void>((resolve) => waiters.push(resolve))
}

function release(): void {
  const next = waiters.shift()
  if (next) next()
  else active--
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

type AttemptResult<T> =
  | { status: "ok"; value: T }
  | { status: "fail"; err: MarketfiyatiError; retriable: boolean }

/** Tek bir deneme: concurrency slotunu yalnız bu süre boyunca tutar. */
async function mfAttempt<T>(
  path: string,
  init: RequestInitLite,
  parse: (json: unknown) => T,
  opts: RequestOptions | undefined,
): Promise<AttemptResult<T>> {
  await acquire()
  try {
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
      // Ağ hatası — geçici olabilir, retriable.
      return {
        status: "fail",
        err: new MarketfiyatiError(`marketfiyati ${path} network error: ${message}`, 0),
        retriable: true,
      }
    }

    // 403 = header eksik / IP bloğu. Retry anlamsız.
    if (res.status === 403) {
      return {
        status: "fail",
        err: new MarketfiyatiError(`marketfiyati ${path} 403 (forbidden / IP block)`, 403),
        retriable: false,
      }
    }
    // 5xx = sunucu hatası. Exponential backoff ile retry.
    if (res.status >= 500) {
      return {
        status: "fail",
        err: new MarketfiyatiError(`marketfiyati ${path} ${res.status}`, res.status),
        retriable: true,
      }
    }
    if (!res.ok) {
      return {
        status: "fail",
        err: new MarketfiyatiError(`marketfiyati ${path} ${res.status}`, res.status),
        retriable: false,
      }
    }

    // WAF bloğunda response JSON değil, HTML ("Your Access To This Page Has Been
    // Blocked!"). res.json() patlar — önce text al, content-type'a bak.
    const contentType = res.headers.get("content-type") ?? ""
    const text = await res.text()
    if (
      !contentType.includes("json") ||
      /Access To This Page Has Been Blocked/i.test(text)
    ) {
      return {
        status: "fail",
        err: new MarketfiyatiError(`marketfiyati ${path} WAF/HTML block (geçici)`, 429),
        retriable: false,
      }
    }

    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return {
        status: "fail",
        err: new MarketfiyatiError(`marketfiyati ${path} invalid JSON`, 429),
        retriable: false,
      }
    }
    return { status: "ok", value: parse(json) }
  } finally {
    release()
  }
}

async function mfRequest<T>(
  path: string,
  init: RequestInitLite,
  parse: (json: unknown) => T,
  opts?: RequestOptions,
): Promise<T> {
  // Ağ hatası ve 5xx için backoff'lu 2 tekrar (toplam 3 deneme). Backoff
  // beklemesi slot dışında olur, böylece bekleyen istek slotu boşa tutmaz.
  for (let attempt = 0; ; attempt++) {
    const result = await mfAttempt(path, init, parse, opts)
    if (result.status === "ok") return result.value
    if (result.retriable && attempt < 2) {
      await sleep(300 * 2 ** attempt)
      continue
    }
    throw result.err
  }
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
  // Yakın depo ID'leri (ör. "a101-K709"). marketfiyati lat/lng'yi tek başına
  // KONUM FİLTRESİ olarak kullanmıyor — bu liste verilmezse rastgele (çoğunlukla
  // İstanbul) depoları döndürür. Konum-doğru fiyat için /nearest'tan alınan
  // ID'ler buraya verilmeli. Boş/verilmemişse alan body'den tamamen düşülür.
  depots?: string[]
  signal?: AbortSignal
}

/** Boşsa body'ye hiç eklenmesin diye depots'u koşullu serpilen yardımcı. */
function depotsField(depots?: string[]): { depots: string[] } | Record<string, never> {
  return depots && depots.length > 0 ? { depots } : {}
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
      ...depotsField(opts?.depots),
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
    { identity, identityType, latitude, longitude, distance, ...depotsField(opts?.depots) },
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
