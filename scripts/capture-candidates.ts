/**
 * Faz 1 adım A — 84 temel gıdanın aday havuzunu marketfiyati'den çekip
 * lib/ai/eval/candidates/*.json olarak dondurur.
 *
 * Throttle spesifikasyonu (plan §8): seri koşu, sorgular arası ~10 sn ± 3 sn
 * jitter, terim başına checkpoint, 403/429'da RETRY YOK — koşu tamamen durur.
 * Toplam ~15 dk / 252 istek (0,28 istek/sn); Sepet'in tek bir 8 kalemlik
 * sepeti zaten 24 istek atıyor.
 *
 *   pnpm eval:capture              eksik terimleri çeker (kaldığı yerden devam)
 *   pnpm eval:capture --force      hepsini yeniden çeker
 *   pnpm eval:capture --only=süt   tek terim
 */
import { mkdir, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"

import { TERMS, termSlug } from "@/lib/ai/eval/terms"
import type { CaptureFile, CapturedCandidate } from "@/lib/ai/eval/types"
import { MF_MATCH_PAGES, searchProductDetails } from "@/lib/marketfiyati/cache"
import { MarketfiyatiError, nearest, type LocationContext } from "@/lib/marketfiyati/client"
import type { ProductDetail } from "@/lib/marketfiyati/types"

const OUT_DIR = join(process.cwd(), "lib/ai/eval/candidates")
const GAP_MS = 10_000
const JITTER_MS = 3_000

/**
 * Konum env'den OKUNMAZ (plan §8 kural 7): farklı konum farklı depo seti, yani
 * farklı aday havuzu demek. Geliştiricinin kendi MARKETFIYATI_DEFAULT_LAT'ı
 * fixture'ı sessizce başka bir şehirde dondurmasın diye burada sabit —
 * .env.example'daki İstanbul referansı. --lat/--lng/--distance ile geçilebilir.
 */
const EVAL_LOCATION: LocationContext = {
  latitude: 41.06495,
  longitude: 28.983262,
  distance: 10,
  depots: [],
}

const args = process.argv.slice(2)
const force = args.includes("--force")
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length)
const numArg = (name: string) => {
  const v = args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1]
  return v === undefined ? undefined : Number(v)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const nextGap = () => GAP_MS + (Math.random() * 2 - 1) * JITTER_MS

/** Fiyat alanları prompt'a girmez; "en ucuz X" primary kuralı ve denetim için. */
function toCandidate(d: ProductDetail): CapturedCandidate {
  return {
    productId: d.productId,
    name: d.name,
    brand: d.brand,
    category: d.category,
    marketCount: d.marketCount,
    minPrice: d.minPrice,
    maxPrice: d.maxPrice,
    markets: d.markets.map((m) => ({ market: m.market, price: m.price })),
  }
}

function fatal(message: string): never {
  console.error(`\n✗ ${message}`)
  console.error("  Çekim durduruldu. Tamamlanan terimler diskte — tekrar")
  console.error("  koştuğunda kaldığı yerden devam eder.")
  process.exit(1)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const queue = TERMS.filter((t) => {
    if (only) return t.term === only
    if (force) return true
    return !existsSync(join(OUT_DIR, `${termSlug(t.term)}.json`))
  })

  if (queue.length === 0) {
    console.log("Çekilecek terim yok — hepsi diskte. --force ile yenileyebilirsin.")
    return
  }

  const loc: LocationContext = {
    ...EVAL_LOCATION,
    latitude: numArg("lat") ?? EVAL_LOCATION.latitude,
    longitude: numArg("lng") ?? EVAL_LOCATION.longitude,
    distance: numArg("distance") ?? EVAL_LOCATION.distance,
  }
  let depotCount = 0
  try {
    depotCount = (await nearest(loc.latitude, loc.longitude, loc.distance)).length
  } catch (err) {
    fatal(`/nearest başarısız: ${err instanceof Error ? err.message : String(err)}`)
  }

  const eta = Math.round((queue.length * GAP_MS) / 60_000)
  console.log(
    `Sepet — aday çekimi · ${queue.length}/${TERMS.length} terim · ` +
      `${MF_MATCH_PAGES} sayfa · ~${eta} dk`,
  )
  console.log(
    `konum: ${loc.latitude}, ${loc.longitude} · ${loc.distance} km · ${depotCount} depo\n`,
  )

  const started = Date.now()
  for (const [i, entry] of queue.entries()) {
    const label = `[${String(i + 1).padStart(2)}/${queue.length}] ${entry.term}`
    let raw: Awaited<ReturnType<typeof searchProductDetails>>
    try {
      raw = await searchProductDetails(entry.term, loc, { pages: MF_MATCH_PAGES })
    } catch (err) {
      if (err instanceof MarketfiyatiError && (err.status === 403 || err.status === 429)) {
        fatal(`${entry.term}: WAF sinyali (${err.status}). Zorlama — yarın dene.`)
      }
      fatal(`${entry.term}: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Üretimdeki aday havuzuyla AYNI filtre (tools.ts → findFirstHit): en az bir
    // markette gerçek fiyatı olmayan aday optimizasyona katkı yapamaz.
    const withMarket = raw.details.filter((d) => d.markets.length >= 1)
    const file: CaptureFile = {
      term: entry.term,
      category: entry.category,
      split: entry.split,
      capturedAt: new Date().toISOString(),
      location: {
        lat: loc.latitude,
        lng: loc.longitude,
        distance: loc.distance,
        depotCount,
      },
      candidates: withMarket.map(toCandidate),
    }
    await writeFile(
      join(OUT_DIR, `${termSlug(entry.term)}.json`),
      `${JSON.stringify(file, null, 2)}\n`,
    )

    const multi = withMarket.filter((d) => d.marketCount > 1).length
    console.log(
      `${label.padEnd(26)} ${String(withMarket.length).padStart(3)} aday ` +
        `(${raw.details.length} ham, ${multi} çok-marketli)` +
        (raw.cached ? " · cache" : ""),
    )

    if (i < queue.length - 1) await sleep(nextGap())
  }

  const mins = ((Date.now() - started) / 60_000).toFixed(1)
  console.log(`\n✓ ${queue.length} terim çekildi · ${mins} dk · ${OUT_DIR}`)
}

main().catch((err) => fatal(err instanceof Error ? err.message : String(err)))
