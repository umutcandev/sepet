import "server-only"
import { and, asc, eq, isNotNull } from "drizzle-orm"
import { db, baskets, basketItems, conversations } from "@/lib/db"
import { isUuid } from "@/lib/utils"

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
