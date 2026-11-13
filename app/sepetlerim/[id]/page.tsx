import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getBasketDetailCached } from "@/lib/data/records"
import { withResolvedItemImages } from "@/lib/data/item-images"
import { recordShareStatus } from "@/lib/data/record-shares"
import { priceFreshness } from "@/lib/price-freshness"
import { basketRecordData } from "@/lib/records/record-data"
import { BasketRecordBody } from "@/components/records/basket-record-body"
import { RecordHeader } from "@/components/records/record-header"
import { BasketActionsMenu } from "./actions-menu"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return { title: "Sepet Detayı" }
  const { id } = await params
  const detail = await getBasketDetailCached(id, session.user.id)
  // Statik metadata yüzünden on kayıtlı sepetin sekme başlığı, tarayıcı geçmişi
  // ve paylaşım önizlemesi birbirinin aynıydı.
  return { title: detail ? detail.basket.name : "Sepet Detayı" }
}

export default async function BasketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sepetlerim")

  const { id } = await params
  const detail = await getBasketDetailCached(id, session.user.id)
  if (!detail) notFound()
  const { basket, conversation } = detail
  // Görseli olmayan kalemler eşleşen üründen tamamlanır — `matchedImageUrl`
  // sütunu sonradan eklendiğinden eski kayıtların tamamı boşta kalmıştı.
  const [items, shareStatus] = await Promise.all([
    withResolvedItemImages(detail.items, "basket", session.user.id),
    recordShareStatus("basket", basket.id, session.user.id),
  ])
  const data = basketRecordData(basket, items)

  // "Fiyatları yenile": aynı kalemlerle asistanda yeniden hesaplat.
  const refreshQuery = data.items
    .map((it) => `${it.quantity} ${it.unit} ${it.rawName}`)
    .join(", ")
  const freshness = priceFreshness(basket.createdAt)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <RecordHeader
        title={basket.name}
        createdAt={basket.createdAt}
        actions={
          <BasketActionsMenu
            id={basket.id}
            title={basket.name}
            conversation={conversation}
            refreshHref={
              refreshQuery
                ? `/asistan?liste=${encodeURIComponent(refreshQuery)}`
                : null
            }
            freshnessLabel={freshness?.ageLabel ?? null}
            isStale={freshness?.isStale ?? false}
            shareStatus={shareStatus}
          />
        }
      />
      <BasketRecordBody data={data} />
    </div>
  )
}
