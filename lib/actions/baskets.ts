"use server"

import { revalidatePath } from "next/cache"
import { and, asc, count, desc, eq, exists, ilike, inArray, isNotNull, or, sql } from "drizzle-orm"
import { auth } from "@/auth"
import { db, baskets, basketItems } from "@/lib/db"
import { escapeLike, isUuid } from "@/lib/utils"
import { getUserPlan } from "@/lib/usage/usage"
import { planLimit } from "@/lib/usage/limits"
import { type BasketSort, DEFAULT_BASKET_SORT } from "@/lib/basket-sort"
import type {
  MatchResult,
  OptimizationSummary,
  ParsedItem,
} from "@/lib/ai/schemas"

const BASKETS_PAGE_SIZE = 20
const BULK_DELETE_CHUNK = 100

// Liste satırı için gereken alanlar (tablo + arama + infinite scroll ortak tipi).
export type BasketListItem = {
  id: string
  name: string
  createdAt: Date
  bestSingleMarket: string | null
  bestSingleTotal: string | null
  twoMarketSavingsTL: string | null
}

const basketListColumns = {
  id: baskets.id,
  name: baskets.name,
  createdAt: baskets.createdAt,
  bestSingleMarket: baskets.bestSingleMarket,
  bestSingleTotal: baskets.bestSingleTotal,
  twoMarketSavingsTL: baskets.twoMarketSavingsTL,
} as const

function orderByForBasketSort(sort: BasketSort) {
  const lowerName = sql`lower(${baskets.name})`
  switch (sort) {
    case "date_asc":
      return [asc(baskets.createdAt), asc(baskets.id)]
    case "name_asc":
      return [asc(lowerName), asc(baskets.id)]
    case "name_desc":
      return [desc(lowerName), asc(baskets.id)]
    case "date_desc":
    default:
      return [desc(baskets.createdAt), asc(baskets.id)]
  }
}

type SaveBasketInput = {
  name: string | null
  items: Array<{
    rawName: string
    searchQuery: string
    quantity: number
    unit: ParsedItem["unit"]
  }>
  matches: MatchResult[]
  summary: OptimizationSummary
  conversationId?: string | null
  sourceToolCallId?: string | null
}

function autoBasketName(): string {
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
  return `Sepet · ${fmt.format(new Date())}`
}

// Depolama limiti kullanıcıya gösterilecek beklenen bir sonuç olduğu için
// (exception değil) ayrık bir union dönülür — Next.js production'da server
// action exception mesajlarını maskeler, dönen değer ise korunur.
export type SaveBasketResult =
  | { ok: true; id: string }
  | { ok: false; reason: "storage_limit_reached" }

export async function saveBasket(
  input: SaveBasketInput,
): Promise<SaveBasketResult> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const userId = session.user.id
  const conversationId = input.conversationId ?? null
  const sourceToolCallId = input.sourceToolCallId ?? null

  // Aynı (sohbet, tool-call) için kullanıcı zaten kaydettiyse aynı id'yi
  // döndür — yenile/yeniden tıkla durumunda kopya satır oluşmasın.
  if (conversationId && sourceToolCallId) {
    const [existing] = await db
      .select({ id: baskets.id })
      .from(baskets)
      .where(
        and(
          eq(baskets.userId, userId),
          eq(baskets.conversationId, conversationId),
          eq(baskets.sourceToolCallId, sourceToolCallId),
        ),
      )
      .limit(1)
    if (existing) return { ok: true, id: existing.id }
  }

  // Depolama kotası: kayıt öncesi sert tavan (kullanıcının açık "Kaydet"
  // aksiyonu; sohbetlere kota yoktur).
  //
  // Eşzamanlılık notu: count→insert statement-düzeyinde atomik değil, ama
  // pratikte güvenli. Gerçek çift-gönderim üç katmanda engelli: (1) UI "Kaydet"i
  // kaydederken/kaydedince kilitler, (2) yukarıdaki dedup aynı (sohbet, tool-call)
  // için var olan id'yi döner, (3) basket_conv_tool_idx unique index'i aynı
  // kartın iki satırını DB'de imkânsız kılar. Geriye yalnızca "aynı anda iki
  // FARKLI sepet" yarışı kalır — ardışık insan tıklamasıyla ulaşılamaz ve en kötü
  // 1 fazla satır demektir (AI/maliyet/güvenlik etkisi yok). neon-http
  // transaction desteklemediğinden daha sıkı serileştirme, jsonb/numeric'i ham
  // SQL'de elle kodlayıp çalışan kayıt yolunu riske atmayı gerektirirdi — bu
  // denge için gereksiz.
  const basketLimit = planLimit(await getUserPlan(userId), "savedBaskets")
  if (basketLimit !== null) {
    const [row] = await db
      .select({ value: count() })
      .from(baskets)
      .where(eq(baskets.userId, userId))
    if ((row?.value ?? 0) >= basketLimit) {
      return { ok: false, reason: "storage_limit_reached" }
    }
  }

  const trimmedName = input.name?.trim()
  const name = trimmedName && trimmedName.length > 0 ? trimmedName : autoBasketName()

  const bestSingle =
    input.summary.singleMarket.itemCount > 0
      ? input.summary.singleMarket
      : null
  const twoMarketSavings =
    input.summary.twoMarketCombo.markets.length === 2
      ? input.summary.twoMarketCombo.savingsTL
      : null

  const [inserted] = await db
    .insert(baskets)
    .values({
      userId,
      conversationId,
      sourceToolCallId,
      name,
      bestSingleMarket: bestSingle?.market ?? null,
      bestSingleTotal: bestSingle ? bestSingle.total.toFixed(2) : null,
      twoMarketSavingsTL:
        twoMarketSavings != null ? twoMarketSavings.toFixed(2) : null,
      summaryJson: input.summary,
    })
    .returning({ id: baskets.id })

  if (!inserted) throw new Error("insert_failed")

  if (input.items.length > 0) {
    await db.insert(basketItems).values(
      input.items.map((it, idx) => {
        const match = input.matches[idx]
        const best = match?.bestMatch ?? null
        const minPrice = best?.minPrice ?? null
        const marketWithMin = best
          ? match.marketPrices.find((mp) => mp.price === minPrice) ?? null
          : null
        return {
          basketId: inserted.id,
          rawName: it.rawName,
          searchQuery: it.searchQuery,
          quantity: it.quantity.toString(),
          unit: it.unit,
          matchedProductId: best?.productId ?? null,
          matchedName: best?.name ?? null,
          bestMarket: marketWithMin?.market ?? null,
          bestPrice: minPrice != null ? minPrice.toFixed(2) : null,
        }
      }),
    )
  }

  revalidatePath("/sepetlerim")
  return { ok: true, id: inserted.id }
}

