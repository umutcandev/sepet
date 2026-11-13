import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getReceiptDetailCached } from "@/lib/data/records"
import { withResolvedItemImages } from "@/lib/data/item-images"
import { recordShareStatus } from "@/lib/data/record-shares"
import { priceFreshness } from "@/lib/price-freshness"
import { receiptRecordData, receiptTitle } from "@/lib/records/record-data"
import { ReceiptRecordBody } from "@/components/records/receipt-record-body"
import { RecordHeader } from "@/components/records/record-header"
import { ReceiptActionsMenu } from "./actions-menu"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return { title: "Fiş Detayı" }
  const { id } = await params
  const detail = await getReceiptDetailCached(id, session.user.id)
  return { title: detail ? receiptTitle(detail.receipt) : "Fiş Detayı" }
}

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/fis-gecmisi")

  const { id } = await params
  const detail = await getReceiptDetailCached(id, session.user.id)
  if (!detail) notFound()
  const { receipt, conversation } = detail
  // Bkz. sepet detayı: görseli boş kalan kalemler eşleşen üründen tamamlanır.
  const [items, shareStatus] = await Promise.all([
    withResolvedItemImages(detail.items, "receipt", session.user.id),
    recordShareStatus("receipt", receipt.id, session.user.id),
  ])
  const title = receiptTitle(receipt)
  // Fişte "yeniden hesaplat" yok; fiyat yaşı tarihin yanında sessiz bir not.
  const freshness = priceFreshness(receipt.createdAt)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <RecordHeader
        title={title}
        createdAt={receipt.createdAt}
        meta={
          freshness ? <span>Fiyatlar {freshness.ageLabel} alındı</span> : null
        }
        actions={
          <ReceiptActionsMenu
            id={receipt.id}
            title={title}
            conversation={conversation}
            shareStatus={shareStatus}
            hasImage={!!receipt.imageR2Key}
          />
        }
      />
      <ReceiptRecordBody
        data={receiptRecordData(receipt, items)}
        imageUrl={receipt.imageUrl}
      />
    </div>
  )
}
