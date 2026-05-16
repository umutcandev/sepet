// Market logoları için statik registry. Camgöz /marketList endpoint'i
// nadiren değiştiği için repo'da elle tutuyoruz; runtime'da cache/fetch yok.
// Güncellemek için: scripts/sync-markets.ts (varsa) ya da elle düzenle.

export type MarketEntry = {
  name: string
  icon: string
  url: string | null
}

const REGISTRY: ReadonlyArray<MarketEntry> = [
  { name: "Afta Market", icon: "https://file.camgoz.net/aftamarket_logo3.png", url: "https://www.aftamarket.com.tr" },
  { name: "Asya Sanal Market", icon: "https://file.camgoz.net/asyamarket_sanallogo.png", url: "https://www.asyasanalmarket.com" },
  { name: "Onakro", icon: "https://file.camgoz.net/onakro.png", url: "https://onakro.com.tr" },
  { name: "EOnbir Gross", icon: "https://file.camgoz.net/eonbir-logo-png350x.png", url: "https://www.eonbir.com.tr" },
  { name: "Gourmet Garage", icon: "https://file.camgoz.net/gourmet.png", url: "https://gourmetgarage.com.tr" },
  { name: "Onur360", icon: "https://file.camgoz.net/onur360.webp", url: "https://www.onur360.com" },
  { name: "Şok Market", icon: "https://file.camgoz.net/sok.png", url: "https://www.sokmarket.com.tr" },
  { name: "ereyon.com.tr", icon: "https://file.camgoz.net/ereyon.webp", url: "https://www.ereyon.com.tr" },
  { name: "Turuncu Kasa", icon: "https://file.camgoz.net/turuncu2.jpg", url: "https://turuncukasa.com" },
  { name: "Onur", icon: "https://file.camgoz.net/onur.png", url: "https://www.onurmarket.com" },
  { name: "Arden", icon: "https://file.camgoz.net/arden.png", url: "https://ardenmarket.com.tr/" },
  { name: "Beymar", icon: "https://file.camgoz.net/beymar.png", url: "https://ebeymar.com" },
  { name: "HakkıAkyüz", icon: "https://file.camgoz.net/hakkı.png", url: "https://www.hakkiakyuz.com" },
  { name: "File", icon: "https://file.camgoz.net/file.png", url: "https://www.file.com.tr/" },
  { name: "Bizim Toptan", icon: "https://file.camgoz.net/bizim-magazalari--600.png", url: "https://www.bizimtoptan.com.tr" },
  { name: "A101", icon: "https://file.camgoz.net/a101.png", url: "https://www.a101.com.tr/kapida" },
  { name: "GrossCepte", icon: "https://file.camgoz.net/grosscepte.png", url: "https://www.grosscepte.com" },
  { name: "Demtaş Online Market", icon: "https://file.camgoz.net/demtas.webp", url: "https://www.demtaskapinda.com" },
  { name: "toptancozum.com", icon: "https://file.camgoz.net/toptancozum.webp", url: "https://toptancozum.com" },
  { name: "Çamlıca Süpermarket", icon: "https://file.camgoz.net/camlica.webp", url: "https://www.camlicasupermarket.com" },
  { name: "Ofma Market", icon: "https://file.camgoz.net/ofma.png", url: "https://www.ofma.com.tr" },
  { name: "Obak Market", icon: "https://file.camgoz.net/obak.webp", url: "https://www.obakmarket.com.tr" },
  { name: "Onyaka Sanal Market", icon: "https://file.camgoz.net/onyaka.jpeg", url: "https://www.onyakasanalmarket.com.tr" },
  { name: "Mopaş", icon: "https://file.camgoz.net/mopas.png", url: "https://mopas.com.tr" },
  { name: "Güleç Kapında", icon: "https://file.camgoz.net/gulec.png", url: "https://www.guleckapinda.com" },
  { name: "toptanservis.com.tr", icon: "https://file.camgoz.net/toptanservis.webp", url: "https://www.toptanservis.com.tr" },
  { name: "siparisgelecek.com", icon: "https://file.camgoz.net/siparis.png", url: "https://www.siparisgelecek.com" },
  { name: "Develi Gross", icon: "https://file.camgoz.net/develi.webp", url: "https://www.develigross.com" },
  { name: "Bil-mar", icon: "https://file.camgoz.net/bilmar.webp", url: "https://www.bilecen.com.tr" },
  { name: "Kale Online Market", icon: "https://file.camgoz.net/kale.png", url: "https://www.kalemarketleri.com" },
  { name: "Starling Süpermarket", icon: "https://file.camgoz.net/starling.png", url: "https://www.starlingsupermarket.com" },
  { name: "Hakmar", icon: "https://file.camgoz.net/hakmar.png", url: "https://www.hakmarexpress.com.tr/" },
  { name: "Oğul Market", icon: "https://file.camgoz.net/ogul.png", url: "https://www.ogulmarket.com.tr" },
  { name: "Tahtakale Spot", icon: "https://file.camgoz.net/tahtakale.png", url: "https://www.tahtakalespot.com" },
  { name: "Umut Toptan", icon: "https://file.camgoz.net/umut.webp", url: "https://www.umuthirdavat.com/" },
  { name: "Ekonomik Olsun", icon: "https://file.camgoz.net/ekonomi.png", url: "https://www.ekonomikolsun.com" },
  { name: "Düvenciler Süpermarket", icon: "https://file.camgoz.net/duvenci.png", url: "https://duvencilermarket.tr" },
  { name: "Asya Pazarı Sanal Market", icon: "https://file.camgoz.net/asyapazar2.webp", url: "https://www.asyapazari.com" },
  { name: "Özdilekteyim", icon: "https://file.camgoz.net/ozdilek.png", url: "https://www.ozdilekteyim.com" },
  { name: "Migros", icon: "https://file.camgoz.net/migros.png", url: "https://www.migros.com.tr/" },
  { name: "Hapeloğlu", icon: "https://file.camgoz.net/halepoglu.png", url: "https://www.hapeloglu.com" },
  { name: "Dodomar", icon: "https://file.camgoz.net/dodomar.webp", url: "https://www.dodomar.com" },
  { name: "kozmoyol.com", icon: "https://file.camgoz.net/kozmoyol.webp", url: "https://www.kozmoyol.com" },
  { name: "ultrasepet.com", icon: "https://file.camgoz.net/usepet_logo.png", url: "https://ultrasepet.com/" },
  { name: "Gürmar Online", icon: "https://file.camgoz.net/gurmar.png", url: "https://www.gurmar.com.tr/" },
  { name: "Günkay Sanal Market", icon: "https://file.camgoz.net/günkay.jpeg", url: "https://www.gunkaysanalmarket.com" },
  { name: "Barış Gross Market", icon: "https://file.camgoz.net/baris.png", url: "https://barisgrossonlinemagaza.com/" },
  { name: "eczane.com.tr", icon: "https://file.camgoz.net/eczane.jpeg", url: "https://www.eczane.com.tr/" },
  { name: "ToptanTR", icon: "https://file.camgoz.net/toptan.jpg", url: "https://www.toptantr.com" },
  { name: "Snowy Market", icon: "https://file.camgoz.net/snowy.png", url: "https://www.snowymarket.com/" },
  { name: "Özbesin", icon: "https://file.camgoz.net/ozbesin.png", url: "https://www.ozbesin.com" },
  { name: "Pazarama", icon: "https://file.camgoz.net/pazarama.jpg", url: "https://www.macrocenter.com.tr" },
  { name: "Show Sanal", icon: "https://file.camgoz.net/show.webp", url: "https://www.showsanal.com/" },
  { name: "Mercan Kurumsal", icon: "https://file.camgoz.net/mercankurumsal.svgg", url: "https://www.mercankurumsal.com" },
  { name: "Eren Market", icon: "https://file.camgoz.net/eren2.png", url: "https://erenmarket.com.tr/" },
  { name: "Essen Jet", icon: "https://file.camgoz.net/essen.png", url: "https://www.essenjet.com" },
  { name: "Macro Center", icon: "https://file.camgoz.net/macro.png", url: "https://www.macrocenter.com.tr" },
]

