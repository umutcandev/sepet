import type {
  MatchResult,
  OptimizationSummary,
  MarketAllocation,
  Unit,
} from "./schemas"

type ItemMarketPrice = {
  rawName: string
  productBarcode: string
  productName: string
  packCount: number
  marketPrices: Map<string, number>
}

// "500g beyaz peynir" gibi ağırlık/hacim girdilerinde quantity miktarı temsil
// eder (gram, ml). Ancak eşleşen ürün zaten sabit boyutlu paket. Bu yüzden
// fiyat çarpanı olarak sadece adet/paket birimlerinde quantity kullanılır;
// diğerlerinde 1 paket satın alındığı varsayılır.
function toPackCount(quantity: number, unit: Unit): number {
  if (unit === "adet" || unit === "paket") return Math.max(1, quantity)
  return 1
}

function toItemPriceMaps(matches: MatchResult[]): ItemMarketPrice[] {
  const items: ItemMarketPrice[] = []
  for (const m of matches) {
    if (!m.bestMatch) continue
    if (m.marketPrices.length === 0) continue
    const priceMap = new Map<string, number>()
    for (const mp of m.marketPrices) {
      priceMap.set(mp.market, mp.price)
    }
    items.push({
      rawName: m.rawName,
      productBarcode: m.bestMatch.barcode,
      productName: m.bestMatch.name,
      packCount: toPackCount(m.quantity, m.unit),
      marketPrices: priceMap,
    })
  }
  return items
}

function collectMarketUniverse(items: ItemMarketPrice[]): string[] {
  const set = new Set<string>()
  for (const item of items) {
    for (const market of item.marketPrices.keys()) set.add(market)
  }
  return Array.from(set)
}

type SingleMarketCandidate = {
  market: string
  total: number
  itemCount: number
  missingItemCount: number
  missingItemNames: string[]
}

function bestSingleMarket(items: ItemMarketPrice[]): {
  market: string
  total: number
  itemCount: number
  missingItemCount: number
  missingItemNames: string[]
  isFullCoverage: boolean
} {
  const markets = collectMarketUniverse(items)
  let bestFull: SingleMarketCandidate | null = null
  let bestPartial: SingleMarketCandidate | null = null

  for (const market of markets) {
    let total = 0
    let count = 0
    const missingNames: string[] = []
    for (const item of items) {
      const price = item.marketPrices.get(market)
      if (price === undefined) {
        missingNames.push(item.rawName)
        continue
      }
      total += price * item.packCount
      count++
    }
    if (count === 0) continue

    const candidate: SingleMarketCandidate = {
      market,
      total,
      itemCount: count,
      missingItemCount: missingNames.length,
      missingItemNames: missingNames,
    }
    if (missingNames.length === 0) {
      if (!bestFull || total < bestFull.total) bestFull = candidate
    } else {
      if (!bestPartial || total < bestPartial.total) bestPartial = candidate
    }
  }

  if (bestFull) return { ...bestFull, isFullCoverage: true }
  if (bestPartial) return { ...bestPartial, isFullCoverage: false }
  return {
    market: "—",
    total: 0,
    itemCount: 0,
    missingItemCount: items.length,
    missingItemNames: items.map((i) => i.rawName),
    isFullCoverage: false,
  }
}

function bestTwoMarketCombo(items: ItemMarketPrice[]): {
  markets: string[]
  total: number
  allocation: MarketAllocation[]
} {
  const markets = collectMarketUniverse(items)
  let best = { markets: [] as string[], total: Infinity, allocation: [] as MarketAllocation[] }
  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const a = markets[i]
      const b = markets[j]
      let total = 0
      let valid = true
      let usedA = false
      let usedB = false
      const allocation: MarketAllocation[] = []
      for (const item of items) {
        const priceA = item.marketPrices.get(a)
        const priceB = item.marketPrices.get(b)
        if (priceA === undefined && priceB === undefined) {
          valid = false
          break
        }
        const pickedMarket =
          priceA === undefined
            ? b
            : priceB === undefined
              ? a
              : priceA <= priceB
                ? a
                : b
        if (pickedMarket === a) usedA = true
        else usedB = true
        const unitPrice = pickedMarket === a ? (priceA as number) : (priceB as number)
        const lineTotal = unitPrice * item.packCount
        total += lineTotal
        allocation.push({
          market: pickedMarket,
          productBarcode: item.productBarcode,
          productName: item.productName,
          unitPrice,
          quantity: item.packCount,
          lineTotal,
        })
      }
      if (!valid) continue
      // Gerçek bir iki-market kombosu sayılması için her iki marketin de en az
      // bir kaleme katkı vermesi gerekir; aksi halde "X + Y" göstermek
      // yanıltıcı olur (Y hiç kullanılmıyor).
      if (!usedA || !usedB) continue
      if (total < best.total) {
        best = { markets: [a, b], total, allocation }
      }
    }
  }
  if (best.total === Infinity) {
    return { markets: [], total: 0, allocation: [] }
  }
  return best
}

export function computeOptimization(matches: MatchResult[]): OptimizationSummary {
  const items = toItemPriceMaps(matches)
  const totalItems = items.length

  if (items.length === 0) {
    return {
      singleMarket: {
        market: "—",
        total: 0,
        itemCount: 0,
        missingItemCount: matches.length,
        missingItemNames: matches.map((m) => m.rawName),
        isFullCoverage: false,
      },
      twoMarketCombo: {
        markets: [],
        total: 0,
        savingsTL: 0,
        savingsPct: 0,
        allocation: [],
      },
      currency: "TRY",
      totalItems: 0,
    }
  }

  const single = bestSingleMarket(items)
  const combo = bestTwoMarketCombo(items)

  const savingsTL = Math.max(0, single.total - combo.total)
  const savingsPct = single.total > 0 ? (savingsTL / single.total) * 100 : 0

  return {
    singleMarket: single,
    twoMarketCombo: {
      markets: combo.markets,
      total: combo.total,
      savingsTL: round2(savingsTL),
      savingsPct: round2(savingsPct),
      allocation: combo.allocation,
    },
    currency: "TRY",
    totalItems,
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
