import "server-only"
import { revalidatePath } from "next/cache"
import { and, eq, max, sql } from "drizzle-orm"
import { db, conversations, conversationMessages } from "@/lib/db"
import type { ConversationStatus } from "@/lib/assistant/conversation-status"
import { isUuid } from "@/lib/utils"

const TITLE_MAX = 100

// Server-only data access. These take an already-authenticated userId from the
// caller, so they must never live in a "use server" module: every export there
// becomes a publicly callable action endpoint.

/** İstemciden gelen sohbet id'si bu kullanıcıya aitse id'yi, değilse null döner. */
export async function ownedConversationId(
  conversationId: string | null | undefined,
  userId: string,
): Promise<string | null> {
  if (!conversationId || !isUuid(conversationId)) return null
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1)
  return row?.id ?? null
}

/**
 * Sunucu tarafından (oturum aç henüz validate edilmiş bir akışta) konuşma
 * başlığını günceller. updatedAt'i bilinçli olarak değiştirmez — başlık
 * güncellemesinin sohbeti sidebar sıralamasında zıplatmasını istemiyoruz.
 */
export async function setConversationTitle(
  conversationId: string,
  userId: string,
  title: string,
): Promise<void> {
  const trimmed = title.trim().slice(0, TITLE_MAX)
  if (!trimmed) return

  await db
    .update(conversations)
    .set({ title: trimmed })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )

  revalidatePath("/asistan", "layout")
}

/**
 * Asistan turn'ü bittiğinde sohbetin sidebar durumunu günceller. setTitle gibi
 * updatedAt'i bilinçli olarak değiştirmez — durum güncellemesi sohbeti sidebar
 * sıralamasında zıplatmasın (asıl sıralama dokunuşu appendMessages'ta yapılır).
 */
export async function setConversationStatus(
  conversationId: string,
  userId: string,
  status: ConversationStatus,
): Promise<void> {
  await db
    .update(conversations)
    .set({ status })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )

  revalidatePath("/asistan", "layout")
}

// Postgres jsonb \u0000 kabul etmez: metinde bir NUL karakteri tüm insert'i
// düşürür, mesaj sessizce kaydedilmezdi (kota slotu yine de harcanmış olurdu).
function stripNul(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/\u0000/g, "")
  if (Array.isArray(value)) return value.map(stripNul)
  if (value !== null && typeof value === "object") {
    // Yalnız düz nesneler (JSON'dan gelen part'lar); Date vb. olduğu gibi kalır.
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== null) return value
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k.replace(/\u0000/g, ""),
        stripNul(v),
      ]),
    )
  }
  return value
}

export async function appendMessages(
  conversationId: string,
  userId: string,
  msgs: Array<{
    role: "user" | "assistant"
    parts: unknown
    metadata?: unknown
  }>,
): Promise<void> {
  if (msgs.length === 0) return

  // Authorize: ensure conversation belongs to user (cheap re-check)
  const [owner] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1)
  if (!owner) throw new Error("conversation_not_found")

  const [{ value: lastSeq }] = await db
    .select({ value: max(conversationMessages.sequence) })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))

  let next = (lastSeq ?? 0) + 1
  const rows = msgs.map((m) => ({
    conversationId,
    role: m.role,
    parts: stripNul(m.parts) as object,
    metadata: stripNul(m.metadata ?? null) as object | null,
    sequence: next++,
  }))

  await db.insert(conversationMessages).values(rows)

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))

  revalidatePath("/asistan", "layout")
}

/**
 * Bu kullanıcının sohbetinde verilen tool çağrısını taşıyan asistan mesajı.
 * Mesaj id'si istemcide farklı (canlı akışta SDK üretir), tool çağrısı id'si
 * ise sunucunun ürettiği ve kayıtta aynen duran tek ortak anahtar.
 */
export async function findAssistantMessageByToolCall(
  conversationId: string,
  userId: string,
  toolCallId: string,
): Promise<{ id: string; parts: unknown } | null> {
  if (!isUuid(conversationId)) return null
  const [row] = await db
    .select({ id: conversationMessages.id, parts: conversationMessages.parts })
    .from(conversationMessages)
    .innerJoin(
      conversations,
      and(
        eq(conversations.id, conversationMessages.conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .where(
      and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.role, "assistant"),
        // jsonb kapsama: part dizisinde bu toolCallId'yi taşıyan bir eleman var.
        sql`${conversationMessages.parts} @> ${JSON.stringify([{ toolCallId }])}::jsonb`,
      ),
    )
    .limit(1)
  return row ?? null
}

/**
 * Kayıtlı bir mesajın part'larını yerinde günceller. Yalnızca Sepet Özeti'nden
 * ürün değiştirme kullanır; sohbetin sırası ve `updatedAt`i değişmez, mesaj
 * aynı kartın düzeltilmiş hâlidir.
 */
export async function updateMessageParts(
  messageId: string,
  conversationId: string,
  parts: unknown,
): Promise<void> {
  await db
    .update(conversationMessages)
    .set({ parts: parts as object })
    .where(
      and(
        eq(conversationMessages.id, messageId),
        eq(conversationMessages.conversationId, conversationId),
      ),
    )
}
