import "server-only"
import { and, asc, eq, isNotNull } from "drizzle-orm"
import { db, receipts, receiptItems, conversations } from "@/lib/db"
import { isUuid } from "@/lib/utils"

// Server-only data access. These take an already-authenticated userId from the
// caller, so they must never live in a "use server" module: every export there
// becomes a publicly callable action endpoint.

/**
 * Bir sohbet için kullanıcının kaydettiği fişlerin {toolCallId → receiptId}
 * eşlemesini döndürür. Sohbet rehidrate edilirken her `tool-receiptComparison`
 * çıktısı için "Kaydedildi" durumunu sunucudan kurabilmek için kullanılır
 * (bkz. getSavedBasketsForConversation — aynı desen).
 */
export async function getSavedReceiptsForConversation(
  conversationId: string,
  userId: string,
): Promise<Record<string, string>> {
  const rows = await db
    .select({
      id: receipts.id,
      sourceToolCallId: receipts.sourceToolCallId,
    })
    .from(receipts)
    .where(
      and(
        eq(receipts.userId, userId),
        eq(receipts.conversationId, conversationId),
        isNotNull(receipts.sourceToolCallId),
      ),
    )
  const map: Record<string, string> = {}
  for (const row of rows) {
    if (row.sourceToolCallId) map[row.sourceToolCallId] = row.id
  }
  return map
}

/**
 * Fiş + kalemleri + (varsa) geldiği sohbet. Bkz. getBasketDetail — aynı desen:
 * paralel sorgu, sortIndex ile sıra garantisi, sohbete geri dönüş bağlantısı.
 */
export async function getReceiptDetail(id: string, userId: string) {
  if (!isUuid(id)) return null

  const [rows, items] = await Promise.all([
    db
      .select({ receipt: receipts, conversationTitle: conversations.title })
      .from(receipts)
      .leftJoin(
        conversations,
        and(
          eq(conversations.id, receipts.conversationId),
          eq(conversations.userId, userId),
        ),
      )
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
      .limit(1),
    db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, id))
      .orderBy(asc(receiptItems.sortIndex), asc(receiptItems.rawName)),
  ])

  const row = rows[0]
  if (!row) return null

  return {
    receipt: row.receipt,
    items,
    conversation:
      row.receipt.conversationId && row.conversationTitle
        ? { id: row.receipt.conversationId, title: row.conversationTitle }
        : null,
  }
}
