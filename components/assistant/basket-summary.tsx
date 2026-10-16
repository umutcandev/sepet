"use client"

import * as React from "react"

import { toast } from "@/components/ui/sonner"
import {
  OptimizationCard,
  type EditAllocation,
  type ProductImageFallback,
} from "./optimization-card"
import {
  BasketSaveFooter,
  type BasketContextPayload,
} from "./basket-save-footer"
import {
  ProductPickerDialog,
  type ProductPickerTarget,
} from "./product-picker-dialog"
import { updateBasketItemSelection } from "@/lib/actions/basket-selection"
import type { SelectionUpdate } from "@/lib/assistant/selection-update"

const ERROR_TEXT: Record<string, string> = {
  no_products:
    "Seçtiğin ürünlerin hiçbiri için şu an market fiyatı yok. Başka bir ürün seçebilirsin.",
  rate_limited: "Çok hızlı denedin. Biraz bekleyip tekrar dener misin?",
  not_found: "Bu Sepet Özeti artık değiştirilemiyor.",
}

/**
 * Sepet onayı turunun sonucu: Sepet Özeti, altında Kaydet ve döküm
 * satırlarından açılan ürün değiştirme ekranı. Üçü de aynı veriden
 * (tool-basketContext) beslenir; ürün değiştirilince özet, kaydedilecek veri
 * ve (kaydedildiyse) kayıt birlikte güncellenir.
 */
export function BasketSummary({
  data,
  toolCallId,
  conversationId,
  initialSavedId,
  editable,
  imageFallback,
  onUpdated,
}: {
  data: BasketContextPayload
  toolCallId: string | null
  conversationId: string | null
  initialSavedId: string | null
  /** Yalnızca sohbetin son kartında ve asistan meşgul değilken. */
  editable: boolean
  imageFallback?: ProductImageFallback
  onUpdated: (toolCallId: string, update: SelectionUpdate) => void
}) {
  const [savedId, setSavedId] = React.useState(initialSavedId)
  const [target, setTarget] = React.useState<ProductPickerTarget | null>(null)

  const canEdit = editable && !!toolCallId && !!conversationId
  const onEditItem: EditAllocation | undefined = canEdit
    ? (entry) => {
        // Kalem sırası taşımayan eski dökümlerde ham adla bulunur.
        const index =
          entry.itemIndex ??
          data.matches.findIndex((m) => m.rawName === entry.rawName)
        if (index >= 0 && data.matches[index]) setTarget({ itemIndex: index })
      }
    : undefined

  async function apply(itemIndex: number, productIds: string[]) {
    if (!conversationId || !toolCallId) return false
    try {
      const res = await updateBasketItemSelection({
        conversationId,
        toolCallId,
        itemIndex,
        productIds,
      })
      if (!res.ok) {
        toast.error(
          ERROR_TEXT[res.error] ??
            "Sepet Özeti güncellenemedi. Lütfen tekrar dene."
        )
        return false
      }
      onUpdated(toolCallId, {
        matches: res.matches,
        summary: res.summary,
        text: res.text,
      })
      if (res.savedBasketFailed) {
        toast.warning(
          "Sepet Özeti güncellendi ama kayıtlı sepetin güncellenemedi."
        )
      } else {
        toast.success(
          res.savedBasketId
            ? "Sepet Özeti ve kayıtlı sepetin güncellendi."
            : "Sepet Özeti güncellendi."
        )
      }
      return true
    } catch (err) {
      console.error("[BasketSummary] selection update failed", err)
      toast.error("Sepet Özeti güncellenemedi. Lütfen tekrar dene.")
      return false
    }
  }

  return (
    <>
      <OptimizationCard
        summary={data.summary}
        imageFallback={imageFallback}
        onEditItem={onEditItem}
        footer={
          <BasketSaveFooter
            data={data}
            conversationId={conversationId}
            toolCallId={toolCallId}
            savedId={savedId}
            onSaved={setSavedId}
          />
        }
      />
      <ProductPickerDialog
        target={canEdit ? target : null}
        onClose={() => setTarget(null)}
        matches={data.matches}
        summary={data.summary}
        onApply={apply}
      />
    </>
  )
}
