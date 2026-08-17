import {
  OptimizationSummarySchema,
  type MarketAllocation,
  type OptimizationSummary,
} from "@/lib/ai/schemas"

/**
 * `summaryJson` istemciden gelip doğrudan `jsonb`'ye yazılıyordu ve okurken
 * tipe cast ediliyordu — eksik/eski bir kayıt (ör. `twoMarketCombo` yok) sunucu
 * bileşenini `TypeError` ile düşürüyordu. Okuma yolunda tek giriş noktası burası:
 * zod `safeParse` + default'lar eski kayıtları tamamlar, tamamlanamayan kayıt
 * `null` döner ve sayfa "özet yok" durumuna düşer, patlamaz.
 */
export function parseSummary(value: unknown): OptimizationSummary | null {
  if (!value || typeof value !== "object") return null
  const parsed = OptimizationSummarySchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export type BasketPlan = {
  kind: "single" | "combo"
  /** Kullanıcıya gösterilen etiket ("Tek market" / "İki market"). */
  label: string
  markets: string[]
  allocation: MarketAllocation[]
  total: number
}

/**
 * Kayıt sayfasında hangi satın alma planının gösterileceğini seçer.
 *
 * `OptimizationCard`'ın sıralama kuralıyla BİREBİR aynı: tek market sepeti tam
 * karşılamıyor ve tam karşılayan bir kombinasyon varsa, gerçek öneri
 * kombinasyondur. Aksi halde tek market. İki yerin farklı plan seçmesi, raporun
 * K-01'inde tarif edilen "üçüncü sepet" sorununun aynısını geri getirirdi.
 */
export function recommendedPlan(
  summary: OptimizationSummary | null,
): BasketPlan | null {
  if (!summary) return null
  const { singleMarket, twoMarketCombo } = summary
  const hasCombo = twoMarketCombo.markets.length === 2
  const comboFirst = !singleMarket.isFullCoverage && hasCombo

  // `allocation` her iki tarafta da `.default([])` taşıyor: `parseSummary`'den
  // geçmiş bir özette alan daima dizidir, eski kayıtta boş dizidir. Buradaki
  // `?? []` savunması şemayla çelişiyordu (tip zaten opsiyonel değil) — tek
  // doğru kaynak şema.
  if (comboFirst) {
    return {
      kind: "combo",
      label: "İki market",
      markets: twoMarketCombo.markets,
      allocation: twoMarketCombo.allocation,
      total: twoMarketCombo.total,
    }
  }
  if (singleMarket.itemCount === 0) {
    return hasCombo
      ? {
          kind: "combo",
          label: "İki market",
          markets: twoMarketCombo.markets,
          allocation: twoMarketCombo.allocation,
          total: twoMarketCombo.total,
        }
      : null
  }
  return {
    kind: "single",
    label: "Tek market",
    markets: [singleMarket.market],
    allocation: singleMarket.allocation,
    total: singleMarket.total,
  }
}

function allocationKey(rawName: string): string {
  return rawName.trim().toLocaleLowerCase("tr-TR")
}

/**
 * Kalem satırlarını plan dökümüne bağlar. Anahtar ham kalem adı — kalem satırı
 * ile allocation aynı kaynaktan (`matches`) üretildiği için ham ad ikisinde de
 * aynıdır. Aynı ham ad birden çok kez geçebileceğinden (ör. iki ayrı "süt")
 * eşleşenler sırayla tüketilir.
 */
export function createAllocationLookup(allocation: MarketAllocation[]) {
  const buckets = new Map<string, MarketAllocation[]>()
  for (const entry of allocation) {
    const key = allocationKey(entry.rawName)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(entry)
    else buckets.set(key, [entry])
  }
  return function take(rawName: string): MarketAllocation | null {
    const bucket = buckets.get(allocationKey(rawName))
    if (!bucket || bucket.length === 0) return null
    return bucket.shift() ?? null
  }
}

/** Plan dökümünü market bazında toplar (dağılım grafiği için). */
export function marketTotals(
  allocation: MarketAllocation[],
): Array<{ market: string; value: number }> {
  const totals = new Map<string, number>()
  for (const entry of allocation) {
    if (!Number.isFinite(entry.lineTotal) || entry.lineTotal <= 0) continue
    totals.set(entry.market, (totals.get(entry.market) ?? 0) + entry.lineTotal)
  }
  return Array.from(totals.entries()).map(([market, value]) => ({
    market,
    value,
  }))
}
