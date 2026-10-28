import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  RiArrowRightLine,
  RiFlagLine,
  RiInformationLine,
  RiSpyLine,
} from "@remixicon/react"

import { auth } from "@/auth"
import { SharedConversation } from "@/components/assistant/shared-conversation"
import { LEGAL_SUPPORT_EMAIL } from "@/components/legal/legal-content"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSharedConversation } from "@/lib/data/conversation-shares"
import { absoluteUrl } from "@/lib/site"

// Paylaşım kapatıldığı an bağlantı 404 olmalı: önbellek yok.
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ token: string }> }

const ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const shared = await getSharedConversation(token)
  if (!shared) {
    return { title: "Paylaşılan sohbet bulunamadı", robots: ROBOTS }
  }
  const title = `${shared.title} · Sepet`
  const description = shared.authorName
    ? `${shared.authorName}, Sepet asistanıyla yaptığı bir sohbeti paylaştı.`
    : "Sepet asistanıyla yapılmış bir sohbetin paylaşılan kopyası."
  return {
    title,
    description,
    // Bağlantı herkese açık ama aranabilir değil (bkz. proxy.ts X-Robots-Tag).
    robots: ROBOTS,
    referrer: "no-referrer",
    // Kök layout'un `canonical: "./"`i token'lı adresi otoriter ilan ederdi.
    alternates: null,
    openGraph: {
      type: "article",
      locale: "tr_TR",
      siteName: "Sepet",
      title,
      description,
      images: [
        {
          url: "/brand/opengraph-image.png",
          width: 957,
          height: 410,
          alt: "Sepet",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/brand/opengraph-image.png"],
    },
  }
}

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeZone: "Europe/Istanbul",
})

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
  const date = dateFormat.format(shared.sharedAt)
  const reportHref = `mailto:${LEGAL_SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Paylaşılan sohbet bildirimi"
  )}&body=${encodeURIComponent(
    `Bildirmek istediğim sohbet: ${absoluteUrl(`/paylasim/${token}`)}\n\nNeden:\n`
  )}`

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16 md:pt-10">
      <header className="mb-8 grid gap-4 border-b pb-6">
        <h1 className="cn-font-display text-3xl font-normal text-balance md:text-4xl">
          {shared.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <AuthorBadge name={shared.authorName} />
          <span className="font-medium text-foreground">
            {shared.authorName ?? "Anonim kullanıcı"}
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={shared.sharedAt.toISOString()}>{date}</time>
        </div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <RiInformationLine
            aria-hidden="true"
            className="mt-px size-3.5 shrink-0"
          />
          <span>
            Bu, Sepet asistanıyla yapılmış bir sohbetin {date} tarihli
            kopyasıdır. Fiyatlar o günkü fiyatlardır, bugün farklı olabilir.
            Yapay zekâ yanıtları hata içerebilir.
          </span>
        </p>
        {isOwner ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
            <span className="flex-1 text-muted-foreground">
              Bu bağlantıyı sen paylaştın.
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/asistan/${shared.conversationId}`}>
                Sohbete git
              </Link>
            </Button>
          </div>
        ) : null}
      </header>

      <SharedConversation
        messages={shared.messages}
        imageBase={shared.hideImages ? null : `/paylasim/${token}/gorsel`}
      />

      <footer className="mt-14 grid gap-4">
        <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <div className="grid flex-1 gap-1">
            <span className="text-base font-medium">
              Sen de en ucuz sepeti bul
            </span>
            <span className="text-sm text-muted-foreground">
              Listeni yaz ya da fişini yükle; Sepet marketlerdeki güncel
              fiyatları karşılaştırsın.
            </span>
          </div>
          <Button variant="default" asChild>
            <Link href="/asistan">
              Asistanı dene
              <RiArrowRightLine data-icon="inline-end" />
            </Link>
          </Button>
        </Card>
        <a
          href={reportHref}
          className="inline-flex items-center gap-1.5 self-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <RiFlagLine aria-hidden="true" className="size-3.5" />
          Uygunsuz içerik bildir
        </a>
      </footer>
    </div>
  )
}

// Profil fotoğrafı bilinçli olarak yok: sağlayıcının (Google/Facebook)
// görselini herkese açık bir sayfaya taşımak, adı göstermekten fazlası.
function AuthorBadge({ name }: { name: string | null }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-medium text-foreground"
    >
      {name ? (
        name.charAt(0).toLocaleUpperCase("tr-TR")
      ) : (
        <RiSpyLine className="size-3.5 text-muted-foreground" />
      )}
    </span>
  )
}
