"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Loader2Icon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { AssistantPrompt } from "./assistant-prompt"
import { Button } from "@/components/ui/button"
import { useRequireAuth } from "@/lib/hooks/use-require-auth"
import type {
  BasketDraft,
  MatchResult,
  OptimizationSummary,
  ReceiptOCR,
} from "@/lib/ai/schemas"
import { ParsedItemsCard } from "./parsed-items-card"
import { ProductMatchList } from "./product-match-list"
import { OptimizationCard } from "./optimization-card"
import {
  ReceiptApprovalCard,
  type ApprovalSubmit,
} from "./receipt-approval-card"
import {
  ReceiptComparisonCard,
  type ReceiptComparisonPayload,
} from "./receipt-comparison-card"

const SEED_KEY = "assistant:seed"
const FILE_KEY = "assistant:file"

const SUGGESTIONS = [
  "Sucuklu pizza için malzemeler",
  "Menemen için malzemeler",
  "Market fişimi analiz et",
]

type ParseReceiptOutput = {
  ocr: ReceiptOCR
  receiptImageUrl: string
  receiptImageR2Key: string | null
}

type AssistantChatProps = {
  conversationId?: string
  initialMessages?: Array<Pick<UIMessage, "id" | "role" | "parts"> & {
    metadata?: unknown
  }>
}

