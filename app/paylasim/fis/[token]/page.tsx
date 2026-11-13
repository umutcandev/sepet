import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { ReceiptRecordBody } from "@/components/records/receipt-record-body"
import {
  SharedPage,
  formatSharedDate,
  sharedPageMetadata,
} from "@/components/share/shared-page"
import { getSharedReceipt } from "@/lib/data/record-shares"
import { sharePath } from "@/lib/share/paths"

// Paylaşım kapatıldığı an bağlantı 404 olmalı: önbellek yok.
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const shared = await getSharedReceipt(token)
  return sharedPageMetadata(
    shared && {
      title: shared.title,
      description: shared.authorName
        ? `${shared.authorName}, Sepet'te karşılaştırdığı bir fişi paylaştı.`
        : "Sepet'te karşılaştırılmış bir fişin paylaşılan kopyası.",
    },
    "Paylaşılan fiş bulunamadı"
  )
}

export default async function SharedReceiptPage({ params }: Props) {
  const { token } = await params
  const [shared, session] = await Promise.all([
    getSharedReceipt(token),
    auth(),
  ])
  if (!shared) notFound()

  const isOwner = !!session?.user?.id && session.user.id === shared.ownerId
  const path = sharePath("receipt", token)

  return (
    <SharedPage
      wide
      title={shared.title}
      authorName={shared.authorName}
      sharedAt={shared.sharedAt}
      notice={`Bu, Sepet'te karşılaştırılmış bir fişin paylaşılan kopyasıdır. Market fiyatları ${formatSharedDate(
        shared.data.createdAt
      )} tarihinde alındı, bugün farklı olabilir. Fiş yapay zekâyla okundu, hata içerebilir.`}
      owner={
        isOwner
          ? { href: `/fis-gecmisi/${shared.recordId}`, label: "Fişe git" }
          : null
      }
      report={{
        subject: "Paylaşılan fiş bildirimi",
        noun: "fiş",
        path,
      }}
    >
      <ReceiptRecordBody
        data={shared.data}
        imageUrl={shared.showImage ? `${path}/gorsel` : null}
        readOnly
      />
    </SharedPage>
  )
}
