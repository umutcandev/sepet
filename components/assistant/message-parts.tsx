"use client"

import * as React from "react"
import type { UIMessage } from "ai"
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiFileCopyLine,
  RiStopCircleLine,
} from "@remixicon/react"

import { Squircle } from "@/components/ui/squircle"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import { MessageResponse } from "@/components/ai-elements/message"
import { CopiedIconSwap } from "@/components/blog/article-actions"
import { useMounted } from "@/hooks/use-mounted"
import { copyText } from "@/lib/copy"
import { formatMessageTime, formatMessageTimeFull } from "@/lib/message-time"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import type { MatchResult } from "@/lib/ai/schemas"
import { cn } from "@/lib/utils"
import type { ProductImageFallback } from "./optimization-card"
import { ThinkingText } from "./ai-thinking-text"

// Sohbet mesajlarının part'larını çizen ortak parçalar. Canlı sohbet
// (assistant-chat) ve paylaşılan salt okunur sayfa (shared-conversation) aynı
// görünsün diye ikisi de buradan kullanır.

type ToolPartLike = {
  state: string
  output?: unknown
  errorText?: string
}

export function renderToolPart(
  key: string,
  part: ToolPartLike,
  loadingLabel: string,
  renderResult: (output: unknown) => React.ReactNode,
  suppressLoader = false
) {
  if (part.state === "output-available" && part.output !== undefined) {
    return <div key={key}>{renderResult(part.output)}</div>
  }
  if (part.state === "output-error") {
    return (
      <Squircle
        key={key}
        role="alert"
        radius="xl"
        className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive inset-ring inset-ring-destructive/40"
      >
        <RiAlertLine aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {part.errorText ?? "Bir hata oluştu, tekrar deneyebilir misin?"}
        </span>
      </Squircle>
    )
  }
  if (suppressLoader) {
    return null
  }
  return (
    <div key={key} className="py-0.5">
      <Marker role="status">
        <MarkerContent className="shimmer font-medium">
          {loadingLabel}
        </MarkerContent>
      </Marker>
    </div>
  )
}

export type PartLike = UIMessage["parts"][number]

// Sıralama paylaşılan sayfa ve markdown kopyasıyla ortak (bkz. part-order).
export { orderAssistantParts } from "@/lib/assistant/part-order"

/**
 * Görsel alanından önce kaydedilmiş sohbetlerde Sepet Özeti dökümü
 * görselsizdir; aynı turun eşleşmelerinden productId → görsel eşlemesi kurulur.
 */
export function matchImageFallback(
  parts: PartLike[]
): ProductImageFallback | undefined {
  const lookup = parts.find(
    (p) =>
      p.type === "tool-lookupProducts" &&
      (p as { state?: string }).state === "output-available"
  ) as { output?: { matches?: MatchResult[] } } | undefined
  const matches = lookup?.output?.matches
  if (!matches) return undefined
  const images: ProductImageFallback = {}
  for (const m of matches) {
    for (const product of [m.bestMatch, ...m.alternatives]) {
      if (product?.imageUrl) images[product.productId] = product.imageUrl
    }
  }
  return images
}

export function StoppedMarker({
  label = "Yanıtı durdurdun.",
}: {
  label?: string
}) {
  return (
    <Marker role="status">
      <MarkerIcon>
        <RiStopCircleLine />
      </MarkerIcon>
      <MarkerContent>{label}</MarkerContent>
    </Marker>
  )
}

type ReasoningBlockProps = {
  text: string
  streaming: boolean
}

