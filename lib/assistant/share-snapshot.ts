import { z } from "zod"

import {
  FoodIngredientsSchema,
  ImageAnalysisSchema,
  MatchResultSchema,
  OptimizationSummarySchema,
  ParsedItemSchema,
  ReceiptComparisonSchema,
  ReceiptOCRItemSchema,
  ReceiptOCRSchema,
  ReceiptStalenessSchema,
  UNIT_VALUES,
  type ImageAnalysis,
  type MatchResult,
  type OptimizationSummary,
  type ReceiptOCR,
} from "@/lib/ai/schemas"
import {
  IMAGE_OMITTED_PART_TYPE,
  type SharedMessage,
  type SharedMessageMetadata,
  type SharedPart,
  type SharedToolOutputs,
  type SharedToolType,
} from "./share-types"
import { STOPPED_PART_TYPE } from "./turn-state"

/**
 * Paylaşılan sohbetin anlık görüntüsü: kayıtlı mesajların herkese açık bir
 * sayfada gösterilebilecek, TEMİZLENMİŞ kopyası.
 *
 * Kural izin listesidir: yalnızca sohbet ekranında çizilen part türleri ve
 * onların çizim için gereken alanları kopyaya girer; tanınmayan her şey düşer.
 * Böylece mesajlara ileride eklenecek bir alan kendiliğinden herkese açık hâle
 * gelmez.
 *
 * Bilinçli olarak dışarıda kalanlar:
 *  - Yüklenen görseller (fiş/yemek fotoğrafı). R2 adresi kullanıcı kimliğini
 *    taşır (`receipts/{userId}/…`), görselin kendisi de ad, adres ya da kart
 *    numarası içerebilir. Yerine "görsel paylaşılmadı" işareti konur.
 *  - Modelin düşünme metni ("Düşündüm"). Görsel turunda model fişte okuduğu
 *    her şeyi (mağaza adresi, kart numarasının son haneleri, kasiyer adı)
 *    burada özetleyebiliyor; görseli saklayıp metnini yayımlamak anlamsız olurdu.
 *  - Şube adları (`depotName`). Fiyatların alındığı şubeler kullanıcının
 *    konumuna en yakın şubelerdir; adları oturduğu semti ele verir.
 *  - Tool girdileri, mesaj id'leri, ürün değiştirme durumu (`selection`), iç
 *    hata metinleri (`errorMessage`) ve istemciden gelen ham metadata.
 *    Kullanıcı mesajının part'ları ve metadata'sı istemcinin gönderdiği
 *    haliyle kaydedilir; buradan yalnızca doğrulanmış onay listesi geçer.
 *
 * Fonksiyon saf ve idempotent: hem paylaşım anında hem okurken uygulanır.
 * Okurken uygulanması, buradaki kural sıkılaştırılırsa eski kopyaların da
 * kendiliğinden düzelmesini sağlar. Bedeli: buradaki şemalara default'suz bir
 * alan eklenirse eski kopyalardaki kartlar düşer; bkz. testteki sabit kopya.
 */

/** Tek bir metin part'ının tavanı. Sohbetteki gerçek mesajlar bunun çok altında. */
export const SHARED_TEXT_MAX = 20_000
/** Kopyaya giren azami mesaj sayısı; fazlası paylaşımı reddeder (bkz. lib/data). */
export const SHARED_MESSAGES_MAX = 400
const ERROR_TEXT_MAX = 500
const TITLE_MAX = 100
const NAME_MAX = 200
const APPROVED_ITEMS_MAX = 100

export { IMAGE_OMITTED_PART_TYPE }
export type { SharedMessage, SharedPart } from "./share-types"

type ToolOutputs = SharedToolOutputs

// ─── Şemalar ───
//
// Mevcut şemalar kullanılır; zod nesneleri tanımadığı anahtarları atar, bu da
// izin listesini alan düzeyine indirir. Eski kayıtlarda bulunmayabilecek
// alanlar default'la tamamlanır (bkz. MatchResultSchema'daki notlar).

const finite = z.number().refine(Number.isFinite)

const ApprovedItemSchema = z.object({
  rawName: z.string().max(NAME_MAX),
  searchQuery: z.string().max(NAME_MAX),
  quantity: finite.refine((n) => n >= 0),
  unit: z.enum(UNIT_VALUES),
  note: z
    .string()
    .max(NAME_MAX)
    .nullish()
    .transform((v) => v ?? null),
})

const ApprovalMetadataSchema = z.object({
  kind: z.literal("basketApproval"),
  payload: z.object({
    items: z.array(ApprovedItemSchema).max(APPROVED_ITEMS_MAX),
  }),
})

const ReceiptContextItemSchema = ReceiptOCRItemSchema.extend({
  unitPrice: z.number().nullable().default(null),
  totalPrice: z.number().nullable().default(null),
})

