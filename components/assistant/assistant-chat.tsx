"use client"

import { Squircle } from "@/components/ui/squircle"
import { Card } from "@/components/ui/card"
import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiSparklingLine,
  RiStopCircleLine,
} from "@remixicon/react"

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
import { useRequireLocation } from "@/lib/hooks/use-require-location"
import { useCurrentUser } from "@/components/providers/session-provider"
import { assistantTitle } from "@/lib/stores/assistant-title"
import { assistantConversations } from "@/lib/stores/assistant-conversations"
import type {
  BasketDraft,
  ImageAnalysis,
  MatchResult,
  OptimizationSummary,
  ReceiptOCR,
} from "@/lib/ai/schemas"
import { UnmatchedProductList } from "./unmatched-product-list"
import {
  OptimizationCard,
  type ProductImageFallback,
} from "./optimization-card"
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
import {
  applySelectionToParts,
  type SelectionUpdate,
} from "@/lib/assistant/selection-update"
import { ThinkingText } from "./ai-thinking-text"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import {
  STOPPED_PART_TYPE,
  approvalKind,
  hasStoppedMarker,
  resolveApprovalCard,
  statusAfterStop,
  type MessageLike,
} from "@/lib/assistant/turn-state"
import { PressFx } from "@/components/motion/press-fx"
import { stripQuantityTokens } from "@/lib/ai/normalize"
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
  /**
   * Yazma alanına önceden doldurulacak metin (ör. kayıtlı bir sepetten
   * "Fiyatları yenile"). Kasıtlı olarak GÖNDERİLMEZ, yalnızca doldurulur:
   * kullanıcının açık onayı olmadan bir asistan turu başlatmak kotasını harcar.
   */
  initialInput?: string
  initialTitle?: string
  initialMessages?: Array<Pick<UIMessage, "id" | "role" | "parts"> & {
    metadata?: unknown
  }>
  initialSavedBaskets?: Record<string, string>
  initialSavedReceipts?: Record<string, string>
}

