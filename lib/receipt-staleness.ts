export const STALE_DAY_THRESHOLD = 180

export function isReceiptStaleByDate(
  purchaseDate: Date | string | null | undefined,
): boolean {
  if (!purchaseDate) return false
  const d =
    purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate)
  if (Number.isNaN(d.getTime())) return false
  const ageDays = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  return ageDays >= STALE_DAY_THRESHOLD
}
