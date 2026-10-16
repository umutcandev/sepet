import { generateObject } from "ai"
import {
  BasketDraftOutputSchema,
  ChatTitleSchema,
  ImageAnalysisOutputSchema,
  MatchSelectionSchema,
  QuerySuggestionSchema,
  type BasketDraft,
  type ImageAnalysis,
  type MatchResult,
  type MatchSelection,
  type ParsedItem,
} from "./schemas"
import {
  geminiFlash,
  geminiFlashLite,
  GEMINI_FLASH,
  GEMINI_FLASH_LITE,
  FLASH_THINKING_BUDGET,
  AI_MAX_RETRIES,
  type AiCallOptions,
} from "./models"
import { devLog, isAbortError, withLlmCall } from "./telemetry"
import { userThought } from "./user-thought"
import {
  CHAT_TITLE_PROMPT,
  IMAGE_ANALYSIS_PROMPT,
  MATCH_PROMPT,
  PARSE_PROMPT,
  QUERY_SUGGESTION_PROMPT,
  type MatchPromptItem,
} from "./prompts"
import {
  stripQuantityTokens,
  queryGeneralizations,
  searchAlias,
} from "./normalize"
import { POLICY_VERSION } from "./match-policy"
import {
  MF_MATCH_PAGES,
  MF_PAGE_SIZE,
  getProductById,
  searchProductDetails,
} from "@/lib/marketfiyati/cache"
import type { ProductDetail } from "@/lib/marketfiyati/types"
import {
  MarketfiyatiError,
  MF_DEFAULT_LOCATION,
  type LocationContext,
} from "@/lib/marketfiyati/client"
import {
  buildMatchResult,
  type CarriedSelection,
  resolveSelection,
  resolveUserSelection,
  selectionKey,
  type Candidate,
  type ItemSelection,
  type PoolOutcome,
} from "./match-result"
import { redis, MF_MATCH_TTL } from "@/lib/redis"
import { createHash } from "node:crypto"

/**
 * Bir sorgunun aday havuzu: eşleştirme ile Sepet Özeti'ndeki ürün değiştirme
 * ekranı AYNI havuzu görsün diye tek yerde. Arama sonuçları Redis'te
 * paylaşımlı olduğundan aynı sorgu ikinci kez API'ye gitmez.
 *
 * En az bir marketten gerçek fiyatı olmayan adaylar elenir — bir depo fiyatı
 * yoksa o ürün optimizasyona katkı yapamaz.
 */
export async function searchCandidatePool(
  query: string,
  loc: LocationContext,
): Promise<{ hits: ProductDetail[]; cached: boolean; total: number }> {
  const result = await searchProductDetails(query, loc, { pages: MF_MATCH_PAGES })
  return {
    hits: result.details.filter((d) => d.markets.length >= 1),
    cached: result.cached,
    total: result.details.length,
  }
}

/**
 * Bir kalem için atılacak en fazla arama denemesi. Kısaltma yalnızca sonuç
 * ALINAMAYINCA devreye girdiğinden normal listelerde ("süt", "beyaz peynir")
 * hiç tetiklenmez; tavan yalnızca uzun OCR sorgularında geçerli olur ve
 * upstream'e karşı üst sınır görevi görür.
 */
const MAX_SEARCH_ATTEMPTS = 4

