import { NextResponse } from "next/server"
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai"
import { nanoid } from "nanoid"
import { auth } from "@/auth"
import {
  parseShoppingList,
  parseReceiptImage,
  lookupProducts,
} from "@/lib/ai/tools"
import { computeOptimization } from "@/lib/ai/optimize"
import type {
  MatchResult,
  OptimizationSummary,
  ParsedItem,
  ReceiptOCR,
  ReceiptComparison,
} from "@/lib/ai/schemas"

export const runtime = "nodejs"
export const maxDuration = 60

const FALLBACK_TEXT =
  'Sana yardım edebilmem için alışveriş listeni yazar mısın? Örnek: "2 ekmek, 1 lt süt, 500g beyaz peynir".'

type LastUserMode =
  | { kind: "receiptApproval"; payload: ReceiptApprovalPayload }
  | { kind: "receiptImage"; imageUrl: string; imageR2Key?: string; text: string }
  | { kind: "text"; text: string }
  | { kind: "empty" }

type ReceiptApprovalPayload = {
  receiptImageUrl: string
  receiptImageR2Key: string
  marketName: string | null
  purchaseDate: string | null
  totalAmount: number | null
  items: Array<{
    rawName: string
    searchQuery: string
    quantity: number
    unit: ParsedItem["unit"]
    unitPrice: number | null
    totalPrice: number | null
  }>
}

function detectLastUserMode(messages: UIMessage[]): LastUserMode {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== "user") continue

    const meta = (m as { metadata?: unknown }).metadata as
      | { kind?: string; payload?: ReceiptApprovalPayload }
      | undefined
    if (meta?.kind === "receiptApproval" && meta.payload) {
      return { kind: "receiptApproval", payload: meta.payload }
    }

    const parts = m.parts ?? []
    let imageUrl: string | null = null
    let imageR2Key: string | undefined
    let textBuf = ""

    for (const p of parts) {
      if (
        p.type === "file" &&
        typeof (p as { mediaType?: unknown }).mediaType === "string" &&
        (p as { mediaType: string }).mediaType.startsWith("image/")
      ) {
        const url = (p as { url?: unknown }).url
        if (typeof url === "string") imageUrl = url
        // Client passes the R2 object key via `filename` field.
        const fn = (p as { filename?: unknown }).filename
        if (typeof fn === "string" && fn.startsWith("receipts/")) {
          imageR2Key = fn
        }
      } else if (
        p.type === "text" &&
        typeof (p as { text?: unknown }).text === "string"
      ) {
        textBuf += " " + (p as { text: string }).text
      }
    }

    if (imageUrl) {
      return {
        kind: "receiptImage",
        imageUrl,
        imageR2Key,
        text: textBuf.trim(),
      }
    }
    const text = textBuf.trim()
    if (text) return { kind: "text", text }
    return { kind: "empty" }
  }
  return { kind: "empty" }
}

