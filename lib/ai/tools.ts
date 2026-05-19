import { generateObject } from "ai"
import {
  BasketDraftSchema,
  ChatTitleSchema,
  ImageAnalysisSchema,
  MatchSelectionSchema,
  type BasketDraft,
  type ImageAnalysis,
  type MatchResult,
  type MatchSelection,
  type ParsedItem,
} from "./schemas"
import { geminiFlash, geminiFlashLite } from "./models"
import {
  CHAT_TITLE_PROMPT,
  IMAGE_ANALYSIS_PROMPT,
  MATCH_PROMPT,
  PARSE_PROMPT,
  type MatchPromptItem,
} from "./prompts"
import { stripQuantityTokens } from "./normalize"
import { searchProducts, getProductByBarcode } from "@/lib/camgoz/cache"
import { CamgozError } from "@/lib/camgoz/client"
import { redis, CAMGOZ_CACHE_TTL_SECONDS } from "@/lib/redis"
import { createHash } from "node:crypto"

type FindOutcome =
  | { kind: "hit"; hits: Awaited<ReturnType<typeof searchProducts>>["hits"] }
  | { kind: "no_match" }
  | { kind: "api_quota"; message: string }
  | { kind: "api_error"; message: string }

async function findFirstHit(
  searchQuery: string,
  rawName: string,
): Promise<FindOutcome> {
  const tried = new Set<string>()
  const variants = [searchQuery, stripQuantityTokens(rawName)]
    .map((v) => v.trim())
    .filter((v) => v.length >= 2 && !tried.has(v) && tried.add(v))

  let lastError: FindOutcome | null = null

  for (const q of variants) {
    try {
      const result = await searchProducts(q)
      // En az bir marketten fiyat verisi olmayan adayları ele. Bunlar için
      // camgöz "ortalama fiyat" döndürse de hangi markette satıldığı belli
      // değil, dolayısıyla optimizasyona katkı yapamazlar.
      const hits = result.hits.filter((h) => h.marketCount >= 1)
      console.log(
        `[lookupProducts] q="${q}" cached=${result.cached} hits=${result.hits.length} withMarket=${hits.length}`,
      )
      if (hits.length > 0) return { kind: "hit", hits }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status = err instanceof CamgozError ? err.status : undefined
      console.error(
        `[lookupProducts] error for q="${q}" status=${status} ${message}`,
      )
      if (status === 402 || status === 429) {
        lastError = { kind: "api_quota", message }
      } else {
        lastError = { kind: "api_error", message }
      }
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
): Promise<ImageAnalysisWithReasoning> {
  const { object, reasoning } = await generateObject({
    model: geminiFlash,
    schema: ImageAnalysisSchema,
    temperature: 0.1,
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
  })
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

export async function generateChatTitle(userText: string): Promise<string> {
  const { object } = await generateObject({
    model: geminiFlashLite,
    schema: ChatTitleSchema,
    temperature: 0.2,
    prompt: CHAT_TITLE_PROMPT(userText),
  })
  return object.title.trim().replace(/\s+/g, " ").slice(0, 100)
}

export type BasketDraftWithReasoning = {
  draft: BasketDraft
  reasoning: string | null
}

export async function parseShoppingList(
  rawText: string,
): Promise<BasketDraftWithReasoning> {
  const { object, reasoning } = await generateObject({
    model: geminiFlashLite,
    schema: BasketDraftSchema,
    temperature: 0.1,
    prompt: PARSE_PROMPT(rawText),
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 512,
          includeThoughts: true,
        },
      },
    },
  })
  console.log(
    "[parseShoppingList] items:",
    object.items.map((i) => `${i.name} → "${i.searchQuery}"`).join(" | "),
    "reasoning=",
    reasoning ? `${reasoning.length} chars` : "none",
  )
  return { draft: object, reasoning: reasoning ?? null }
}