async function findFirstHit(
  searchQuery: string,
  rawName: string,
  loc: LocationContext,
): Promise<PoolOutcome> {
  const tried = new Set<string>()
  const alias = searchAlias(searchQuery)
  const variants = alias
    ? // Takma adlı terimin kendi araması bilerek alakasız ürün getiriyor
      // (bkz. searchAlias); genelleştirmesi de ("ayçiçek") başka bir ürün.
      [alias, searchQuery]
    : [
        searchQuery,
        // Genelleştirmeler rawName varyantından ÖNCE: ölçümde sonucu kurtaran
        // hep kelime atmak oldu. stripQuantityTokens fiş bağlamında aynı kelime
        // sayısını üretiyor ("omo sivi color" → "omo sıvı color"), yani sıfır
        // sonucu sıfır sonuca çeviriyor ama denemelerden birini harcıyordu.
        ...queryGeneralizations(searchQuery),
        // Son çare: searchQuery hatalı üretilmişse ham ad farklı bir ipucu taşır.
        stripQuantityTokens(rawName),
      ]
    .map((v) => v.trim())
    .filter((v) => v.length >= 2 && !tried.has(v) && tried.add(v))
    .slice(0, MAX_SEARCH_ATTEMPTS)

  let lastError: PoolOutcome | null = null

  for (const q of variants) {
    try {
      const { hits, cached, total } = await searchCandidatePool(q, loc)
      // Sorgu metni kullanıcı içeriğidir → yalnızca dev. Üretimde cache
      // isabet oranı `[lookupProducts] match cache` satırından okunur.
      devLog(
        `[lookupProducts] q="${q}" cached=${cached} hits=${total} withMarket=${hits.length}`,
      )
      if (hits.length > 0) return { kind: "hit", hits, query: q }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status = err instanceof MarketfiyatiError ? err.status : undefined
      // Hata üretimde de görünmeli, ama sorgu metni olmadan.
      console.error(`[lookupProducts] search failed status=${status} ${message}`)
      devLog(`[lookupProducts] ↑ failing query: q="${q}"`)
      // Marketfiyati ücretsiz — kota yok. 403/429/WAF/5xx hepsi geçici API hatası.
      lastError = { kind: "api_error", message }
    }
  }
  return lastError ?? { kind: "no_match" }
}

/** Üretim logu: notun uzunluğu ya da kontrolde düştüğü (içerik yazılmaz). */
function thoughtLog(raw: string, shown: string | null): string {
  if (shown) return `${shown.length}c`
  return raw.trim() ? "dropped" : "none"
}

export type ImageAnalysisWithReasoning = {
  analysis: ImageAnalysis
  reasoning: string | null
}