function formatTL(n: number) {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildSummaryText(
  summary: OptimizationSummary,
  matches: MatchResult[],
): string {
  const matchedCount = summary.totalItems
  const missing = matches
    .filter((m) => m.lookupStatus !== "ok" || !m.bestMatch)
    .map((m) => m.rawName)
  const missingPart = missing.length
    ? ` Eşleştiremediklerim: ${missing.join(", ")}.`
    : ""

  if (matchedCount === 0) {
    return `Listendeki hiçbir kalemi şu an eşleştiremedim.${missingPart}`
  }

  const single = summary.singleMarket
  const combo = summary.twoMarketCombo
  const hasFullCombo = combo.markets.length === 2

  if (single.isFullCoverage) {
    const head = `${matchedCount} kalemli sepetini hazırladım. ${single.market} marketinden almak en ucuz çıkıyor (${formatTL(single.total)} TL).`
    const comboPart =
      hasFullCombo && combo.savingsTL > 0
        ? ` İki market kombinasyonu denenirse (${combo.markets.join(" + ")}) ${formatTL(combo.savingsTL)} TL tasarruf edersin (%${combo.savingsPct.toFixed(1)}).`
        : ""
    return head + comboPart + missingPart
  }

  if (hasFullCombo) {
    const head = `${matchedCount} kalemli sepetini hazırladım. Tek bir markette tüm sepetini bulamadım, ama iki market kombinasyonuyla (${combo.markets.join(" + ")}) tamamı ${formatTL(combo.total)} TL'ye geliyor.`
    return head + missingPart
  }

  const head = `${matchedCount} kalemli sepetini hazırladım. Tek bir markette tüm sepetini bulamadım — en iyi durumda ${single.market}'ten ${single.itemCount}/${matchedCount} kalem ${formatTL(single.total)} TL'ye alınıyor.`
  return head + missingPart
}

function buildReceiptComparisonText(comp: ReceiptComparison): string {
  if (comp.items.length === 0) {
    return "Fişindeki kalemleri çıkardım ama eşleşen ürün bulamadım."
  }
  if (comp.totalSavingsTL <= 0) {
    return `Fişindeki ${formatTL(comp.totalReceiptAmount)} TL'lik harcamana karşılık bulduğumuz en iyi fiyatlar zaten yakın — ek bir kazanç çıkmadı.`
  }
  return `Bu fişinde ${formatTL(comp.totalReceiptAmount)} TL harcamışsın. Bulduğumuz en iyi fiyatlarla aynı sepet ${formatTL(comp.totalBestAmount)} TL'ye geliyordu — yaklaşık ${formatTL(comp.totalSavingsTL)} TL tasarruf mümkündü.`
}

function computeReceiptComparison(
  payloadItems: ReceiptApprovalPayload["items"],
  matches: MatchResult[],
): ReceiptComparison {
  const items = payloadItems.map((it, idx) => {
    const match = matches[idx]
    const best = match?.bestMatch ?? null
    const minPrice = best?.minPrice ?? null
    const marketWithMin = best
      ? match.marketPrices.find((mp) => mp.price === minPrice) ?? null
      : null
    const bestMarket = marketWithMin?.market ?? null
    const bestPrice = minPrice ?? null
    // Fişteki toplam tutarla en iyi (birim fiyat * quantity) karşılaştır
    const receiptTotal =
      it.totalPrice ??
      (it.unitPrice != null ? it.unitPrice * it.quantity : null)
    const bestTotal = bestPrice != null ? bestPrice * it.quantity : null
    const savingsTL =
      receiptTotal != null && bestTotal != null
        ? Math.max(0, receiptTotal - bestTotal)
        : null
    return {
      rawName: it.rawName,
      receiptUnitPrice: it.unitPrice,
      receiptTotalPrice: receiptTotal,
      matchedBarcode: best?.barcode ?? null,
      matchedName: best?.name ?? null,
      bestMarket,
      bestPrice,
      savingsTL,
    }
  })

  const totalReceiptAmount = items.reduce(
    (sum, i) => sum + (i.receiptTotalPrice ?? 0),
    0,
  )
  const totalBestAmount = items.reduce(
    (sum, i, idx) =>
      sum +
      (i.bestPrice != null ? i.bestPrice * payloadItems[idx].quantity : 0),
    0,
  )
  const totalSavingsTL = items.reduce(
    (sum, i) => sum + (i.savingsTL ?? 0),
    0,
  )

  return { items, totalReceiptAmount, totalBestAmount, totalSavingsTL }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let payload: { messages?: UIMessage[] }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const messages = payload.messages
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "no_messages" }, { status: 400 })
  }

  const mode = detectLastUserMode(messages)
  if (mode.kind === "empty") {
    return NextResponse.json({ error: "no_input" }, { status: 400 })
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" })

      if (mode.kind === "receiptImage") {
        const parseCallId = nanoid()
        writer.write({
          type: "tool-input-available",
          toolCallId: parseCallId,
          toolName: "parseReceipt",
          input: { imageUrl: mode.imageUrl },
        })

        let ocr: ReceiptOCR
        try {
          ocr = await parseReceiptImage(mode.imageUrl)
        } catch (err) {
          console.error("[assistant/chat] receipt OCR failed", err)
          writer.write({
            type: "tool-output-error",
            toolCallId: parseCallId,
            errorText:
              "Fişi okuyamadım. Daha net bir fotoğrafla tekrar deneyebilir misin?",
          })
          writer.write({ type: "finish" })
          return
        }

        writer.write({
          type: "tool-output-available",
          toolCallId: parseCallId,
          output: {
            ocr,
            receiptImageUrl: mode.imageUrl,
            receiptImageR2Key: mode.imageR2Key ?? null,
          },
        })

        emitText(
          writer,
          ocr.items.length === 0
            ? "Fişten ürün çıkartamadım. Lütfen tüm satırların net göründüğü bir kare çek."
            : "Fişindeki kalemleri çıkardım. Aşağıdan kontrol et ve düzeltmelerini yap — ardından karşılaştırma için onayla.",
        )
        writer.write({ type: "finish" })
        return
      }

      if (mode.kind === "receiptApproval") {
        const p = mode.payload
        const parsedItems: ParsedItem[] = p.items.map((it) => ({
          name: it.rawName,
          searchQuery: it.searchQuery,
          quantity: it.quantity,
          unit: it.unit,
        }))

        const lookupCallId = nanoid()
        writer.write({
          type: "tool-input-available",
          toolCallId: lookupCallId,
          toolName: "lookupProducts",
          input: { items: parsedItems },
        })

        const { matches } = await lookupProducts(parsedItems)

        writer.write({
          type: "tool-output-available",
          toolCallId: lookupCallId,
          output: { matches },
        })

        const summarizeCallId = nanoid()
        writer.write({
          type: "tool-input-available",
          toolCallId: summarizeCallId,
          toolName: "summarizeOptimization",
          input: { matches },
        })

        const summary = computeOptimization(matches)

        writer.write({
          type: "tool-output-available",
          toolCallId: summarizeCallId,
          output: summary,
        })

        const comparison = computeReceiptComparison(p.items, matches)
        const compareCallId = nanoid()
        writer.write({
          type: "tool-input-available",
          toolCallId: compareCallId,
          toolName: "receiptComparison",
          input: {},
        })
        writer.write({
          type: "tool-output-available",
          toolCallId: compareCallId,
          output: {
            comparison,
            receiptContext: {
              imageUrl: p.receiptImageUrl,
              imageR2Key: p.receiptImageR2Key,
              marketName: p.marketName,
              purchaseDate: p.purchaseDate,
              totalAmount: p.totalAmount,
              items: p.items,
            },
            summary,
            matches,
          },
        })

        emitText(writer, buildReceiptComparisonText(comparison))
        writer.write({ type: "finish" })
        return
      }

      // Text mode (existing)
      const rawText = mode.text
      const parseCallId = nanoid()
      writer.write({
        type: "tool-input-available",
        toolCallId: parseCallId,
        toolName: "parseShoppingList",
        input: { rawText },
      })

      let basket: Awaited<ReturnType<typeof parseShoppingList>>
      try {
        basket = await parseShoppingList(rawText)
      } catch (err) {
        console.error("[assistant/chat] parse failed", err)
        writer.write({
          type: "tool-output-error",
          toolCallId: parseCallId,
          errorText: "Listeyi okuyamadım, tekrar yazabilir misin?",
        })
        emitText(writer, FALLBACK_TEXT)
        writer.write({ type: "finish" })
        return
      }

      writer.write({
        type: "tool-output-available",
        toolCallId: parseCallId,
        output: basket,
      })

      if (basket.items.length === 0) {
        emitText(writer, FALLBACK_TEXT)
        writer.write({ type: "finish" })
        return
      }

      const lookupCallId = nanoid()
      writer.write({
        type: "tool-input-available",
        toolCallId: lookupCallId,
        toolName: "lookupProducts",
        input: { items: basket.items },
      })

      const { matches } = await lookupProducts(basket.items)

      writer.write({
        type: "tool-output-available",
        toolCallId: lookupCallId,
        output: { matches },
      })

      const summarizeCallId = nanoid()
      writer.write({
        type: "tool-input-available",
        toolCallId: summarizeCallId,
        toolName: "summarizeOptimization",
        input: { matches },
      })

      const summary = computeOptimization(matches)

      writer.write({
        type: "tool-output-available",
        toolCallId: summarizeCallId,
        output: summary,
      })

      emitText(writer, buildSummaryText(summary, matches))
      writer.write({ type: "finish" })
    },
    onError: (error) => {
      console.error("[assistant/chat] stream error", error)
      return "Asistan şu an cevap veremiyor. Lütfen biraz sonra tekrar deneyin."
    },
  })

  return createUIMessageStreamResponse({ stream })
}

function emitText(
  writer: Parameters<
    NonNullable<Parameters<typeof createUIMessageStream>[0]["execute"]>
  >[0]["writer"],
  text: string,
) {
  const id = nanoid()
  writer.write({ type: "text-start", id })
  writer.write({ type: "text-delta", id, delta: text })
  writer.write({ type: "text-end", id })
}
