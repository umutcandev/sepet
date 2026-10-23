"use server"

import { revalidatePath } from "next/cache"
import { and, asc, count, desc, eq, exists, ilike, inArray, or, sql } from "drizzle-orm"
import { auth } from "@/auth"
import { db, baskets, basketItems } from "@/lib/db"
import { ownedConversationId } from "@/lib/data/conversations"
import { basketItemMatchFields, basketSummaryFields } from "@/lib/data/baskets"
import { escapeLike, isUuid } from "@/lib/utils"
import { getUserPlan } from "@/lib/usage/usage"
import { planLimit } from "@/lib/usage/limits"
import { withUserLock } from "@/lib/security/user-lock"
import { MAX_APPROVAL_ITEMS } from "@/lib/assistant/approval-limits"
import { type BasketSort, DEFAULT_BASKET_SORT } from "@/lib/basket-sort"
import { OptimizationSummarySchema } from "@/lib/ai/schemas"
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

/**
 * `matches[idx]` ile `items[idx]` konum üzerinden eşleştiriliyordu — anahtarsız,
 * örtük bir sözleşme. İkisi de aynı kaynaktan sırayla üretildiği için bugün
 * çalışıyor, ama araya tek bir filtre girmesi tüm kalemleri sessizce kaydırırdı.
 * Önce konumu doğrula, tutmuyorsa ham adla ara.
 *
 * İkisi de tutmazsa `null`: konuma geri düşmek tam da kaçınılan hatayı geri
 * getirirdi — yanlış kalemin fiyatını doğru kalemin satırına yazmak. Eşleşme
 * bilgisiz kalsın, yanlış olmasın.
 */
function matchForItem(
  matches: MatchResult[],
  rawName: string,
  idx: number,
): MatchResult | null {
  const positional = matches[idx]
  if (positional && positional.rawName === rawName) return positional
  return matches.find((m) => m.rawName === rawName) ?? null
}

export async function saveBasket(
  input: SaveBasketInput,
): Promise<SaveBasketResult> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const userId = session.user.id
  // Kalemler istemciden geliyor; onay kartlarının tavanıyla aynı sınır (bkz.
  // lib/assistant/approval-limits.ts) — kayıt başına sınırsız satır yazılmasın.
  if (!Array.isArray(input.items) || input.items.length > MAX_APPROVAL_ITEMS) {
    throw new Error("too_many_items")
  }
  // Başkasının sohbetine bağlanamaz; sahiplik tutmazsa kayıt sohbetsiz yapılır.
  const conversationId = await ownedConversationId(input.conversationId, userId)
  const sourceToolCallId = conversationId ? input.sourceToolCallId ?? null : null

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
  // aksiyonu; sohbetlere kota yoktur). Sayım ile insert aşağıda kullanıcı
  // başına kilit altında yapılır (bkz. lib/security/user-lock.ts): action'ı
  // paralel çağırarak sınır aşılamaz.
  const basketLimit = planLimit(await getUserPlan(userId), "savedBaskets")

  const trimmedName = input.name?.trim()
  const name = trimmedName && trimmedName.length > 0 ? trimmedName : autoBasketName()

  // `summary` istemciden geliyor ve doğrudan jsonb'ye yazılıyordu; bozuk/eksik
  // bir özet ancak okuma anında, detay sayfasını düşürerek fark ediliyordu.
  // Yazarken doğrula: hata artık kaydedenin kendi isteğinde patlar, kayıt
  // sonrası sessiz bir bomba bırakmaz.
  const summary = OptimizationSummarySchema.parse(input.summary)

  const insertRow = async () => {
    if (basketLimit !== null) {
      const [row] = await db
        .select({ value: count() })
        .from(baskets)
        .where(eq(baskets.userId, userId))
      if ((row?.value ?? 0) >= basketLimit) return "limit" as const
    }
    const [row] = await db
      .insert(baskets)
      .values({
        userId,
        conversationId,
        sourceToolCallId,
        name,
        ...basketSummaryFields(summary),
      })
      .returning({ id: baskets.id })
    return row
  }
  // Kilit yalnız tavanlı planda: sınırsız planda (Pro) yarışın aşacağı bir
  // sınır yok, kayıt Redis'e bağımlı kalmasın.
  const inserted =
    basketLimit === null
      ? await insertRow()
      : await withUserLock(userId, "basket", insertRow)

  if (inserted === "limit") {
    return { ok: false, reason: "storage_limit_reached" }
  }
  if (!inserted) throw new Error("insert_failed")

  if (input.items.length > 0) {
    await db.insert(basketItems).values(
      input.items.map((it, idx) => ({
        basketId: inserted.id,
        sortIndex: idx,
        rawName: it.rawName,
        searchQuery: it.searchQuery,
        quantity: it.quantity.toString(),
        unit: it.unit,
        ...basketItemMatchFields(matchForItem(input.matches, it.rawName, idx)),
      })),
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
