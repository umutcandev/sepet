/**
 * Kayıtlı fiyatların yaşı.
 *
 * Sepet ve fiş detayındaki tüm tutarlar kayıt anından donmuş birer snapshot,
 * ama hiçbir yerde öyle etiketlenmiyordu: altı ay önce kaydedilmiş bir sepet
 * "₺137,95" değerini bugünün fiyatıymış gibi gösteriyordu. Bu, `receipt-
 * staleness`ten AYRI bir kavram: orası fişin ÇEKİLDİĞİ tarihe bakar (kıyas
 * anlamlı mı), burası fiyatların TOPLANDIĞI tarihe (kayıt anı, `createdAt`).
 */
export const PRICE_STALE_DAYS = 14

export type PriceFreshness = {
  ageDays: number
  isStale: boolean
  /** "bugün" · "3 gün önce" · "2 ay önce" */
  ageLabel: string
}

const rel = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" })

export function priceFreshness(
  capturedAt: Date | string | number,
): PriceFreshness | null {
  const date = capturedAt instanceof Date ? capturedAt : new Date(capturedAt)
  const time = date.getTime()
  if (!Number.isFinite(time)) return null

  const ageDays = Math.max(0, Math.floor((Date.now() - time) / 86_400_000))

  let ageLabel: string
  if (ageDays === 0) ageLabel = "bugün"
  else if (ageDays < 30) ageLabel = rel.format(-ageDays, "day")
  else if (ageDays < 365) ageLabel = rel.format(-Math.round(ageDays / 30), "month")
  else ageLabel = rel.format(-Math.round(ageDays / 365), "year")

  return { ageDays, isStale: ageDays >= PRICE_STALE_DAYS, ageLabel }
}
