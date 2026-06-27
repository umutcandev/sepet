import { generateObject } from "ai"
import {
  BasketDraftSchema,
  ChatTitleSchema,
  ImageAnalysisSchema,
  MatchSelectionSchema,
  type BasketDraft,
  type ImageAnalysis,
  type MarketOption,
  type MatchResult,
  type MatchSelection,
  type ParsedItem,
} from "./schemas"
import {
  geminiFlash,
  geminiFlashLite,
  GEMINI_FLASH,
  GEMINI_FLASH_LITE,
  AI_MAX_RETRIES,
  type AiCallOptions,
} from "./models"
import { withLlmCall } from "./telemetry"
import {
  CHAT_TITLE_PROMPT,
  IMAGE_ANALYSIS_PROMPT,
  MATCH_PROMPT,
  PARSE_PROMPT,
  type MatchPromptItem,
} from "./prompts"
import { stripQuantityTokens } from "./normalize"
import { searchProductDetails } from "@/lib/marketfiyati/cache"
import type { ProductDetail } from "@/lib/marketfiyati/types"
import {
  MarketfiyatiError,
  MF_DEFAULT_LOCATION,
  type LocationContext,
} from "@/lib/marketfiyati/client"
import { effectiveLineCost, hasBaseMismatch, hasSizeMismatch } from "./effective-cost"
import { redis, MF_MATCH_TTL } from "@/lib/redis"
import { createHash } from "node:crypto"

type FindOutcome =
  | { kind: "hit"; hits: ProductDetail[] }
  | { kind: "no_match" }
  | { kind: "api_quota"; message: string }
  | { kind: "api_error"; message: string }

async function findFirstHit(
  searchQuery: string,
  rawName: string,
  loc: LocationContext,
): Promise<FindOutcome> {
  const tried = new Set<string>()
  const variants = [searchQuery, stripQuantityTokens(rawName)]
    .map((v) => v.trim())
    .filter((v) => v.length >= 2 && !tried.has(v) && tried.add(v))

  let lastError: FindOutcome | null = null

  for (const q of variants) {
    try {
      const result = await searchProductDetails(q, loc)
      // En az bir marketten gerçek fiyatı olmayan adayları ele — bir depo
      // fiyatı yoksa o ürün optimizasyona katkı yapamaz.
      const hits = result.details.filter((d) => d.markets.length >= 1)
      console.log(
        `[lookupProducts] q="${q}" cached=${result.cached} hits=${result.details.length} withMarket=${hits.length}`,
      )
      if (hits.length > 0) return { kind: "hit", hits }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status = err instanceof MarketfiyatiError ? err.status : undefined
      console.error(
        `[lookupProducts] error for q="${q}" status=${status} ${message}`,
      )
      // Marketfiyati ücretsiz — kota yok. 403/429/WAF/5xx hepsi geçici API hatası.
      lastError = { kind: "api_error", message }
    }
  }
  return lastError ?? { kind: "no_match" }
}

export type ImageAnalysisWithReasoning = {
  analysis: ImageAnalysis
  reasoning: string | null
}

export async function analyzeImage(
  imageUrl: string,
  opts: AiCallOptions = {},
): Promise<ImageAnalysisWithReasoning> {
  const { object, reasoning } = await withLlmCall(
    "analyzeImage",
    GEMINI_FLASH,
    () =>
      generateObject({
        model: geminiFlash,
        schema: ImageAnalysisSchema,
        temperature: 0.1,
        abortSignal: opts.signal,
        maxRetries: opts.maxRetries ?? AI_MAX_RETRIES,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: IMAGE_ANALYSIS_PROMPT },
              { type: "image", image: new URL(imageUrl) },
            ],
          },
        ],
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: 1024,
              includeThoughts: true,
            },
          },
        },
      }),
  )
  console.log(
    "[analyzeImage] kind=",
    object.kind,
    object.kind === "receipt"
      ? `market=${object.receipt?.marketName} items=${object.receipt?.items.length} total=${object.receipt?.totalAmount}`
      : object.kind === "food"
        ? `dish=${object.food?.dishName} items=${object.food?.items.length}`
        : `reason=${object.unknownReason}`,
    "reasoning=",
    reasoning ? `${reasoning.length} chars` : "none",
  )
  return { analysis: object, reasoning: reasoning ?? null }
}

export async function generateChatTitle(
  userText: string,
  opts: AiCallOptions = {},
): Promise<string> {
  const { object } = await withLlmCall("generateChatTitle", GEMINI_FLASH_LITE, () =>
    generateObject({
      model: geminiFlashLite,
      schema: ChatTitleSchema,
      temperature: 0.2,
      abortSignal: opts.signal,
      maxRetries: opts.maxRetries ?? AI_MAX_RETRIES,
      prompt: CHAT_TITLE_PROMPT(userText),
    }),
  )
  return object.title.trim().replace(/\s+/g, " ").slice(0, 100)
}

