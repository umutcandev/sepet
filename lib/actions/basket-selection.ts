"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/auth"
import {
  MatchResultSchema,
  OptimizationSummarySchema,
  type MatchResult,
  type OptimizationSummary,
} from "@/lib/ai/schemas"
import { computeOptimization } from "@/lib/ai/optimize"
import { buildMatchResult, resolveUserSelection } from "@/lib/ai/match-result"
import { searchAlias } from "@/lib/ai/normalize"
import { searchCandidatePool } from "@/lib/ai/tools"
import { getProductById } from "@/lib/marketfiyati/cache"
import type { ProductDetail } from "@/lib/marketfiyati/types"
import { getUserLocationContext } from "@/lib/auth/location"
import { buildSummaryText } from "@/lib/assistant/summary-text"
import { applySelectionToParts } from "@/lib/assistant/selection-update"
import {
  findAssistantMessageByToolCall,
  updateMessageParts,
} from "@/lib/data/conversations"
import { updateSavedBasketSelection } from "@/lib/data/baskets"
import { productLimiter } from "@/lib/security/rate-limit"
import { checkLimit } from "@/lib/security/action-rate-limit"
import { logError } from "@/lib/ai/telemetry"

const productId = z.string().regex(/^[A-Za-z0-9_-]{1,32}$/)

const inputSchema = z.object({
  conversationId: z.uuid(),
  toolCallId: z.string().min(1).max(64),
  itemIndex: z.number().int().min(0).max(199),
  productIds: z.array(productId).min(1).max(80),
})

const basketContextSchema = z.object({
  matches: z.array(MatchResultSchema),
  summary: OptimizationSummarySchema,
})

/**
 * Havuz dışından (değiştirme ekranında aramayla) eklenebilecek en fazla ürün.
 * Her biri tek bir ürün detayı isteği demek; ekran da bu sınırı uygular.
 */
const MAX_EXTRA_PRODUCTS = 20

export type UpdateSelectionResult =
  | {
      ok: true
      matches: MatchResult[]
      summary: OptimizationSummary
      text: string
      /** Kayıtlı sepet de güncellendiyse id'si; kayıt yoksa null. */
      savedBasketId: string | null
      /** Kayıt vardı ama güncellenemedi: kart ile kayıt artık farklı. */
      savedBasketFailed: boolean
    }
  | {
      ok: false
      error: "invalid" | "not_found" | "no_products" | "rate_limited" | "failed"
    }

/**
 * Sepet Özeti'nde bir kalemin hangi ürünlerle karşılanacağını kullanıcının
 * seçimiyle değiştirir ve aynı kartı yerinde günceller.
 *
 * AI çağrısı yok, kota harcamaz. İstemciden yalnızca hangi ürünlerin seçildiği
 * gelir; fiyatlar, plan ve özet cümlesi sunucuda kullanıcının konumuyla
 * yeniden kurulur. İstemcinin hesapladığı önizleme ekranda kalır, kayda
 * girmez.
 */
