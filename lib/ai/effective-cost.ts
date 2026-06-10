import type { MarketPrice } from "@/lib/marketfiyati/types"
import type { Unit } from "./schemas"

type Base = "l" | "kg" | "adet"

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * İstenen miktarı normalize bir baza (litre / kilogram / adet) çevirir. Böylece
 * farklı paket boyutları aynı ölçekte kıyaslanabilir. "paket" opak bir birimdir
 * (normalize edilemez) → base null.
 */
function requestBase(
  quantity: number,
  unit: Unit,
): { base: Base | null; amount: number } {
  switch (unit) {
    case "l":
      return { base: "l", amount: quantity }
    case "ml":
      return { base: "l", amount: quantity / 1000 }
    case "kg":
      return { base: "kg", amount: quantity }
    case "g":
      return { base: "kg", amount: quantity / 1000 }
    case "adet":
      return { base: "adet", amount: Math.max(1, quantity) }
    case "paket":
      return { base: null, amount: Math.max(1, quantity) }
  }
}

const SIZE_RE = /(\d+(?:[.,]\d+)?)\s*(adet|lt|litre|l|ml|kg|kilo|gr|gram|g)\b/

/**
 * Ürün adından paket boyutunu ("10 Adet", "1 Lt", "500 Gr") çıkarıp baz birime
 * çevirir. API `unitPriceValue`'su olmadığında veya baz uyuşmadığında (ör.
 * yumurtada API ₺/Kg dönerken kullanıcı adet istediğinde) yedek yol.
 */
function parseSizeFromText(text: string): { base: Base; amount: number } | null {
  const m = SIZE_RE.exec(text.toLocaleLowerCase("tr-TR"))
  if (!m) return null
  const n = parseFloat(m[1].replace(",", "."))
  if (!Number.isFinite(n) || n <= 0) return null
  switch (m[2]) {
    case "adet":
      return { base: "adet", amount: n }
    case "lt":
    case "litre":
    case "l":
      return { base: "l", amount: n }
    case "ml":
      return { base: "l", amount: n / 1000 }
    case "kg":
    case "kilo":
      return { base: "kg", amount: n }
    case "gr":
    case "gram":
    case "g":
      return { base: "kg", amount: n / 1000 }
    default:
      return null
  }
}

/**
 * Bir kalemin istenen miktarını belirli bir markette belirli bir üründen almanın
 * NORMALİZE maliyeti. Önceliklerle:
 *   1) API'nin birim fiyatı (₺/L, ₺/kg, ₺/adet) — istenen bazla uyuşuyorsa
 *   2) Ürün adından çıkarılan boyutla `paket fiyatı / boyut × istenen` — API
 *      birim fiyatı yoksa veya baz uyuşmuyorsa
 *   3) Yedek: ham paket fiyatı (adet/paket'te istenen adetle çarpılır)
 *
 * Bu sayede farklı paket boyutları (6'lı vs 10'lu yumurta) ve farklı marketler
 * adilce kıyaslanır; küçük-paket yanlılığı ve eski packCount çarpım hatası önlenir.
 */
export function effectiveLineCost(
  quantity: number,
  unit: Unit,
  mp: MarketPrice,
  productName: string,
): number {
  const req = requestBase(quantity, unit)

  // 1) API'nin normalize birim fiyatı — en güvenilir kaynak.
  if (req.base && mp.unitBase === req.base && mp.unitPriceValue != null) {
    return round2(mp.unitPriceValue * req.amount)
  }

  // 2) Ürün adından boyut türet → birim başına fiyat.
  if (req.base) {
    const size = parseSizeFromText(productName)
    if (size && size.base === req.base && size.amount > 0) {
      return round2((mp.price / size.amount) * req.amount)
    }
  }

  // 3) Yedek: paket fiyatı (adet/paket'te istenen adetle çarp).
  const mult = unit === "adet" || unit === "paket" ? Math.max(1, quantity) : 1
  return round2(mp.price * mult)
}