export type BasketDraftWithReasoning = {
  draft: BasketDraft
  reasoning: string | null
}

export async function parseShoppingList(
  rawText: string,
  opts: AiCallOptions = {},
): Promise<BasketDraftWithReasoning> {
  const { object, reasoning } = await withLlmCall(
    "parseShoppingList",
    GEMINI_FLASH_LITE,
    () =>
      generateObject({
        model: geminiFlashLite,
        schema: BasketDraftSchema,
        temperature: 0.1,
        abortSignal: opts.signal,
        maxRetries: opts.maxRetries ?? AI_MAX_RETRIES,
        prompt: PARSE_PROMPT(rawText),
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: 512,
              includeThoughts: true,
            },
          },
        },
      }),
  )
  console.log(
    "[parseShoppingList] items:",
    object.items.map((i) => `${i.name} → "${i.searchQuery}"`).join(" | "),
    "reasoning=",
    reasoning ? `${reasoning.length} chars` : "none",
  )
  return { draft: object, reasoning: reasoning ?? null }
}

type HitList = ProductDetail[]
type ProductHitItem = ProductDetail

const MAX_CANDIDATES = 12

type CachedSelection = {
  primaryProductId: string | null
  acceptedProductIds: string[]
  sizeMismatch: boolean
}

/**
 * MATCH_PROMPT'un içeriğinden türetilen kısa sürüm damgası. Eskiden cache anahtarı
 * prompt'a bağlı DEĞİLDİ; prompt kuralı değişince elle `v4` gibi bir sürüm bump'ı
 * yapmak ŞARTTI — unutulursa eski (yanlış) seçimler TTL boyunca servis ediliyordu.
 * Artık prompt şablonunun kendisini hash'leyerek bunu OTOMATİKLEŞTİRİYORUZ: kabul/
 * red kuralları her değiştiğinde damga da değişir ve cache kendiliğinden geçersiz
 * olur. `MATCH_PROMPT([])` sabit aday listesiyle (boş) yalnızca kural metnini verir.
 */
const MATCH_PROMPT_VERSION = createHash("sha1")
  .update(MATCH_PROMPT([]))
  .digest("hex")
  .slice(0, 12)

/**
 * LLM eşleştirme cache anahtarı. Aynı kalem (ham ad + miktar + birim) aynı aday
 * kümesi VE aynı prompt sürümüyle gelirse seçim de aynıdır — LLM'i tekrar
 * çağırmaya gerek yok. Prompt sürümü (MATCH_PROMPT_VERSION) anahtara dahil
 * olduğundan kural değişikliği eski seçimleri otomatik geçersiz kılar.
 */
function matchCacheKey(item: ParsedItem, hits: HitList): string {
  const payload = JSON.stringify({
    rawName: item.name.trim().toLocaleLowerCase("tr-TR"),
    quantity: item.quantity,
    unit: item.unit,
    candidates: hits
      .slice(0, MAX_CANDIDATES)
      .map((h) => h.productId)
      .sort(),
  })
  return `mf:match:${MATCH_PROMPT_VERSION}:${createHash("sha1").update(payload).digest("hex")}`
}

function toMatchedProduct(h: ProductHitItem) {
  return {
    productId: h.productId,
    name: h.name,
    brand: h.brand,
    category: h.category,
    imageUrl: h.imageUrl,
    averagePrice: h.averagePrice,
    minPrice: h.minPrice,
    maxPrice: h.maxPrice,
    marketCount: h.marketCount,
  }
}

/**
 * Adayı olan kalemleri tek bir LLM çağrısında doğru ürüne eşler. Dönüş:
 * promptIndex → seçim. Çağrı hata verirse istisna fırlatır; çağıran taraf
 * hits[0] davranışına geri düşer.
 */
async function selectMatches(
  prepared: Array<{ item: ParsedItem; hits: HitList }>,
  opts: AiCallOptions = {},
): Promise<Map<number, MatchSelection["selections"][number]>> {
  const promptItems: MatchPromptItem[] = prepared.map((p, idx) => ({
    itemIndex: idx,
    rawName: p.item.name,
    quantity: p.item.quantity,
    unit: p.item.unit,
    candidates: p.hits.slice(0, MAX_CANDIDATES).map((h) => ({
      productId: h.productId,
      name: h.name,
      brand: h.brand,
      category: h.category,
    })),
  }))

  const { object } = await withLlmCall("selectMatches", GEMINI_FLASH_LITE, () =>
    generateObject({
      model: geminiFlashLite,
      schema: MatchSelectionSchema,
      temperature: 0.1,
      abortSignal: opts.signal,
      maxRetries: opts.maxRetries ?? AI_MAX_RETRIES,
      prompt: MATCH_PROMPT(promptItems),
    }),
  )

  const map = new Map<number, MatchSelection["selections"][number]>()
  for (const sel of object.selections) map.set(sel.itemIndex, sel)
  return map
}

