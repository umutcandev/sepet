// Tek biçim kaynağı. Daha önce dokuz ayrı dosya kendi Intl örneğini kurup iki
// farklı para biçimi ("27,50 TL" ve "₺27,50") üretiyordu; kullanıcı ürün
// panelinde bir biçim, kayıt sayfasında başkasını görüyordu. Karar: her yerde
// "₺27,50". Yeni bir yerel formatter kurma — buradan import et.

const currencyFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
})

const decimalFmt = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "₺27,50" — projedeki tek para biçimi. */
export function formatTL(value: number): string {
  return currencyFmt.format(value)
}

/** `formatTL` ama null/NaN toleranslı ("—" fallback). */
export function formatTLOrDash(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return formatTL(value)
}

/** Sembolsüz ondalık — "₺" zaten bağlamda varsa (ör. tablo başlığında). */
export function formatAmount(value: number): string {
  return decimalFmt.format(value)
}

const quantityFmt = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 3,
})

/**
 * Miktar: "2", "1,5", "0,85" — gereksiz sıfır yok, ondalık ayracı Türkçe.
 *
 * İki ayrı dosyada `q.toFixed(2).replace(/\.?0+$/, "")` olarak duruyordu; hem
 * kopyaydı hem de para biçimi "₺1,50" iken miktarı "1.5" diye nokta ile
 * yazıyordu — aynı satırda iki farklı ondalık ayracı.
 */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return "0"
  return quantityFmt.format(value)
}

// ─── Tarih ───

const dateLongFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

const dateTimeFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const dateShortFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

/** "08 Ağustos 2026" — detay sayfası başlıkları. */
export function formatDate(value: DateInput): string {
  return dateLongFmt.format(toDate(value))
}

/** "08 Ağustos 2026 17:42" — kayıt zamanı. */
export function formatDateTime(value: DateInput): string {
  return dateTimeFmt.format(toDate(value))
}

/** "08 Ağu 2026" — liste satırları. */
export function formatDateShort(value: DateInput): string {
  return dateShortFmt.format(toDate(value))
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
