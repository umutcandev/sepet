import type {
  BasketDraft,
  ImageAnalysis,
  MatchResult,
  OptimizationSummary,
  ReceiptComparison,
  ReceiptOCR,
  ReceiptOCRItem,
  Unit,
} from "@/lib/ai/schemas"
import { STOPPED_PART_TYPE } from "./turn-state"

// Paylaşılan sohbet kopyasının tipleri. Temizleyiciden (share-snapshot.ts)
// ayrı: paylaşılan sayfanın istemci bileşeni yalnız bunları kullanır, zod ve
// şemalar tarayıcı paketine girmez.

export const IMAGE_OMITTED_PART_TYPE = "data-image-omitted"

export type SharedApprovedItem = {
  rawName: string
  searchQuery: string
  quantity: number
  unit: Unit
  note: string | null
}

export type SharedPart =
  | { type: "text"; text: string }
  | { type: typeof IMAGE_OMITTED_PART_TYPE; data: Record<string, never> }
  | { type: typeof STOPPED_PART_TYPE; data: Record<string, never> }
  | SharedToolPart

export type SharedToolOutputs = {
  "tool-parseShoppingList": Pick<BasketDraft, "items">
  "tool-parseReceipt": {
    ocr: ReceiptOCR
    receiptImageUrl: ""
    receiptImageR2Key: null
  }
  "tool-analyzeImage": {
    analysis: ImageAnalysis
    receiptImageUrl: ""
    receiptImageR2Key: null
  }
  "tool-lookupProducts": { matches: MatchResult[] }
  "tool-summarizeOptimization": OptimizationSummary
  "tool-basketContext": {
    items: SharedApprovedItem[]
    matches: MatchResult[]
    summary: OptimizationSummary
  }
  "tool-receiptComparison": {
    comparison: ReceiptComparison
    receiptContext: {
      imageUrl: ""
      imageR2Key: null
      marketName: string | null
      purchaseDate: string | null
      totalAmount: number | null
      items: ReceiptOCRItem[]
    }
    summary: OptimizationSummary
    matches: MatchResult[]
  }
}

export type SharedToolType = keyof SharedToolOutputs

export type SharedToolPart =
  | {
      [K in SharedToolType]: {
        type: K
        state: "output-available"
        output: SharedToolOutputs[K]
      }
    }[SharedToolType]
  | { type: SharedToolType; state: "output-error"; errorText: string }

export type SharedMessageMetadata =
  | { kind: "basketApproval"; payload?: { items: SharedApprovedItem[] } }
  | { kind: "receiptApproval" }

export type SharedMessage = {
  id: string
  role: "user" | "assistant"
  /** Asistan mesajında boş olabilir: bkz. sanitizeMessagesForShare. */
  parts: SharedPart[]
  metadata?: SharedMessageMetadata
}
