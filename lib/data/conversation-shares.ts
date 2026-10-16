import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { cache } from "react"
import { and, asc, eq, isNull } from "drizzle-orm"

import {
  db,
  conversations,
  conversationMessages,
  conversationShares,
  users,
} from "@/lib/db"
import {
  SHARED_MESSAGES_MAX,
  sanitizeMessagesForShare,
  sanitizeShareTitle,
  type SharedMessage,
} from "@/lib/assistant/share-snapshot"

// Server-only: bu modüldeki fonksiyonlar kimliği doğrulanmış bir userId alır,
// "use server" modülünde durmamalı (oradaki her export herkese açık bir uç olur).

const TOKEN_BYTES = 16
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/

/** Kopyanın JSON boyutu tavanı. Aşan sohbet paylaşılamaz (sayfa da ağırlaşırdı). */
const SNAPSHOT_MAX_BYTES = 1_500_000

/** 128 bit rastgele, URL'de güvenli (base64url, 22 karakter). */
export function generateShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

/** Biçimi tutmayan token DB'ye hiç gitmez. */
export function isShareToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_RE.test(value)
}

/**
 * Sohbetin KAYITLI hâlinin özeti (başlık + mesajların ham satırları). Kopya
 * yerine kaynağın özeti alınır: temizleyici kuralı değişince bütün paylaşımlar
 * boş yere "güncel değil" görünmesin. jsonb anahtar sırasını kendisi
 * normalleştirdiği için aynı içerik hep aynı özeti verir.
 */
export function conversationHash(
  title: string,
  rows: ReadonlyArray<{ role: string; parts: unknown; metadata: unknown }>
): string {
  return createHash("sha256")
    .update(JSON.stringify({ title, rows }))
    .digest("hex")
}

/** Kopyada sayfada çizilecek en az bir part var mı. */
function hasVisibleParts(messages: SharedMessage[]): boolean {
  return messages.some((m) => m.parts.length > 0)
}

/**
 * Paylaşılan sayfada görünen ad: yalnızca kullanıcının açıkça sahip olduğu ad
 * (sosyal girişten gelen ya da Ayarlar'da yazdığı). Uygulama içinde adı
 * olmayanlara e-postadan bir ad türetilir (displayNameFromEmail), ama herkese
 * açık sayfada o ad e-postayı ele verir ("mehmet.kaya1990@…" → "Mehmet
 * Kaya1990"); bu yüzden burada kullanılmaz, sayfa "Anonim" der. Paylaşım
 * penceresi aynı değeri önizler.
 */
export function shareAuthorName(
  name: string | null | undefined
): string | null {
  return name?.trim() || null
}

export type ShareSnapshot = {
  title: string
  messages: SharedMessage[]
  contentHash: string
}

export type SnapshotResult =
  | { ok: true; snapshot: ShareSnapshot }
  | { ok: false; error: "not_found" | "empty" | "too_large" }

/** Bu kullanıcının sohbetinin şu anki hâlinden paylaşılabilir kopya. */
export async function buildShareSnapshot(
  conversationId: string,
  userId: string
): Promise<SnapshotResult> {
  const [conv] = await db
    .select({ title: conversations.title })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1)
  if (!conv) return { ok: false, error: "not_found" }

  const rows = await db
    .select({
      role: conversationMessages.role,
      parts: conversationMessages.parts,
      metadata: conversationMessages.metadata,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(asc(conversationMessages.sequence))

  const messages = sanitizeMessagesForShare(rows)
  if (!hasVisibleParts(messages)) return { ok: false, error: "empty" }
  if (messages.length > SHARED_MESSAGES_MAX) {
    return { ok: false, error: "too_large" }
  }
  if (
    Buffer.byteLength(JSON.stringify(messages), "utf8") > SNAPSHOT_MAX_BYTES
  ) {
    return { ok: false, error: "too_large" }
  }
  return {
    ok: true,
    snapshot: {
      title: sanitizeShareTitle(conv.title),
      messages,
      contentHash: conversationHash(conv.title, rows),
    },
  }
}

export type SharedConversationView = {
  title: string
  messages: SharedMessage[]
  /** null → anonim paylaşım (ya da adı hiç olmayan hesap). */
  authorName: string | null
  anonymous: boolean
  sharedAt: Date
  /** Yalnızca sahibine "sohbete dön" bağlantısı göstermek için. */
  ownerId: string
  conversationId: string
}

/**
 * Herkese açık okuma: token → paylaşılan kopya. Oturum gerektirmez.
 *
 * Silinmeyi bekleyen (arşivlenmiş) hesabın paylaşımları görünmez; hesap
 * 14 gün içinde geri açılırsa bağlantılar kendiliğinden geri gelir, açılmazsa
 * purge cascade ile siler. Kopya okurken de temizlenir (bkz. share-snapshot).
 *
 * `cache`: generateMetadata ile sayfa aynı istekte tek sorgu yapar.
 */
export const getSharedConversation = cache(
  async (token: string): Promise<SharedConversationView | null> => {
    if (!isShareToken(token)) return null
    const [row] = await db
      .select({
        title: conversationShares.title,
        messages: conversationShares.messages,
        anonymous: conversationShares.anonymous,
        updatedAt: conversationShares.updatedAt,
        userId: conversationShares.userId,
        conversationId: conversationShares.conversationId,
        name: users.name,
      })
      .from(conversationShares)
      .innerJoin(
        users,
        and(eq(users.id, conversationShares.userId), isNull(users.archivedAt))
      )
      .where(eq(conversationShares.token, token))
      .limit(1)
    if (!row) return null

    const messages = sanitizeMessagesForShare(
      Array.isArray(row.messages) ? row.messages : []
    )
    if (!hasVisibleParts(messages)) return null

    return {
      title: sanitizeShareTitle(row.title),
      messages,
      authorName: row.anonymous ? null : shareAuthorName(row.name),
      anonymous: row.anonymous,
      sharedAt: row.updatedAt,
      ownerId: row.userId,
      conversationId: row.conversationId,
    }
  }
)
