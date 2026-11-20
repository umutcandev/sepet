import type { MarketOption, MatchResult } from "@/lib/ai/schemas"
import { hasNationalPricing } from "@/lib/markets/registry"

// `discount=true` zincir geneli kampanyada da geliyor; kapsamı ayırmak için
// kampanyalı kalem zincirin başka bir şubesinde tekrar sorulur.

export type DiscountScope = NonNullable<MarketOption["discountScope"]>

export const MAX_SCOPE_CHECKS = 12

/** "a101-K709" → "a101", "tarim_kredi-6474" → "tarim_kredi". */
export function chainOfDepot(depotId: string): string {
  const i = depotId.lastIndexOf("-")
  return i > 0 ? depotId.slice(0, i) : depotId
}

export function referenceDepot(
  depotId: string,
  nearby: readonly string[]
): string | null {
  const chain = chainOfDepot(depotId)
  return (
    nearby.find((id) => id !== depotId && chainOfDepot(id) === chain) ?? null
  )
}

export function scopeFromReference(
  price: number,
  referencePrice: number | null
): DiscountScope | null {
  if (referencePrice == null) return null
  return Math.abs(referencePrice - price) < 0.005 ? "chain" : "branch"
}

const needsCheck = (o: MarketOption): o is MarketOption & { depotId: string } =>
  o.regularPrice != null &&
  o.discountScope == null &&
  !!o.depotId &&
  hasNationalPricing(o.market)

export type ReferencePriceFetcher = (
  productId: string,
  depotId: string
) => Promise<number | null>

export type CachedScope = DiscountScope | "unknown"

export type ScopeCache = {
  get(
    productId: string,
    depotId: string,
    refId: string
  ): Promise<CachedScope | null>
  set(
    productId: string,
    depotId: string,
    refId: string,
    value: CachedScope
  ): Promise<void>
}

export async function annotateDiscountScopes(
  matches: MatchResult[],
  deps: {
    nearby: () => Promise<readonly string[]>
    fetchReferencePrice: ReferencePriceFetcher
    cache?: ScopeCache
  }
): Promise<MatchResult[]> {
  const targets = new Map<string, MarketOption & { depotId: string }>()
  for (const m of matches) {
    for (const o of m.marketOptions) {
      if (needsCheck(o)) targets.set(`${o.productId}|${o.depotId}`, o)
    }
  }
  if (targets.size === 0) return matches

  const nearby = await deps.nearby()
  const scopes = new Map<string, DiscountScope>()
  await Promise.all(
    [...targets].slice(0, MAX_SCOPE_CHECKS).map(async ([key, o]) => {
      const ref = referenceDepot(o.depotId, nearby)
      if (!ref) return
      try {
        const cached = await deps.cache?.get(o.productId, o.depotId, ref)
        if (cached) {
          if (cached !== "unknown") scopes.set(key, cached)
          return
        }
        const scope = scopeFromReference(
          o.packagePrice,
          await deps.fetchReferencePrice(o.productId, ref)
        )
        if (scope) scopes.set(key, scope)
        await deps.cache?.set(o.productId, o.depotId, ref, scope ?? "unknown")
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[discount-scope] check failed ${message}`)
      }
    })
  )
  if (scopes.size === 0) return matches

  return matches.map((m) => ({
    ...m,
    marketOptions: m.marketOptions.map((o) => {
      const scope = o.depotId
        ? scopes.get(`${o.productId}|${o.depotId}`)
        : undefined
      return scope ? { ...o, discountScope: scope } : o
    }),
  }))
}
