import { z } from "zod"

import {
  OptimizationSummarySchema,
  UNIT_VALUES,
  type OptimizationSummary,
} from "@/lib/ai/schemas"
import { clipText, stripSummary } from "@/lib/assistant/share-snapshot"
import type {
  BasketRecordData,
  ReceiptRecordData,
  RecordShareKind,
} from "./record-data"

// Paylaşılan sepet/fiş kopyası: sohbet kopyası gibi izin listesi, idempotent,
// hem paylaşırken hem okurken uygulanır. Şube adları ve ürün CDN'i dışındaki
// görsel adresleri düşer (kayıt verisi istemciden gelir; yabancı adres sayfayı
// açanın IP'sini sızdırırdı).

const PRODUCT_IMAGE_PREFIX = "https://cdn.marketfiyati.org.tr/"
const NAME_MAX = 200
const SHORT_MAX = 100
const ITEMS_MAX = 200
const IMAGES_MAX = 400
export const RECORD_SNAPSHOT_MAX_BYTES = 500_000

function productImage(url: string | null | undefined): string | null {
  return typeof url === "string" && url.startsWith(PRODUCT_IMAGE_PREFIX)
    ? url
    : null
}

function stripRecordSummary(summary: OptimizationSummary): OptimizationSummary {
  const stripped = stripSummary(summary)
  const images = (a: OptimizationSummary["singleMarket"]["allocation"]) =>
    a.map((x) => ({ ...x, imageUrl: productImage(x.imageUrl) }))
  return {
    ...stripped,
    singleMarket: {
      ...stripped.singleMarket,
      allocation: images(stripped.singleMarket.allocation),
    },
    twoMarketCombo: {
      ...stripped.twoMarketCombo,
      allocation: images(stripped.twoMarketCombo.allocation),
    },
  }
}

const clip = (max: number) => z.string().transform((s) => clipText(s, max))
const finite = z.number().refine(Number.isFinite)
const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)))

// Özet ya da görsel haritası okunamazsa yalnız ilgili kart düşer, sayfa kalır.
const ItemImagesSchema = z
  .record(z.string(), z.string())
  .transform((map) =>
    Object.fromEntries(
      Object.entries(map)
        .filter(([id, url]) => id.length <= SHORT_MAX && productImage(url))
        .slice(0, IMAGES_MAX)
    )
  )
  .catch({})

const SummarySchema = OptimizationSummarySchema.nullable()
  .transform((s) => (s ? stripRecordSummary(s) : null))
  .catch(null)

const BasketSchema = z.object({
  createdAt: isoDate,
  items: z
    .array(
      z.object({
        rawName: clip(NAME_MAX),
        searchQuery: clip(NAME_MAX),
        quantity: finite,
        unit: z.enum(UNIT_VALUES),
        matched: z.boolean(),
      })
    )
    .max(ITEMS_MAX),
  twoMarketSavings: finite,
  summary: SummarySchema,
  itemImages: ItemImagesSchema,
})

const ReceiptSchema = z.object({
  createdAt: isoDate,
  marketName: clip(SHORT_MAX).nullable(),
  purchaseDate: isoDate.nullable(),
  totalAmount: finite.nullable(),
  bestSingleMarket: clip(SHORT_MAX).nullable(),
  bestSingleTotal: finite.nullable(),
  potentialSavings: finite.nullable(),
  items: z
    .array(
      z.object({
        rawName: clip(NAME_MAX),
        quantity: finite,
        unit: clip(20),
        searchQuery: clip(NAME_MAX).nullable(),
        matchedName: clip(NAME_MAX).nullable(),
        matchedBrand: clip(NAME_MAX).nullable(),
        matchedImageUrl: z.string().nullable().transform(productImage),
        matchedProductId: z.string().max(SHORT_MAX).nullable(),
        matched: z.boolean(),
        bestMarket: clip(SHORT_MAX).nullable(),
        bestPrice: finite.nullable(),
        receiptUnitPrice: finite.nullable(),
        savings: finite.nullable(),
      })
    )
    .max(ITEMS_MAX),
  summary: SummarySchema,
  itemImages: ItemImagesSchema,
})

export function sanitizeSharedBasket(value: unknown): BasketRecordData | null {
  const parsed = BasketSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function sanitizeSharedReceipt(value: unknown): ReceiptRecordData | null {
  const parsed = ReceiptSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function sanitizeSharedRecord(
  kind: RecordShareKind,
  value: unknown
): BasketRecordData | ReceiptRecordData | null {
  return kind === "basket"
    ? sanitizeSharedBasket(value)
    : sanitizeSharedReceipt(value)
}

export { publicRecordTitle } from "./public-title"
