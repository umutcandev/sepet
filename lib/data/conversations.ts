import "server-only"
import { revalidatePath } from "next/cache"
import { and, eq, max } from "drizzle-orm"
import { db, conversations, conversationMessages } from "@/lib/db"
import type { ConversationStatus } from "@/lib/assistant/conversation-status"

const TITLE_MAX = 100

// Server-only data access. These take an already-authenticated userId from the
// caller, so they must never live in a "use server" module: every export there
// becomes a publicly callable action endpoint.

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
    parts: m.parts as object,
    metadata: (m.metadata ?? null) as object | null,
    sequence: next++,
  }))

  await db.insert(conversationMessages).values(rows)

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))

  revalidatePath("/asistan", "layout")
}