export function ReasoningBlock({ text, streaming }: ReasoningBlockProps) {
  // Akordiyon her zaman kapalı başlar — kullanıcı isterse açıp düşünceleri
  // (akış sırasında bile canlı yazılırken) görür.
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "group inline-flex items-center gap-1 self-start font-medium text-muted-foreground transition-colors hover:text-foreground",
          streaming ? "text-xs" : "text-sm"
        )}
      >
        {streaming ? (
          <ThinkingText className="text-sm">Düşünüyorum</ThinkingText>
        ) : (
          <span>Düşündüm</span>
        )}
        <RiArrowDownSLine
          className={cn(
            "transition-transform duration-200",
            streaming ? "size-3.5" : "size-4",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground [&_code]:px-1 [&_code]:py-0 [&_code]:text-[0.95em] [&_code]:font-normal [&_li]:my-0.5 [&_li]:pl-1 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:p-2 [&_pre]:text-xs [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
          <MessageResponse>{text}</MessageResponse>
        </div>
      )}
    </div>
  )
}

/**
 * Mesajın altındaki şerit: gönderilme/alınma zamanı ("14:32", "Dün 14:32") ve
 * "Kopyala". Kullanıcı mesajında sağda, asistanınkinde solda.
 *
 * Zaman yalnızca istemcide yazılır: sunucu UTC'de, kullanıcı kendi saat
 * diliminde; sunucuda çizilse hidrasyonda saat değişirdi. O ana kadar aynı
 * yükseklikte boş durur, mesaj listesi kaymaz.
 *
 * Kopyala fareyle gezinirken mesajın üstüne gelince görünür (ekranı
 * kalabalıklaştırmasın); dokunmatik ekranda üstüne gelmek olmadığı için hep
 * görünür. Metni çağıran üretir (bkz. messageToMarkdown): tıklanana kadar
 * hesaplanmaz.
 */
export function MessageFooter({
  at,
  align,
  getMarkdown,
}: {
  at: number
  align: "start" | "end"
  getMarkdown: () => string
}) {
  const mounted = useMounted()
  const [copied, setCopied] = React.useState(false)
  const date = new Date(at)

  // Blogdaki kod kopyalama butonuyla aynı süre ve aynı ikon geçişi.
  React.useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(t)
  }, [copied])

  async function handleCopy() {
    const text = getMarkdown()
    if (!text) return
    if (await copyText(text)) setCopied(true)
    else toast.error("Mesaj kopyalanamadı.")
  }

  return (
    <div
      className={cn(
        "relative -mt-1.5 flex h-6 items-center gap-0.5",
        align === "end" ? "flex-row-reverse self-end" : "self-start"
      )}
    >
      <time
        dateTime={date.toISOString()}
        title={mounted ? formatMessageTimeFull(date) : undefined}
        // Dış kenarda boşluk yok: saat, mesaj metninin (ya da balonun)
        // kenarıyla aynı hizada başlar.
        className={cn(
          "text-[0.6875rem] leading-4 text-muted-foreground/80 tabular-nums",
          align === "end" ? "pl-1" : "pr-1"
        )}
      >
        {mounted ? formatMessageTime(date) : null}
      </time>
      {/* Etiket sabit kalır: odaklı butonun aria-label'ını değiştirmek ekran
          okuyucularda güvenilir duyurulmuyor; onay aşağıdaki durum
          bölgesinden okunur (blogdaki kod kopyalamayla aynı). */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => void handleCopy()}
        aria-label="Mesajı kopyala"
        title="Markdown olarak kopyala"
        data-copied={copied || undefined}
        className="transition-opacity focus-visible:opacity-100 data-copied:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
      >
        <CopiedIconSwap
          copied={copied}
          idleIcon={RiFileCopyLine}
          copiedClassName="text-primary"
        />
      </Button>
      {/* Konum açıkça sol üst: flex içindeki mutlak öğe yerini flex
          hizasından alıyordu; sağa hizalı (kullanıcı) mesajda sr-only'nin -1px
          marjı onu sohbet kabının 1px dışına taşırıyor, sohbet telefonda yana
          kayıyordu. */}
      <span
        role="status"
        aria-live="polite"
        className="sr-only top-0 left-0"
      >
        {copied ? "Mesaj kopyalandı" : ""}
      </span>
    </div>
  )
}