// Türkçe-uyumlu agresif normalizasyon: diakritikleri sadeleştir, alfasayısal
// dışı her şeyi at. "Şok Market" / "sok" / "ŞOK MARKET!" hepsi "sokmarket"
// üretir.
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

// Scrape/vision varyantları için manuel köprüler. Anahtarlar normalize edilmiş
// formda; değerler registry'deki canonical ad.
const ALIASES: Record<string, string> = {
  sok: "Şok Market",
  sokmarket: "Şok Market",
  a101kapida: "A101",
  migrosjet: "Migros",
  migrossanalmarket: "Migros",
  hakkiakyuz: "HakkıAkyüz",
  ogul: "Oğul Market",
  ofma: "Ofma Market",
  obak: "Obak Market",
  arden: "Arden",
  bilmar: "Bil-mar",
  bilecen: "Bil-mar",
  hapeloglu: "Hapeloğlu",
  halepoglu: "Hapeloğlu",
  ozdilek: "Özdilekteyim",
  ozdilekteyim: "Özdilekteyim",
  mopas: "Mopaş",
  ozbesin: "Özbesin",
  hakmarexpress: "Hakmar",
  duvenciler: "Düvenciler Süpermarket",
  camlica: "Çamlıca Süpermarket",
  starling: "Starling Süpermarket",
  gourmetgarage: "Gourmet Garage",
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
  // (örn. "migros" → "Migros"). Tek eşleşme varsa kabul et, çoklu eşleşmede
  // belirsizliği önlemek için null dön.
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

export function getMarketInitial(name: string | null | undefined): string {
  if (!name) return "?"
  const trimmed = name.trim()
  if (!trimmed) return "?"
  return trimmed.charAt(0).toLocaleUpperCase("tr-TR")
}
