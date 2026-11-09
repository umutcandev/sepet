"use client"

import * as React from "react"
import type { UIMessage } from "ai"

import {
  Message,
  MessageContent,
  MessageResponse,
  ModelResponse,
} from "@/components/ai-elements/message"
import type {
  BasketDraft,
  ImageAnalysis,
  MatchResult,
  OptimizationSummary,
  ReceiptOCR,
} from "@/lib/ai/schemas"
import { UnmatchedProductList } from "./unmatched-product-list"
import { OptimizationCard } from "./optimization-card"
import {
  ReceiptApprovalCard,
  type ApprovalSubmit,
} from "./receipt-approval-card"
import {
  ReceiptComparisonCard,
  type ReceiptComparisonPayload,
} from "./receipt-comparison-card"
import {
  BasketApprovalCard,
  type BasketApprovalSubmit,
} from "./basket-approval-card"
import { BasketSummary } from "./basket-summary"
import type { BasketContextPayload } from "./basket-save-footer"
import type { SelectionUpdate } from "@/lib/assistant/selection-update"
import {
  MessageFooter,
  ReasoningBlock,
  StoppedMarker,
  matchImageFallback,
  orderAssistantParts,
  renderToolPart,
} from "./message-parts"
import { messageToMarkdown } from "@/lib/assistant/message-markdown"

type ParseReceiptOutput = {
  ocr: ReceiptOCR
  receiptImageUrl: string
  receiptImageR2Key: string | null
}

type AnalyzeImageOutput = {
  analysis: ImageAnalysis
  receiptImageUrl: string
  receiptImageR2Key: string | null
}

type AssistantMessageRowProps = {
  message: UIMessage
  isStreaming: boolean
  isLast: boolean
  busy: boolean
  stopped: boolean
  locked: boolean | undefined
  approvedBasketItems: BasketApprovalSubmit["items"] | undefined
  time: number | undefined
  conversationId: string | null
  initialSavedBaskets?: Record<string, string>
  initialSavedReceipts?: Record<string, string>
  onApprove: (a: ApprovalSubmit) => void
  onBasketApprove: (a: BasketApprovalSubmit) => void
  onRetryUnmatched: (
    matches: MatchResult[],
    index: number,
    query: string
  ) => void
  onSelectionApplied: (toolCallId: string, update: SelectionUpdate) => void
}

