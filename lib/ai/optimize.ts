import type {
  MatchResult,
  OptimizationSummary,
  MarketAllocation,
} from "./schemas"

// Bir kalemin BİR markette satın alınma maliyeti + o markette hangi ürüne
// çözüldüğü. Aynı kalem farklı marketlerde farklı ürüne (productId) çözülebilir;
// `cost`, istenen miktarı karşılayan tam paket(ler)in GERÇEK toplam fiyatıdır
// (packsNeeded × packagePrice) — oran-orantı yok.
type MarketChoice = {
  cost: number
  packsNeeded: number
  packagePrice: number
  productId: string
  productName: string
  depotName: string | null
}

type ItemMarketPrice = {
  rawName: string
  // İstenen boyut bulunamadı, farklı boyutlu ürünle eşleşti — allocation
  // satırında "Farklı Boyut" rozeti için kalem boyunca taşınır.
  sizeMismatch: boolean
  // market display adı → o markette en hesaplı kabul edilebilir seçenek.
  marketChoices: Map<string, MarketChoice>
}

function toItemPriceMaps(matches: MatchResult[]): ItemMarketPrice[] {
  const items: ItemMarketPrice[] = []
  for (const m of matches) {
    if (m.marketOptions.length === 0) continue
    const marketChoices = new Map<string, MarketChoice>()
    for (const opt of m.marketOptions) {
      // marketOptions zaten market başına tek (en ucuz) seçenek; yine de
      // savunmacı olalım.
      const cur = marketChoices.get(opt.market)
      if (!cur || opt.effectiveCost < cur.cost) {
        marketChoices.set(opt.market, {
          cost: opt.effectiveCost,
          packsNeeded: opt.packsNeeded,
          packagePrice: opt.packagePrice,
          productId: opt.productId,
          productName: opt.productName,
          depotName: opt.depotName,
        })
      }
    }
    items.push({ rawName: m.rawName, sizeMismatch: m.sizeMismatch, marketChoices })
  }
  return items
}

function collectMarketUniverse(items: ItemMarketPrice[]): string[] {
  const set = new Set<string>()
  for (const item of items) {
    for (const market of item.marketChoices.keys()) set.add(market)
  }
  return Array.from(set)
}

type SingleMarketCandidate = {
  market: string
  total: number
  itemCount: number
  missingItemCount: number
  missingItemNames: string[]
  allocation: MarketAllocation[]
}

function bestSingleMarket(items: ItemMarketPrice[]): {
  market: string
  total: number
  itemCount: number
  missingItemCount: number
  missingItemNames: string[]
  isFullCoverage: boolean
  allocation: MarketAllocation[]
} {
  const markets = collectMarketUniverse(items)
  let bestFull: SingleMarketCandidate | null = null
  let bestPartial: SingleMarketCandidate | null = null

  for (const market of markets) {
    let total = 0
    let count = 0
    const missingNames: string[] = []
    const allocation: MarketAllocation[] = []
    for (const item of items) {
      const choice = item.marketChoices.get(market)
      if (choice === undefined) {
        missingNames.push(item.rawName)
        continue
      }
      total += choice.cost
      count++
      allocation.push({
        market,
        rawName: item.rawName,
        productId: choice.productId,
        productName: choice.productName,
        unitPrice: choice.packagePrice,
        quantity: choice.packsNeeded,
        lineTotal: choice.cost,
        sizeMismatch: item.sizeMismatch,
        depotName: choice.depotName,
      })
    }
    if (count === 0) continue

    const candidate: SingleMarketCandidate = {
      market,
      total,
      itemCount: count,
      missingItemCount: missingNames.length,
      missingItemNames: missingNames,
      allocation,
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
    allocation: [],
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
        const choiceA = item.marketChoices.get(a)
        const choiceB = item.marketChoices.get(b)
        if (choiceA === undefined && choiceB === undefined) {
          valid = false
          break
        }
        // İki markette de varsa ucuz olanı; sadece birinde varsa o.
        const pickA =
          choiceB === undefined
            ? true
            : choiceA === undefined
              ? false
              : choiceA.cost <= choiceB.cost
        const pickedMarket = pickA ? a : b
        const choice = (pickA ? choiceA : choiceB) as MarketChoice
        if (pickA) usedA = true
        else usedB = true
        total += choice.cost
        allocation.push({
          market: pickedMarket,
          rawName: item.rawName,
          productId: choice.productId,
          productName: choice.productName,
          unitPrice: choice.packagePrice,
          quantity: choice.packsNeeded,
          lineTotal: choice.cost,
          sizeMismatch: item.sizeMismatch,
          depotName: choice.depotName,
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
        allocation: [],
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
    singleMarket: { ...single, total: round2(single.total) },
    twoMarketCombo: {
      markets: combo.markets,
      total: round2(combo.total),
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
