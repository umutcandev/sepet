"use client"

import * as React from "react"
import { cjk } from "@streamdown/cjk"
import { code } from "@streamdown/code"
import { RiImageLine } from "@remixicon/react"

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import type {
  BasketDraft,
  MatchResult,
  OptimizationSummary,
} from "@/lib/ai/schemas"
import {
  IMAGE_OMITTED_PART_TYPE,
  SHARED_IMAGE_PART_TYPE,
  type SharedMessage,
  type SharedPart,
} from "@/lib/assistant/share-types"
import {
  hasStoppedMarker,
  resolveApprovalCard,
  type MessageLike,
} from "@/lib/assistant/turn-state"
import {
  BasketApprovalCard,
  type BasketApprovalSubmit,
} from "./basket-approval-card"
import { OptimizationCard } from "./optimization-card"
import { ReceiptApprovalCard } from "./receipt-approval-card"
import {
  ReceiptComparisonCard,
  type ReceiptComparisonPayload,
} from "./receipt-comparison-card"
import { UnmatchedProductList } from "./unmatched-product-list"
import {
  StoppedMarker,
  matchImageFallback,
  orderAssistantParts,
  renderToolPart,
  type PartLike,
} from "./message-parts"

/*
 * Paylaşılan sohbetin salt okunur görünümü. Sohbet ekranıyla aynı kartlar ve
 * aynı sıra (bkz. message-parts); farkı, hiçbir eylemin olmaması: onay,
 * kaydet, ürün değiştir, yeniden ara yok.
 *
 * İçerik başka birinin yazdığı metin ve sayfa bizim alan adımızda. Bu yüzden
 * markdown burada daha dar: bağlantı ve görsel çizilmez (bağlantının yazısı
 * düz metin kalır, adres tıklanamaz), ham HTML atlanır, diyagram/formül
 * eklentileri kapalı. Asistanın cevaplarında bağlantı zaten olmuyor; olsa
 * olsa kullanıcının yazdığı ya da modele yazdırdığı bir adres olurdu.
 */
const SHARED_PLUGINS = { cjk, code }
const NO_ELEMENTS = ["a", "img"]

function SharedText({ children }: { children: string }) {
  return (
    <MessageResponse
      plugins={SHARED_PLUGINS}
      disallowedElements={NO_ELEMENTS}
      unwrapDisallowed
      skipHtml
    >
      {children}
    </MessageResponse>
  )
}

function isStopped(m: MessageLike) {
  return hasStoppedMarker(m.parts)
}

export function SharedConversation({
  messages,
  imageBase = null,
}: {
  messages: SharedMessage[]
  /**
   * Görsellerin verildiği uç (`/paylasim/[token]/gorsel`). null: sahibi
   * "Resimleri gizle" demiş, görsellerin yerine "paylaşılmadı" işareti çıkar.
   */
  imageBase?: string | null
}) {
  return (
    <div className="flex flex-col gap-8">
      {messages.map((m, msgIdx) =>
        // Boş asistan mesajı yalnızca kart kilidi hesabı için kopyada duruyor.
        m.parts.length === 0 ? null : (
          <SharedMessageView
            key={m.id}
            message={m}
            imageBase={imageBase}
            card={
              m.role === "assistant"
                ? resolveApprovalCard(messages, msgIdx, {
                    busy: false,
                    isStopped,
                  })
                : null
            }
          />
        )
      )}
    </div>
  )
}

