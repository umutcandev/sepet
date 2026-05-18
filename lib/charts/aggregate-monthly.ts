import type { MonthlyDatum } from "@/components/charts/monthly-bar-chart"

const monthFmt = new Intl.DateTimeFormat("tr-TR", { month: "short" })

/**
 * Bucket rows into the last 6 months (oldest → newest), summing `getValue` per
 * month. Returns 6 entries even if months are empty (0-value bars get hidden by
 * the chart's empty-state check when the total is zero).
 */
export function aggregateMonthly<T>(
  rows: readonly T[],
  getDate: (row: T) => Date | string | null | undefined,
  getValue: (row: T) => number,
  now: Date = new Date(),
): MonthlyDatum[] {
  const buckets: { key: string; date: Date; value: number }[] = []
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  for (let i = 0; i < 6; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      date: d,
      value: 0,
    })
  }

  const index = new Map(buckets.map((b, i) => [b.key, i]))

  for (const row of rows) {
    const raw = getDate(row)
    if (!raw) continue
    const d = raw instanceof Date ? raw : new Date(raw)
    if (Number.isNaN(d.getTime())) continue
    if (d < start) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const i = index.get(key)
    if (i === undefined) continue
    buckets[i].value += getValue(row)
  }

  return buckets.map((b) => ({
    month: monthFmt.format(b.date).replace(".", ""),
    value: Math.round(b.value * 100) / 100,
  }))
}
