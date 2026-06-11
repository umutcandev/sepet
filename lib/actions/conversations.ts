"use server"

import { revalidatePath } from "next/cache"
import { and, asc, desc, eq, exists, ilike, inArray, max, or, sql } from "drizzle-orm"
import type { UIMessage } from "ai"
import { auth } from "@/auth"
import { db, conversations, conversationMessages } from "@/lib/db"
import type { ConversationStatus } from "@/lib/assistant/conversation-status"
import { isUuid } from "@/lib/utils"
import { getSavedBasketsForConversation } from "./baskets"

const TITLE_MAX = 100
const SEED_TITLE_MAX = 60

type StoredMessage = Pick<UIMessage, "id" | "role" | "parts"> & {
  metadata?: unknown
}

function extractTitleFromMessage(msg: UIMessage): string {
  const parts = msg.parts ?? []
  for (const p of parts) {
    if (p.type === "text") {
      const text = (p as { text?: unknown }).text
      if (typeof text === "string" && text.trim()) {
        const trimmed = text.trim().replace(/\s+/g, " ")
        return trimmed.length > SEED_TITLE_MAX
          ? trimmed.slice(0, SEED_TITLE_MAX).trimEnd() + "…"
          : trimmed
      }
    }
  }
  for (const p of parts) {
    if (
      p.type === "file" &&
      typeof (p as { mediaType?: unknown }).mediaType === "string" &&
      (p as { mediaType: string }).mediaType.startsWith("image/")
    ) {
      return "Fiş analizi"
    }
  }
  return "Yeni sohbet"
}

export async function createConversation(input: {
  firstUserMessage: UIMessage
}): Promise<{ id: string; title: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const title = extractTitleFromMessage(input.firstUserMessage)
  const [row] = await db
    .insert(conversations)
    .values({ userId: session.user.id, title })
    .returning({ id: conversations.id, title: conversations.title })

  if (!row) throw new Error("conversation_insert_failed")

  revalidatePath("/asistan", "layout")
  return { id: row.id, title: row.title }
}

export async function listConversations() {
  const session = await auth()
  if (!session?.user?.id) return []

  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
      status: conversations.status,
      starred: conversations.starred,
    })
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt))
    .limit(100)
}

// Sayfa başına yüklenecek sohbet sayısı. /sohbetler sayfası infinite scroll
// ile bu boyutta parçalar halinde yükler.
const CONVERSATIONS_PAGE_SIZE = 30

/**
 * /sohbetler sayfası için sayfalanmış listeleme. `offset` ile cursor-free
 * pagination sağlar; silme/ekleme sonrası offset kayması tolere edilir
 * (kullanıcı zaten ekrandaki listeyi görüyor, duplar istemci tarafı
 * dedupe ile engellenir).
 */
export async function listConversationsPaginated(offset = 0) {
  const session = await auth()
  if (!session?.user?.id) return { items: [], hasMore: false }

  const items = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
      status: conversations.status,
      starred: conversations.starred,
    })
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt))
    .limit(CONVERSATIONS_PAGE_SIZE + 1)
    .offset(offset)

  const hasMore = items.length > CONVERSATIONS_PAGE_SIZE
  if (hasMore) items.pop()

  return { items, hasMore }
}

// ILIKE deseni için kullanıcı girdisindeki joker karakterleri (\ % _) kaçır;
// "%50" gibi bir aramanın tüm satırları getirmesini engeller.
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/**
 * Sohbetlerde arama: hem başlıkta hem de mesaj içeriğinde (jsonb parts) geçen
 * eşleşmeleri döndürür. İçerik araması, her sohbet için EXISTS alt sorgusuyla
 * yapılır; parts metne cast edilip ILIKE ile taranır. Sonuçlar updatedAt'e göre
 * sıralı ve tavanla sınırlıdır.
 */
export async function searchConversations(query: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const q = query.trim()
  if (!q || q.length > 100) return []

  const pattern = `%${escapeLike(q)}%`

  const messageMatch = exists(
    db
      .select({ one: sql`1` })
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.conversationId, conversations.id),
          sql`${conversationMessages.parts}::text ILIKE ${pattern}`,
        ),
      ),
  )

  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
      status: conversations.status,
      starred: conversations.starred,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, session.user.id),
        or(ilike(conversations.title, pattern), messageMatch),
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(200)
}