const LenientImageAnalysisSchema = ImageAnalysisSchema.extend({
  receipt: ReceiptOCRSchema.nullable().default(null),
  food: FoodIngredientsSchema.nullable().default(null),
  unknownReason: z.string().nullable().default(null),
})

const LenientComparisonSchema = ReceiptComparisonSchema.extend({
  staleness: ReceiptStalenessSchema.nullable().default(null),
})

const TOOL_OUTPUT_SCHEMAS = {
  "tool-parseShoppingList": z.object({ items: z.array(ParsedItemSchema) }),
  "tool-parseReceipt": z.object({ ocr: ReceiptOCRSchema }),
  "tool-analyzeImage": z.object({ analysis: LenientImageAnalysisSchema }),
  "tool-lookupProducts": z.object({ matches: z.array(MatchResultSchema) }),
  "tool-summarizeOptimization": OptimizationSummarySchema,
  "tool-basketContext": z.object({
    items: z.array(ApprovedItemSchema),
    matches: z.array(MatchResultSchema),
    summary: OptimizationSummarySchema,
  }),
  "tool-receiptComparison": z.object({
    comparison: LenientComparisonSchema,
    receiptContext: z.object({
      marketName: z.string().nullable().default(null),
      purchaseDate: z.string().nullable().default(null),
      totalAmount: z.number().nullable().default(null),
      items: z.array(ReceiptContextItemSchema),
    }),
    summary: OptimizationSummarySchema,
    matches: z.array(MatchResultSchema),
  }),
} as const

function isSharedToolType(type: string): type is SharedToolType {
  return Object.prototype.hasOwnProperty.call(TOOL_OUTPUT_SCHEMAS, type)
}

// ─── Konum izi bırakan alanlar ───

function stripSummary(summary: OptimizationSummary): OptimizationSummary {
  return {
    ...summary,
    singleMarket: {
      ...summary.singleMarket,
      allocation: summary.singleMarket.allocation.map((a) => ({
        ...a,
        depotName: null,
      })),
    },
    twoMarketCombo: {
      ...summary.twoMarketCombo,
      allocation: summary.twoMarketCombo.allocation.map((a) => ({
        ...a,
        depotName: null,
      })),
    },
  }
}

function stripMatch(match: MatchResult): MatchResult {
  // `selection` kasıtlı olarak düşer: ürün değiştirme ekranının aday havuzu
  // ve kullanıcının elle seçtikleri, salt okunur sayfada kullanılmıyor.
  const { selection: _selection, ...rest } = match
  return {
    ...rest,
    // Ham servis hatası ("marketfiyati … 403"); arayüz göstermiyor, sayfanın
    // verisine de girmesin. Eşleşmeme sebebi `lookupStatus`ta.
    errorMessage: null,
    marketPrices: match.marketPrices.map((p) => ({ ...p, depotName: null })),
    marketOptions: match.marketOptions.map((o) => ({ ...o, depotName: null })),
  }
}

function sanitizeToolOutput(
  type: SharedToolType,
  output: unknown
): ToolOutputs[SharedToolType] | null {
  const parsed = TOOL_OUTPUT_SCHEMAS[type].safeParse(output)
  if (!parsed.success) return null
  switch (type) {
    case "tool-parseShoppingList": {
      const data = parsed.data as ToolOutputs["tool-parseShoppingList"]
      return { items: data.items }
    }
    case "tool-parseReceipt": {
      const data = parsed.data as { ocr: ReceiptOCR }
      return { ocr: data.ocr, receiptImageUrl: "", receiptImageR2Key: null }
    }
    case "tool-analyzeImage": {
      const data = parsed.data as { analysis: ImageAnalysis }
      return {
        analysis: data.analysis,
        receiptImageUrl: "",
        receiptImageR2Key: null,
      }
    }
    case "tool-lookupProducts": {
      const data = parsed.data as ToolOutputs["tool-lookupProducts"]
      return { matches: data.matches.map(stripMatch) }
    }
    case "tool-summarizeOptimization":
      return stripSummary(parsed.data as OptimizationSummary)
    case "tool-basketContext": {
      const data = parsed.data as ToolOutputs["tool-basketContext"]
      return {
        items: data.items,
        matches: data.matches.map(stripMatch),
        summary: stripSummary(data.summary),
      }
    }
    case "tool-receiptComparison": {
      const data = parsed.data as Omit<
        ToolOutputs["tool-receiptComparison"],
        "receiptContext"
      > & {
        receiptContext: Omit<
          ToolOutputs["tool-receiptComparison"]["receiptContext"],
          "imageUrl" | "imageR2Key"
        >
      }
      return {
        comparison: data.comparison,
        receiptContext: {
          imageUrl: "",
          imageR2Key: null,
          marketName: data.receiptContext.marketName,
          purchaseDate: data.receiptContext.purchaseDate,
          totalAmount: data.receiptContext.totalAmount,
          items: data.receiptContext.items,
        },
        summary: stripSummary(data.summary),
        matches: data.matches.map(stripMatch),
      }
    }
  }
}

