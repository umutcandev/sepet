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

// Yeni/üst-aboneliğin "taze aktif" olduğunu belirten durumlar. Sıra-dışı teslimat
// korumasında (aşağı bkz.) yalnızca bunlar farklı bir subscriptionId ile gelen
// satırı güncelleyebilir; past_due bilinçli olarak dışarıda — o sadece mevcut
// aboneliğin (aynı subId) geçici durumudur, yeni bir aboneliği temsil etmez.
const FRESH_ACTIVE_STATUSES = new Set(["active", "trialing"])

// Tek senkron noktası: gelen tüm subscription event'leri buraya akar ve users
// satırını Polar'ın bildirdiği son duruma eşitler. `plan` tek doğruluk
// kaynağıdır; diğer alanlar Abonelik panelini + portalı besler.
async function syncSubscription(sub: SubscriptionLike): Promise<void> {
  // Ürün gate'i: event yalnızca status değil, gerçekten BİZİM Pro ürünümüze ait
  // olduğunda Pro açar. intervalForProduct tanımadığı üründe null döner; org'a
  // ileride başka bir ürün (farklı tier / tek seferlik) eklenirse ona abone olan
  // kullanıcılar yanlışlıkla Pro erişimi almasın.
  const interval = intervalForProduct(sub.productId)
  const isProProduct = interval !== null
  const grantsAccess = isProProduct && ACTIVE_STATUSES.has(sub.status)

  // Hedef kullanıcı: önce externalCustomerId (= users.id; checkout'ta biz set
  // ederiz), yoksa (elle/önceden oluşturulmuş müşteri) Polar müşteri ID'siyle.
  const externalId = sub.customer?.externalId
  const whereUser = externalId
    ? eq(users.id, externalId)
    : eq(users.polarCustomerId, sub.customerId)

  const [row] = await db
    .select({ id: users.id, polarSubscriptionId: users.polarSubscriptionId })
    .from(users)
    .where(whereUser)
    .limit(1)

  if (!row) {
    // Eşleşen kullanıcı yok. Checkout akışımız her zaman externalCustomerId
    // gönderdiği için pratikte olmamalı; sessizce kaybolmasın diye loglarız
    // (örn. elle oluşturulan müşterinin polarCustomerId'si henüz yazılmamış).
    console.warn("[polar] webhook eşleşen kullanıcı bulamadı", {
      subscriptionId: sub.id,
      customerId: sub.customerId,
      hasExternalId: Boolean(externalId),
    })
    return
  }

  // Sıra-dışı / gecikmeli teslimat koruması: Polar event sırasını garanti etmez.
  // Kullanıcı iptal edip (revoked) tekrar abone olduysa (yeni active), eski
  // aboneliğe ait gecikmeli "revoked" yeni active'ten sonra gelirse satırı
  // yanlışlıkla free'ye düşürebilir. Kayıtta FARKLI bir abonelik dururken yalnızca
  // taze-aktif bir event (yeni aboneliğin devralması) güncelleyebilir; diğer her
  // şey (revoked/canceled/past_due...) eski aboneliğe ait sayılıp atlanır.
  const isNewSubscription =
    Boolean(row.polarSubscriptionId) && row.polarSubscriptionId !== sub.id
  if (isNewSubscription && !FRESH_ACTIVE_STATUSES.has(sub.status)) {
    console.warn("[polar] eski aboneliğe ait gecikmeli event atlandı", {
      incomingSubscriptionId: sub.id,
      storedSubscriptionId: row.polarSubscriptionId,
      status: sub.status,
    })
    return
  }

  await db
    .update(users)
    .set({
      plan: grantsAccess ? "pro" : "free",
      polarCustomerId: sub.customerId,
      polarSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      subscriptionInterval: interval,
      subscriptionCurrentPeriodEnd: sub.currentPeriodEnd ?? null,
      subscriptionCancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    })
    .where(eq(users.id, row.id))
}

// Imza doğrulaması secret olmadan tüm istekleri fail-closed (403) reddeder; bu
// güvenli ama webhook'un sessizce hiç çalışmaması teşhisi zorlaştırır. Eksikse
// erken uyar (deploy checklist'inde POLAR_WEBHOOK_SECRET zorunludur).
if (!process.env.POLAR_WEBHOOK_SECRET) {
  console.warn(
    "[polar] POLAR_WEBHOOK_SECRET ayarlı değil — webhook imza doğrulaması tüm istekleri 403 ile reddeder.",
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
