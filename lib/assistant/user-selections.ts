import { z } from "zod"
import { UNIT_VALUES } from "@/lib/ai/schemas"
import { selectionKey, type CarriedSelection } from "@/lib/ai/match-result"

/**
 * Kullanıcının bu sohbette Sepet Özeti'nden seçtiği ürünler, kalem anahtarına
 * göre (bkz. selectionKey).
 *
 * Neden: kullanıcı konserve kuru fasulyeyi elle düzeltip ardından "bir de ayran
 * ekle" dediğinde yeni sepet baştan eşleştiriliyor ve aynı konserve geri
 * geliyordu. Açık seçimi bir sonraki turda da geçerli kılmak için önceki
 * turların Sepet Özeti verisinden okunur.
 *
 * Veri istemcinin gönderdiği sohbetten gelir. Yalnızca kullanıcının kendi
 * sepetini etkiler, yine de alanlar tek tek doğrulanır ve id listeleri
 * sınırlanır: id'ler sunucuda ürün aramasına dönüşebiliyor.
 */

const productId = z.string().regex(/^[A-Za-z0-9_-]{1,32}$/)

const carriedMatchSchema = z.object({
  searchQuery: z.string().max(200),
  note: z.string().max(300).nullish(),
  quantity: z.number().refine(Number.isFinite),
  unit: z.enum(UNIT_VALUES),
  bestMatch: z.object({ productId: z.string() }).nullable().optional(),
  selection: z
    .object({
      poolQuery: z.string().max(200),
      aiAcceptedProductIds: z.array(productId).max(200),
      aiSizeMismatch: z.boolean(),
      userAcceptedProductIds: z.array(productId).max(80).nullable(),
    })
    .nullable()
    .optional(),
})

type PartLike = { type: string; state?: unknown; output?: unknown }
type MessageLike = { role: string; parts?: readonly PartLike[] }

export function collectUserSelections(
  messages: readonly MessageLike[]
): Map<string, CarriedSelection> {
  const out = new Map<string, CarriedSelection>()
  for (const m of messages) {
    if (m.role !== "assistant") continue
    for (const part of m.parts ?? []) {
      if (
        part.type !== "tool-basketContext" ||
        part.state !== "output-available"
      )
        continue
      const matches = (part.output as { matches?: unknown } | null)?.matches
      if (!Array.isArray(matches)) continue
      for (const raw of matches) {
        const parsed = carriedMatchSchema.safeParse(raw)
        if (!parsed.success || !parsed.data.selection) continue
        const { searchQuery, note, quantity, unit, bestMatch, selection } =
          parsed.data
        const key = selectionKey(searchQuery, note)
        const user = selection.userAcceptedProductIds
        // Sonraki tur önceki turu geçersiz kılar: aynı kalemi asistan seçtiyse
        // (taşınan id'ler artık bulunamadı) eski seçim bayattır.
        if (!user || user.length === 0) {
          out.delete(key)
          continue
        }
        out.set(key, {
          state: { ...selection, userAcceptedProductIds: user },
          primaryProductId: bestMatch?.productId ?? null,
          quantity,
          unit,
        })
      }
    }
  }
  return out
}
