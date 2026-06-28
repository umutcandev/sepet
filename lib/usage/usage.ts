import { and, count, eq, sql } from "drizzle-orm"

import { db, users, usageCounters, baskets, receipts } from "@/lib/db"
import {
  PLAN_LIMITS,
  type MeteredMetric,
  type Plan,
  type UsageMetric,
} from "./limits"
import { billingPeriod, currentPeriod, nextPeriodStart } from "./period"

function counterColumn(metric: MeteredMetric) {
  return metric === "textMessages"
    ? usageCounters.textMessages
    : usageCounters.imageAnalyses
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const [row] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row?.plan ?? "free"
}

/**
 * Kota penceresini plana göre çözer. Pro + abonelik başlangıcı varsa pencere
 * takvim ayına değil yenileme gününe sabitlenir (billingPeriod); aksi halde
 * (free, ya da dönem verisi henüz dolmamış Pro) takvim ayı mantığına düşer —
 * böylece kota hiçbir koşulda bozulmaz.
 */
function resolvePeriod(
  plan: Plan,
  anchorStart: Date | null,
  now: Date = new Date(),
): { key: string; resetAt: Date } {
  if (plan === "pro" && anchorStart) {
    return billingPeriod(anchorStart.getUTCDate(), now)
  }
  return { key: currentPeriod(now), resetAt: nextPeriodStart(now) }
}

// reserveQuota'nın tek okuması: plan (limit için) + abonelik başlangıcı (pencere
// için) aynı satırdan gelir, ekstra round-trip yok.
async function getQuotaContext(
  userId: string,
): Promise<{ plan: Plan; key: string; resetAt: Date }> {
  const [row] = await db
    .select({
      plan: users.plan,
      periodStart: users.subscriptionCurrentPeriodStart,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const plan: Plan = row?.plan ?? "free"
  return { plan, ...resolvePeriod(plan, row?.periodStart ?? null) }
}

export type ReserveResult =
  | { ok: true; used: number; limit: number | null; period: string }
  | { ok: false; limit: number; resetAt: Date }

/**
 * Atomik "limitin altındaysa rezerve et". Kontrol + artırma tek bir
 * INSERT … ON CONFLICT DO UPDATE … WHERE ifadesinde yapılır; Postgres satır
 * kilidi eşzamanlı istekleri sıraya sokar → kotayı aşmak fiziksel olarak
 * imkânsız, hiçbir mesaj limitten kaçamaz.
 *
 * - Conflict yok (ayın ilk isteği) → her zaman 1'le insert eder.
 * - Conflict + WHERE true (kota dolu değil) → artırır, yeni değeri döner.
 * - Conflict + WHERE false (kota dolu) → hiçbir satır dönmez → ok:false.
 * - Sınırsız (Pro) plan → WHERE atlanır, daima artar (analitik için sayılır).
 */
export async function reserveQuota(
  userId: string,
  metric: MeteredMetric,
): Promise<ReserveResult> {
  const { plan, key: period, resetAt } = await getQuotaContext(userId)
  const limit = PLAN_LIMITS[plan][metric]
  const col = counterColumn(metric)

  // Dinamik kolon anahtarı yerine metrik bazında dallanarak tam tip güvenliği.
  const values =
    metric === "textMessages"
      ? { userId, period, textMessages: 1 }
      : { userId, period, imageAnalyses: 1 }
  const set =
    metric === "textMessages"
      ? { textMessages: sql`${col} + 1`, updatedAt: new Date() }
      : { imageAnalyses: sql`${col} + 1`, updatedAt: new Date() }

  const rows = await db
    .insert(usageCounters)
    .values(values)
    .onConflictDoUpdate({
      target: [usageCounters.userId, usageCounters.period],
      set,
      // setWhere = DO UPDATE … WHERE: kota dolduysa UPDATE gerçekleşmez ve hiçbir
      // satır dönmez. (Deprecated `where` hedef/set ayrımında belirsiz olduğu için
      // açıkça setWhere kullanılır.)
      setWhere: limit === null ? undefined : sql`${col} < ${limit}`,
    })
    .returning({ used: col })

  const row = rows[0]
  if (!row) {
    // Sınırsız planda buraya düşülmez (WHERE yok → her zaman döner).
    return { ok: false, limit: limit ?? 0, resetAt }
  }
  // period: refund'ın AYNI kovayı hedeflemesi için çağırana geri verilir.
  return { ok: true, used: row.used, limit, period }
}

/**
 * Adil iade: slot çağrıdan önce rezerve edilir. AI çağrısı sert bir hatayla
 * (model 503/429, exception) hiç çıktı üretmeden düşerse slot geri verilir;
 * böylece başarısız istek kotayı yakmaz. `> 0` koruması altta taşmayı engeller.
 * `period`, reserveQuota'nın döndürdüğü anahtardır: reserve↔refund arasında
 * dönem dönerse (Pro pencere sınırı) yanlış kovaya iade edilmesini önler.
 */
export async function refundQuota(
  userId: string,
  metric: MeteredMetric,
  period: string,
): Promise<void> {
  const col = counterColumn(metric)
  const set =
    metric === "textMessages"
      ? { textMessages: sql`${col} - 1`, updatedAt: new Date() }
      : { imageAnalyses: sql`${col} - 1`, updatedAt: new Date() }

  await db
    .update(usageCounters)
    .set(set)
    .where(
      and(
        eq(usageCounters.userId, userId),
        eq(usageCounters.period, period),
        sql`${col} > 0`,
      ),
    )
}

export type MetricUsage = { used: number; limit: number | null }
export type UsageSnapshot = {
  plan: Plan
  period: string
  resetAt: Date
  metrics: Record<UsageMetric, MetricUsage>
}

/**
 * Kullanım sekmesi için tek okuma: plan + aylık sayaçlar (resetlenen) + sepet/fiş
 * sayıları (anlık, COUNT(*)) tek turda paralel çekilir.
 */
export async function getUsage(userId: string): Promise<UsageSnapshot> {
  // Plandan bağımsız sayımlar (sepet/fiş) + plan/abonelik aynı anda; sayaç
  // sorgusu pencere anahtarına bağlı olduğundan plan okunduktan sonra çalışır.
  const [userRows, basketRows, receiptRows] = await Promise.all([
    db
      .select({
        plan: users.plan,
        periodStart: users.subscriptionCurrentPeriodStart,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db.select({ value: count() }).from(baskets).where(eq(baskets.userId, userId)),
    db
      .select({ value: count() })
      .from(receipts)
      .where(eq(receipts.userId, userId)),
  ])

  const plan: Plan = userRows[0]?.plan ?? "free"
  const limits = PLAN_LIMITS[plan]
  const { key: period, resetAt } = resolvePeriod(
    plan,
    userRows[0]?.periodStart ?? null,
  )

  const [counter] = await db
    .select({
      textMessages: usageCounters.textMessages,
      imageAnalyses: usageCounters.imageAnalyses,
    })
    .from(usageCounters)
    .where(
      and(eq(usageCounters.userId, userId), eq(usageCounters.period, period)),
    )
    .limit(1)

  return {
    plan,
    period,
    resetAt,
    metrics: {
      textMessages: {
        used: counter?.textMessages ?? 0,
        limit: limits.textMessages,
      },
      imageAnalyses: {
        used: counter?.imageAnalyses ?? 0,
        limit: limits.imageAnalyses,
      },
      savedBaskets: { used: basketRows[0]?.value ?? 0, limit: limits.savedBaskets },
      savedReceipts: {
        used: receiptRows[0]?.value ?? 0,
        limit: limits.savedReceipts,
      },
    },
  }
}
