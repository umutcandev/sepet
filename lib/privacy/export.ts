import { asc, eq, inArray } from "drizzle-orm"
import { strToU8, zipSync, type Zippable } from "fflate"

import {
  db,
  users,
  accounts,
  userSessions,
  usageCounters,
  baskets,
  basketItems,
  receipts,
  receiptItems,
  conversations,
  conversationMessages,
} from "@/lib/db"
import { getObjectBytes } from "@/lib/storage/r2"
import { EXPORT_CATEGORIES, type ExportCategory } from "./categories"

const ROOT = "sepet-verilerim"

function jsonBytes(data: unknown): Uint8Array {
  return strToU8(JSON.stringify(data, null, 2))
}

function extFromKey(key: string | null | undefined): string {
  if (!key) return "jpg"
  const m = /\.([a-z0-9]+)$/i.exec(key)
  return m ? m[1].toLowerCase() : "jpg"
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(d)
}

/**
 * Bir kullanıcının seçili veri kategorilerini toplayıp tek bir ZIP (Uint8Array)
 * olarak döndürür. Tüm sorgular `eq(userId)` ile kapsanır. Hassas alanlar (OAuth
 * token'ları, session token'ları) hiçbir zaman dahil edilmez. Fiş görselleri
 * R2'den best-effort çekilir; erişilemeyen görseller sessizce atlanır.
 */
