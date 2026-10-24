import "server-only"
import { and, asc, eq, isNotNull } from "drizzle-orm"
import { db, baskets, basketItems, conversations } from "@/lib/db"
import { isUuid } from "@/lib/utils"
import { isProductId } from "@/lib/marketfiyati/product-id"
import type { MatchResult, OptimizationSummary } from "@/lib/ai/schemas"

// Server-only data access. These take an already-authenticated userId from the
// caller, so they must never live in a "use server" module: every export there
// becomes a publicly callable action endpoint.

/**
 * Bir sohbet için kullanıcının kaydettiği sepetlerin {toolCallId → basketId}
 * eşlemesini döndürür. Sohbet rehidrate edilirken her `tool-basketContext`
 * çıktısı için "Kaydedildi" durumunu sunucudan kurabilmek için kullanılır.
 */
export async function getSavedBasketsForConversation(
  conversationId: string,
  userId: string,
): Promise<Record<string, string>> {
  const rows = await db
    .select({
      id: baskets.id,
      sourceToolCallId: baskets.sourceToolCallId,
    })
    .from(baskets)
    .where(
      and(
        eq(baskets.userId, userId),
        eq(baskets.conversationId, conversationId),
        isNotNull(baskets.sourceToolCallId),
      ),
    )
  const map: Record<string, string> = {}
  for (const row of rows) {
    if (row.sourceToolCallId) map[row.sourceToolCallId] = row.id
  }
  return map
}

/**
 * Sepet + kalemleri + (varsa) geldiği sohbet.
 *
 * İki sorgu ardışık çalışıyordu; birbirine bağlı olmadıkları için paralel.
 * Kalemler `sortIndex` ile çekilir — sırasız SELECT'in bugün doğru görünmesi
 * tesadüftü (bkz. basket_item.sortIndex).
 *
 * `conversationId` hem yazılıyor hem `set null` ile özenle korunuyordu ama
 * hiçbir yerde okunmuyordu: kullanıcı "bu sepeti neden böyle kurdum"a
 * dönemiyordu. Sohbet silinmişse join boş döner, rozet gizlenir.
 */
export async function getBasketDetail(id: string, userId: string) {
  if (!isUuid(id)) return null

  // İki sorgu birbirine bağlı değil → paralel. Kalem sorgusu sahiplik
  // kontrolünden bağımsız çalışır ama sonucu yalnızca sepet bu kullanıcıya
  // aitse döner; aksi halde aşağıda daha okunmadan atılır.
  const [rows, items] = await Promise.all([
    db
      .select({ basket: baskets, conversationTitle: conversations.title })
      .from(baskets)
      .leftJoin(
        conversations,
        and(
          eq(conversations.id, baskets.conversationId),
          eq(conversations.userId, userId),
        ),
      )
      .where(and(eq(baskets.id, id), eq(baskets.userId, userId)))
      .limit(1),
    db
      .select()
      .from(basketItems)
      .where(eq(basketItems.basketId, id))
      .orderBy(asc(basketItems.sortIndex), asc(basketItems.rawName)),
  ])

  const row = rows[0]
  if (!row) return null

  return {
    basket: row.basket,
    items,
    conversation:
      row.basket.conversationId && row.conversationTitle
        ? { id: row.basket.conversationId, title: row.conversationTitle }
        : null,
  }
}

/**
 * Bir kalem satırının eşleşmeden türeyen alanları. Kaydetme ve kayıtlı sepeti
 * Sepet Özeti'nden güncelleme aynı alanları yazsın diye tek yerde.
 */
export function basketItemMatchFields(match: MatchResult | null) {
  const best = match?.bestMatch ?? null
  const productId = best?.productId
  const minPrice = best?.minPrice ?? null
  const marketWithMin =
    best && match
      ? match.marketPrices.find((mp) => mp.price === minPrice) ?? null
      : null
  return {
    // Kimlik istemciden gelir: biçimsiz kimlik saklanmaz (bkz. item-images).
    matchedProductId: isProductId(productId) ? productId : null,
    matchedName: best?.name ?? null,
    matchedBrand: best?.brand ?? null,
    matchedImageUrl: best?.imageUrl ?? null,
    lookupStatus: match?.lookupStatus ?? null,
    // Referans fiyat — plana ait değil. Bkz. schema.ts'teki uzun yorum.
    minPrice: minPrice != null ? minPrice.toFixed(2) : null,
    minPriceMarket: marketWithMin?.market ?? null,
  }
}

/** Sepet satırının özet sütunları (liste sayfası bunları okur). */
export function basketSummaryFields(summary: OptimizationSummary) {
  const bestSingle =
    summary.singleMarket.itemCount > 0 ? summary.singleMarket : null
  const twoMarketSavings =
    summary.twoMarketCombo.markets.length === 2
      ? summary.twoMarketCombo.savingsTL
      : null
  return {
    bestSingleMarket: bestSingle?.market ?? null,
    bestSingleTotal: bestSingle ? bestSingle.total.toFixed(2) : null,
    twoMarketSavingsTL:
      twoMarketSavings != null ? twoMarketSavings.toFixed(2) : null,
    summaryJson: summary,
  }
}

/**
 * Sohbetteki bir Sepet Özeti kaydedildiyse, kartta ürün değiştirilince kayıt
 * da aynı hâle getirilir (kart ile kayıt tek doğru kaynak). Kayıt yoksa
 * `null`; varsa güncellenen sepetin id'si.
 *
 * Kalem satırı `sortIndex` ile bulunur (kayıtta kalemler basketContext'teki
 * sırayla yazılır) ve ham ad tutmazsa dokunulmaz: yanlış satıra başka kalemin
 * ürününü yazmaktansa satırı eski hâliyle bırakmak daha iyi.
 */
export async function updateSavedBasketSelection(input: {
  userId: string
  conversationId: string
  toolCallId: string
  itemIndex: number
  match: MatchResult
  summary: OptimizationSummary
}): Promise<string | null> {
  const [basket] = await db
    .select({ id: baskets.id })
    .from(baskets)
    .where(
      and(
        eq(baskets.userId, input.userId),
        eq(baskets.conversationId, input.conversationId),
        eq(baskets.sourceToolCallId, input.toolCallId),
      ),
    )
    .limit(1)
  if (!basket) return null

  await db
    .update(baskets)
    .set(basketSummaryFields(input.summary))
    .where(and(eq(baskets.id, basket.id), eq(baskets.userId, input.userId)))

  await db
    .update(basketItems)
    .set(basketItemMatchFields(input.match))
    .where(
      and(
        eq(basketItems.basketId, basket.id),
        eq(basketItems.sortIndex, input.itemIndex),
        eq(basketItems.rawName, input.match.rawName),
      ),
    )

  return basket.id
}