// ─── Part'lar ───

type RawPart = {
  type?: unknown
  text?: unknown
  state?: unknown
  output?: unknown
  errorText?: unknown
  mediaType?: unknown
}

function asText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.length > max ? value.slice(0, max) + "…" : value
  return text.trim() ? text : null
}

const EMPTY_DATA: Record<string, never> = {}

function sanitizeUserPart(part: RawPart): SharedPart | null {
  if (part.type === "text") {
    const text = asText(part.text, SHARED_TEXT_MAX)
    return text ? { type: "text", text } : null
  }
  if (part.type === "file") {
    // Görselin yerini tutar; adresi, adı ve R2 anahtarı (filename) düşer.
    return typeof part.mediaType === "string" &&
      part.mediaType.startsWith("image/")
      ? { type: IMAGE_OMITTED_PART_TYPE, data: EMPTY_DATA }
      : null
  }
  // Okurken tekrar temizlenen kopyada işaret yerinde kalır.
  if (part.type === IMAGE_OMITTED_PART_TYPE) {
    return { type: IMAGE_OMITTED_PART_TYPE, data: EMPTY_DATA }
  }
  return null
}

function sanitizeAssistantPart(part: RawPart): SharedPart | null {
  const type = typeof part.type === "string" ? part.type : ""
  if (type === "text") {
    const text = asText(part.text, SHARED_TEXT_MAX)
    return text ? { type: "text", text } : null
  }
  if (type === STOPPED_PART_TYPE) {
    return { type: STOPPED_PART_TYPE, data: EMPTY_DATA }
  }
  if (!isSharedToolType(type)) return null
  if (part.state === "output-error") {
    return {
      type,
      state: "output-error",
      errorText:
        asText(part.errorText, ERROR_TEXT_MAX) ??
        "Bir hata oluştu, tekrar deneyebilir misin?",
    }
  }
  // Çıktısı gelmemiş çağrı (durdurulan / yarıda kalan tur) salt okunur
  // sayfada sonsuz bir "yükleniyor" olurdu.
  if (part.state !== "output-available") return null
  const output = sanitizeToolOutput(type, part.output)
  return output
    ? ({ type, state: "output-available", output } as SharedPart)
    : null
}

function sanitizeMetadata(
  role: "user" | "assistant",
  metadata: unknown
): SharedMessageMetadata | undefined {
  if (role !== "user" || !metadata || typeof metadata !== "object") {
    return undefined
  }
  const kind = (metadata as { kind?: unknown }).kind
  if (kind === "receiptApproval") return { kind }
  if (kind !== "basketApproval") return undefined
  const parsed = ApprovalMetadataSchema.safeParse(metadata)
  // Liste geçersizse yalnızca türü kalır: kart yine "Onaylandı" olarak
  // kilitlenir, kalemler taslaktan gösterilir.
  return parsed.success
    ? { kind, payload: { items: parsed.data.payload.items } }
    : { kind }
}

export type StoredMessageLike = {
  role: unknown
  parts: unknown
  metadata?: unknown
}

export function sanitizeMessagesForShare(
  rows: readonly StoredMessageLike[]
): SharedMessage[] {
  const out: SharedMessage[] = []
  for (const row of rows) {
    if (row.role !== "user" && row.role !== "assistant") continue
    const role = row.role
    const rawParts = Array.isArray(row.parts) ? (row.parts as RawPart[]) : []
    const parts: SharedPart[] = []
    for (const raw of rawParts) {
      if (!raw || typeof raw !== "object") continue
      const part =
        role === "user" ? sanitizeUserPart(raw) : sanitizeAssistantPart(raw)
      if (part) parts.push(part)
    }
    // Boş kalan kullanıcı mesajı düşer. Asistan mesajı boş da olsa yerini
    // korur: sohbette o tur cevaplanmış görünüyorsa (onay kartı kilitli,
    // "Onaylandı") paylaşılan sayfada da öyle görünsün (bkz. resolveApprovalCard).
    if (parts.length === 0 && role === "user") continue
    const metadata = sanitizeMetadata(role, row.metadata)
    out.push({
      // Kayıttaki uuid değil: sayfada yalnızca React anahtarı olarak lazım.
      id: `m${out.length}`,
      role,
      parts,
      ...(metadata ? { metadata } : {}),
    })
  }
  return out
}

export function sanitizeShareTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ").slice(0, TITLE_MAX)
  return trimmed || "Paylaşılan sohbet"
}
