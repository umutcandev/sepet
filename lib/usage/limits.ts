// Katman (plan) limitleri — tek kaynak. Yeni bir katman eklemek ya da bir
// limiti değiştirmek = burada bir satır değiştirmek; route/action mantığı sabit.
// `null` = sınırsız.
//
// Aylık metrikler (textMessages, imageAnalyses) usage_counter'da tutulur ve her
// ay 0'dan başlar. Depolama metrikleri (savedBaskets, savedReceipts) anlıktır;
// mevcut tablolardan COUNT(*) ile okunur.

export type Plan = "free" | "pro"

// Aylık resetlenen, atomik rezerve edilen metrikler.
export type MeteredMetric = "textMessages" | "imageAnalyses"
// Anlık (depolama) metrikleri.
export type StorageMetric = "savedBaskets" | "savedReceipts"
export type UsageMetric = MeteredMetric | StorageMetric

export const PLAN_LIMITS: Record<Plan, Record<UsageMetric, number | null>> = {
  free: { textMessages: 50, imageAnalyses: 10, savedBaskets: 20, savedReceipts: 20 },
  pro: { textMessages: 500, imageAnalyses: 250, savedBaskets: null, savedReceipts: null },
}

export function planLimit(plan: Plan, metric: UsageMetric): number | null {
  return PLAN_LIMITS[plan][metric]
}
