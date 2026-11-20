import type { MarketAllocation } from "@/lib/ai/schemas"
import { hasNationalPricing } from "@/lib/markets/registry"
import { haversineKm, type GeoPoint } from "./trip"

export type PlacedAllocation = MarketAllocation & { relocated?: boolean }

type Depot = Pick<MarketAllocation, "depotName" | "depotCoords" | "depotId">

const depotKey = (d: Depot): string | null =>
  d.depotId ??
  (d.depotCoords ? `${d.depotCoords.lat}:${d.depotCoords.lng}` : null)

/** Eve en yakın şube; konum yoksa en çok kalemi taşıyan. */
function pickTarget(pool: MarketAllocation[], home: GeoPoint | null): Depot {
  const counts = new Map<string, { depot: Depot; n: number }>()
  for (const e of pool) {
    const key = depotKey(e)
    if (!key) continue
    const cur = counts.get(key)
    if (cur) cur.n++
    else counts.set(key, { depot: e, n: 1 })
  }
  let best: { depot: Depot; n: number; km: number } | null = null
  for (const { depot, n } of counts.values()) {
    const km =
      home && depot.depotCoords ? haversineKm(home, depot.depotCoords) : 0
    if (!best || km < best.km || (km === best.km && n > best.n)) {
      best = { depot, n, km }
    }
  }
  return best!.depot
}

/**
 * Fiyatı her şubede aynı zincirlerde kalemleri tek şubede toplar. Şubeye özel
 * kampanyalı kalem kendi şubesinde kalır; diğerleri varsa ona, yoksa eve en yakın şubeye.
 */
export function consolidateDepots(
  allocation: readonly MarketAllocation[],
  home: GeoPoint | null = null
): PlacedAllocation[] {
  const byMarket = new Map<string, MarketAllocation[]>()
  for (const a of allocation) {
    if (!hasNationalPricing(a.market)) continue
    const list = byMarket.get(a.market) ?? []
    list.push(a)
    byMarket.set(a.market, list)
  }

  const placed = new Map<MarketAllocation, PlacedAllocation>()
  for (const entries of byMarket.values()) {
    const located = entries.filter((e) => e.depotCoords && depotKey(e))
    if (located.length === 0) continue
    const pinned = located.filter((e) => e.discountScope === "branch")
    const pinnedKeys = new Set(pinned.map(depotKey))
    const target = pickTarget(pinned.length > 0 ? pinned : located, home)
    const targetKey = depotKey(target)
    for (const e of located) {
      const key = depotKey(e)
      if (pinnedKeys.has(key) || key === targetKey) continue
      placed.set(e, {
        ...e,
        depotName: target.depotName,
        depotCoords: target.depotCoords,
        depotId: target.depotId ?? null,
        relocated: true,
      })
    }
  }
  return allocation.map((a) => placed.get(a) ?? a)
}
