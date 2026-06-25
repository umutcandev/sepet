import { Webhooks } from "@polar-sh/nextjs"
import { eq } from "drizzle-orm"

import { db, users } from "@/lib/db"
import { intervalForProduct } from "@/lib/polar/client"

// Yalnızca kullandığımız alanlar. SDK'nın tam `Subscription` tipini import etmek
// yerine yapısal (structural) tip kullanırız: @polar-sh/nextjs adaptörü kendi
// @polar-sh/sdk sürümünü taşıdığından (bizim doğrudan bağımlılığımızla
// eşleşmeyebilir) doğrudan import iki kopya arasında tip kimliği çakışması
// yaratır. Bu shape her iki sürümle de uyumludur.
type SubscriptionLike = {
  id: string
  status: string
  customerId: string
  productId: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  customer?: { externalId?: string | null } | null
}

// Polar abonelik webhook'ları. İmza POLAR_WEBHOOK_SECRET ile doğrulanır
// (adaptör ham gövdeyi okur); doğrulama başarısızsa 403 döner. Endpoint Polar
// dashboard'ında /api/webhooks/polar'a kuruludur.

// Bu durumlar Pro erişimi verir; diğerleri (canceled/incomplete/unpaid) free'ye
// düşürür. past_due dahil: ödeme yeniden denenirken erişim kesilmez — Polar
// pes ederse subscription.revoked ile zaten free'ye iner.
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"])

// Tek senkron noktası: gelen tüm subscription event'leri buraya akar ve users
// satırını Polar'ın bildirdiği son duruma eşitler. `plan` tek doğruluk
// kaynağıdır; diğer alanlar Abonelik panelini + portalı besler.
async function syncSubscription(sub: SubscriptionLike): Promise<void> {
  const values = {
    plan: ACTIVE_STATUSES.has(sub.status) ? "pro" : "free",
    polarCustomerId: sub.customerId,
    polarSubscriptionId: sub.id,
    subscriptionStatus: sub.status,
    subscriptionInterval: intervalForProduct(sub.productId),
    subscriptionCurrentPeriodEnd: sub.currentPeriodEnd ?? null,
    subscriptionCancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  } as const

  // Öncelik externalCustomerId (= users.id); checkout sırasında biz set ederiz.
  // Yoksa (elle/önceden oluşturulmuş müşteri) Polar müşteri ID'siyle eşle.
  const externalId = sub.customer?.externalId
  await db
    .update(users)
    .set(values)
    .where(
      externalId
        ? eq(users.id, externalId)
        : eq(users.polarCustomerId, sub.customerId),
    )
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
  onSubscriptionCreated: (payload) => syncSubscription(payload.data),
  onSubscriptionActive: (payload) => syncSubscription(payload.data),
  onSubscriptionUpdated: (payload) => syncSubscription(payload.data),
  onSubscriptionCanceled: (payload) => syncSubscription(payload.data),
  onSubscriptionUncanceled: (payload) => syncSubscription(payload.data),
  onSubscriptionRevoked: (payload) => syncSubscription(payload.data),
})