/**
 * LLM seçimini (ya da yokluğunu) normalize CachedSelection'a çevirir:
 * - Sadece gerçekten aday listesinde olan productId'leri tutar (halüsinasyon ele).
 * - acceptedProductIds'in primary'yi içermesini garanti eder.
 * - LLM yok/başarısızsa en üst adaya geri düşer (cache'lenmez).
 */
function resolveSelection(
  sel: MatchSelection["selections"][number] | null | undefined,
  hits: HitList,
): CachedSelection {
  const validIds = new Set(hits.map((h) => h.productId))

  if (!sel) {
    const top = hits[0]?.productId ?? null
    return {
      primaryProductId: top,
      acceptedProductIds: top ? [top] : [],
      sizeMismatch: false,
    }
  }

  const accepted = (sel.acceptedProductIds ?? []).filter((id) =>
    validIds.has(id),
  )
  let primary =
    sel.primaryProductId && validIds.has(sel.primaryProductId)
      ? sel.primaryProductId
      : null
  if (primary && !accepted.includes(primary)) accepted.unshift(primary)
  if (!primary) primary = accepted[0] ?? null

  return {
    primaryProductId: primary,
    acceptedProductIds: accepted,
    sizeMismatch: sel.sizeMismatch,
  }
}

/**
 * Market-bilinçli optimizasyon girdisi. Kabul edilen adaylar arasından HER
 * market için en hesaplı (tek paket raf fiyatı en düşük) seçeneği bulur. İstenen
 * miktar fiyata etki etmez — yalnızca eşleştirmede kullanılır. Aynı kalem farklı
 * marketlerde farklı ürüne çözülebilir — tek/iki market kombinasyonlarının özü budur.
 */
function buildMarketOptions(accepted: HitList): MarketOption[] {
  const byMarket = new Map<string, MarketOption>()
  for (const cand of accepted) {
    for (const mp of cand.markets) {
      const { packsNeeded, packagePrice, total } = effectiveLineCost(mp)
      const cur = byMarket.get(mp.market)
      if (!cur || total < cur.effectiveCost) {
        byMarket.set(mp.market, {
          market: mp.market,
          productId: cand.productId,
          productName: cand.name,
          packagePrice,
          packsNeeded,
          effectiveCost: total,
          unitPriceLabel: mp.unitPrice ?? null,
          depotName: mp.depotName,
        })
      }
    }
  }
  return Array.from(byMarket.values()).sort(
    (a, b) => a.effectiveCost - b.effectiveCost,
  )
}

