// Market registry — marketfiyati.org.tr 6 marketi destekliyor. Logolar
// public/market-logos/ altında 1:1 kare webp olarak tutulur. Eksik bir dosya
// olduğunda MarketLogo (components/market-logo.tsx) yükleme hatasında baş-harf
// fallback'ine düşer — kırık görsel göstermez. Yeni logo eklemek için: kareyi
// public/market-logos/<slug>.webp olarak koy, başka değişiklik gerekmez.

export type MarketEntry = {
  name: string
  icon: string | null
  url: string | null
  /** Marka rengi; haritada o markete giden rota bu renkle çizilir. */
  color: string
  /** "national": fiyat her şubede aynı, rota tek şubeye. "branch": şubeye özel kampanya var. */
  pricing: "national" | "branch"
}

export const MARKETS: ReadonlyArray<MarketEntry> = [
  { name: "BİM", icon: "/market-logos/bim.webp", url: "https://www.bim.com.tr", color: "#E30613", pricing: "national" },
  { name: "A101", icon: "/market-logos/a101.webp", url: "https://www.a101.com.tr", color: "#009FE3", pricing: "national" },
  { name: "Migros", icon: "/market-logos/migros.webp", url: "https://www.migros.com.tr", color: "#F39200", pricing: "branch" },
  { name: "Şok", icon: "/market-logos/sok.webp", url: "https://www.sokmarket.com.tr", color: "#F2B700", pricing: "national" },
  { name: "CarrefourSA", icon: "/market-logos/carrefoursa.webp", url: "https://www.carrefoursa.com", color: "#1E5BC6", pricing: "branch" },
  { name: "Tarım Kredi", icon: "/market-logos/tarim-kredi.webp", url: "https://www.tkkoopmarket.com.tr", color: "#00843D", pricing: "branch" },
]

const FALLBACK_COLOR = "#6D4530"

export function getMarketColor(name: string | null | undefined): string {
  return findMarket(name)?.color ?? FALLBACK_COLOR
}

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
for (const entry of MARKETS) {
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

export function hasNationalPricing(name: string | null | undefined): boolean {
  return findMarket(name)?.pricing === "national"
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
