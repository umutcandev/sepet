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

export type LineCost = {
  // Her zaman 1. İstenen miktar (adet/gramaj) kalemin FİYATINI ETKİLEMEZ;
  // yalnızca doğru ürünü eşleştirmek için kullanılır. Şema/UI uyumu için korunur.
  packsNeeded: number
  // Seçilen ürünün GERÇEK raf fiyatı (tek paket).
  packagePrice: number
  // Kalemin maliyeti = tek paketin raf fiyatı. Miktarla çarpım / oran-orantı YOK.
  total: number
}

/**
 * Bir markette bir ürünün paket boyutunu istenen baz biriminde türetir:
 *   1) API birim fiyatından: `paket fiyatı / birim fiyat` (baz uyuşuyorsa)
 *   2) Ürün adındaki boyuttan ("700 Gr", "1 Kg", "10 Adet")
 * Türetilemezse null. Boyut-overshoot kontrolü (hasSizeOvershoot) kullanır.
 */
function derivePackSize(
  base: Base,
  mp: MarketPrice,
  productName: string,
): number | null {
  let packSize: number | null = null
  // 1) API birim fiyatından paket boyutu (baz birimde).
  if (mp.unitBase === base && mp.unitPriceValue && mp.unitPriceValue > 0) {
    packSize = mp.price / mp.unitPriceValue
  }
  // 2) Ürün adından boyut.
  if (packSize == null || !Number.isFinite(packSize) || packSize <= 0) {
    const size = parseSizeFromText(productName)
    if (size && size.base === base && size.amount > 0) packSize = size.amount
  }
  if (packSize == null || !Number.isFinite(packSize) || packSize <= 0) return null
  return packSize
}

/**
 * Bir kalemin belirli bir markette belirli bir üründen maliyeti = o ürünün TEK
 * paketinin GERÇEK raf fiyatı. İstenen miktar (adet/gramaj) fiyata MÜDAHALE
 * ETMEZ — yalnızca doğru ürünü/marketi SEÇMEK için kullanılır. ÇARPIM YOK:
 * "6 adet limon" + "1 Kg Limon" → 1 kg'lık paketin raf fiyatı (6× değil).
 * Boyut farkı varsa kullanıcı `sizeMismatch` ("Farklı Boyut") rozetiyle
 * ayrıca uyarılır — ama fiyat asla çarpılmaz/uydurulmaz.
 */
export function effectiveLineCost(mp: MarketPrice): LineCost {
  return {
    packsNeeded: 1,
    packagePrice: mp.price,
    total: round2(mp.price),
  }
}

/**
 * Kullanıcı ölçülebilir bir miktar (gramaj/hacim — kg/l) istedi ama eşleşen ürün
 * o bazda fiyatlanamıyor mu? Tipik vaka: "tavuk göğüs 200 g" → "Tavuk Göğsü 1
 * Adet" — adetle satılan bir ürün gramajla istenince ne istenen miktar onurlanır
 * ne de fiyat anlamlı normalize edilir (effectiveLineCost ham paket fiyatına
 * düşer). Bu durumda kalem `sizeMismatch` sayılmalı; tasarruf/kıyas yapılmaz.
 *
 * Yalnızca SÜREKLİ ölçüler (kg/l) için anlamlıdır: "1 adet" istendiğinde gramajlı
 * bir ürünü (ekmek, lavaş) 1 paket almak doğal yorumdur — mismatch değildir.
 */
export function hasBaseMismatch(
  quantity: number,
  unit: Unit,
  product: { name: string; markets: MarketPrice[] },
): boolean {
  const req = requestBase(quantity, unit)
  if (req.base !== "kg" && req.base !== "l") return false
  // API herhangi bir markette istenen bazda birim fiyat veriyorsa uyumludur.
  const apiResolvable = product.markets.some(
    (mp) => mp.unitBase === req.base && mp.unitPriceValue != null,
  )
  if (apiResolvable) return false
  // Ürün adından istenen bazda bir boyut çıkarılabiliyorsa uyumludur.
  const size = parseSizeFromText(product.name)
  if (size && size.base === req.base) return false
  return true
}

// İstenen miktarı karşılayan en küçük paket, istenen miktarın bu katından
// büyükse boyut uyuşmazlığı sayılır. "200 g nohut" → en küçük paket "1 kg"
// (5×) kullanıcıyı istediğinin kat kat fazlasını almaya zorlar. 2× eşiği
// "500 g → 1 kg"yı işaretler ama "600 g → 1 kg" (1,67×) gibi makul yukarı
// yuvarlamaları işaretlemez.
const OVERSHOOT_FACTOR = 2

/**
 * Kullanıcı ölçülebilir bir miktar (kg/l) istedi ama eşleşen ürünün satılan EN
 * KÜÇÜK paketi bile istenen miktarı belirgin biçimde aşıyor mu? Baz uyumlu olsa
 * da (1 kg nohut ₺/kg fiyatlanır) "200 g istedim, 1 kg almak zorundayım" bir
 * boyut uyuşmazlığıdır — `hasBaseMismatch`'in yakalamadığı durum.
 *
 * Yalnızca SÜREKLİ ölçüler (kg/l) için anlamlıdır: "1 adet" / "1 paket"
 * istendiğinde tek paket almak doğal yorumdur, overshoot sayılmaz.
 */
export function hasSizeOvershoot(
  quantity: number,
  unit: Unit,
  product: { name: string; markets: MarketPrice[] },
): boolean {
  const req = requestBase(quantity, unit)
  if (req.base !== "kg" && req.base !== "l") return false
  let smallest: number | null = null
  for (const mp of product.markets) {
    const packSize = derivePackSize(req.base, mp, product.name)
    if (packSize != null && (smallest == null || packSize < smallest)) {
      smallest = packSize
    }
  }
  if (smallest == null) return false
  return smallest >= req.amount * OVERSHOOT_FACTOR
}
