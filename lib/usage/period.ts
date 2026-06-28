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

// Verilen aydaki gün sayısı (gün 0 of next month = bu ayın son günü). monthIndex
// 0-11; taşma/eksilme Date.UTC tarafından doğal olarak ele alınır.
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

// anchorDay'i o ayın gün sayısına clamp eder: 31 → Şubat'ta 28/29, Nisan'da 30.
function clampDay(year: number, monthIndex: number, day: number): number {
  return Math.min(day, daysInMonth(year, monthIndex))
}

function isoDate(d: Date): string {
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${d.getUTCFullYear()}-${month}-${day}`
}

/**
 * Pro kota penceresi: takvim ayına değil abonenin YENİLEME GÜNÜNE sabitlenir.
 * anchorDay = abonelik başlangıç gününün gün-of-month'u (1..31); kısa aylarda
 * ayın son gününe clamp edilir. Her zaman AYLIK döner — yıllık abonede bile,
 * çünkü anchorDay yenilemeler boyunca sabittir. Anahtar "YYYY-MM-DD" (pencere
 * başı) biçimindedir; free'nin "YYYY-MM" anahtarıyla aynı text PK'da çakışmaz.
 *
 * Pencere `now` + anchorDay'den hesaplanır (saklanan periodEnd'den değil), bu
 * yüzden webhook gecikse de reset penceresi gerçek zamanla doğru ilerler.
 */
export function billingPeriod(
  anchorDay: number,
  now: Date = new Date(),
): { key: string; resetAt: Date } {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const anchorThisMonth = clampDay(year, month, anchorDay)

  // now anchor gününe ulaştıysa pencere başı bu ayın anchor'ı, değilse önceki ayın.
  const start =
    now.getUTCDate() >= anchorThisMonth
      ? new Date(Date.UTC(year, month, anchorThisMonth))
      : new Date(Date.UTC(year, month - 1, clampDay(year, month - 1, anchorDay)))

  // resetAt: pencere başından bir sonraki ayın anchor'ı (clamp'li) = sonraki yenileme.
  const sY = start.getUTCFullYear()
  const sM = start.getUTCMonth()
  const resetAt = new Date(Date.UTC(sY, sM + 1, clampDay(sY, sM + 1, anchorDay)))

  return { key: isoDate(start), resetAt }
}
