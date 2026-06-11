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

// Kullanıcı ölçülebilir (kg/l) bir miktar verdiğinde, eşleşen ürünün ADINDA
// yazan paket boyutu istenenden bu orandan fazla saparsa "Farklı Boyut"
// sayılır. ±%10 bandı etiket gürültüsünü (0,5 kg ↔ 500 g, "1 kg" ↔ 950 g)
// yutar ama 500 g → 750 g (1,5×) gibi gerçek farkları işaretler.
const SIZE_TOLERANCE = 0.1

/**
 * Kullanıcı ölçülebilir bir miktar (kg/l) istedi ama eşleşen ürünün paket boyutu
 * istenenden belirgin farklı mı? Hem AŞIM (500 g → 750 g / 1 kg) hem EKSİKLİK
 * (1,5 kg → 1 kg) "Farklı Boyut"tur: kullanıcı istediği gramajı/hacmi bu fiyata
 * almıyor. İstenen miktar fiyatı ETKİLEMEZ — yalnızca uyarı rozetidir.
 *
 * Paket boyutunu ÜRÜN ADINDAN okuruz ("... Yoğurt 750 Gr" → 0,75 kg). Adında
 * net bir boyut yoksa (açık/tartılan ürün: "Domates", "Kaşar Peyniri") sessiz
 * kalırız — tartıyla tam istenen miktar alınabildiği için yanlış uyarı vermeyiz.
 * (Eski sürüm API ₺/kg'dan boyut türetip açık ürünleri yanlış işaretliyordu.)
 *
 * Yalnızca SÜREKLİ ölçüler (kg/l) için anlamlıdır: "1 adet" / "1 paket"
 * istendiğinde tek paket almak doğal yorumdur; adet/koli (yumurta 10'lu viyol)
 * için bu kontrol çalışmaz — o farkı LLM eşleştirme adımı işaretler.
 */
export function hasSizeMismatch(
  quantity: number,
  unit: Unit,
  product: { name: string },
): boolean {
  const req = requestBase(quantity, unit)
  if (req.base !== "kg" && req.base !== "l") return false
  const size = parseSizeFromText(product.name)
  if (!size || size.base !== req.base || size.amount <= 0) return false
  const ratio = size.amount / req.amount
  return ratio < 1 - SIZE_TOLERANCE || ratio > 1 + SIZE_TOLERANCE
}