export async function getConversation(id: string): Promise<{
  id: string
  title: string
  messages: StoredMessage[]
  savedBaskets: Record<string, string>
} | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  if (!isUuid(id)) return null

  const [conv] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, id),
        eq(conversations.userId, session.user.id),
      ),
    )
    .limit(1)

  if (!conv) return null

  const [rows, savedBaskets] = await Promise.all([
    db
      .select({
        id: conversationMessages.id,
        role: conversationMessages.role,
        parts: conversationMessages.parts,
        metadata: conversationMessages.metadata,
      })
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, id))
      .orderBy(asc(conversationMessages.sequence)),
    getSavedBasketsForConversation(id, session.user.id),
  ])

  const messages: StoredMessage[] = rows.map((r) => ({
    id: r.id,
    role: r.role as UIMessage["role"],
    parts: (r.parts ?? []) as UIMessage["parts"],
    metadata: r.metadata ?? undefined,
  }))

  return { id: conv.id, title: conv.title, messages, savedBaskets }
}

export async function deleteConversation(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")
  if (!isUuid(id)) throw new Error("not_found")

  await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, id),
        eq(conversations.userId, session.user.id),
      ),
    )

  revalidatePath("/asistan", "layout")
  revalidatePath("/sohbetler")
}

// Tek seferde silinebilecek azami sohbet sayısı. Toplu silmede istek
// parça parça (CHUNK) çalıştırılır; bu, parametre limiti ve tek devasa
// sorgudan kaynaklı timeout riskini ortadan kaldırır.
const BULK_DELETE_CHUNK = 100

/**
 * Toplu silme. Güvenlik garantileri:
 *  - Yalnızca geçerli UUID'ler işlenir (geçersiz girdi sessizce atlanır).
 *  - Her silme `userId` ile kapsanır → başka kullanıcının sohbeti silinemez.
 *  - Tekilleştirme + parçalama ile devasa/yinelenen girdilerde de güvenli.
 *  - Boş/eşleşmesiz girdi sıfır döndürür, hata fırlatmaz.
 * Mesajlar FK cascade ile, kayıtlı sepetlerin conversationId'si ise
 * `set null` ile temizlenir (sepetler korunur). Gerçekte silinen sayı döner.
 */
export async function deleteConversations(
  ids: string[],
): Promise<{ deleted: number }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const valid = Array.from(new Set(ids)).filter((id) => isUuid(id))
  if (valid.length === 0) return { deleted: 0 }

  let deleted = 0
  for (let i = 0; i < valid.length; i += BULK_DELETE_CHUNK) {
    const slice = valid.slice(i, i + BULK_DELETE_CHUNK)
    const rows = await db
      .delete(conversations)
      .where(
        and(
          inArray(conversations.id, slice),
          eq(conversations.userId, session.user.id),
        ),
      )
      .returning({ id: conversations.id })
    deleted += rows.length
  }

  if (deleted > 0) {
    revalidatePath("/asistan", "layout")
    revalidatePath("/sohbetler")
  }

  return { deleted }
}

/**
 * Sohbeti yıldızlar / yıldızı kaldırır. updatedAt'e bilinçli olarak dokunmaz —
 * yıldızlamak sohbeti sidebar sıralamasında zıplatmaz.
 */
export async function setConversationStarred(
  id: string,
  starred: boolean,
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")
  if (!isUuid(id)) throw new Error("not_found")

  await db
    .update(conversations)
    .set({ starred })
    .where(
      and(
        eq(conversations.id, id),
        eq(conversations.userId, session.user.id),
      ),
    )

  revalidatePath("/asistan", "layout")
  revalidatePath("/sohbetler")
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

export async function renameConversation(
  id: string,
  title: string,
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const trimmed = title.trim().slice(0, TITLE_MAX)
  if (!trimmed) throw new Error("empty_title")

  await db
    .update(conversations)
    .set({ title: trimmed, updatedAt: new Date() })
    .where(
      and(
        eq(conversations.id, id),
        eq(conversations.userId, session.user.id),
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