export async function buildUserExport(
  userId: string,
  categories: ExportCategory[],
): Promise<{ bytes: Uint8Array; filename: string }> {
  const selected = new Set<ExportCategory>(
    categories.length ? categories : EXPORT_CATEGORIES,
  )
  const files: Zippable = {}
  const now = new Date()
  const includedSections: string[] = []
  let userEmail: string | null = null

  // ─── Profil + hesap ───
  if (selected.has("profil")) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    userEmail = user?.email ?? null

    const [providerRows, sessionRows, usageRows] = await Promise.all([
      db
        .select({
          provider: accounts.provider,
          type: accounts.type,
          scope: accounts.scope,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId)),
      db
        .select({
          deviceLabel: userSessions.deviceLabel,
          userAgent: userSessions.userAgent,
          ip: userSessions.ip,
          locationLabel: userSessions.locationLabel,
          createdAt: userSessions.createdAt,
          lastSeenAt: userSessions.lastSeenAt,
          revokedAt: userSessions.revokedAt,
        })
        .from(userSessions)
        .where(eq(userSessions.userId, userId)),
      db
        .select({
          period: usageCounters.period,
          textMessages: usageCounters.textMessages,
          imageAnalyses: usageCounters.imageAnalyses,
          updatedAt: usageCounters.updatedAt,
        })
        .from(usageCounters)
        .where(eq(usageCounters.userId, userId)),
    ])

    files[`${ROOT}/profil.json`] = jsonBytes({
      profil: user ?? null,
      baglıHesaplar: providerRows,
      oturumlar: sessionRows,
      kullanim: usageRows,
    })
    includedSections.push("profil.json — profil, bağlı hesaplar, oturumlar, kullanım")
  }

  // ─── Sepetler ───
  if (selected.has("sepetler")) {
    const basketRows = await db
      .select()
      .from(baskets)
      .where(eq(baskets.userId, userId))
      .orderBy(asc(baskets.createdAt))

    const ids = basketRows.map((b) => b.id)
    const itemRows = ids.length
      ? await db
          .select()
          .from(basketItems)
          .where(inArray(basketItems.basketId, ids))
      : []
    const itemsByBasket = groupBy(itemRows, (it) => it.basketId)

    files[`${ROOT}/sepetler.json`] = jsonBytes(
      basketRows.map((b) => ({ ...b, urunler: itemsByBasket.get(b.id) ?? [] })),
    )
    includedSections.push(`sepetler.json — ${basketRows.length} sepet`)
  }

  // ─── Fişler (+ görseller) ───
  if (selected.has("fisler")) {
    const receiptRows = await db
      .select()
      .from(receipts)
      .where(eq(receipts.userId, userId))
      .orderBy(asc(receipts.createdAt))

    const ids = receiptRows.map((r) => r.id)
    const itemRows = ids.length
      ? await db
          .select()
          .from(receiptItems)
          .where(inArray(receiptItems.receiptId, ids))
      : []
    const itemsByReceipt = groupBy(itemRows, (it) => it.receiptId)

    // Görselleri R2'den paralel çek; erişilemezse atla (DB kaynak doğrudur).
    const images = await Promise.allSettled(
      receiptRows.map(async (r) => {
        const ext = extFromKey(r.imageR2Key)
        const bytes = await getObjectBytes(r.imageR2Key)
        return { id: r.id, path: `fis-gorselleri/${r.id}.${ext}`, bytes }
      }),
    )
    const imagePathById = new Map<string, string>()
    for (const res of images) {
      if (res.status === "fulfilled") {
        files[`${ROOT}/${res.value.path}`] = res.value.bytes
        imagePathById.set(res.value.id, res.value.path)
      } else {
        console.error("[export] fiş görseli çekilemedi", res.reason)
      }
    }

    files[`${ROOT}/fisler.json`] = jsonBytes(
      receiptRows.map(({ imageR2Key: _omit, ...r }) => ({
        ...r,
        gorselDosyasi: imagePathById.get(r.id) ?? null,
        urunler: itemsByReceipt.get(r.id) ?? [],
      })),
    )
    includedSections.push(
      `fisler.json — ${receiptRows.length} fiş (görseller fis-gorselleri/ içinde)`,
    )
  }

  // ─── Sohbetler ───
  if (selected.has("sohbetler")) {
    const convRows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(asc(conversations.createdAt))

    const ids = convRows.map((c) => c.id)
    const msgRows = ids.length
      ? await db
          .select({
            conversationId: conversationMessages.conversationId,
            role: conversationMessages.role,
            parts: conversationMessages.parts,
            metadata: conversationMessages.metadata,
            sequence: conversationMessages.sequence,
            createdAt: conversationMessages.createdAt,
          })
          .from(conversationMessages)
          .where(inArray(conversationMessages.conversationId, ids))
          .orderBy(asc(conversationMessages.sequence))
      : []
    const msgsByConv = groupBy(msgRows, (m) => m.conversationId)

    files[`${ROOT}/sohbetler.json`] = jsonBytes(
      convRows.map((c) => ({
        ...c,
        mesajlar: (msgsByConv.get(c.id) ?? []).map(
          ({ conversationId: _omit, ...m }) => m,
        ),
      })),
    )
    includedSections.push(`sohbetler.json — ${convRows.length} sohbet`)
  }

  // ─── README ───
  files[`${ROOT}/README.txt`] = strToU8(buildReadme(now, userEmail, includedSections))

  const bytes = zipSync(files, { level: 6 })
  const stamp = now.toISOString().slice(0, 10)
  return { bytes, filename: `sepet-verilerim-${stamp}.zip` }
}

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const row of rows) {
    const k = key(row)
    const arr = map.get(k)
    if (arr) arr.push(row)
    else map.set(k, [row])
  }
  return map
}

function buildReadme(
  now: Date,
  email: string | null,
  sections: string[],
): string {
  return [
    "Sepet — Kişisel Veri Dışa Aktarımı",
    "===================================",
    "",
    `Dışa aktarma tarihi: ${formatDate(now)}`,
    email ? `Hesap: ${email}` : null,
    "",
    "Bu arşiv, Sepet hesabınla ilişkili kişisel verilerini içerir. KVKK ve GDPR",
    "kapsamındaki veri taşınabilirliği hakkın gereği bu veriyi makine tarafından",
    "okunabilir JSON biçiminde sağlıyoruz.",
    "",
    "İçerik:",
    ...sections.map((s) => `  - ${s}`),
    "",
    "Güvenlik notu: Bu arşiv OAuth erişim/yenileme token'larını veya oturum",
    "anahtarlarını İÇERMEZ. Yine de dosyaları güvenli sakla; kişisel bilgi içerir.",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n")
}
