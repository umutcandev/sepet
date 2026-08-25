"use client"

import { Squircle } from "@/components/ui/squircle"
import * as React from "react"

import { SaveRecordRow } from "@/components/assistant/save-record-row"
import { saveBasket } from "@/lib/actions/baskets"
import type {
  MatchResult,
  OptimizationSummary,
  ParsedItem,
} from "@/lib/ai/schemas"

export type BasketContextPayload = {
  items: Array<{
    rawName: string
    searchQuery: string
    quantity: number
    unit: ParsedItem["unit"]
  }>
  matches: MatchResult[]
  summary: OptimizationSummary
}

export function BasketSaveCard({
  data,
  conversationId = null,
  toolCallId = null,
  initialSavedId = null,
}: {
  data: BasketContextPayload
  conversationId?: string | null
  toolCallId?: string | null
  initialSavedId?: string | null
}) {
  const placeholder = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    return `Sepet · ${fmt.format(new Date())}`
  }, [])

  return (
    <Squircle className="border bg-card" radius="xl" effects>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-medium">Sepeti Kaydet</span>
      </div>
      <SaveRecordRow
        className="px-4 py-3"
        namePlaceholder={placeholder}
        nameLabel="Sepet adı"
        saveLabel="Sepeti Kaydet"
        viewHref={(id) => `/sepetlerim/${id}`}
        initialSavedId={initialSavedId}
        save={(name) =>
          saveBasket({
            name,
            items: data.items,
            matches: data.matches,
            summary: data.summary,
            conversationId,
            sourceToolCallId: toolCallId,
          })
        }
        limitMessage="Sepet kaydetme limitin doldu. Eski bir sepeti sil ya da Pro'ya geç."
        successMessage="Sepet kaydedildi."
        errorMessage="Sepet kaydedilemedi. Lütfen tekrar dene."
      />
    </Squircle>
  )
}
