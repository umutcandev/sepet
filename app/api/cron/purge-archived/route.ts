import { NextResponse } from "next/server"
import { and, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm"

import {
  db,
  users,
  receipts,
  conversations,
  conversationMessages,
  emailVerification,
  passwordReset,
  pendingLogin,
} from "@/lib/db"
import {
  deleteObjectsByKeys,
  deleteUserStorage,
  listReceiptObjectsPage,
} from "@/lib/storage/r2"
import { redis } from "@/lib/redis"

export const runtime = "nodejs"
export const maxDuration = 60

// Arşivlenen hesaplar bu kadar gün sonra kalıcı silinir.
const GRACE_DAYS = 14

// ─── Yetim fiş görseli temizliği ───
// /api/receipts/upload görseli R2'ye yazar, ama kullanıcı hiç göndermeden
// vazgeçerse hiçbir yerde referansı olmaz ve nesne sonsuza dek kalır.
//
// DİKKAT — iki ayrı referans yolu var, ikisi de korunmalı:
//   1. `receipts.imageR2Key` — kullanıcı "Fişi Kaydet" dedi.
//   2. `conversation_message.parts` — kullanıcı kaydetmedi AMA görsel sohbete
//      gömülü (yüklenen dosya part'ı + analyzeImage tool çıktısı). Sohbet
//      yeniden açıldığında render edilir; silinirse geçmişte kırık görsel kalır.
// Yalnızca İKİSİNDE DE geçmeyen key silinir.
const ORPHAN_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Cron'un 60 sn bütçesi içinde kalmak için tarama sayfa sayfa yapılır; imleç
// Redis'te tutulur ve bir sonraki çalıştırma kaldığı yerden devam eder. Liste
// bitince imleç silinir → ertesi gün baştan tarar.
const ORPHAN_CURSOR_KEY = "cron:receipts:orphan-cursor"
const ORPHAN_CURSOR_TTL = 60 * 60 * 24 * 7
const ORPHAN_PAGES_PER_RUN = 3
const ORPHAN_PAGE_SIZE = 1000
// Sohbet referansı kontrolü aday başına maliyetli; gerçek yetim sayısı
// pratikte küçük olduğundan bu tavan yalnızca patolojik durumda devreye girer.
const ORPHAN_MAX_CHECKS_PER_RUN = 200

/** `receipts/{userId}/{dosya}` → userId. Beklenmeyen biçimde null. */
function userIdFromReceiptKey(key: string): string | null {
  const parts = key.split("/")
  return parts.length >= 3 && parts[0] === "receipts" && parts[1] ? parts[1] : null
}

/**
 * Verilen key'lerden `conversation_message.parts` içinde GEÇENLERİ döndürür.
 * Sorgu tek bir kullanıcının sohbetleriyle sınırlıdır (conversation.userId →
 * conversationId indeksleri üzerinden) ve gerçek yetimlerde hiç satır dönmez —
 * yani yaygın durumda ucuzdur.
 */
async function keysReferencedInConversations(
  userId: string,
  keys: string[],
): Promise<Set<string>> {
  const rows = await db
    .select({ parts: conversationMessages.parts })
    .from(conversationMessages)
    .innerJoin(
      conversations,
      eq(conversations.id, conversationMessages.conversationId),
    )
    .where(
      and(
        eq(conversations.userId, userId),
        or(
          ...keys.map(
            (k) => sql`${conversationMessages.parts}::text LIKE ${`%${k}%`}`,
          ),
        ),
      ),
    )

  if (rows.length === 0) return new Set()
  const blob = rows.map((r) => JSON.stringify(r.parts)).join("\n")
  return new Set(keys.filter((k) => blob.includes(k)))
}

/**
 * Bir R2 key sayfasını DB ile karşılaştırıp yetimleri siler. Önce ucuz olan
 * `receipts` kontrolü (tek indeksli IN sorgusu), kalan adaylar için kullanıcı
 * bazında sohbet kontrolü yapılır.
 */
async function deleteOrphansIn(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0

  // 1) Kaydedilmiş fişler.
  const referenced = new Set<string>()
  for (let i = 0; i < keys.length; i += 500) {
    const rows = await db
      .select({ key: receipts.imageR2Key })
      .from(receipts)
      .where(inArray(receipts.imageR2Key, keys.slice(i, i + 500)))
    for (const r of rows) referenced.add(r.key)
  }

  // 2) Sohbete gömülü görseller — yalnızca 1'de eşleşmeyen adaylar için.
  const candidates = keys
    .filter((k) => !referenced.has(k))
    .slice(0, ORPHAN_MAX_CHECKS_PER_RUN)
  if (candidates.length === 0) return 0

  const byUser = new Map<string, string[]>()
  for (const key of candidates) {
    const uid = userIdFromReceiptKey(key)
    // Biçimi tanınmayan key'e dokunma — sahibini doğrulayamıyoruz.
    if (!uid) continue
    const list = byUser.get(uid)
    if (list) list.push(key)
    else byUser.set(uid, [key])
  }

  const orphans: string[] = []
  for (const [uid, userKeys] of byUser) {
    const inChat = await keysReferencedInConversations(uid, userKeys)
    for (const k of userKeys) if (!inChat.has(k)) orphans.push(k)
  }

  await deleteObjectsByKeys(orphans)
  return orphans.length
}

async function purgeOrphanReceiptObjects(): Promise<{
  scanned: number
  deleted: number
}> {
  let cursor = (await redis.get<string>(ORPHAN_CURSOR_KEY)) ?? undefined
  const cutoff = Date.now() - ORPHAN_MIN_AGE_MS
  let scanned = 0
  let deleted = 0

  for (let page = 0; page < ORPHAN_PAGES_PER_RUN; page++) {
    const { objects, nextStartAfter } = await listReceiptObjectsPage({
      startAfter: cursor,
      maxKeys: ORPHAN_PAGE_SIZE,
    })
    scanned += objects.length

    // Yaşı bilinmeyen (LastModified yok) nesneye dokunma — güvenli taraf.
    const candidates = objects
      .filter((o) => o.lastModified != null && o.lastModified.getTime() < cutoff)
      .map((o) => o.key)
    deleted += await deleteOrphansIn(candidates)

    if (!nextStartAfter) {
      await redis.del(ORPHAN_CURSOR_KEY)
      return { scanned, deleted }
    }
    cursor = nextStartAfter
  }

  await redis.set(ORPHAN_CURSOR_KEY, cursor, { ex: ORPHAN_CURSOR_TTL })
  return { scanned, deleted }
}

export async function GET(req: Request) {
  // Vercel Cron, CRON_SECRET set edilmişse Authorization: Bearer <secret>
  // başlığını otomatik gönderir. Secret yoksa uç kapalıdır.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 })
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Süresi dolmuş tek kullanımlık auth token'ları temizle (hijyen; okuma zaten
  // süre kontrolü yapar, bunlar yalnız satır biriktirmesini önler).
  const now = new Date()
  await db.delete(emailVerification).where(lt(emailVerification.expiresAt, now))
  await db.delete(passwordReset).where(lt(passwordReset.expiresAt, now))
  await db.delete(pendingLogin).where(lt(pendingLogin.expiresAt, now))

  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(isNotNull(users.archivedAt), lt(users.archivedAt, cutoff)))

  let purged = 0
  for (const u of rows) {
    try {
      // Önce R2 nesneleri (avatar + fişler), sonra DB satırı; users silinince
      // accounts/session/user_session/receipts/baskets/conversations/usage
      // cascade ile temizlenir.
      await deleteUserStorage(u.id)
      await db.delete(users).where(eq(users.id, u.id))
      purged++
    } catch (err) {
      console.error("[cron/purge-archived] failed for", u.id, err)
    }
  }

  // Hesap purge'ünden SONRA çalışır: silinen hesapların nesneleri
  // deleteUserStorage ile zaten gitti, burada gereksiz yere taranmazlar.
  // Tarama hata verirse cron'un asıl işi (hesap purge) başarılı sayılmalı.
  let orphans = { scanned: 0, deleted: 0 }
  try {
    orphans = await purgeOrphanReceiptObjects()
  } catch (err) {
    console.error("[cron/purge-archived] yetim fiş taraması başarısız", err)
  }

  return NextResponse.json({
    scanned: rows.length,
    purged,
    orphanObjectsScanned: orphans.scanned,
    orphanObjectsDeleted: orphans.deleted,
  })
}
