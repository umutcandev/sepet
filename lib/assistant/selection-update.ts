import type { MatchResult, OptimizationSummary } from "@/lib/ai/schemas"

/**
 * Sepet Özeti'nden ürün değiştirildiğinde aynı asistan mesajında güncellenen
 * her şey. Sunucu kayıtlı mesajı, istemci ekrandaki mesajı bu fonksiyonla
 * günceller; iki tarafın farklı part'a dokunup sayfa yenilenince başka bir
 * kart göstermesi böylece imkânsız.
 *
 * Bir sepet onayı turunun part'ları: tool-lookupProducts (eşleşmeler),
 * tool-summarizeOptimization (Sepet Özeti), tool-basketContext (kayıt
 * bağlamı) ve özet cümlesi (text). Cümle de güncellenir: "En ucuz tek market
 * A101: 131,65 TL" diyen metin, değişen kartla çelişirdi.
 */
export type SelectionUpdate = {
  matches: MatchResult[]
  summary: OptimizationSummary
  text: string
}

type PartLike = {
  type: string
  toolCallId?: string
  state?: string
  input?: unknown
  output?: unknown
  text?: string
}

/** Mesajda bu tool çağrısına ait tamamlanmış bir basketContext var mı. */
export function hasBasketContext(
  parts: readonly PartLike[],
  toolCallId: string
): boolean {
  return parts.some(
    (p) =>
      p.type === "tool-basketContext" &&
      p.toolCallId === toolCallId &&
      p.state === "output-available"
  )
}

/**
 * `parts`in güncellenmiş bir kopyasını döner; mesaj bu basketContext'i
 * taşımıyorsa `null`. Diğer part'lar (reasoning, dosya vb.) olduğu gibi kalır.
 */
export function applySelectionToParts<P extends PartLike>(
  parts: readonly P[],
  toolCallId: string,
  update: SelectionUpdate
): P[] | null {
  if (!hasBasketContext(parts, toolCallId)) return null
  // Turun özet cümlesi mesajın son metin part'ıdır (bkz. route.ts
  // basketApproval kolu: kartlardan sonra tek bir emitText).
  let lastText = -1
  parts.forEach((p, i) => {
    if (p.type === "text") lastText = i
  })

  return parts.map((p, i) => {
    if (p.state === "output-available") {
      switch (p.type) {
        case "tool-basketContext":
          if (p.toolCallId !== toolCallId) return p
          return {
            ...p,
            output: {
              ...(p.output as object),
              matches: update.matches,
              summary: update.summary,
            },
          }
        case "tool-lookupProducts":
          return {
            ...p,
            output: { ...(p.output as object), matches: update.matches },
          }
        case "tool-summarizeOptimization":
          return {
            ...p,
            input: { matches: update.matches },
            output: update.summary,
          }
      }
    }
    if (i === lastText) return { ...p, text: update.text }
    return p
  })
}