export async function analyzeImage(
  imageUrl: string,
  opts: AiCallOptions = {},
): Promise<ImageAnalysisWithReasoning> {
  const { object: output } = await withLlmCall(
    "analyzeImage",
    GEMINI_FLASH,
    () =>
      generateObject({
        model: geminiFlash,
        schema: ImageAnalysisOutputSchema,
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
        // flash'ta düşünme varsayılan olarak AÇIK ve sınırsıza yakın;
        // bütçesiz bırakmak çıktı token'ını kat kat artırır. Düşünce özeti
        // (includeThoughts) istenmez: İngilizce geliyor ve iç işleyişi
        // anlatıyor. Kullanıcı "Düşündüm"de modelin `thought` notunu okur.
        providerOptions: {
          google: {
            thinkingConfig: { thinkingBudget: 1024 },
          },
        },
      }),
  )
  const { thought, ...object } = output
  const reasoning = userThought(thought)
  // Üretim: sınıflandırma + sayılar (içeriksiz). Market adı, tutar, yemek adı
  // ve unknownReason kullanıcı içeriğidir → dev.
  const itemCount =
    object.kind === "receipt"
      ? object.receipt?.items.length
      : object.kind === "food"
        ? object.food?.items.length
        : undefined
  console.log(
    `[analyzeImage] kind=${object.kind} items=${itemCount ?? "-"} ` +
      `thought=${thoughtLog(thought, reasoning)}`,
  )
  devLog(
    "[analyzeImage] detail:",
    object.kind === "receipt"
      ? `market=${object.receipt?.marketName} total=${object.receipt?.totalAmount}`
      : object.kind === "food"
        ? `dish=${object.food?.dishName}`
        : `reason=${object.unknownReason}`,
  )
  return { analysis: object, reasoning }
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

/**
 * @param history Sohbetin önceki turlarının özeti (bkz.
 * lib/assistant/conversation-context.ts). Model "listeyi sen hazırla" ya da
 * "bir de ayran ekle" gibi tek başına eksik mesajları bununla tamamlar.
 */
export async function parseShoppingList(
  rawText: string,
  opts: AiCallOptions = {},
  history = "",
): Promise<BasketDraftWithReasoning> {
  const { object: output } = await withLlmCall(
    "parseShoppingList",
    GEMINI_FLASH_LITE,
    () =>
      generateObject({
        model: geminiFlashLite,
        schema: BasketDraftOutputSchema,
        temperature: 0.1,
        abortSignal: opts.signal,
        maxRetries: opts.maxRetries ?? AI_MAX_RETRIES,
        prompt: PARSE_PROMPT(rawText, history),
        // Düşünce özeti istenmez, bkz. analyzeImage.
        providerOptions: {
          google: {
            thinkingConfig: { thinkingBudget: 512 },
          },
        },
      }),
  )
  const { thought, ...object } = output
  const reasoning = userThought(thought)
  // Üretim: kaç kalem çıktı (parse kalitesi metriği). Kalem adları ve arama
  // sorguları kullanıcının alışveriş listesidir → dev.
  console.log(
    `[parseShoppingList] items=${object.items.length} ` +
      `thought=${thoughtLog(thought, reasoning)}`,
  )
  devLog(
    "[parseShoppingList] detail:",
    object.items.map((i) => `${i.name} → "${i.searchQuery}"`).join(" | "),
  )
  return { draft: object, reasoning }
}

type HitList = Candidate[]

/**
 * LLM'e gönderilen aday tavanı — asıl darboğaz burasıydı, arama sayfa boyutu
 * değil: havuz ne kadar büyürse büyüsün prompt'a yalnız bu kadarı giriyor.
 *
 * Çekilen havuzun TAMAMINA eşit tutuluyor; çekip atmak hem boşa istek hem de
 * ölçümün gösterdiği kaybı geri getiriyor. Birden fazla markette satılan
 * adayların ilk 12/24/48/72 dilimlerindeki sayısı (2026-08-08, İstanbul 34
 * depo): peynir 0/0/0/4, süt 7/11/15/20, makarna 2/6/13/20, domates 1/6/9/14.
 * Konsolidasyon tam da bu adaylara dayandığından 24'lük tavan "peynir" gibi
 * sorgularda optimizasyona HİÇ malzeme bırakmıyordu.
 *
 * Bedeli: prompt token'ı aday sayısıyla doğrusal artar (~30 token/aday, kalem
 * başına ~2.2K). Düşürmek istersen MF_MATCH_PAGES'i azalt — ikisi birlikte
 * hareket etmeli.
 */
const MAX_CANDIDATES = MF_MATCH_PAGES * MF_PAGE_SIZE

/**
 * MATCH_PROMPT'un içeriğinden türetilen kısa sürüm damgası. Eskiden cache anahtarı
 * prompt'a bağlı DEĞİLDİ; prompt kuralı değişince elle `v4` gibi bir sürüm bump'ı
 * yapmak ŞARTTI — unutulursa eski (yanlış) seçimler TTL boyunca servis ediliyordu.
 * Artık prompt şablonunun kendisini hash'leyerek bunu OTOMATİKLEŞTİRİYORUZ: kabul/
 * red kuralları her değiştiğinde damga da değişir ve cache kendiliğinden geçersiz
 * olur. `MATCH_PROMPT([])` sabit aday listesiyle (boş) yalnızca kural metnini verir.
 */
export const MATCH_PROMPT_VERSION = createHash("sha1")
  .update(MATCH_PROMPT([]))
  // MATCH_PROMPT([]) yalnız KURAL bloğunu verir; §13.1 politika satırları
  // kalem bazında enjekte edildiği için oraya hiç girmez. Politika metni
  // değişip kural bloğu aynı kalırsa damga da değişmez ve TTL boyunca eski
  // seçimler servis edilirdi — bu yüzden politika hash'i ayrıca karıştırılır.
  .update(POLICY_VERSION)
  .digest("hex")
  .slice(0, 12)

/**
 * LLM eşleştirme cache anahtarı. Aynı kalem (ham ad + miktar + birim + not) aynı
 * aday kümesi VE aynı prompt sürümüyle gelirse seçim de aynıdır — LLM'i tekrar
 * çağırmaya gerek yok. Prompt sürümü (MATCH_PROMPT_VERSION) anahtara dahil
 * olduğundan kural değişikliği eski seçimleri otomatik geçersiz kılar.
 *
 * Not anahtarın parçası: kullanıcı "konserve olmasın" diye itiraz ettiğinde
 * kalemin geri kalanı aynı kalıyor. Not anahtarda olmasaydı düzeltme turu
 * itiraz edilen seçimi cache'ten aynen geri getirirdi.
 */
function matchCacheKey(item: ParsedItem, hits: HitList): string {
  const payload = JSON.stringify({
    rawName: item.name.trim().toLocaleLowerCase("tr-TR"),
    quantity: item.quantity,
    unit: item.unit,
    note: item.note?.trim().toLocaleLowerCase("tr-TR") || null,
    candidates: hits
      .slice(0, MAX_CANDIDATES)
      .map((h) => h.productId)
      .sort(),
  })
  return `mf:match:${MATCH_PROMPT_VERSION}:${createHash("sha1").update(payload).digest("hex")}`
}

/**
 * Adayı olan kalemleri tek bir LLM çağrısında doğru ürüne eşler. Dönüş:
 * promptIndex → seçim. Çağrı hata verirse istisna fırlatır; çağıran taraf
 * hits[0] davranışına geri düşer.
 *
 * export: golden eval koşucusunun seam'i (lib/ai/eval). Cache mantığı çağıran
 * lookupProducts'ta olduğundan burası cache dışıdır — eval LLM'i ölçer.
 */
export async function selectMatches(
  prepared: Array<{ item: ParsedItem; hits: HitList }>,
  opts: AiCallOptions = {},
): Promise<Map<number, MatchSelection["selections"][number]>> {
  const promptItems: MatchPromptItem[] = prepared.map((p, idx) => ({
    itemIndex: idx,
    rawName: p.item.name,
    quantity: p.item.quantity,
    unit: p.item.unit,
    // §13.1 politika aramasının anahtarı. name ham kullanıcı metni ("1 lt süt"),
    // searchQuery ise PARSE_PROMPT'un normalize ettiği terim ("süt").
    searchQuery: p.item.searchQuery,
    note: p.item.note?.trim() || null,
    candidates: p.hits.slice(0, MAX_CANDIDATES).map((h) => ({
      productId: h.productId,
      name: h.name,
      brand: h.brand,
      category: h.category,
    })),
  }))

  const { object } = await withLlmCall(
    "selectMatches",
    opts.modelId ?? GEMINI_FLASH,
    () =>
      generateObject({
        model: opts.model ?? geminiFlash,
        schema: MatchSelectionSchema,
        temperature: 0.1,
        abortSignal: opts.signal,
        maxRetries: opts.maxRetries ?? AI_MAX_RETRIES,
        prompt: MATCH_PROMPT(promptItems),
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: opts.thinkingBudget ?? FLASH_THINKING_BUDGET,
            },
          },
        },
      }),
  )

  const map = new Map<number, MatchSelection["selections"][number]>()
  for (const sel of object.selections) map.set(sel.itemIndex, sel)
  return map
}

