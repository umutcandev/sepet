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
  free: { textMessages: 10, imageAnalyses: 3, savedBaskets: 20, savedReceipts: 20 },
  pro: { textMessages: 60, imageAnalyses: 15, savedBaskets: null, savedReceipts: null },
}

export function planLimit(plan: Plan, metric: UsageMetric): number | null {
  return PLAN_LIMITS[plan][metric]
}

// ─── Vitrin metinleri ───
// Limit sayısı kullanıcıya en az beş yerde gösteriliyor (plan kartları, ana
// sayfa tablosu, SSS, mesafeli satış sözleşmesi, llms.txt). Bu sayılar elle
// kopyalandığında kaçınılmaz olarak bayatlıyor — nitekim bayatladı. Metinler
// PLAN_LIMITS'ten TÜRETİLİR; hiçbir bileşen sayıyı kendi içine yazmaz.

/** `null` = sınırsız. Küçük harfli, cümle içinde kullanmak için. */
export function limitText(value: number | null): string {
  return value === null ? "sınırsız" : String(value)
}

/** Tablo hücresi: "10 / ay", "Sınırsız". */
export function limitCell(plan: Plan, metric: UsageMetric): string {
  const v = planLimit(plan, metric)
  if (v === null) return "Sınırsız"
  const monthly: UsageMetric[] = ["textMessages", "imageAnalyses"]
  return monthly.includes(metric) ? `${v} / ay` : String(v)
}

/** Madde etiketi: "Aylık 10 asistan mesajı", "Sınırsız sepet kaydı". */
export function limitFeature(plan: Plan, metric: UsageMetric): string {
  const v = planLimit(plan, metric)
  const noun: Record<UsageMetric, string> = {
    textMessages: "asistan mesajı",
    imageAnalyses: "görsel analizi",
    savedBaskets: "sepet kaydı",
    savedReceipts: "fiş kaydı",
  }
  if (v === null) return `Sınırsız ${noun[metric]}`
  const monthly: UsageMetric[] = ["textMessages", "imageAnalyses"]
  return monthly.includes(metric) ? `Aylık ${v} ${noun[metric]}` : `${v} ${noun[metric]}`
}
