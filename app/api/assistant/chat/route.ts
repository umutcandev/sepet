import { NextResponse } from "next/server"
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai"
import { nanoid } from "nanoid"
import { auth } from "@/auth"
import { parseShoppingList, lookupProducts } from "@/lib/ai/tools"
import { computeOptimization } from "@/lib/ai/optimize"
import type { MatchResult, OptimizationSummary } from "@/lib/ai/schemas"

export const runtime = "nodejs"
export const maxDuration = 60

const FALLBACK_TEXT =
  'Sana yardım edebilmem için alışveriş listeni yazar mısın? Örnek: "2 ekmek, 1 lt süt, 500g beyaz peynir".'

function extractLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== "user") continue
    const text = (m.parts ?? [])
      .filter(
        (p): p is { type: "text"; text: string } =>
          p.type === "text" && typeof (p as { text?: unknown }).text === "string",
      )
      .map((p) => p.text)
      .join(" ")
      .trim()
    if (text) return text
  }
  return ""
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

  const rawText = extractLastUserText(messages)
  if (!rawText) {
    return NextResponse.json({ error: "no_text" }, { status: 400 })
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" })

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
