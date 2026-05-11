import { camgozSearchResponseSchema, type CamgozRawProduct } from "./types"

const CAMGOZ_BASE =
  process.env.CAMGOZ_API_BASE ?? "https://camgoz.jojapi.net/api/external"

function authHeaders(): HeadersInit {
  const key = process.env.JOJAPI_KEY
  if (!key) throw new Error("JOJAPI_KEY is not set")
  return { "X-JoJAPI-Key": key }
}

export class CamgozError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "CamgozError"
  }
}

type SearchOptions = {
  query: string
  withMarketPrices?: boolean
  withHistory?: boolean
  signal?: AbortSignal
}

/**
 * Tek bir camgoz isteği — kredi tüketir. Çağrı katmanı (lib/camgoz/cache.ts)
 * burayı ancak cache miss'te çağırmalı.
 */
export async function camgozSearch({
  query,
  withMarketPrices = true,
  withHistory = false,
  signal,
}: SearchOptions): Promise<CamgozRawProduct[]> {
  const url = new URL(`${CAMGOZ_BASE}/search`)
  url.searchParams.set("query", query)
  url.searchParams.set("marketPrices", String(withMarketPrices))
  if (withHistory) url.searchParams.set("historyPrices", "true")

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
    signal,
    cache: "no-store",
  })

  if (!res.ok) {
    throw new CamgozError(
      `camgoz /search failed: ${res.status} ${res.statusText}`,
      res.status,
    )
  }

  const json = (await res.json()) as unknown
  const parsed = camgozSearchResponseSchema.safeParse(json)
  if (!parsed.success) {
    throw new CamgozError(
      `camgoz /search response shape mismatch: ${parsed.error.message}`,
      500,
    )
  }
  return parsed.data
}