function SharedMessageView({
  message: m,
  card,
  imageBase,
}: {
  message: SharedMessage
  card: ReturnType<typeof resolveApprovalCard> | null
  imageBase: string | null
}) {
  const approvalMeta = card?.approval?.metadata as
    | SharedMessage["metadata"]
    | undefined
  const approvedBasketItems: BasketApprovalSubmit["items"] | undefined =
    approvalMeta?.kind === "basketApproval"
      ? approvalMeta.payload?.items
      : undefined
  const locked = card?.locked ?? false
  // Paylaşılan tipler UIMessage part'larının daraltılmış hâli; ortak
  // yardımcılar onları part olarak okur.
  const parts = m.parts as unknown as PartLike[]
  const ordered =
    m.role === "assistant"
      ? (orderAssistantParts(parts) as unknown as SharedPart[])
      : m.parts
  const hasReceiptComparison = m.parts.some(
    (p) => p.type === "tool-receiptComparison"
  )

  return (
    <Message from={m.role}>
      <MessageContent>
        {ordered.map((part, i) => {
          const key = `${m.id}-${i}`
          switch (part.type) {
            case "text":
              return <SharedText key={key}>{part.text}</SharedText>
            case IMAGE_OMITTED_PART_TYPE:
              return <ImageOmitted key={key} />
            case SHARED_IMAGE_PART_TYPE:
              return imageBase ? (
                <SharedImage key={key} src={`${imageBase}/${part.data.ref}`} />
              ) : (
                <ImageOmitted key={key} />
              )
            case "tool-parseShoppingList":
              return renderToolPart(
                key,
                part,
                "",
                (out) => {
                  const draft = out as Pick<BasketDraft, "items">
                  if (draft.items.length === 0) return null
                  return (
                    <BasketApprovalCard
                      data={draft}
                      alreadyApproved={locked}
                      approvedItems={approvedBasketItems}
                      readOnly
                    />
                  )
                },
                true
              )
            case "tool-basketContext":
              return null
            case "tool-lookupProducts":
              return renderToolPart(
                key,
                part,
                "",
                (out) =>
                  hasReceiptComparison ? null : (
                    <UnmatchedProductList
                      matches={(out as { matches: MatchResult[] }).matches}
                    />
                  ),
                true
              )
            case "tool-summarizeOptimization": {
              // Sepet onayı turunda kartın gösterdiği özet, kayıt bağlamındaki
              // özettir (ürün değiştirilince ikisi birlikte güncellenir).
              const context = m.parts.find(
                (p) =>
                  p.type === "tool-basketContext" &&
                  p.state === "output-available"
              )
              const contextSummary =
                context?.type === "tool-basketContext" &&
                context.state === "output-available"
                  ? context.output.summary
                  : null
              return renderToolPart(
                key,
                part,
                "",
                (out) => (
                  <OptimizationCard
                    summary={contextSummary ?? (out as OptimizationSummary)}
                    imageFallback={matchImageFallback(parts)}
                  />
                ),
                true
              )
            }
            case "tool-parseReceipt":
              return renderToolPart(
                key,
                part,
                "",
                (out) => (
                  <ReceiptApprovalCard
                    data={
                      out as React.ComponentProps<
                        typeof ReceiptApprovalCard
                      >["data"]
                    }
                    alreadyApproved={locked}
                    readOnly
                  />
                ),
                true
              )
            case "tool-analyzeImage":
              return renderToolPart(
                key,
                part,
                "",
                (out) => {
                  const { analysis } = out as {
                    analysis: {
                      kind: string
                      receipt:
                        | React.ComponentProps<
                            typeof ReceiptApprovalCard
                          >["data"]["ocr"]
                        | null
                      food: Pick<BasketDraft, "items"> | null
                    }
                  }
                  if (analysis.kind === "receipt" && analysis.receipt) {
                    return (
                      <ReceiptApprovalCard
                        data={{
                          ocr: analysis.receipt,
                          receiptImageUrl: "",
                          receiptImageR2Key: null,
                        }}
                        alreadyApproved={locked}
                        readOnly
                      />
                    )
                  }
                  if (analysis.kind === "food" && analysis.food) {
                    return (
                      <BasketApprovalCard
                        data={{ items: analysis.food.items }}
                        alreadyApproved={locked}
                        approvedItems={approvedBasketItems}
                        readOnly
                      />
                    )
                  }
                  return null
                },
                true
              )
            case "tool-receiptComparison":
              return renderToolPart(
                key,
                part,
                "",
                (out) => (
                  <ReceiptComparisonCard
                    data={out as unknown as ReceiptComparisonPayload}
                    readOnly
                  />
                ),
                true
              )
            default:
              return null
          }
        })}
        {m.role === "assistant" && hasStoppedMarker(m.parts) ? (
          <StoppedMarker label="Yanıt durduruldu." />
        ) : null}
      </MessageContent>
    </Message>
  )
}

/** Sohbetteki yüklenen görselle aynı çerçeve (bkz. assistant-chat). */
function SharedImage({ src }: { src: string }) {
  return (
    <div className="max-w-[280px] overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Paylaşılan görsel"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="block h-auto w-full"
      />
    </div>
  )
}

function ImageOmitted() {
  return (
    <Marker>
      <MarkerIcon>
        <RiImageLine />
      </MarkerIcon>
      <MarkerContent>Görsel gizlilik için paylaşılmadı</MarkerContent>
    </Marker>
  )
}
