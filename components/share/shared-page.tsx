import type { Metadata } from "next"
import Link from "next/link"
import {
  RiArrowRightLine,
  RiFlagLine,
  RiInformationLine,
  RiSpyLine,
} from "@remixicon/react"

import { LEGAL_SUPPORT_EMAIL } from "@/components/legal/legal-content"
import { RecordNotFoundState } from "@/components/records/record-not-found"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { absoluteUrl } from "@/lib/site"
import { cn } from "@/lib/utils"

// Paylaşılan sayfaların (sohbet, sepet, fiş) ortak iskeleti ve metadata'sı.

const ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false },
}

export function sharedPageMetadata(
  found: { title: string; description: string } | null,
  notFoundTitle: string
): Metadata {
  if (!found) return { title: notFoundTitle, robots: ROBOTS }
  const title = `${found.title} · Sepet`
  const { description } = found
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
// <time> için makine okunur tarih; saat herkese açık sayfaya yazılmaz.
const isoDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
})

export function formatSharedDate(date: Date | string): string {
  return dateFormat.format(typeof date === "string" ? new Date(date) : date)
}

export function SharedPage({
  title,
  authorName,
  sharedAt,
  notice,
  owner,
  report,
  wide = false,
  children,
}: {
  title: string
  authorName: string | null
  sharedAt: Date
  notice: string
  /** Yalnız sahibine: kaynağa geri dönüş. */
  owner: { href: string; label: string } | null
  /** Bildirim e-postası: konu ve bağlantının adı ("sohbet", "sepet"). */
  report: { subject: string; noun: string; path: string }
  wide?: boolean
  children: React.ReactNode
}) {
  const reportHref = `mailto:${LEGAL_SUPPORT_EMAIL}?subject=${encodeURIComponent(
    report.subject
  )}&body=${encodeURIComponent(
    `Bildirmek istediğim ${report.noun}: ${absoluteUrl(report.path)}\n\nNeden:\n`
  )}`

  return (
    <>
      <div
        className={cn(
          "mx-auto w-full flex-1 px-4 pt-6 md:pt-10",
          wide ? "max-w-5xl" : "max-w-3xl"
        )}
      >
        <header className="mb-8 grid gap-4 border-b pb-6">
          <h1 className="cn-font-display text-3xl font-normal text-balance md:text-4xl">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <AuthorBadge name={authorName} />
            <span className="font-medium text-foreground">
              {authorName ?? "Anonim kullanıcı"}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={isoDateFormat.format(sharedAt)}>
              {formatSharedDate(sharedAt)}
            </time>
          </div>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <RiInformationLine
              aria-hidden="true"
              className="mt-px size-3.5 shrink-0"
            />
            <span>{notice}</span>
          </p>
          {owner ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
              <span className="flex-1 text-muted-foreground">
                Bu bağlantıyı sen paylaştın.
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link href={owner.href}>{owner.label}</Link>
              </Button>
            </div>
          ) : null}
        </header>

        {children}

        <div className="mt-14 grid gap-4">
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
        </div>
      </div>
      <SiteFooter />
    </>
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

/** Kapatılmış, hiç var olmamış ve sahibi silinmiş paylaşım aynı görünür. */
export function SharedNotFound({ title }: { title: string }) {
  return (
    <>
      <div className="flex-1">
        <RecordNotFoundState
          title={title}
          description="Bağlantı kaldırılmış ya da hatalı olabilir. Paylaşan kişiden yeni bir bağlantı isteyebilirsin."
          backHref="/"
          backLabel="Ana sayfa"
        />
      </div>
      <SiteFooter />
    </>
  )
}