export function AssistantChat({
  conversationId: initialConversationId,
  initialInput,
  initialTitle,
  initialMessages,
  initialSavedBaskets,
  initialSavedReceipts,
}: AssistantChatProps = {}) {
  const guard = useRequireAuth()
  const locationGuard = useRequireLocation()
  const { user } = useCurrentUser()
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : ""
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
  // Stop ile kesilen turlar. Anahtar, durdurulan asistan mesajının id'si; ilk
  // chunk gelmeden durdurulduysa asistan mesajı hiç oluşmaz, o zaman cevabı
  // gelmeyen kullanıcı mesajının id'si. Yeniden yüklenen sohbette aynı bilgi
  // sunucunun kaydettiği `data-stopped` part'ından okunur (bkz. turn-state).
  const [stoppedIds, setStoppedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const { messages, sendMessage, setMessages, status, stop, error } = useChat({
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
      if (
        dataPart.type === "data-conversation-status" &&
        dataPart.data &&
        typeof (dataPart.data as { status?: unknown }).status === "string"
      ) {
        const data = dataPart.data as {
          id?: string
          status: "awaiting" | "completed"
        }
        const id = data.id ?? conversationIdRef.current
        if (id) {
          assistantConversations.setStatus(id, data.status)
        }
      }
    },
    onFinish: ({ message, messages: finalMessages, isAbort }) => {
      // Sunucu title event'i göndermediyse skeleton'u kapat — header
      // çizgide kalır ya da varsa mevcut title'a düşer.
      assistantTitle.setLoading(false)
      if (isAbort) {
        const cut = finalMessages.find((m) => m.id === message.id)
        const lastUser = [...finalMessages]
          .reverse()
          .find((m) => m.role === "user")
        const key = cut?.id ?? lastUser?.id
        if (key) setStoppedIds((prev) => new Set(prev).add(key))
        // Kesilen akış durum event'ini getiremez; sunucunun kaydettiği
        // durumla aynı kurala göre burada yaz.
        const stoppedId = conversationIdRef.current
        if (stoppedId) {
          assistantConversations.setStatus(
            stoppedId,
            statusAfterStop(
              cut?.parts ?? [],
              lastUser ? approvalKind(lastUser) !== null : false,
            ),
          )
        }
      }
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
  const [input, setInput] = React.useState(initialInput ?? "")
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
      // Home page görseli attach anında R2'ye yükledi ve public URL + key'i
      // sessionStorage'a yazdı. Burada upload yok; doğrudan gönderiyoruz.
      try {
        const fileData = JSON.parse(fileRaw) as {
          url?: string
          mediaType?: string
          filename?: string
        }
        if (fileData.url) {
          markPendingTitleIfNew()
          sendMessage({
            parts: [
              { type: "text", text: text || "Bu görseli analiz et" },
              {
                type: "file",
                mediaType: fileData.mediaType ?? "image/jpeg",
                url: fileData.url,
                filename: fileData.filename,
              },
            ],
          })
        } else if (text) {
          markPendingTitleIfNew()
          sendMessage({ text })
        }
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

  // Sidebar'da bu sohbet için üç nokta animasyonunu süren istemci-içi bayrak.
  // Stream başladığında (id biliniyorsa) işaretle, bittiğinde/değiştiğinde
  // temizle. Yeni sohbette id ilk turn'de gelir → conversationId state'i
  // değişince effect tekrar çalışır ve bayrağı kurar. Onay turn'lerinde
  // (mevcut sohbet) de aynı şekilde çalışır.
  React.useEffect(() => {
    if (!isBusy || !conversationId) return
    assistantConversations.setStreaming(conversationId)
    return () => assistantConversations.clearStreaming()
  }, [isBusy, conversationId])

  // Handler'lar event-time'da çağrılır — render sırasında çağrılmaz. React 19
  // derleyicisi `guard()`'a ref okuyan callback geçişini false-positive olarak
  // bayraklıyor (transport useMemo'sunda da aynı kalıp var).
  /* eslint-disable react-hooks/refs */
  const handleSubmit = guard(
    locationGuard(async (message: PromptInputMessage) => {
      if (isBusy) return
      const text = message.text?.trim() ?? ""
      const imageFile = (message.files ?? []).find((f) =>
        f.mediaType?.startsWith("image/"),
      )

      if (imageFile) {
        // Görsel attach anında zaten R2'ye yüklendi; imageFile.url public URL,
        // imageFile.filename ise R2 key'idir. Burada upload beklemiyoruz.
        markPendingTitleIfNew()
        sendMessage({
          parts: [
            { type: "text", text: text || "Bu görseli analiz et" },
            {
              type: "file",
              mediaType: imageFile.mediaType,
              url: imageFile.url,
              filename: imageFile.filename,
            },
          ],
        })
        setInput("")
        return
      }

      if (!text) return
      markPendingTitleIfNew()
      sendMessage({ text })
      setInput("")
    }),
  )

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

  // Eşleştirilemeyen bir kalemi yeni bir adla yeniden aratır: aynı sepet, o
  // kalemin adı/sorgusu değişmiş olarak yeni bir sepet onayı turu olur. Böylece
  // kalem bulunursa Sepet Özeti onu da içerecek şekilde baştan kurulur.
  const handleRetryUnmatched = React.useCallback(
    (matches: MatchResult[], index: number, query: string) => {
      if (isBusy) return
      const target = matches[index]
      const name = query.trim()
      if (!target || !name) return
      // Aynı adla yeniden deneme (servis hatası) kalemin sorgusunu korur.
      const same =
        name.toLocaleLowerCase("tr-TR") === target.rawName.toLocaleLowerCase("tr-TR")
      const items = matches.map((m, i) =>
        i === index && !same
          ? {
              rawName: name,
              searchQuery:
                stripQuantityTokens(name) || name.toLocaleLowerCase("tr-TR"),
              quantity: m.quantity,
              unit: m.unit,
              // Ad değişse de kullanıcının tercihi aynı ürüne ait.
              note: m.note ?? null,
            }
          : {
              rawName: m.rawName,
              searchQuery: m.searchQuery,
              quantity: m.quantity,
              unit: m.unit,
              note: m.note ?? null,
            },
      )
      sendMessage({
        metadata: { kind: "basketApproval", payload: { items } },
        text: same
          ? `${capitalizeTr(name)} için tekrar dener misin?`
          : `${capitalizeTr(target.rawName)} yerine ${name.toLocaleLowerCase("tr-TR")} ile arar mısın?`,
      })
    },
    [isBusy, sendMessage],
  )

  // Sepet Özeti'nden ürün değiştirildi: sunucu kayıtlı mesajı güncelledi,
  // ekrandaki mesaj aynı fonksiyonla güncellenir (bkz. applySelectionToParts).
  const handleSelectionApplied = React.useCallback(
    (toolCallId: string, update: SelectionUpdate) => {
      setMessages((prev) =>
        prev.map((m) => {
          const parts = applySelectionToParts(m.parts, toolCallId, update)
          return parts ? { ...m, parts } : m
        }),
      )
    },
    [setMessages],
  )

  const isStoppedMessage = React.useCallback(
    (m: MessageLike) => stoppedIds.has(m.id) || hasStoppedMarker(m.parts),
    [stoppedIds],
  )
  // İlk chunk gelmeden durdurulan turda asistan mesajı hiç oluşmaz. Sunucu o
  // turu yalnızca durdurma işaretini taşıyan bir mesaj olarak kaydeder; aynısı
  // burada da eklenir ki canlı görünüm ile yeniden yüklenen sohbet aynı olsun.
  const thread = React.useMemo(
    () =>
      messages.flatMap((m) =>
        m.role === "user" && stoppedIds.has(m.id)
          ? [
              m,
              {
                id: `${m.id}-stopped`,
                role: "assistant",
                parts: [{ type: STOPPED_PART_TYPE, data: {} }],
              } satisfies UIMessage,
            ]
          : [m],
      ),
    [messages, stoppedIds],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
      {messages.length === 0 && !showSeedOptimistic ? (
        /* Kap yalnız xl'de genişliyor: başlık orada 48px'e çıkıyor ve en uzun
           ad ("Abdurrahman, bugün ne alıyoruz?" ≈ 15.8em → ~760px) max-w-3xl'in
           iç genişliğine (704px) sığmıyordu. 54rem − p-8 = 800px, tek satır için
           gereken en dar basamak. Altında punto 36px (~570px), 704px zaten
           yetiyor. Çipler kendi max-w-2xl'inde kalıyor (ana sayfayla aynı),
           yoksa başlıkla birlikte yayılırlardı. */
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 p-8 text-center xl:max-w-[54rem]">
          {/* Vitrin yüzü (Cooper) ve punto basamakları hero h1 ile aynı.
              `font-normal`: ailede yalnız 400 kayıtlı, `font-bold` sahte bold
              çizdirirdi. `tracking-tight` de gitti — sıkılık cn-font-display'in
              kendi -0.0167em'inden geliyor, ikisi üst üste binerdi. */}
          <h1 className="cn-font-display text-4xl font-normal xl:text-5xl">
            {firstName
              ? `${firstName}, bugün ne alıyoruz?`
              : "Bugün ne alıyoruz?"}
          </h1>
          {/* Çipler ana sayfadaki hero çipleriyle aynı `chip` varyantı;
              PressFx hover'da kaldırır. */}
          <div className="mt-4 flex w-full max-w-2xl flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <PressFx key={s}>
                <Button
                  type="button"
                  variant="chip"
                  size="sm"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s}
                </Button>
              </PressFx>
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
                      <div className="max-w-[280px] overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pendingSeed.file.url}
                          alt={pendingSeed.file.filename ?? "Yüklenen görsel"}
                          className="block h-auto w-full"
                        />
                      </div>
                    )}
                  </MessageContent>
                </Message>
                <Message from="assistant" key="__seed_assistant">
                  <MessageContent>
                    <Marker role="status">
                      <MarkerContent className="shimmer font-medium">
                        Düşünüyorum…
                      </MarkerContent>
                    </Marker>
                  </MessageContent>
                </Message>
              </>
            )}
            {thread.map((m, msgIdx) => {
              // Yalnızca şu an akan mesajın bitmemiş part'ları "yükleniyor"
              // gösterir. Stop'tan (ya da hatadan) sonra çıktısı hiç gelmeyecek
              // bir tool çağrısı sonsuza dek "Hallediyorum…" diye dönüyordu ve
              // durdurma işe yaramamış gibi görünüyordu.
              const isStreamingMsg =
                isBusy &&
                m.role === "assistant" &&
                msgIdx === thread.length - 1
              const stopped = isStoppedMessage(m)
              const card =
                m.role === "assistant"
                  ? resolveApprovalCard(thread, msgIdx, {
                      busy: isBusy,
                      isStopped: isStoppedMessage,
                    })
                  : null
              const approvalMeta = card?.approval?.metadata as
                | { kind?: string; payload?: { items?: BasketApprovalSubmit["items"] } }
                | undefined
              const approvedBasketItems =
                approvalMeta?.kind === "basketApproval" &&
                Array.isArray(approvalMeta.payload?.items)
                  ? approvalMeta.payload.items
                  : undefined
              // Aktif (henüz "done" olmayan) bir reasoning part'ı varsa
              // pending tool part'larının yükleniyor etiketi ("Hallediyorum…"
              // vb.) bastırılır — aynı anda iki "düşünme" animasyonu (örn.
              // "Hallediyorum" + "Düşünüyorum") görmemek için. Reasoning
              // "done" olur olmaz tool kendi etiketini gösterir.
              const hasActiveReasoning =
                isStreamingMsg &&
                m.parts.some(
                  (p) =>
                    p.type === "reasoning" &&
                    (p as { state?: string }).state !== "done",
                )
              const suppressToolLoader = !isStreamingMsg || hasActiveReasoning
              const orderedParts =
                m.role === "assistant" ? orderAssistantParts(m.parts) : m.parts
              // Fiş turunda karşılaştırma kartı her satırı (eşleşmeyenler
              // dahil, "eşleşme yok") zaten listeliyor; ayrı bir
              // Eşleştirilemeyen Ürünler kartı aynı bilgiyi tekrarlardı.
              const hasReceiptComparison = m.parts.some(
                (p) => p.type === "tool-receiptComparison",
              )
              return (
                <Message from={m.role} key={m.id}>
                  <MessageContent>
                    {orderedParts.map((part, i) => {
                      const key = `${m.id}-${i}`
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
                                  alreadyApproved={card?.locked}
                                  approvedItems={approvedBasketItems}
                                  onApprove={handleBasketApprove}
                                />
                              )
                            },
                            suppressToolLoader,
                          )
                        case "tool-basketContext":
                          // Kaydet artık Sepet Özeti kartının alt şeridinde
                          // (bkz. tool-summarizeOptimization kolu).
                          return null
                        case "tool-lookupProducts":
                          return renderToolPart(
                            key,
                            part,
                            "Ürünleri aratıyorum…",
                            (out) =>
                              hasReceiptComparison ? null : (
                                <UnmatchedProductList
                                  matches={
                                    (out as { matches: MatchResult[] }).matches
                                  }
                                  // Yeniden arama yalnızca son turda: eski bir
                                  // kartta tıklamak sohbetin ortasına geçmiş
                                  // bir sepetin yeni sonucunu düşürürdü.
                                  onRetry={
                                    msgIdx === thread.length - 1
                                      ? handleRetryUnmatched
                                      : undefined
                                  }
                                  disabled={isBusy}
                                />
                              ),
                            suppressToolLoader,
                          )
                        case "tool-summarizeOptimization": {
                          // Sepet onayı turunda özet, kayıt bağlamıyla birlikte
                          // tek kart: Kaydet ve ürün değiştirme onun üstünde.
                          // Fiş turunda bağlam yok; düz özet kartı.
                          const context = m.parts.find(
                            (p) =>
                              p.type === "tool-basketContext" &&
                              (p as { state?: string }).state ===
                                "output-available",
                          ) as
                            | { toolCallId?: string; output?: unknown }
                            | undefined
                          const contextCallId = context?.toolCallId ?? null
                          return renderToolPart(
                            key,
                            part,
                            "En ucuz market kombinasyonunu hesaplıyorum…",
                            (out) =>
                              context?.output ? (
                                <BasketSummary
                                  data={context.output as BasketContextPayload}
                                  toolCallId={contextCallId}
                                  conversationId={conversationId ?? null}
                                  initialSavedId={
                                    contextCallId && initialSavedBaskets
                                      ? (initialSavedBaskets[contextCallId] ??
                                        null)
                                      : null
                                  }
                                  // Ürün değiştirme yalnızca son turda: eski
                                  // bir kartı değiştirmek sohbetin ortasındaki
                                  // geçmiş bir sepeti sessizce değiştirirdi.
                                  editable={
                                    !isBusy && msgIdx === thread.length - 1
                                  }
                                  imageFallback={matchImageFallback(m.parts)}
                                  onUpdated={handleSelectionApplied}
                                />
                              ) : (
                                <OptimizationCard
                                  summary={out as OptimizationSummary}
                                  imageFallback={matchImageFallback(m.parts)}
                                />
                              ),
                            suppressToolLoader,
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
                                alreadyApproved={card?.locked}
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
                                    alreadyApproved={card?.locked}
                                    onApprove={handleApprove}
                                  />
                                )
                              }
                              if (analysis.kind === "food" && analysis.food) {
                                return (
                                  <BasketApprovalCard
                                    data={{ items: analysis.food.items }}
                                    alreadyApproved={card?.locked}
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
                        case "tool-receiptComparison": {
                          const toolCallId =
                            (part as { toolCallId?: string }).toolCallId ?? null
                          const savedId =
                            toolCallId && initialSavedReceipts
                              ? initialSavedReceipts[toolCallId] ?? null
                              : null
                          return renderToolPart(
                            key,
                            part,
                            "Fiş karşılaştırmasını hazırlıyorum…",
                            (out) => (
                              <ReceiptComparisonCard
                                data={out as ReceiptComparisonPayload}
                                conversationId={conversationId ?? null}
                                toolCallId={toolCallId}
                                initialSavedId={savedId}
                              />
                            ),
                            suppressToolLoader,
                          )
                        }
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
                </Message>
              )
            })}

            {error &&
              (() => {
                const quota = parseQuotaError(error)
                if (quota) {
                  return (
                    <QuotaExceededCard
                      metric={quota.metric}
                      resetAt={quota.resetAt}
                    />
                  )
                }
                return (
                  <Squircle
                    role="alert"
                    radius="xl"
                    // Kenar kartlarla aynı teknikte (içeride), ama rengi
                    // BİLEREK hairline değil: destructive yüzeyler kendi
                    // semantik kenarlarını taşır (bkz. badge'in destructive
                    // varyantı). CSS `border` yerine `inset-ring` olmasının
                    // sebebi `effects`i kapatabilmek — düz bir border
                    // clip-path'le köşeden kesilirdi.
                    className="mx-auto flex w-full max-w-3xl items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive inset-ring inset-ring-destructive/40"
                  >
                    <RiAlertLine
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0"
                    />
                    <span>
                      {error.message ||
                        "Asistan şu an cevap veremiyor. Lütfen biraz sonra tekrar deneyin."}
                    </span>
                  </Squircle>
                )
              })()}
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

/** "börek yufkası" → "Börek yufkası" (Türkçe i/İ kuralına uyar). */
function capitalizeTr(s: string): string {
  return s ? s[0].toLocaleUpperCase("tr-TR") + s.slice(1) : s
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
      <Squircle
        key={key}
        role="alert"
        radius="xl"
        className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive inset-ring inset-ring-destructive/40"
      >
        <RiAlertLine aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{part.errorText ?? "Bir hata oluştu, tekrar deneyebilir misin?"}</span>
      </Squircle>
    )
  }
  if (suppressLoader) {
    return null
  }
  return (
    <div key={key} className="py-0.5">
      <Marker role="status">
        <MarkerContent className="shimmer font-medium">{loadingLabel}</MarkerContent>
      </Marker>
    </div>
  )
}

type PartLike = UIMessage["parts"][number]

/**
 * Asistan mesajında text/reasoning kısımları tool & file kart(lar)ından ÖNCE
 * gelir: sunucu stream sırası genelde [tool, reasoning, text]; kullanıcı için
 * doğal okuma sırası ise önce kısa özet/açıklama, sonra detay/kart.
 *
 * Kartlarda asıl sonuç Sepet Özeti: eşleştirme part'ı (artık yalnızca
 * eşleştirilemeyen kalemleri gösteriyor) sunucuda önce gelse de özetin
 * hemen ALTINA taşınır. Eski sohbetler de aynı sırayla görünür.
 */
function orderAssistantParts(parts: PartLike[]): PartLike[] {
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
function matchImageFallback(parts: PartLike[]): ProductImageFallback | undefined {
  const lookup = parts.find(
    (p) =>
      p.type === "tool-lookupProducts" &&
      (p as { state?: string }).state === "output-available",
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

function StoppedMarker() {
  return (
    <Marker role="status">
      <MarkerIcon>
        <RiStopCircleLine />
      </MarkerIcon>
      <MarkerContent>Yanıtı durdurdun.</MarkerContent>
    </Marker>
  )
}

// Kota dolduğunda sunucu 402 + JSON gövdesiyle yanıtlar. AI SDK transport'u
// ok olmayan yanıtta gövdeyi `Error.message`'a koyar (new Error(response.text()))
// → burada parse edip dostça bir Pro kartı gösteririz.
function parseQuotaError(
  error: Error,
): { metric: string; resetAt: string | null } | null {
  try {
    const data = JSON.parse(error.message) as {
      error?: string
      metric?: string
      resetAt?: string
    }
    if (data?.error === "quota_exceeded") {
      return { metric: data.metric ?? "", resetAt: data.resetAt ?? null }
    }
  } catch {
    // gövde JSON değil → kota hatası değil
  }
  return null
}

function QuotaExceededCard({
  metric,
  resetAt,
}: {
  metric: string
  resetAt: string | null
}) {
  const metricLabel =
    metric === "imageAnalyses" ? "görsel analizi" : "metin mesajı"
  const resetLabel = resetAt
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
      }).format(new Date(resetAt))
    : null
  return (
    <Card className="mx-auto w-full max-w-3xl p-4">
      <div className="flex items-start gap-3">
        <RiSparklingLine className="mt-0.5 size-5 shrink-0 text-foreground" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            Bu ayki {metricLabel} hakkın doldu
          </span>
          <span className="text-sm text-muted-foreground">
            {resetLabel
              ? `Kotan ${resetLabel} tarihinde yenilenecek.`
              : "Kotan gelecek ay yenilenecek."}{" "}
            Daha fazlasına ihtiyacın varsa Pro yakında.
          </span>
        </div>
      </div>
    </Card>
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
        <RiArrowDownSLine
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
