"use client"

import * as React from "react"
import type { UIMessage } from "ai"
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiStopCircleLine,
} from "@remixicon/react"

import { Squircle } from "@/components/ui/squircle"
import { MessageResponse } from "@/components/ai-elements/message"
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

/**
 * Asistan mesajında text/reasoning kısımları tool & file kart(lar)ından ÖNCE
 * gelir: sunucu stream sırası genelde [tool, reasoning, text]; kullanıcı için
 * doğal okuma sırası ise önce kısa özet/açıklama, sonra detay/kart.
 *
 * Kartlarda asıl sonuç Sepet Özeti: eşleştirme part'ı (artık yalnızca
 * eşleştirilemeyen kalemleri gösteriyor) sunucuda önce gelse de özetin
 * hemen ALTINA taşınır. Eski sohbetler de aynı sırayla görünür.
 */
export function orderAssistantParts(parts: PartLike[]): PartLike[] {
  const isProse = (p: PartLike) => p.type === "text" || p.type === "reasoning"
  const prose = parts.filter(isProse)
  const cards = parts.filter((p) => !isProse(p))
  const at = cards.findIndex((p) => p.type === "tool-summarizeOptimization")
  // Özet henüz gelmediyse eşleştirme part'ı (yükleniyor etiketi) yerinde kalır.
  if (at === -1) return [...prose, ...cards]
  const isLookup = (p: PartLike) => p.type === "tool-lookupProducts"
  return [
    ...prose,
    ...cards.slice(0, at + 1).filter((p) => !isLookup(p)),
    ...cards.filter(isLookup),
    ...cards.slice(at + 1).filter((p) => !isLookup(p)),
  ]
}

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
