// Market registry — marketfiyati.org.tr 6 marketi destekliyor. Logo asset'leri
// henüz yok; `icon: null` olanlar UI'da baş-harf fallback gösterir (bkz.
// components/market-logo.tsx). Logolar eklenince public/market-logos/'a koyup
// icon alanını doldur.

export type MarketEntry = {
  name: string
  icon: string | null
  url: string | null
}

const REGISTRY: ReadonlyArray<MarketEntry> = [
  { name: "BİM", icon: null, url: "https://www.bim.com.tr" },
  { name: "A101", icon: null, url: "https://www.a101.com.tr" },
  { name: "Migros", icon: null, url: "https://www.migros.com.tr" },
  { name: "Şok", icon: null, url: "https://www.sokmarket.com.tr" },
  { name: "CarrefourSA", icon: null, url: "https://www.carrefoursa.com" },
  { name: "Tarım Kredi", icon: null, url: "https://www.tkkoopmarket.com.tr" },
]

// Türkçe-uyumlu agresif normalizasyon: diakritikleri sadeleştir, alfasayısal
// dışı her şeyi at. "Şok" / "sok" / "ŞOK!" hepsi "sok"; "tarim_kredi" →
// "tarimkredi" üretir (marketfiyati marketAdi formatıyla eşleşir).
function normalizeKey(input: string): string {
  if (!input) return ""
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

// marketfiyati `marketAdi` (küçük harf, ör. "carrefour", "tarim_kredi") ve diğer
// scrape/vision varyantları için köprüler. Anahtarlar normalize edilmiş form;
// değerler registry'deki canonical ad.
const ALIASES: Record<string, string> = {
  bim: "BİM",
  a101: "A101",
  a101kapida: "A101",
  migros: "Migros",
  migrosjet: "Migros",
  sok: "Şok",
  sokmarket: "Şok",
  carrefour: "CarrefourSA",
  carrefoursa: "CarrefourSA",
  tarimkredi: "Tarım Kredi",
  tarimkredikoop: "Tarım Kredi",
  tkkoop: "Tarım Kredi",
}

const BY_KEY = new Map<string, MarketEntry>()
for (const entry of REGISTRY) {
  BY_KEY.set(normalizeKey(entry.name), entry)
}

export function findMarket(name: string | null | undefined): MarketEntry | null {
  if (!name) return null
  const key = normalizeKey(name)
  if (!key) return null

  const direct = BY_KEY.get(key)
  if (direct) return direct

  const aliased = ALIASES[key]
  if (aliased) {
    const e = BY_KEY.get(normalizeKey(aliased))
    if (e) return e
  }

  // Son şans: registry içinde key başka bir adın anahtarına prefix oluyorsa
  // (örn. "carrefour" → "carrefoursa"). Tek eşleşme varsa kabul et, çoklu
  // eşleşmede belirsizliği önlemek için null dön.
  let match: MarketEntry | null = null
  for (const [k, entry] of BY_KEY) {
    if (k === key || k.startsWith(key) || key.startsWith(k)) {
      if (match) return null
      match = entry
    }
  }
  return match
}

export function getMarketLogo(name: string | null | undefined): string | null {
  return findMarket(name)?.icon ?? null
}

export function getMarketUrl(name: string | null | undefined): string | null {
  return findMarket(name)?.url ?? null
}

/**
 * marketfiyati'nin ham `marketAdi`'sini ("a101", "sok", "tarim_kredi") kullanıcıya
 * gösterilecek canonical ada ("A101", "Şok", "Tarım Kredi") çevirir. Registry'de
 * yoksa ham adı döndürür.
 */
export function getMarketDisplayName(name: string | null | undefined): string {
  return findMarket(name)?.name ?? (name ?? "")
}

export function getMarketInitial(name: string | null | undefined): string {
  if (!name) return "?"
  const trimmed = name.trim()
  if (!trimmed) return "?"
  return trimmed.charAt(0).toLocaleUpperCase("tr-TR")
}