export function AssistantChat({
  conversationId: initialConversationId,
  initialMessages,
}: AssistantChatProps = {}) {
  const router = useRouter()
  const guard = useRequireAuth()
  const conversationIdRef = React.useRef<string | undefined>(initialConversationId)
  const navigatedRef = React.useRef(false)
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant/chat",
        body: () => ({ conversationId: conversationIdRef.current }),
      }),
    [],
  )
  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    messages: initialMessages as UIMessage[] | undefined,
    onData: (dataPart) => {
      if (
        dataPart.type === "data-conversation-id" &&
        dataPart.data &&
        typeof (dataPart.data as { id?: unknown }).id === "string"
      ) {
        const id = (dataPart.data as { id: string }).id
        conversationIdRef.current = id
        if (!navigatedRef.current) {
          navigatedRef.current = true
          // Soft URL update: avoid Next.js route navigation here, which would
          // unmount this component mid-stream and abort the SSE reader.
          // The /assistant/[id] route will SSR fresh data on refresh / next nav.
          window.history.replaceState(null, "", `/assistant/${id}`)
        }
      }
    },
    onFinish: () => {
      // Stream is done — now safe to refresh server data so the sidebar's
      // conversation list picks up the newly created conversation.
      if (navigatedRef.current) {
        router.refresh()
      }
    },
  })
  const [input, setInput] = React.useState("")
  const sentSeedRef = React.useRef(false)

  React.useEffect(() => {
    if (sentSeedRef.current) return
    if (typeof window === "undefined") return
    if (initialMessages && initialMessages.length > 0) {
      sentSeedRef.current = true
      return
    }

    const seed = window.sessionStorage.getItem(SEED_KEY)
    const fileRaw = window.sessionStorage.getItem(FILE_KEY)

    if (!seed?.trim() && !fileRaw) return
    sentSeedRef.current = true
    window.sessionStorage.removeItem(SEED_KEY)
    window.sessionStorage.removeItem(FILE_KEY)

    const text = seed?.trim() || ""

    if (fileRaw) {
      // Home page stored a file — upload it, then send as message
      try {
        const fileData = JSON.parse(fileRaw) as {
          url?: string
          mediaType?: string
          filename?: string
        }
        ;(async () => {
          try {
            const upload = await uploadReceiptImage(fileData)
            sendMessage({
              parts: [
                { type: "text", text: text || "Fişimi analiz et" },
                {
                  type: "file",
                  mediaType: fileData.mediaType ?? "image/jpeg",
                  url: upload.publicUrl,
                  filename: upload.key,
                },
              ],
            })
          } catch (err) {
            console.error("[assistant-chat] seed file upload failed", err)
            toast.error(
              err instanceof Error
                ? err.message
                : "Fotoğraf yüklenemedi. Lütfen tekrar dene.",
            )
            // Still send the text if there was one
            if (text) sendMessage({ text })
          }
        })()
      } catch {
        // JSON parse failed, just send text
        if (text) sendMessage({ text })
      }
    } else if (text) {
      sendMessage({ text })
    }
  }, [sendMessage, initialMessages])

  const isBusy = status === "submitted" || status === "streaming"

  const handleSubmit = guard(async (message: PromptInputMessage) => {
    if (isBusy) return
    const text = message.text?.trim() ?? ""
    const imageFile = (message.files ?? []).find((f) =>
      f.mediaType?.startsWith("image/"),
    )

    if (imageFile) {
      try {
        const upload = await uploadReceiptImage(imageFile)
        sendMessage({
          parts: [
            { type: "text", text: text || "Fişimi analiz et" },
            {
              type: "file",
              mediaType: imageFile.mediaType,
              url: upload.publicUrl,
              filename: upload.key,
            },
          ],
        })
        setInput("")
      } catch (err) {
        console.error("[assistant-chat] upload failed", err)
        toast.error(
          err instanceof Error
            ? err.message
            : "Fotoğraf yüklenemedi. Lütfen tekrar dene.",
        )
      }
      return
    }

    if (!text) return
    sendMessage({ text })
    setInput("")
  })

  const handleSuggestionClick = guard((text: string) => {
    if (isBusy) return
    sendMessage({ text })
  })

  const handleApprove = React.useCallback(
    (a: ApprovalSubmit) => {
      if (isBusy) return
      const payload = {
        receiptImageUrl: a.receiptImageUrl,
        receiptImageR2Key: a.receiptImageR2Key ?? "",
        marketName: a.marketName,
        purchaseDate: a.purchaseDate,
        totalAmount: a.totalAmount,
        items: a.items.map((it) => ({
          rawName: it.rawName,
          searchQuery: it.searchQuery,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
        })),
      }
      sendMessage({
        metadata: { kind: "receiptApproval", payload },
        text: "Bu kalemleri onayladım, karşılaştır.",
      })
    },
    [isBusy, sendMessage],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
      <Conversation className="mx-auto w-full max-w-3xl">
        <ConversationContent className="px-0">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="text-muted-foreground">
                <SparklesIcon className="size-10" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Bugün ne alışverişi yapacaksın?
              </h1>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(s)}
                    className="h-auto rounded-full px-3 py-1.5 text-xs font-normal text-muted-foreground"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m, msgIdx) => {
              const isLatestAssistant =
                m.role === "assistant" && msgIdx === messages.length - 1
              return (
                <Message from={m.role} key={m.id}>
                  <MessageContent>
                    {m.parts.map((part, i) => {
                      const key = `${m.id}-${i}`
                      switch (part.type) {
                        case "text":
                          return (
                            <MessageResponse key={key}>
                              {part.text}
                            </MessageResponse>
                          )
                        case "tool-parseShoppingList":
                          return renderToolPart(
                            key,
                            part,
                            "Hallediyorum…",
                            (out) => (
                              <ParsedItemsCard data={out as BasketDraft} />
                            ),
                          )
                        case "tool-lookupProducts":
                          return renderToolPart(
                            key,
                            part,
                            "Ürünleri aratıyorum…",
                            (out) => (
                              <ProductMatchList
                                matches={
                                  (out as { matches: MatchResult[] }).matches
                                }
                              />
                            ),
                          )
                        case "tool-summarizeOptimization":
                          return renderToolPart(
                            key,
                            part,
                            "En ucuz market kombinasyonunu hesaplıyorum…",
                            (out) => (
                              <OptimizationCard
                                summary={out as OptimizationSummary}
                              />
                            ),
                          )
                        case "tool-parseReceipt":
                          return renderToolPart(
                            key,
                            part,
                            "Fişini okuyorum…",
                            (out) => (
                              <ReceiptApprovalCard
                                data={out as ParseReceiptOutput}
                                alreadyApproved={!isLatestAssistant}
                                onApprove={handleApprove}
                              />
                            ),
                          )
                        case "tool-receiptComparison":
                          return renderToolPart(
                            key,
                            part,
                            "Fiş karşılaştırmasını hazırlıyorum…",
                            (out) => (
                              <ReceiptComparisonCard
                                data={out as ReceiptComparisonPayload}
                              />
                            ),
                          )
                        case "file": {
                          const filePart = part as {
                            type: "file"
                            mediaType?: string
                            url?: string
                            filename?: string
                          }
                          if (
                            !filePart.url ||
                            !filePart.mediaType?.startsWith("image/")
                          ) {
                            return null
                          }
                          return (
                            <div
                              key={key}
                              className="overflow-hidden rounded-lg border border-border max-w-[280px]"
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
                  </MessageContent>
                </Message>
              )
            })
          )}

          {error && (
            <div className="mx-auto w-full max-w-3xl rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message ||
                "Asistan şu an cevap veremiyor. Lütfen biraz sonra tekrar deneyin."}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <AssistantPrompt
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-3xl"
        status={status}
        onStop={stop}
      />
    </div>
  )
}

/**
 * Convert any browser-side URL (data: or blob:) into a usable Blob.
 * Falls back gracefully if fetch fails (e.g. revoked blob URL).
 */
async function urlToBlob(url: string, mimeType: string): Promise<Blob> {
  if (url.startsWith("data:")) {
    try {
      const [meta, b64] = url.split(",", 2)
      const mime = meta.match(/:(.*?);/)?.[1] ?? mimeType
      const raw = atob(b64)
      const arr = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
      return new Blob([arr], { type: mime })
    } catch {
      throw new Error("Data URL çözümlenemedi.")
    }
  }

  if (url.startsWith("blob:")) {
    try {
      return await (await fetch(url)).blob()
    } catch {
      throw new Error(
        "Dosya okunamadı — muhtemelen zaman aşımına uğradı. Lütfen tekrar yükle.",
      )
    }
  }

  try {
    return await (await fetch(url)).blob()
  } catch {
    throw new Error("Dosya indirilemedi.")
  }
}

async function uploadReceiptImage(file: {
  url?: string
  mediaType?: string
  filename?: string
}): Promise<{ key: string; publicUrl: string }> {
  if (!file.url || !file.mediaType) {
    throw new Error("Geçersiz dosya.")
  }

  const blob = await urlToBlob(file.url, file.mediaType)

  const res = await fetch("/api/receipts/upload", {
    method: "POST",
    headers: { "Content-Type": file.mediaType },
    body: blob,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      message?: string
    } | null
    throw new Error(data?.message ?? "Yükleme reddedildi.")
  }
  const { key, publicUrl } = (await res.json()) as {
    key: string
    publicUrl: string
  }
  return { key, publicUrl }
}



type ToolPartLike = {
  state: string
  output?: unknown
  errorText?: string
}

function renderToolPart(
  key: string,
  part: ToolPartLike,
  loadingLabel: string,
  renderResult: (output: unknown) => React.ReactNode,
) {
  if (part.state === "output-available" && part.output !== undefined) {
    return <div key={key}>{renderResult(part.output)}</div>
  }
  if (part.state === "output-error") {
    return (
      <div
        key={key}
        className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
      >
        {part.errorText ?? "Bir hata oluştu, tekrar deneyebilir misin?"}
      </div>
    )
  }
  return (
    <div
      key={key}
      className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
    >
      <Loader2Icon className="size-3.5 animate-spin" />
      {loadingLabel}
    </div>
  )
}