export async function updateBasketItemSelection(
  raw: z.input<typeof inputSchema>
): Promise<UpdateSelectionResult> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")
  const userId = session.user.id

  const parsed = inputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "invalid" }
  const input = parsed.data

  // Her çağrı marketfiyati'ye arama/detay isteğine dönüşebilir; ürün
  // aramasıyla aynı bütçe (proxy server action'ları görmez).
  const limit = await checkLimit(productLimiter, `selection:user:${userId}`)
  if (!limit.ok) return { ok: false, error: "rate_limited" }

  const message = await findAssistantMessageByToolCall(
    input.conversationId,
    userId,
    input.toolCallId
  )
  if (!message || !Array.isArray(message.parts)) {
    return { ok: false, error: "not_found" }
  }
  const parts = message.parts as Array<{
    type: string
    toolCallId?: string
    state?: string
    output?: unknown
  }>
  const contextPart = parts.find(
    (p) =>
      p.type === "tool-basketContext" &&
      p.toolCallId === input.toolCallId &&
      p.state === "output-available"
  )
  const context = basketContextSchema.safeParse(contextPart?.output)
  if (!context.success) return { ok: false, error: "not_found" }

  const { matches } = context.data
  const match = matches[input.itemIndex]
  if (!match) return { ok: false, error: "invalid" }

  try {
    const loc = await getUserLocationContext()
    // Eşleştirmenin gördüğü havuz. Eski kayıtlarda havuz sorgusu yok; arama
    // aynı kuralla (takma ad önce) yeniden kurulur.
    const poolQuery =
      match.selection?.poolQuery ??
      searchAlias(match.searchQuery) ??
      match.searchQuery
    const { hits: pool } = await searchCandidatePool(poolQuery, loc)

    const inPool = new Set(pool.map((h) => h.productId))
    const missing = [...new Set(input.productIds)]
      .filter((id) => !inPool.has(id))
      .slice(0, MAX_EXTRA_PRODUCTS)
    // Tek bir ürünün detayı alınamazsa yalnız o ürün düşer; seçimin geri
    // kalanı uygulanır (hiçbiri kalmazsa aşağıda no_products).
    const extras = (
      await Promise.all(
        missing.map((id) =>
          getProductById(id, loc).catch((err: unknown) => {
            logError("[basket-selection] product fetch failed", err)
            return null
          })
        )
      )
    ).filter((d): d is ProductDetail => d !== null && d.markets.length > 0)
    const hits = [...pool, ...extras]

    const aiSizeMismatch = match.selection?.aiSizeMismatch ?? match.sizeMismatch
    const user = resolveUserSelection(input.productIds, hits, {
      previousPrimaryId: match.bestMatch?.productId ?? null,
      aiSizeMismatch,
    })
    if (user.acceptedProductIds.length === 0) {
      return { ok: false, error: "no_products" }
    }

    // Kullanıcı tam olarak asistanın kümesine döndüyse seçim yeniden
    // asistanındır; sonraki turlarda da "kullanıcı seçti" sayılmaz.
    const aiIds = match.selection?.aiAcceptedProductIds ?? []
    const backToAi =
      aiIds.length > 0 &&
      aiIds.length === user.acceptedProductIds.length &&
      aiIds.every((id) => user.acceptedProductIds.includes(id))

    const updated = buildMatchResult({
      item: {
        name: match.rawName,
        searchQuery: match.searchQuery,
        quantity: match.quantity,
        unit: match.unit,
        note: match.note ?? null,
      },
      outcome: { kind: "hit", hits, query: poolQuery },
      selection: user,
      ai: {
        primaryProductId: null,
        acceptedProductIds: aiIds,
        sizeMismatch: aiSizeMismatch,
      },
      userAcceptedProductIds: backToAi ? null : user.acceptedProductIds,
    })

    const nextMatches = matches.map((m, i) =>
      i === input.itemIndex ? updated : m
    )
    const summary = computeOptimization(nextMatches)
    const text = buildSummaryText(summary, nextMatches)

    const nextParts = applySelectionToParts(parts, input.toolCallId, {
      matches: nextMatches,
      summary,
      text,
    })
    if (!nextParts) return { ok: false, error: "not_found" }
    await updateMessageParts(message.id, input.conversationId, nextParts)

    // Kayıtlı sepet de aynı kartın kaydı: onu da güncelle. Mesaj yazıldıktan
    // sonra düşerse kart doğrudur, kayıt eski kalır; kullanıcıya söylenir.
    let savedBasketId: string | null = null
    let savedBasketFailed = false
    try {
      savedBasketId = await updateSavedBasketSelection({
        userId,
        conversationId: input.conversationId,
        toolCallId: input.toolCallId,
        itemIndex: input.itemIndex,
        match: updated,
        summary,
      })
    } catch (err) {
      logError("[basket-selection] saved basket update failed", err)
      savedBasketFailed = true
    }
    if (savedBasketId) {
      revalidatePath("/sepetlerim")
      revalidatePath(`/sepetlerim/${savedBasketId}`)
    }

    console.log(
      `[basket-selection] item updated accepted=${user.acceptedProductIds.length} extras=${extras.length} backToAi=${backToAi}`
    )
    return {
      ok: true,
      matches: nextMatches,
      summary,
      text,
      savedBasketId,
      savedBasketFailed,
    }
  } catch (err) {
    logError("[basket-selection] update failed", err)
    return { ok: false, error: "failed" }
  }
}