type HitList = Extract<FindOutcome, { kind: "hit" }>["hits"]
type ProductHitItem = HitList[number]

const MAX_CANDIDATES = 12

type CachedSelection = { barcode: string | null; sizeMismatch: boolean }

/**
 * LLM eşleştirme cache anahtarı. Aynı kalem (ham ad + miktar + birim) aynı
 * aday kümesiyle gelirse seçim de aynıdır — LLM'i tekrar çağırmaya gerek yok.
 */
function matchCacheKey(item: ParsedItem, hits: HitList): string {
  const payload = JSON.stringify({
    rawName: item.name.trim().toLocaleLowerCase("tr-TR"),
    quantity: item.quantity,
    unit: item.unit,
    candidates: hits
      .slice(0, MAX_CANDIDATES)
      .map((h) => h.barcode)
      .sort(),
  })
  return `camgoz:match:v2:${createHash("sha1").update(payload).digest("hex")}`
}

function toMatchedProduct(h: ProductHitItem) {
  return {
    barcode: h.barcode,
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
): Promise<Map<number, MatchSelection["selections"][number]>> {
  const promptItems: MatchPromptItem[] = prepared.map((p, idx) => ({
    itemIndex: idx,
    rawName: p.item.name,
    quantity: p.item.quantity,
    unit: p.item.unit,
    candidates: p.hits.slice(0, MAX_CANDIDATES).map((h) => ({
      barcode: h.barcode,
      name: h.name,
      brand: h.brand,
      category: h.category,
    })),
  }))

  const { object } = await generateObject({
    model: geminiFlashLite,
    schema: MatchSelectionSchema,
    temperature: 0.1,
    prompt: MATCH_PROMPT(promptItems),
  })

  const map = new Map<number, MatchSelection["selections"][number]>()
  for (const sel of object.selections) map.set(sel.itemIndex, sel)
  return map
}

export async function lookupProducts(
  items: ParsedItem[],
): Promise<{ matches: MatchResult[] }> {
  // Faz 1 — her kalem için aday ürünleri getir.
  const outcomes = await Promise.all(
    items.map((item) => findFirstHit(item.searchQuery, item.name)),
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
        const resolved: CachedSelection = sel
          ? { barcode: sel.matchedBarcode, sizeMismatch: sel.sizeMismatch }
          : // LLM başarısız ya da seçim yok → hits[0]'a geri düş (cache'leme).
            { barcode: entry.hits[0]?.barcode ?? null, sizeMismatch: false }
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
            p.set(key, value, { ex: CAMGOZ_CACHE_TTL_SECONDS })
          }
          await p.exec()
        } catch (err) {
          console.error("[lookupProducts] match cache write failed", err)
        }
      }
    }
  }

  // Faz 3 — sonuçları kur.
  const matches: MatchResult[] = await Promise.all(
    items.map(async (item, index) => {
      const outcome = outcomes[index]
      const hits = outcome.kind === "hit" ? outcome.hits : []
      const selection = pick.get(index) ?? null
      const best =
        selection?.barcode != null
          ? hits.find((h) => h.barcode === selection.barcode) ?? null
          : null
      const sizeMismatch = best ? (selection?.sizeMismatch ?? false) : false
      const detail = best ? await getProductByBarcode(best.barcode) : null

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

      const marketPrices = detail
        ? detail.markets.map((m) => ({
            market: m.market,
            price: m.price,
            sourceUrl: m.sourceUrl,
          }))
        : []

      return {
        rawName: item.name,
        searchQuery: item.searchQuery,
        quantity: item.quantity,
        unit: item.unit,
        bestMatch: best ? toMatchedProduct(best) : null,
        marketPrices,
        alternatives: hits
          .filter((h) => h.barcode !== best?.barcode)
          .slice(0, 3)
          .map(toMatchedProduct),
        lookupStatus,
        errorMessage,
        sizeMismatch,
      } satisfies MatchResult
    }),
  )
  return { matches }
}
