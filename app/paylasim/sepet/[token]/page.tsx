import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { BasketRecordBody } from "@/components/records/basket-record-body"
import {
  SharedPage,
  formatSharedDate,
  sharedPageMetadata,
} from "@/components/share/shared-page"
import { getSharedBasket } from "@/lib/data/record-shares"
import { sharePath } from "@/lib/share/paths"

// Paylaşım kapatıldığı an bağlantı 404 olmalı: önbellek yok.
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const shared = await getSharedBasket(token)
  return sharedPageMetadata(
    shared && {
      title: shared.title,
      description: shared.authorName
        ? `${shared.authorName}, Sepet'te hazırladığı bir sepeti paylaştı.`
        : "Sepet'te hazırlanmış bir sepetin paylaşılan kopyası.",
    },
    "Paylaşılan sepet bulunamadı"
  )
}

export default async function SharedBasketPage({ params }: Props) {
  const { token } = await params
  const [shared, session] = await Promise.all([getSharedBasket(token), auth()])
  if (!shared) notFound()

  const isOwner = !!session?.user?.id && session.user.id === shared.ownerId

  return (
    <SharedPage
      wide
      title={shared.title}
      authorName={shared.authorName}
      sharedAt={shared.sharedAt}
      notice={`Bu, Sepet'te kaydedilmiş bir sepetin paylaşılan kopyasıdır. Fiyatlar ${formatSharedDate(
        shared.data.createdAt
      )} tarihinde alındı, bugün farklı olabilir.`}
      owner={
        isOwner
          ? { href: `/sepetlerim/${shared.recordId}`, label: "Sepete git" }
          : null
      }
      report={{
        subject: "Paylaşılan sepet bildirimi",
        noun: "sepet",
        path: sharePath("basket", token),
      }}
    >
      <BasketRecordBody data={shared.data} readOnly />
    </SharedPage>
  )
}