export async function lookupProducts(
  items: ParsedItem[],
  loc: LocationContext = MF_DEFAULT_LOCATION,
  opts: AiCallOptions = {},
): Promise<{ matches: MatchResult[] }> {
  // Faz 1 — her kalem için aday ürünleri getir.
  const outcomes = await Promise.all(
    items.map((item) => findFirstHit(item.searchQuery, item.name, loc)),
  )

  // Faz 2 — adayı olan kalemleri doğru ürüne eşle. Önce match-cache'e bak;
  // yalnızca cache miss olan kalemleri tek bir LLM çağrısına gönder.
  const withHits: Array<{ index: number; item: ParsedItem; hits: HitList }> = []
  outcomes.forEach((outcome, index) => {
    if (outcome.kind === "hit") {
      withHits.push({ index, item: items[index], hits: outcome.hits })
    }
  })

  // index (orijinal item sırası) → seçim.
  const pick = new Map<number, CachedSelection>()

  if (withHits.length > 0) {
    const cacheKeys = withHits.map((e) => matchCacheKey(e.item, e.hits))
    let cached: (CachedSelection | null)[] = []
    try {
      cached = await redis.mget<(CachedSelection | null)[]>(...cacheKeys)
    } catch (err) {
      console.error("[lookupProducts] match cache read failed", err)
      cached = []
    }

    // Cache hit → doğrudan pick'e. Cache miss → LLM kuyruğuna.
    const misses: Array<{ withHitsIdx: number; item: ParsedItem; hits: HitList }> =
      []
    withHits.forEach((entry, i) => {
      const hit = cached[i]
      if (hit) {
        pick.set(entry.index, hit)
      } else {
        misses.push({ withHitsIdx: i, item: entry.item, hits: entry.hits })
      }
    })
    console.log(
      `[lookupProducts] match cache: ${withHits.length - misses.length}/${withHits.length} hit, ${misses.length} → LLM`,
    )

    if (misses.length > 0) {
      let selections: Map<number, MatchSelection["selections"][number]> | null =
        null
      try {
        selections = await selectMatches(
          misses.map(({ item, hits }) => ({ item, hits })),
          opts,
        )
      } catch (err) {
        console.error(
          "[lookupProducts] match selection failed, falling back to hits[0]",
          err,
        )
        selections = null
      }

      // promptIndex (misses sırası) → orijinal item index'ine geri eşle.
      const toCache: Array<{ key: string; value: CachedSelection }> = []
      misses.forEach((miss, promptIndex) => {
        const sel = selections?.get(promptIndex)
        const entry = withHits[miss.withHitsIdx]
        // LLM başarısız ya da seçim yok → hits[0]'a geri düş (cache'leme).
        const resolved = resolveSelection(sel, entry.hits)
        pick.set(entry.index, resolved)
        if (sel) {
          toCache.push({ key: cacheKeys[miss.withHitsIdx], value: resolved })
        }
      })

      // Yalnızca LLM'in gerçekten cevapladığı seçimleri cache'le.
      if (toCache.length > 0) {
        try {
          const p = redis.pipeline()
          for (const { key, value } of toCache) {
            p.set(key, value, { ex: MF_MATCH_TTL })
          }
          await p.exec()
        } catch (err) {
          console.error("[lookupProducts] match cache write failed", err)
        }
      }
    }
  }

  // Faz 3 — sonuçları kur. /search zaten her adayın market kırılımını getirdiği
  // için ekstra ürün detayı çağrısına gerek yok.
  const matches: MatchResult[] = items.map((item, index) => {
    const outcome = outcomes[index]
    const hits = outcome.kind === "hit" ? outcome.hits : []
    const selection = pick.get(index) ?? null

    // Kabul edilen ve gerçek market fiyatı olan adaylar.
    const acceptedIds = new Set(selection?.acceptedProductIds ?? [])
    const accepted = hits.filter(
      (h) => acceptedIds.has(h.productId) && h.markets.length > 0,
    )
    const primary =
      (selection?.primaryProductId
        ? accepted.find((h) => h.productId === selection.primaryProductId)
        : undefined) ??
      accepted[0] ??
      null
    const best = primary
    // LLM yalnızca adetli/rawName boyut farklarını (ör. "2 yumurta" → 10'lu
    // viyol) güvenilir işaretler. Sepet onayında ölçülebilir boyut ayrı
    // quantity/unit alanında gelir; bu yüzden kg/l farklarını deterministik
    // kontrollerle yakalarız:
    //   · hasBaseMismatch — gramaj istenip adetle satılan ürünle eşleşme
    //     ("tavuk göğüs 200 g" → "Tavuk Göğsü 1 Adet").
    //   · hasSizeMismatch — ürün adındaki paket boyutu istenenden ±%10'dan
    //     fazla sapıyor ("yoğurt 500 g" → "... Yoğurt 750 Gr", 1,5×).
    const sizeMismatch = best
      ? (selection?.sizeMismatch ?? false) ||
        hasBaseMismatch(item.quantity, item.unit, best) ||
        hasSizeMismatch(item.quantity, item.unit, best)
      : false

    const lookupStatus: MatchResult["lookupStatus"] =
      outcome.kind === "hit"
        ? best
          ? "ok"
          : "no_match"
        : outcome.kind === "no_match"
          ? "no_match"
          : outcome.kind === "api_quota"
            ? "api_quota"
            : "api_error"

    const errorMessage =
      outcome.kind === "api_quota" || outcome.kind === "api_error"
        ? outcome.message
        : null

    // Temsilci ürünün (UI kartı) market fiyatları.
    const marketPrices = best
      ? best.markets.map((m) => ({
          market: m.market,
          price: m.price,
          depotName: m.depotName,
        }))
      : []

    return {
      rawName: item.name,
      searchQuery: item.searchQuery,
      quantity: item.quantity,
      unit: item.unit,
      bestMatch: best ? toMatchedProduct(best) : null,
      marketPrices,
      marketOptions: buildMarketOptions(accepted),
      alternatives: accepted
        .filter((h) => h.productId !== best?.productId)
        .slice(0, 3)
        .map(toMatchedProduct),
      lookupStatus,
      errorMessage,
      sizeMismatch,
    } satisfies MatchResult
  })
  return { matches }
}
