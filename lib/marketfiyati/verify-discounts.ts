import type { MatchResult } from "@/lib/ai/schemas"
import { MF_PRODUCT_TTL, redis } from "@/lib/redis"
import { getNearbyDepotIds } from "./cache"
import { searchByIdentity, type LocationContext } from "./client"
import {
  annotateDiscountScopes,
  type CachedScope,
  type ReferencePriceFetcher,
  type ScopeCache,
} from "./discount-scope"

const SCOPE_KEY = (productId: string, depotId: string, refId: string) =>
  `mf:discscope:v1:${productId}:${depotId}:${refId}`

const redisScopeCache: ScopeCache = {
  get: (p, d, r) => redis.get<CachedScope>(SCOPE_KEY(p, d, r)),
  async set(p, d, r, value) {
    await redis.set<CachedScope>(SCOPE_KEY(p, d, r), value, {
      ex: MF_PRODUCT_TTL,
    })
  },
}

function apiFetcher(
  loc: LocationContext,
  signal?: AbortSignal
): ReferencePriceFetcher {
  return async (productId, depotId) => {
    const resp = await searchByIdentity(productId, "id", {
      latitude: loc.latitude,
      longitude: loc.longitude,
      distance: loc.distance,
      depots: [depotId],
      signal,
    })
    const product = resp.content.find((p) => p.id === productId)
    const hit = product?.productDepotInfoList.find((d) => d.depotId === depotId)
    return hit ? hit.price : null
  }
}

/** Hata eşleşmeyi düşürmez; doğrulanamazsa eşleşmeler olduğu gibi döner. */
export async function verifyDiscountScopes(
  matches: MatchResult[],
  loc: LocationContext,
  signal?: AbortSignal
): Promise<MatchResult[]> {
  try {
    return await annotateDiscountScopes(matches, {
      nearby: () => getNearbyDepotIds(loc),
      fetchReferencePrice: apiFetcher(loc, signal),
      cache: redisScopeCache,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[discount-scope] verification skipped ${message}`)
    return matches
  }
}
