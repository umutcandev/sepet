import { generateObject } from "ai"
import {
  BasketDraftSchema,
  type BasketDraft,
  type MatchResult,
  type ParsedItem,
} from "./schemas"
import { geminiFlashLite } from "./models"
import { PARSE_PROMPT } from "./prompts"
import { searchProducts, getProductByBarcode } from "@/lib/camgoz/cache"
import { CamgozError } from "@/lib/camgoz/client"

const TURKISH_QUANTITY_TOKENS = new Set([
  "tane",
  "adet",
  "paket",
  "kutu",
  "şişe",
  "şise",
  "kg",
  "g",
  "gr",
  "gram",
  "kilo",
  "lt",
  "l",
  "litre",
  "ml",
  "bir",
  "iki",
  "üç",
  "uc",
  "dört",
  "dort",
  "beş",
  "bes",
  "altı",
  "alti",
  "yarım",
  "yarim",
])

function stripQuantityTokens(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/[0-9]+([.,][0-9]+)?/g, " ")
    .split(/\s+/)
    .filter((tok) => tok.length > 1 && !TURKISH_QUANTITY_TOKENS.has(tok))
    .join(" ")
    .trim()
}

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
      console.log(
        `[lookupProducts] q="${q}" cached=${result.cached} hits=${result.hits.length}`,
      )
      if (result.hits.length > 0) return { kind: "hit", hits: result.hits }
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

export async function parseShoppingList(rawText: string): Promise<BasketDraft> {
  const { object } = await generateObject({
    model: geminiFlashLite,
    schema: BasketDraftSchema,
    temperature: 0.1,
    prompt: PARSE_PROMPT(rawText),
  })
  console.log(
    "[parseShoppingList] items:",
    object.items.map((i) => `${i.name} → "${i.searchQuery}"`).join(" | "),
  )
  return object
}

export async function lookupProducts(
  items: ParsedItem[],
): Promise<{ matches: MatchResult[] }> {
  const matches: MatchResult[] = await Promise.all(
    items.map(async (item) => {
      const outcome = await findFirstHit(item.searchQuery, item.name)
      const hits = outcome.kind === "hit" ? outcome.hits : []
      const best = hits[0] ?? null
      const detail = best ? await getProductByBarcode(best.barcode) : null

      const lookupStatus: MatchResult["lookupStatus"] =
        outcome.kind === "hit"
          ? "ok"
          : outcome.kind === "no_match"
            ? "no_match"
            : outcome.kind === "api_quota"
              ? "api_quota"
              : "api_error"

      const errorMessage =
        outcome.kind === "api_quota" || outcome.kind === "api_error"
          ? outcome.message
          : null

      return {
        rawName: item.name,
        searchQuery: item.searchQuery,
        quantity: item.quantity,
        unit: item.unit,
        bestMatch: best
          ? {
              barcode: best.barcode,
              name: best.name,
              brand: best.brand,
              category: best.category,
              imageUrl: best.imageUrl,
              averagePrice: best.averagePrice,
              minPrice: best.minPrice,
              maxPrice: best.maxPrice,
              marketCount: best.marketCount,
            }
          : null,
        marketPrices: detail
          ? detail.markets.map((m) => ({
              market: m.market,
              price: m.price,
              sourceUrl: m.sourceUrl,
            }))
          : [],
        alternatives: hits.slice(1, 4).map((h) => ({
          barcode: h.barcode,
          name: h.name,
          brand: h.brand,
          category: h.category,
          imageUrl: h.imageUrl,
          averagePrice: h.averagePrice,
          minPrice: h.minPrice,
          maxPrice: h.maxPrice,
          marketCount: h.marketCount,
        })),
        lookupStatus,
        errorMessage,
      } satisfies MatchResult
    }),
  )
  return { matches }
}
