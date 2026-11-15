import "server-only"
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound.js"

import { polar, polarAccessToken } from "./client"

// Hesap silme ↔ Polar. Arşivde yenileme durdurulur (dönem sonuna kadar erişim
// sürer, 14 günde geri dönen kullanıcı iptali portaldan geri alabilir); kalıcı
// silmede müşteri kaydı silinip anonimleştirilir.

function customerFilter(userId: string, polarCustomerId: string | null) {
  return polarCustomerId
    ? { customerId: polarCustomerId }
    : { externalCustomerId: userId }
}

/** Etkin abonelikleri dönem sonunda iptale çeker. Polar hatası fırlatılır. */
export async function cancelSubscriptionsAtPeriodEnd(
  userId: string,
  polarCustomerId: string | null,
): Promise<void> {
  if (!polarAccessToken) {
    console.warn("[polar] token yok, arşivde abonelik iptali atlandı")
    return
  }
  const pages = await polar.subscriptions.list({
    ...customerFilter(userId, polarCustomerId),
    active: true,
    limit: 100,
  })
  for await (const page of pages) {
    for (const sub of page.result.items) {
      if (sub.cancelAtPeriodEnd) continue
      await polar.subscriptions.update({
        id: sub.id,
        subscriptionUpdate: { cancelAtPeriodEnd: true },
      })
    }
  }
}

/** Müşteriyi siler (kalan abonelikler anında biter) ve kişisel veriyi anonimleştirir. */
export async function deletePolarCustomer(
  userId: string,
  polarCustomerId: string | null,
): Promise<void> {
  if (!polarAccessToken) {
    console.warn("[polar] token yok, müşteri silme atlandı")
    return
  }
  try {
    if (polarCustomerId) {
      await polar.customers.delete({ id: polarCustomerId, anonymize: true })
    } else {
      await polar.customers.deleteExternal({ externalId: userId, anonymize: true })
    }
  } catch (err) {
    if (err instanceof ResourceNotFound) return
    throw err
  }
}