/**
 * Taşınan seçimde aday havuzunda OLMAYAN (kullanıcının değiştirme ekranında
 * aramayla eklediği) ürünler tek tek getirilir. Tur başına tavan: seçimler
 * istemcinin gönderdiği sohbetten okunuyor, sınırsız bırakmak upstream'e keyfi
 * istek açardı.
 */
const MAX_CARRIED_EXTRA_FETCHES = 12

async function fetchExtraCandidates(
  ids: string[],
  loc: LocationContext,
): Promise<ProductDetail[]> {
  const found = await Promise.all(
    ids.map(async (id) => {
      try {
        return await getProductById(id, loc)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[lookupProducts] carried product fetch failed ${message}`)
        return null
      }
    }),
  )
  return found.filter(
    (d): d is ProductDetail => d !== null && d.markets.length > 0,
  )
}

export async function lookupProducts(
  items: ParsedItem[],
  loc: LocationContext = MF_DEFAULT_LOCATION,
  opts: AiCallOptions = {},
  carried: ReadonlyMap<string, CarriedSelection> = new Map(),
): Promise<{ matches: MatchResult[] }> {
  // Faz 1 — her kalem için aday ürünleri getir.
  const outcomes = await Promise.all(
    items.map((item) => findFirstHit(item.searchQuery, item.name, loc)),
  )

  // index (orijinal item sırası) → optimizasyona girecek seçim.
  const pick = new Map<number, ItemSelection>()
  // index → asistanın seçimi; yalnızca kullanıcı seçimi taşınan kalemlerde
  // `pick`ten farklıdır.
  const aiPick = new Map<number, ItemSelection>()
  const userIds = new Map<number, string[]>()

  // Faz 1b — kullanıcının bu sohbette daha önce seçtiği ürünler. Seçim havuzla
  // kesişiyorsa LLM'e hiç gitmez.
  let extraBudget = MAX_CARRIED_EXTRA_FETCHES
  for (const [index, item] of items.entries()) {
    const outcome = outcomes[index]
    if (outcome.kind !== "hit") continue
    const prev = carried.get(selectionKey(item.searchQuery, item.note))
    if (!prev) continue
    const wanted = prev.state.userAcceptedProductIds
    const inPool = new Set(outcome.hits.map((h) => h.productId))
    const missing = wanted.filter((id) => !inPool.has(id)).slice(0, extraBudget)
    extraBudget -= missing.length
    const hits =
      missing.length > 0
        ? [...outcome.hits, ...(await fetchExtraCandidates(missing, loc))]
        : outcome.hits
    // Miktar değiştiyse eski "istenen boyut yok" işareti yeni miktara ait değil.
    const sameSize = prev.quantity === item.quantity && prev.unit === item.unit
    const aiSizeMismatch = sameSize ? prev.state.aiSizeMismatch : false
    const user = resolveUserSelection(wanted, hits, {
      previousPrimaryId: prev.primaryProductId,
      aiSizeMismatch,
    })
    if (user.acceptedProductIds.length === 0) continue
    outcomes[index] = { ...outcome, hits }
    pick.set(index, user)
    userIds.set(index, user.acceptedProductIds)
    aiPick.set(index, {
      primaryProductId: null,
      acceptedProductIds: prev.state.aiAcceptedProductIds,
      sizeMismatch: aiSizeMismatch,
    })
  }

  // Faz 2 — adayı olan kalemleri doğru ürüne eşle. Önce match-cache'e bak;
  // yalnızca cache miss olan kalemleri tek bir LLM çağrısına gönder.
  const withHits: Array<{ index: number; item: ParsedItem; hits: HitList }> = []
  outcomes.forEach((outcome, index) => {
    if (outcome.kind === "hit" && !pick.has(index)) {
      withHits.push({ index, item: items[index], hits: outcome.hits })
    }
  })
  if (userIds.size > 0) {
    console.log(`[lookupProducts] carried user selections: ${userIds.size}`)
  }

  if (withHits.length > 0) {
    const cacheKeys = withHits.map((e) => matchCacheKey(e.item, e.hits))
    let cached: (ItemSelection | null)[] = []
    try {
      cached = await redis.mget<(ItemSelection | null)[]>(...cacheKeys)
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
          misses.map(({ item, hits }) => ({
            // Politika satırı adayları getiren sorguya aittir: "yağ" için
            // yazılmış politika "yağ" havuzunu anlatır, takma adla gelen
            // ayçiçek yağı havuzunu değil.
            item: { ...item, searchQuery: searchAlias(item.searchQuery) ?? item.searchQuery },
            hits,
          })),
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
      const toCache: Array<{ key: string; value: ItemSelection }> = []
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
    const selection = pick.get(index) ?? null
    return buildMatchResult({
      item,
      outcome: outcomes[index],
      selection,
      ai: aiPick.get(index) ?? selection,
      userAcceptedProductIds: userIds.get(index) ?? null,
    })
  })
  return { matches }
}

/** Öneri üretilecek en fazla kalem; prompt'u ve doğrulama aramalarını sınırlar. */
const MAX_SUGGESTION_ITEMS = 8
/** Kalem başına doğrulanacak en fazla öneri (her biri bir arama demek). */
const MAX_SUGGESTIONS_PER_ITEM = 2

/**
 * Eşleştirilemeyen kalemlere ("no_match") marketlerde sonuç veren bir
 * alternatif arama terimi bulur ve `suggestedQuery` olarak işler. Kart bunu
 * "Yufka mı demek istedin?" diye sunar; tıklanınca sepet o terimle yeniden
 * eşleştirilir.
 *
 * Model önerisi tek başına gösterilmez: her terim önce aranır, en az bir
 * markette fiyatı olan ürün dönmezse atlanır. Kullanıcıya "şunu dene" deyip
 * yine boş sonuç göstermek öneri vermemekten kötü.
 *
 * Servis hatası (api_error) kalemlerine dokunmaz: orada sorun ad değil.
 * Hata ya da iptal durumunda eşleşmeleri olduğu gibi döndürür; öneri
 * yardımcı bir ekstradır, turu düşürmemeli.
 */
export async function suggestQueries(
  matches: MatchResult[],
  loc: LocationContext = MF_DEFAULT_LOCATION,
  opts: AiCallOptions = {},
): Promise<MatchResult[]> {
  const targets = matches
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => m.lookupStatus === "no_match")
    .slice(0, MAX_SUGGESTION_ITEMS)
  if (targets.length === 0) return matches

  let proposals: Map<number, string[]>
  try {
    const { object } = await withLlmCall("suggestQueries", GEMINI_FLASH_LITE, () =>
      generateObject({
        model: geminiFlashLite,
        schema: QuerySuggestionSchema,
        temperature: 0.2,
        abortSignal: opts.signal,
        maxRetries: opts.maxRetries ?? AI_MAX_RETRIES,
        prompt: QUERY_SUGGESTION_PROMPT(
          targets.map(({ m }, itemIndex) => ({
            itemIndex,
            rawName: m.rawName,
            searchQuery: m.searchQuery,
          })),
        ),
      }),
    )
    proposals = new Map(object.suggestions.map((s) => [s.itemIndex, s.queries]))
  } catch (err) {
    if (!isAbortError(err)) {
      console.error("[suggestQueries] suggestion failed", err)
    }
    return matches
  }

  const verified = await Promise.all(
    targets.map(async ({ m }, itemIndex) => {
      const tried = new Set(
        [m.searchQuery, m.rawName, searchAlias(m.searchQuery) ?? ""]
          .map(stripQuantityTokens)
          .filter(Boolean),
      )
      const queries = (proposals.get(itemIndex) ?? [])
        .map(stripQuantityTokens)
        .filter((q) => q.length >= 2 && !tried.has(q) && tried.add(q))
        .slice(0, MAX_SUGGESTIONS_PER_ITEM)
      for (const q of queries) {
        if (opts.signal?.aborted) return null
        try {
          const { details } = await searchProductDetails(q, loc)
          if (details.some((d) => d.markets.length > 0)) return q
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`[suggestQueries] verify search failed ${message}`)
        }
      }
      return null
    }),
  )
  console.log(
    `[suggestQueries] items=${targets.length} suggested=${verified.filter(Boolean).length}`,
  )

  const byIndex = new Map(targets.map(({ index }, i) => [index, verified[i]]))
  return matches.map((m, i) =>
    byIndex.has(i) ? { ...m, suggestedQuery: byIndex.get(i) ?? null } : m,
  )
}
