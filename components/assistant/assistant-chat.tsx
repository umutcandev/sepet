"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Loader2Icon, SparklesIcon } from "lucide-react"

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
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Button } from "@/components/ui/button"
import type {
  BasketDraft,
  MatchResult,
  OptimizationSummary,
} from "@/lib/ai/schemas"
import { ParsedItemsCard } from "./parsed-items-card"
import { ProductMatchList } from "./product-match-list"
import { OptimizationCard } from "./optimization-card"

const SEED_KEY = "assistant:seed"

const SUGGESTIONS = [
  "2 ekmek, 1 lt süt, 500g beyaz peynir, 4 elma",
  "Haftalık market listemi hazırla",
  "Bu hafta kahvaltılık ürünler",
  "Temizlik malzemeleri",
]

export function AssistantChat() {
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant/chat" }),
  })
  const [input, setInput] = React.useState("")
  const sentSeedRef = React.useRef(false)

  React.useEffect(() => {
    if (sentSeedRef.current) return
    if (typeof window === "undefined") return
    const seed = window.sessionStorage.getItem(SEED_KEY)
    if (seed?.trim()) {
      sentSeedRef.current = true
      window.sessionStorage.removeItem(SEED_KEY)
      sendMessage({ text: seed })
    }
  }, [sendMessage])

  const isBusy = status === "submitted" || status === "streaming"

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim()
    if (!text || isBusy) return
    sendMessage({ text })
    setInput("")
  }

  const handleSuggestionClick = (text: string) => {
    if (isBusy) return
    sendMessage({ text })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
      <Conversation className="mx-auto w-full max-w-3xl">
        <ConversationContent className="px-0">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="text-muted-foreground">
                <SparklesIcon className="size-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium">
                  Asistana ne soracaksın?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Alışveriş listeni doğal dilde yaz, market kombinasyonunu sana
                  çıkarayım.
                </p>
              </div>
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
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {m.parts.map((part, i) => {
                    const key = `${m.id}-${i}`
                    switch (part.type) {
                      case "text":
                        return (
                          <MessageResponse key={key}>{part.text}</MessageResponse>
                        )
                      case "tool-parseShoppingList":
                        return renderToolPart(key, part, "Listeni okuyorum…", (out) => (
                          <ParsedItemsCard data={out as BasketDraft} />
                        ))
                      case "tool-lookupProducts":
                        return renderToolPart(
                          key,
                          part,
                          "Ürünleri aratıyorum…",
                          (out) => (
                            <ProductMatchList
                              matches={(out as { matches: MatchResult[] }).matches}
                            />
                          ),
                        )
                      case "tool-summarizeOptimization":
                        return renderToolPart(
                          key,
                          part,
                          "En ucuz market kombinasyonunu hesaplıyorum…",
                          (out) => (
                            <OptimizationCard summary={out as OptimizationSummary} />
                          ),
                        )
                      default:
                        return null
                    }
                  })}
                </MessageContent>
              </Message>
            ))
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

      <PromptInput
        onSubmit={handleSubmit}
        className="mx-auto mt-3 w-full max-w-3xl rounded-xl bg-sidebar"
      >
        <PromptInputBody>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Asistana yaz…"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools />
          <PromptInputSubmit
            status={status}
            onStop={stop}
            disabled={!input.trim() && !isBusy}
            className="ml-auto"
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
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
