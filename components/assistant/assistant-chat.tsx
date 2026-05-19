"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { ChevronDownIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Conversation,
  ConversationContent,
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
import { assistantTitle } from "@/lib/stores/assistant-title"
import { assistantConversations } from "@/lib/stores/assistant-conversations"
import type {
  BasketDraft,
  ImageAnalysis,
  MatchResult,
  OptimizationSummary,
  ReceiptOCR,
} from "@/lib/ai/schemas"
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
import {
  BasketApprovalCard,
  type BasketApprovalSubmit,
} from "./basket-approval-card"
import {
  BasketSaveCard,
  type BasketContextPayload,
} from "./basket-save-card"
import { ThinkingText } from "./ai-thinking-text"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const SEED_KEY = "assistant:seed"
const FILE_KEY = "assistant:file"

const SUGGESTIONS = [
  "Fiş veya yemek fotoğrafımı analiz et",
  "Nohutlu pilav yapmak istiyorum",
  "Limonata için malzemeler",
]

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

type AssistantChatProps = {
  conversationId?: string
  initialTitle?: string
  initialMessages?: Array<Pick<UIMessage, "id" | "role" | "parts"> & {
    metadata?: unknown
  }>
  initialSavedBaskets?: Record<string, string>
}

export function AssistantChat({
  conversationId: initialConversationId,
  initialTitle,
  initialMessages,
  initialSavedBaskets,
}: AssistantChatProps = {}) {
  const guard = useRequireAuth()
  // Render-time okuma için state, callback-time okuma için ref tutuyoruz.
  // Transport `body` callback'i memo ile tek sefer oluşturulur ve istek anında
  // çalışır; orada güncel değere ref üzerinden ulaşılır. JSX'te ise state
  // okunur, böylece id değişince re-render düzgün tetiklenir (refs render
  // tetiklemez, hidden staleness'a yol açar).
  const [conversationId, setConversationId] = React.useState<string | undefined>(
    initialConversationId,
  )
  const conversationIdRef = React.useRef<string | undefined>(initialConversationId)
  const navigatedRef = React.useRef(false)
  // body is a lazy callback invoked at request time — the ref read happens
  // outside render. React 19's static analyzer flags this as a false positive.
  /* eslint-disable react-hooks/refs, react-hooks/preserve-manual-memoization */
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant/chat",
        body: () => ({ conversationId: conversationIdRef.current }),
      }),
    [],
  )
  /* eslint-enable react-hooks/refs, react-hooks/preserve-manual-memoization */
  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    messages: initialMessages as UIMessage[] | undefined,
    onData: (dataPart) => {
      if (
        dataPart.type === "data-conversation-id" &&
        dataPart.data &&
        typeof (dataPart.data as { id?: unknown }).id === "string"
      ) {
        const data = dataPart.data as { id: string; title?: string | null }
        const id = data.id
        conversationIdRef.current = id
        setConversationId(id)
        assistantTitle.setConversationId(id)
        // Yeni konuşmayı sidebar listesine hemen ekle. AI başlığı
        // sonradan title event'iyle gelir; o zamana kadar
        // createConversation'ın çıkardığı seed title gösterilir.
        // pending=true → sidebar bu kayıt için title yerine skeleton gösterir;
        // AI title `data-conversation-title` event'iyle gelince setTitle
        // pending'i kapatır. Böylece header'daki skeleton ile sidebar'daki
        // skeleton aynı anda görünür/kaybolur.
        assistantConversations.upsert({
          id,
          title: data.title?.trim() || "Yeni sohbet",
          updatedAt: new Date(),
          pending: true,
        })
        if (!navigatedRef.current) {
          navigatedRef.current = true
          // Soft URL update: avoid Next.js route navigation here, which would
          // unmount this component mid-stream and abort the SSE reader.
          // The /asistan/[id] route will SSR fresh data on refresh / next nav.
          window.history.replaceState(null, "", `/asistan/${id}`)
        }
      }
      if (
        dataPart.type === "data-conversation-title" &&
        dataPart.data &&
        typeof (dataPart.data as { title?: unknown }).title === "string"
      ) {
        const data = dataPart.data as { id?: string; title: string }
        const title = data.title
        assistantTitle.setTitle(title)
        const id = data.id ?? conversationIdRef.current
        if (id) {
          assistantConversations.setTitle(id, title)
        }
      }
    },
    onFinish: () => {
      // Sunucu title event'i göndermediyse skeleton'u kapat — header
      // çizgide kalır ya da varsa mevcut title'a düşer.
      assistantTitle.setLoading(false)
      // NOT: Eskiden burada router.refresh() vardı — sidebar konuşma
      // listesini güncellemek için. Ama URL replaceState ile değişmişken
      // refresh, segment tree'yi /asistan → /asistan/[id]'ye swap edip
      // AssistantChat ve içindeki StickToBottom'ı remount ediyordu →
      // approval kartı göründüğü an "sayfa baştan yükleniyor, yukarıdan
      // aşağı kayıyor" hissi. Artık sidebar mutasyonları
      // assistantConversations store'u üzerinden uygulanıyor.
      const id = conversationIdRef.current
      if (id && navigatedRef.current) {
        assistantConversations.touch(id)
      }
      // Safety net: sunucu title event'i göndermediyse sidebar'daki
      // skeleton'u kapat (header'la aynı davranış).
      if (id) {
        assistantConversations.clearPending(id)
      }
    },
    onError: () => {
      assistantTitle.setLoading(false)
      const id = conversationIdRef.current
      if (id) {
        assistantConversations.clearPending(id)
      }
    },
  })
  const [input, setInput] = React.useState("")
  const sentSeedRef = React.useRef(false)

  // Ana sayfadan gelen seed'i synchronously oku ki ilk render'da hemen
  // optimistic user bubble + "Düşünüyorum…" gösterebilelim. Aksi halde
  // sendMessage useEffect içinde tetiklenene kadar kullanıcı boş bir
  // empty state ile karşılaşıyor ve sayfa donuk görünüyor.
  const [pendingSeed] = React.useState<{
    text: string
    file: { url: string; mediaType: string; filename?: string } | null
  } | null>(() => {
    if (typeof window === "undefined") return null
    if (initialMessages && initialMessages.length > 0) return null
    const rawText = window.sessionStorage.getItem(SEED_KEY)?.trim() ?? ""
    const fileRaw = window.sessionStorage.getItem(FILE_KEY)
    if (!rawText && !fileRaw) return null
    let file: { url: string; mediaType: string; filename?: string } | null = null
    if (fileRaw) {
      try {
        const parsed = JSON.parse(fileRaw) as {
          url?: string
          mediaType?: string
          filename?: string
        }
        if (parsed.url && parsed.mediaType) {
          file = {
            url: parsed.url,
            mediaType: parsed.mediaType,
            filename: parsed.filename,
          }
        }
      } catch {
        // ignore — file görselsiz görünür ama text seed gene de işlenir
      }
    }
    return {
      text: rawText || (file ? "Bu görseli analiz et" : ""),
      file,
    }
  })

  const showSeedOptimistic = pendingSeed !== null && messages.length === 0
  // Seed bir görsel içeriyorsa upload bitene kadar fotoğrafın üzerinde
  // blur+spinner overlay göstermek için bayrak. Upload başarılıysa
  // sendMessage tetiklenir → messages.length>0 olur → optimistic blok zaten
  // unmount olur; başarısız olursa catch içinde false'a çekiyoruz ki kullanıcı
  // donmuş bir overlay görmesin.
  const [isSeedUploading, setIsSeedUploading] = React.useState(
    () => pendingSeed?.file != null,
  )

  // Header'daki title state'ini bu chat'in title'ı ile senkronize tut.
  React.useEffect(() => {
    if (initialTitle) {
      assistantTitle.setTitle(initialTitle)
    } else {
      assistantTitle.reset()
    }
    assistantTitle.setConversationId(initialConversationId ?? null)
    return () => {
      assistantTitle.reset()
    }
  }, [initialTitle, initialConversationId])

  // Yeni bir sohbet başlatılırken (henüz id yok) header'da skeleton göster;
  // sunucudan title event'i geldiğinde store kapanır.
  const markPendingTitleIfNew = React.useCallback(() => {
    if (!conversationIdRef.current) {
      assistantTitle.setLoading(true)
    }
  }, [])

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
            // R2 URL'ini browser cache'ine al ki optimistic blob'dan gerçek
            // mesaja geçişte img boş kalıp "kaybolup tekrar gelmesin".
            await preloadImage(upload.publicUrl)
            markPendingTitleIfNew()
            sendMessage({
              parts: [
                { type: "text", text: text || "Bu görseli analiz et" },
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
            setIsSeedUploading(false)
            toast.error(
              err instanceof Error
                ? err.message
                : "Fotoğraf yüklenemedi. Lütfen tekrar dene.",
            )
            // Still send the text if there was one
            if (text) {
              markPendingTitleIfNew()
              sendMessage({ text })
            }
          }
        })()
      } catch {
        // JSON parse failed, just send text
        if (text) {
          markPendingTitleIfNew()
          sendMessage({ text })
        }
      }
    } else if (text) {
      markPendingTitleIfNew()
      sendMessage({ text })
    }
  }, [sendMessage, initialMessages, markPendingTitleIfNew])

  const isBusy = status === "submitted" || status === "streaming"

  // Handler'lar event-time'da çağrılır — render sırasında çağrılmaz. React 19
  // derleyicisi `guard()`'a ref okuyan callback geçişini false-positive olarak
  // bayraklıyor (transport useMemo'sunda da aynı kalıp var).
  /* eslint-disable react-hooks/refs */
  const handleSubmit = guard(async (message: PromptInputMessage) => {
    if (isBusy) return
    const text = message.text?.trim() ?? ""
    const imageFile = (message.files ?? []).find((f) =>
      f.mediaType?.startsWith("image/"),
    )

    if (imageFile) {
      try {
        const upload = await uploadReceiptImage(imageFile)
        markPendingTitleIfNew()
        sendMessage({
          parts: [
            { type: "text", text: text || "Bu görseli analiz et" },
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
    markPendingTitleIfNew()
    sendMessage({ text })
    setInput("")
  })

  const handleSuggestionClick = guard((text: string) => {
    if (isBusy) return
    setInput(text)
  })
  /* eslint-enable react-hooks/refs */

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

  const handleBasketApprove = React.useCallback(
    (a: BasketApprovalSubmit) => {
      if (isBusy) return
      sendMessage({
        metadata: { kind: "basketApproval", payload: { items: a.items } },
        text: "Sepeti onayladım, en ucuz marketleri göster.",
      })
    },
    [isBusy, sendMessage],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
      {messages.length === 0 && !showSeedOptimistic ? (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
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
                className="h-auto rounded-full border-border px-3 py-1.5 text-xs font-normal text-muted-foreground dark:border-muted-foreground/25"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <Conversation className="mx-auto w-full max-w-3xl">
          <ConversationContent className="px-0">
            {showSeedOptimistic && pendingSeed && (
              <>
                <Message from="user" key="__seed_user">
                  <MessageContent>
                    {pendingSeed.text && (
                      <MessageResponse>{pendingSeed.text}</MessageResponse>
                    )}
                    {pendingSeed.file?.mediaType.startsWith("image/") && (
                      <div className="relative overflow-hidden rounded-lg border border-border max-w-[280px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pendingSeed.file.url}
                          alt={pendingSeed.file.filename ?? "Yüklenen görsel"}
                          className={cn(
                            "block h-auto w-full transition-[filter,transform] duration-200",
                            isSeedUploading && "scale-[1.02] blur-sm",
                          )}
                        />
                        {isSeedUploading && (
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm"
                            aria-live="polite"
                            aria-label="Görsel yükleniyor"
                          >
                            <Spinner className="size-6 text-foreground/80" />
                          </div>
                        )}
                      </div>
                    )}
                  </MessageContent>
                </Message>
                <Message from="assistant" key="__seed_assistant">
                  <MessageContent>
                    <ThinkingText>Düşünüyorum…</ThinkingText>
                  </MessageContent>
                </Message>
              </>
            )}
            {messages.map((m, msgIdx) => {
              const isLatestAssistant =
                m.role === "assistant" && msgIdx === messages.length - 1
              const nextMsg = messages[msgIdx + 1]
              const nextMeta = (nextMsg as { metadata?: unknown } | undefined)
                ?.metadata as
                | { kind?: string; payload?: { items?: BasketApprovalSubmit["items"] } }
                | undefined
              const approvedBasketItems =
                nextMsg?.role === "user" &&
                nextMeta?.kind === "basketApproval" &&
                Array.isArray(nextMeta.payload?.items)
                  ? nextMeta.payload!.items
                  : undefined
              // Aktif (henüz "done" olmayan) bir reasoning part'ı varsa
              // pending tool part'larının yükleniyor etiketi ("Hallediyorum…"
              // vb.) bastırılır — aynı anda iki "düşünme" animasyonu (örn.
              // "Hallediyorum" + "Düşünüyorum") görmemek için. Reasoning
              // "done" olur olmaz tool kendi etiketini gösterir.
              const hasActiveReasoning = m.parts.some(
                (p) =>
                  p.type === "reasoning" &&
                  (p as { state?: string }).state !== "done",
              )
              // Asistan mesajlarında text/reasoning kısımlarını tool & file
              // kart(lar)ından ÖNCE render et. Sunucu stream sırası genelde
              // [tool, reasoning, text] şeklinde geliyor; kullanıcı için
              // doğal okuma sırası ise önce kısa özet/açıklama, sonra
              // detay/kart. User mesajlarında parts olduğu gibi gösterilir.
              const orderedParts =
                m.role === "assistant"
                  ? [
                      ...m.parts.filter(
                        (p) => p.type === "text" || p.type === "reasoning",
                      ),
                      ...m.parts.filter(
                        (p) => p.type !== "text" && p.type !== "reasoning",
                      ),
                    ]
                  : m.parts
              return (
                <Message from={m.role} key={m.id}>
                  <MessageContent>
                    {orderedParts.map((part, i) => {
                      const key = `${m.id}-${i}`
                      const suppressToolLoader = hasActiveReasoning
                      switch (part.type) {
                        case "text":
                          return (
                            <MessageResponse key={key}>
                              {part.text}
                            </MessageResponse>
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
                              streaming={p.state !== "done"}
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
                                  alreadyApproved={!isLatestAssistant}
                                  approvedItems={approvedBasketItems}
                                  onApprove={handleBasketApprove}
                                />
                              )
                            },
                            suppressToolLoader,
                          )
                        case "tool-basketContext": {
                          const toolCallId =
                            (part as { toolCallId?: string }).toolCallId ?? null
                          const savedId =
                            toolCallId && initialSavedBaskets
                              ? initialSavedBaskets[toolCallId] ?? null
                              : null
                          return renderToolPart(
                            key,
                            part,
                            "Sepetini hazırlıyorum…",
                            (out) => (
                              <BasketSaveCard
                                data={out as BasketContextPayload}
                                conversationId={conversationId ?? null}
                                toolCallId={toolCallId}
                                initialSavedId={savedId}
                              />
                            ),
                            suppressToolLoader,
                          )
                        }
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
                            suppressToolLoader,
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
                            suppressToolLoader,
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
                            suppressToolLoader,
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
                                    alreadyApproved={!isLatestAssistant}
                                    onApprove={handleApprove}
                                  />
                                )
                              }
                              if (analysis.kind === "food" && analysis.food) {
                                const draft: BasketDraft = {
                                  items: analysis.food.items,
                                  chatResponse: null,
                                }
                                return (
                                  <BasketApprovalCard
                                    data={draft}
                                    alreadyApproved={!isLatestAssistant}
                                    approvedItems={approvedBasketItems}
                                    onApprove={handleBasketApprove}
                                  />
                                )
                              }
                              // kind === "unknown" → kart yok; metin yanıtı yeter.
                              return null
                            },
                            suppressToolLoader,
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
                            suppressToolLoader,
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
            })}

            {error && (
              <div className="mx-auto w-full max-w-3xl rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error.message ||
                  "Asistan şu an cevap veremiyor. Lütfen biraz sonra tekrar deneyin."}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <AssistantPrompt
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-3xl"
        status={showSeedOptimistic ? "submitted" : status}
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

/**
 * Decode a remote image into the browser cache before swapping the <img> src.
 * Without this, sendMessage fires with the R2 URL while the browser hasn't
 * fetched it yet → optimistic blob image unmounts and the real image renders
 * blank for a beat = visible "kaybolup tekrar geldi" flicker.
 * Errors are swallowed: we don't want a flaky preload to block the chat flow.
 */
async function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
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
  suppressLoader = false,
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
  if (suppressLoader) {
    return null
  }
  return (
    <div key={key} className="py-0.5">
      <ThinkingText>{loadingLabel}</ThinkingText>
    </div>
  )
}

type ReasoningBlockProps = {
  text: string
  streaming: boolean
}

function ReasoningBlock({ text, streaming }: ReasoningBlockProps) {
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
          streaming ? "text-xs" : "text-sm",
        )}
      >
        {streaming ? (
          <ThinkingText className="text-sm">Düşünüyorum</ThinkingText>
        ) : (
          <span>Düşündüm</span>
        )}
        <ChevronDownIcon
          className={cn(
            "transition-transform duration-200",
            streaming ? "size-3.5" : "size-4",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_li]:pl-1 [&_code]:text-[0.95em] [&_code]:px-1 [&_code]:py-0 [&_code]:font-normal [&_pre]:text-xs [&_pre]:p-2">
          <MessageResponse>{text}</MessageResponse>
        </div>
      )}
    </div>
  )
}
