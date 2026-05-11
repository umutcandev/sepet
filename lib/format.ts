const decimalFmt = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "27,50 TL" — symbol-free, locale-correct decimal. */
export function formatTL(value: number): string {
  return `${decimalFmt.format(value)} TL`
}

/** Same as `formatTL` but tolerant of nullish input ("—" fallback). */
export function formatTLOrDash(value: number | null | undefined): string {
  return value == null ? "—" : formatTL(value)
}

const relTime = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" })

export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (Math.abs(minutes) < 60) return relTime.format(-minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relTime.format(-hours, "hour")
  const days = Math.round(hours / 24)
  return relTime.format(-days, "day")
}

/**
 * Splits a price into a 3-tier band relative to the cheapest/priciest market
 * for the same product. Used to tint price badges green/amber/red dynamically.
 * - ≤33% of the range → success (en ucuza yakın)
 * - ≤66% of the range → warning (ortalama)
 * - >66% → destructive (pahalı)
 */
export type PriceTier = "success" | "warning" | "destructive"

export function priceTier(
  price: number,
  min: number,
  max: number,
): PriceTier {
  if (max <= min) return "success"
  const ratio = (price - min) / (max - min)
  if (ratio <= 1 / 3) return "success"
  if (ratio <= 2 / 3) return "warning"
  return "destructive"
}