export const AssistantMessageRow = React.memo(function AssistantMessageRow({
  message: m,
  isStreaming: isStreamingMsg,
  isLast,
  busy: isBusy,
  stopped,
  locked,
  approvedBasketItems,
  time,
  conversationId,
  initialSavedBaskets,
  initialSavedReceipts,
  onApprove: handleApprove,
  onBasketApprove: handleBasketApprove,
  onRetryUnmatched: handleRetryUnmatched,
  onSelectionApplied: handleSelectionApplied,
}: AssistantMessageRowProps) {
  const orderedParts = React.useMemo(
    () => (m.role === "assistant" ? orderAssistantParts(m.parts) : m.parts),
    [m.role, m.parts]
  )
  // In a receipt turn the comparison card already lists every line, unmatched
  // ones included, so a separate unmatched-products card would repeat it.
  const hasReceiptComparison = React.useMemo(
    () => m.parts.some((p) => p.type === "tool-receiptComparison"),
    [m.parts]
  )
  const basketContext = React.useMemo(
    () =>
      m.parts.find(
        (p) =>
          p.type === "tool-basketContext" &&
          (p as { state?: string }).state === "output-available"
      ) as { toolCallId?: string; output?: unknown } | undefined,
    [m.parts]
  )
  const imageFallback = React.useMemo(
    () => matchImageFallback(m.parts),
    [m.parts]
  )
  const getMarkdown = React.useCallback(
    () =>
      messageToMarkdown(m, {
        locked,
        approvedItems: approvedBasketItems,
      }),
    [m, locked, approvedBasketItems]
  )

  // While a reasoning part is still active, pending tools hide their loading
  // label so two "thinking" animations never show at once. Once reasoning is
  // done, the tool shows its own label.
  const hasActiveReasoning =
    isStreamingMsg &&
    m.parts.some(
      (p) =>
        p.type === "reasoning" && (p as { state?: string }).state !== "done"
    )
  const suppressToolLoader = !isStreamingMsg || hasActiveReasoning

  return (
    <Message from={m.role}>
      <MessageContent>
        {orderedParts.map((part, i) => {
          const key = `${m.id}-${i}`
          switch (part.type) {
            case "text":
              // Assistant text comes from the model, so it gets the
              // restricted markdown (no links or images, see ModelResponse).
              return m.role === "assistant" ? (
                <ModelResponse key={key}>{part.text}</ModelResponse>
              ) : (
                <MessageResponse key={key}>{part.text}</MessageResponse>
              )
            case "reasoning": {
              const p = part as {
                type: "reasoning"
                text?: string
                state?: "streaming" | "done"
              }
              const text = p.text?.trim()
              if (!text) return null
              return (
                <ReasoningBlock
                  key={key}
                  text={text}
                  streaming={isStreamingMsg && p.state !== "done"}
                />
              )
            }
            case "tool-parseShoppingList":
              return renderToolPart(
                key,
                part,
                "Hallediyorum…",
                (out) => {
                  const draft = out as BasketDraft
                  if (draft.items.length === 0) return null
                  return (
                    <BasketApprovalCard
                      data={draft}
                      alreadyApproved={locked}
                      approvedItems={approvedBasketItems}
                      onApprove={handleBasketApprove}
                    />
                  )
                },
                suppressToolLoader
              )
            case "tool-basketContext":
              // Saving lives in the basket summary card's footer (see the
              // tool-summarizeOptimization branch).
              return null
            case "tool-lookupProducts":
              return renderToolPart(
                key,
                part,
                "Ürünleri aratıyorum…",
                (out) =>
                  hasReceiptComparison ? null : (
                    <UnmatchedProductList
                      matches={(out as { matches: MatchResult[] }).matches}
                      // Retry only on the latest turn: retrying an older
                      // card would drop a past basket's new result into
                      // the middle of the conversation.
                      onRetry={isLast ? handleRetryUnmatched : undefined}
                      disabled={isBusy}
                    />
                  ),
                suppressToolLoader
              )
            case "tool-summarizeOptimization": {
              // In a basket approval turn the summary and its save context
              // form one card that hosts saving and product swaps. Receipt
              // turns have no context and get the plain summary card.
              const contextCallId = basketContext?.toolCallId ?? null
              return renderToolPart(
                key,
                part,
                "En ucuz market kombinasyonunu hesaplıyorum…",
                (out) =>
                  basketContext?.output ? (
                    <BasketSummary
                      data={basketContext.output as BasketContextPayload}
                      toolCallId={contextCallId}
                      conversationId={conversationId}
                      initialSavedId={
                        contextCallId && initialSavedBaskets
                          ? (initialSavedBaskets[contextCallId] ?? null)
                          : null
                      }
                      // Product swaps only on the latest turn: editing an
                      // older card would silently change a past basket.
                      editable={!isBusy && isLast}
                      imageFallback={imageFallback}
                      onUpdated={handleSelectionApplied}
                    />
                  ) : (
                    <OptimizationCard
                      summary={out as OptimizationSummary}
                      imageFallback={imageFallback}
                    />
                  ),
                suppressToolLoader
              )
            }
            case "tool-parseReceipt":
              return renderToolPart(
                key,
                part,
                "Fişini okuyorum…",
                (out) => (
                  <ReceiptApprovalCard
                    data={out as ParseReceiptOutput}
                    alreadyApproved={locked}
                    onApprove={handleApprove}
                  />
                ),
                suppressToolLoader
              )
            case "tool-analyzeImage":
              return renderToolPart(
                key,
                part,
                "Görseli inceliyorum…",
                (out) => {
                  const { analysis, receiptImageUrl, receiptImageR2Key } =
                    out as AnalyzeImageOutput
                  if (analysis.kind === "receipt" && analysis.receipt) {
                    return (
                      <ReceiptApprovalCard
                        data={{
                          ocr: analysis.receipt,
                          receiptImageUrl,
                          receiptImageR2Key,
                        }}
                        alreadyApproved={locked}
                        onApprove={handleApprove}
                      />
                    )
                  }
                  if (analysis.kind === "food" && analysis.food) {
                    return (
                      <BasketApprovalCard
                        data={{ items: analysis.food.items }}
                        alreadyApproved={locked}
                        approvedItems={approvedBasketItems}
                        onApprove={handleBasketApprove}
                      />
                    )
                  }
                  // kind === "unknown": no card, the text reply is enough.
                  return null
                },
                suppressToolLoader
              )
            case "tool-receiptComparison": {
              const toolCallId =
                (part as { toolCallId?: string }).toolCallId ?? null
              const savedId =
                toolCallId && initialSavedReceipts
                  ? (initialSavedReceipts[toolCallId] ?? null)
                  : null
              return renderToolPart(
                key,
                part,
                "Fiş karşılaştırmasını hazırlıyorum…",
                (out) => (
                  <ReceiptComparisonCard
                    data={out as ReceiptComparisonPayload}
                    conversationId={conversationId}
                    toolCallId={toolCallId}
                    initialSavedId={savedId}
                  />
                ),
                suppressToolLoader
              )
            }
            case "file": {
              const filePart = part as {
                type: "file"
                mediaType?: string
                url?: string
                filename?: string
              }
              if (!filePart.url || !filePart.mediaType?.startsWith("image/")) {
                return null
              }
              return (
                <div
                  key={key}
                  className="max-w-[280px] overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={filePart.url}
                    alt={filePart.filename ?? "Yüklenen görsel"}
                    className="block h-auto w-full"
                  />
                </div>
              )
            }
            default:
              return null
          }
        })}
        {m.role === "assistant" && stopped && <StoppedMarker />}
      </MessageContent>
      {time ? (
        <MessageFooter
          at={time}
          align={m.role === "user" ? "end" : "start"}
          // The copy matches what the card shows: a locked approval
          // card copies the approved items.
          getMarkdown={getMarkdown}
        />
      ) : null}
    </Message>
  )
})
