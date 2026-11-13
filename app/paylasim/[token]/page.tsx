import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { SharedConversation } from "@/components/assistant/shared-conversation"
import {
  SharedPage,
  formatSharedDate,
  sharedPageMetadata,
} from "@/components/share/shared-page"
import { getSharedConversation } from "@/lib/data/conversation-shares"
import { sharePath } from "@/lib/share/paths"

// Paylaşım kapatıldığı an bağlantı 404 olmalı: önbellek yok.
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const shared = await getSharedConversation(token)
  return sharedPageMetadata(
    shared && {
      title: shared.title,
      description: shared.authorName
        ? `${shared.authorName}, Sepet asistanıyla yaptığı bir sohbeti paylaştı.`
        : "Sepet asistanıyla yapılmış bir sohbetin paylaşılan kopyası.",
    },
    "Paylaşılan sohbet bulunamadı"
  )
}

export default async function SharedConversationPage({ params }: Props) {
  const { token } = await params
  const [shared, session] = await Promise.all([
    getSharedConversation(token),
    auth(),
  ])
  if (!shared) notFound()

  // Sohbetin kendisine giden bağlantı yalnız sahibine: başkası için sohbet
  // id'si hiçbir işe yaramaz, sayfada durmasına da gerek yok.
  const isOwner = !!session?.user?.id && session.user.id === shared.ownerId

  return (
    <SharedPage
      title={shared.title}
      authorName={shared.authorName}
      sharedAt={shared.sharedAt}
      notice={`Bu, Sepet asistanıyla yapılmış bir sohbetin ${formatSharedDate(
        shared.sharedAt
      )} tarihli kopyasıdır. Fiyatlar o günkü fiyatlardır, bugün farklı olabilir. Yapay zekâ yanıtları hata içerebilir.`}
      owner={
        isOwner
          ? { href: `/asistan/${shared.conversationId}`, label: "Sohbete git" }
          : null
      }
      report={{
        subject: "Paylaşılan sohbet bildirimi",
        noun: "sohbet",
        path: sharePath("conversation", token),
      }}
    >
      <SharedConversation
        messages={shared.messages}
        imageBase={shared.hideImages ? null : `${sharePath("conversation", token)}/gorsel`}
      />
    </SharedPage>
  )
}
