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
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  createdAt?: Date | null
  modifiedAt?: Date | null
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

// Abonelik bitti; aynı abonelik bu durumlardan çıkamaz.
const TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired"])
// Aktivasyon öncesi durumlar; aktifleşmiş bir abonelik bunlara dönmez.
const PRE_ACTIVE_STATUSES = new Set(["incomplete"])

function isStaleTransition(stored: string, incoming: string): boolean {
  if (TERMINAL_STATUSES.has(stored)) return !TERMINAL_STATUSES.has(incoming)
  if (ACTIVE_STATUSES.has(stored)) return PRE_ACTIVE_STATUSES.has(incoming)
  return false
}

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
    .select({
      id: users.id,
      polarSubscriptionId: users.polarSubscriptionId,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionModifiedAt: users.subscriptionModifiedAt,
    })
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
  // Her event aboneliğin o anki tam görüntüsünü taşır ve `modifiedAt` ile
  // sıralanabilir. Hiç değişmemiş bir abonelikte Polar modifiedAt'i null
  // gönderebilir; o durumda görüntünün zamanı oluşturulma anıdır.
  const incomingModifiedAt = sub.modifiedAt ?? sub.createdAt ?? null

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
  // Farklı aboneliğin taze-aktif görüntüsü de kayıttakinden ESKİ olamaz: biten
  // bir aboneliğin geç teslim edilen (yeniden denenen) "active" event'i yeni
  // aboneliğin yerine geçerse, yeni aboneliğin iptal/past_due event'leri
  // "eski aboneliğe ait" sayılıp atlanır ve plan ödemesiz Pro'da kalırdı.
  if (
    isNewSubscription &&
    row.subscriptionModifiedAt &&
    incomingModifiedAt &&
    incomingModifiedAt.getTime() < row.subscriptionModifiedAt.getTime()
  ) {
    console.warn("[polar] başka aboneliğin eski görüntüsü atlandı", {
      incomingSubscriptionId: sub.id,
      storedSubscriptionId: row.polarSubscriptionId,
      status: sub.status,
    })
    return
  }

  // AYNI aboneliğin gecikmeli event'i: kayıttakinden eski bir görüntü
  // (yeniden denenen/geç teslim edilen) hiçbir alanı ezmez — durum kadar
  // cancelAtPeriodEnd, dönem tarihleri gibi alanlar da geri gidebilirdi.
  if (
    row.polarSubscriptionId === sub.id &&
    row.subscriptionModifiedAt &&
    incomingModifiedAt &&
    incomingModifiedAt.getTime() < row.subscriptionModifiedAt.getTime()
  ) {
    console.warn("[polar] aynı aboneliğin eski bir event'i atlandı", {
      subscriptionId: sub.id,
      status: sub.status,
    })
    return
  }

  // modifiedAt yoksa (ya da ilk kayıtsa) yaşam döngüsü kuralı yedek koruma:
  // AYNI aboneliğin gecikmeli event'i de sırayı bozabilir: Polar iade/iptal
  // sonrası yeniden denenen eski bir "active", "canceled"dan sonra gelirse
  // satır Pro'ya döner ve abonelik artık event üretmediği için öyle kalırdı.
  // Tersine, aktivasyon öncesi geç kalmış bir "incomplete" ödeyen kullanıcıyı
  // düşürürdü. Abonelik yaşam döngüsü tek yönlü: terminal durumdan geri, aktif
  // durumdan aktivasyon öncesine dönüş yok → bu geçişler atlanır.
  if (
    row.polarSubscriptionId === sub.id &&
    row.subscriptionStatus &&
    isStaleTransition(row.subscriptionStatus, sub.status)
  ) {
    console.warn("[polar] aynı aboneliğin gecikmeli event'i atlandı", {
      subscriptionId: sub.id,
      storedStatus: row.subscriptionStatus,
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
      subscriptionCurrentPeriodStart: sub.currentPeriodStart ?? null,
      subscriptionCurrentPeriodEnd: sub.currentPeriodEnd ?? null,
      subscriptionCancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      // Zamanı bilinmeyen bir görüntü kayıttaki zamanı silmesin: sonraki
      // event'lerin sıralaması ona dayanıyor.
      ...(incomingModifiedAt
        ? { subscriptionModifiedAt: incomingModifiedAt }
        : {}),
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
