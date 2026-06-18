import { asc, eq, inArray } from "drizzle-orm"
import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from "fflate"

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

// Fiş görsellerini R2'den çekerken eşzamanlılık tavanı. Görseller sıralı ZIP'e
// basılır ama I/O'yu hızlandırmak için küçük gruplar paralel çekilir. Tepe
// bellek ≈ IMAGE_CONCURRENCY × görsel boyutu (görsel başına en fazla 8 MB).
const IMAGE_CONCURRENCY = 6

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
 * Bir kullanıcının seçili veri kategorilerini ZIP olarak akıtan bir web
 * `ReadableStream` döndürür. Arşiv belleğe topluca alınmaz: JSON bölümleri
 * tek tek deflate'lenir, fiş görselleri küçük gruplar halinde çekilip (bkz.
 * IMAGE_CONCURRENCY) sırayla `ZipPassThrough` ile akıtılır. Böylece tepe bellek
 * kullanıcının toplam veri boyutuyla değil, sabit bir tavanla sınırlı kalır ve
 * senkron `zipSync` gibi event-loop'u bloklamaz.
 *
 * Tüm sorgular `eq(userId)` ile kapsanır. Hassas alanlar (OAuth token'ları,
 * session token'ları) hiçbir zaman dahil edilmez. Fiş görselleri best-effort
 * çekilir; erişilemeyen görseller sessizce atlanır (DB kaynak doğrudur).
 */
export function buildUserExportStream(
  userId: string,
  categories: ExportCategory[],
): { stream: ReadableStream<Uint8Array>; filename: string } {
  const selected = new Set<ExportCategory>(
    categories.length ? categories : EXPORT_CATEGORIES,
  )
  const now = new Date()
  const filename = `sepet-verilerim-${now.toISOString().slice(0, 10)}.zip`

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let errored = false
      const zip = new Zip((err, data, final) => {
        if (err) {
          errored = true
          controller.error(err)
          return
        }
        if (data.length) controller.enqueue(data)
        if (final) controller.close()
      })

      // Bir JSON dosyasını deflate ederek arşive ekler. Sync ZipDeflate kasıtlı:
      // dosya push(bytes, true) ile anında tamamlanır, böylece sonraki (görsel)
      // dosyaların verisi fflate tarafından bellekte tampona alınmaz.
      const addJson = (name: string, data: unknown) => {
        const file = new ZipDeflate(name, { level: 6 })
        zip.add(file)
        file.push(jsonBytes(data), true)
      }

      try {
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

          addJson(`${ROOT}/profil.json`, {
            profil: user ?? null,
            baglıHesaplar: providerRows,
            oturumlar: sessionRows,
            kullanim: usageRows,
          })
          includedSections.push(
            "profil.json — profil, bağlı hesaplar, oturumlar, kullanım",
          )
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

          addJson(
            `${ROOT}/sepetler.json`,
            basketRows.map((b) => ({
              ...b,
              urunler: itemsByBasket.get(b.id) ?? [],
            })),
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

          // Görselleri sınırlı eşzamanlılıkla çek; her grup tamamen belleğe
          // gelince sırayla arşive basılır ve serbest bırakılır. Tam baytlar
          // elde edildikten sonra eklendiği için yarım/bozuk entry oluşmaz;
          // erişilemeyen görsel atlanır.
          const imagePathById = new Map<string, string>()
          for (let i = 0; i < receiptRows.length; i += IMAGE_CONCURRENCY) {
            const slice = receiptRows.slice(i, i + IMAGE_CONCURRENCY)
            const results = await Promise.allSettled(
              slice.map((r) => getObjectBytes(r.imageR2Key)),
            )
            for (let j = 0; j < results.length; j++) {
              const res = results[j]
              const r = slice[j]
              if (res.status === "fulfilled") {
                const path = `fis-gorselleri/${r.id}.${extFromKey(r.imageR2Key)}`
                const file = new ZipPassThrough(`${ROOT}/${path}`)
                zip.add(file)
                file.push(res.value, true)
                imagePathById.set(r.id, path)
              } else {
                console.error("[export] fiş görseli çekilemedi", res.reason)
              }
            }
          }

          addJson(
            `${ROOT}/fisler.json`,
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

          addJson(
            `${ROOT}/sohbetler.json`,
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
        const readme = new ZipDeflate(`${ROOT}/README.txt`, { level: 6 })
        zip.add(readme)
        readme.push(strToU8(buildReadme(now, userEmail, includedSections)), true)

        // Tüm dosyalar eklendi; arşivi sonlandır (final ondata → controller.close).
        zip.end()
      } catch (err) {
        if (!errored) controller.error(err)
      }
    },
  })

  return { stream, filename }
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
