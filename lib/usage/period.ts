// Aylık periyot anahtarı ve reset tarihi. Anahtar "YYYY-MM" biçiminde olduğu
// için yeni ay geldiğinde sayaç doğal olarak yeni satıra (0'dan) yazılır —
// ayrı bir reset job'ı gerekmez. UTC bazlıdır; sunucu saat dilimi farkı
// nedeniyle periyot kayması yaşanmaması için her yerde UTC kullanılır.

export function currentPeriod(now: Date = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

/**
 * İçinde bulunulan periyodun bittiği (= bir sonraki ayın başladığı) an. Kota
 * dolduğunda kullanıcıya "ne zaman yenilenecek" göstermek için kullanılır.
 */
export function nextPeriodStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}
