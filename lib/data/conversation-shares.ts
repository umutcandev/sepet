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
  type ImageRefCollector,
  type SharedMessage,
} from "@/lib/assistant/share-snapshot"
import { SHARED_IMAGES_MAX } from "@/lib/assistant/share-types"
import {
  isOwnedReceiptKey,
  isOwnedReceiptUrl,
  publicUrlForKey,
} from "@/lib/storage/r2"

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
  /** Kopyadaki görsellerin R2 anahtarları, sıra numarasıyla. Yalnız sunucuda. */
  images: string[]
}

/**
 * Kullanıcının mesajındaki görselin R2 anahtarı, yalnızca gerçekten bu
 * kullanıcının klasöründeyse. `filename` istemcinin gönderdiği haliyle
 * kaydedildiği için önek zorunlu; adres yalnız yedek.
 */
function ownedImageKey(
  image: { url: string | null; filename: string | null },
  userId: string
): string | null {
  if (image.filename && isOwnedReceiptKey(image.filename, userId)) {
    return image.filename
  }
  try {
    if (image.url && isOwnedReceiptUrl(image.url, userId)) {
      const base = publicUrlForKey("")
      const key = image.url.slice(base.length)
      return isOwnedReceiptKey(key, userId) ? key : null
    }
  } catch {
    // R2 adresi tanımlı değil: görsel numaralanmaz, "paylaşılmadı" olur.
  }
  return null
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

  // Görseller sıra numarasına dönüşür; aynı görsel tek numara alır.
  const images: string[] = []
  const collectImage: ImageRefCollector = (image) => {
    const key = ownedImageKey(image, userId)
    if (!key) return null
    const existing = images.indexOf(key)
    if (existing >= 0) return existing
    if (images.length >= SHARED_IMAGES_MAX) return null
    images.push(key)
    return images.length - 1
  }
  const messages = sanitizeMessagesForShare(rows, collectImage)
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
      images,
    },
  }
}

export type SharedConversationView = {
  title: string
  messages: SharedMessage[]
  /** null → anonim paylaşım (ya da adı hiç olmayan hesap). */
  authorName: string | null
  anonymous: boolean
  /** Açıkken görseller "paylaşılmadı" işaretiyle gösterilir. */
  hideImages: boolean
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
        hideImages: conversationShares.hideImages,
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
      hideImages: row.hideImages,
      sharedAt: row.updatedAt,
      ownerId: row.userId,
      conversationId: row.conversationId,
    }
  }
)

/**
 * Paylaşılan sayfadaki n. görselin R2 anahtarı. Yalnızca paylaşım varken,
 * sahibinin hesabı açıkken ve "Resimleri gizle" kapalıyken; anahtar yine de
 * sahibinin klasöründe olmalı. Aksi her durumda null (çağıran 404 döner).
 */
export async function getSharedImageKey(
  token: string,
  ref: number
): Promise<string | null> {
  if (!isShareToken(token)) return null
  if (!Number.isInteger(ref) || ref < 0 || ref >= SHARED_IMAGES_MAX) return null
  const [row] = await db
    .select({
      images: conversationShares.images,
      hideImages: conversationShares.hideImages,
      userId: conversationShares.userId,
    })
    .from(conversationShares)
    .innerJoin(
      users,
      and(eq(users.id, conversationShares.userId), isNull(users.archivedAt))
    )
    .where(eq(conversationShares.token, token))
    .limit(1)
  if (!row || row.hideImages || !Array.isArray(row.images)) return null
  const key = row.images[ref]
  return typeof key === "string" && isOwnedReceiptKey(key, row.userId)
    ? key
    : null
}