export async function deleteBasket(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")
  if (!isUuid(id)) throw new Error("not_found")

  await db
    .delete(baskets)
    .where(and(eq(baskets.id, id), eq(baskets.userId, session.user.id)))

  revalidatePath("/sepetlerim")
}

/**
 * Toplu silme: yalnızca bu kullanıcıya ait satırlar silinir (yetki kontrolü
 * her sorguda eq(userId) ile). Sorgu zaman aşımına girmemesi için 100'lük
 * parçalara bölünür. `basketItems` CASCADE ile birlikte silinir.
 */
export async function deleteBaskets(
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
      .delete(baskets)
      .where(
        and(inArray(baskets.id, slice), eq(baskets.userId, session.user.id)),
      )
      .returning({ id: baskets.id })
    deleted += rows.length
  }

  if (deleted > 0) revalidatePath("/sepetlerim")
  return { deleted }
}

/**
 * Sayfalı sepet listesi (infinite scroll). `PAGE_SIZE + 1` satır çekip fazlasını
 * atarak `hasMore` belirlenir. Sıralama sunucu tarafında uygulanır.
 */
export async function listBasketsPaginated(
  offset = 0,
  sort: BasketSort = DEFAULT_BASKET_SORT,
): Promise<{ items: BasketListItem[]; hasMore: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { items: [], hasMore: false }

  const items = await db
    .select(basketListColumns)
    .from(baskets)
    .where(eq(baskets.userId, session.user.id))
    .orderBy(...orderByForBasketSort(sort))
    .limit(BASKETS_PAGE_SIZE + 1)
    .offset(offset)

  const hasMore = items.length > BASKETS_PAGE_SIZE
  if (hasMore) items.pop()
  return { items, hasMore }
}

/**
 * Sepetlerde arama: sepet adı veya içindeki kalem adlarında (EXISTS alt sorgu)
 * geçen eşleşmeleri döndürür. Tek seferde gelir (paginate edilmez), tavanla
 * sınırlı.
 */
export async function searchBaskets(
  query: string,
  sort: BasketSort = DEFAULT_BASKET_SORT,
): Promise<BasketListItem[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const q = query.trim()
  if (!q || q.length > 100) return []

  const pattern = `%${escapeLike(q)}%`

  const itemMatch = exists(
    db
      .select({ one: sql`1` })
      .from(basketItems)
      .where(
        and(
          eq(basketItems.basketId, baskets.id),
          or(
            ilike(basketItems.rawName, pattern),
            ilike(basketItems.matchedName, pattern),
          ),
        ),
      ),
  )

  return db
    .select(basketListColumns)
    .from(baskets)
    .where(
      and(
        eq(baskets.userId, session.user.id),
        or(ilike(baskets.name, pattern), itemMatch),
      ),
    )
    .orderBy(...orderByForBasketSort(sort))
    .limit(200)
}

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

export async function getBasketDetail(id: string, userId: string) {
  if (!isUuid(id)) return null
  const [basket] = await db
    .select()
    .from(baskets)
    .where(and(eq(baskets.id, id), eq(baskets.userId, userId)))
    .limit(1)
  if (!basket) return null
  const items = await db
    .select()
    .from(basketItems)
    .where(eq(basketItems.basketId, id))
  return { basket, items }
}
