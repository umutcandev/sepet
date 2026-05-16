import { NextResponse } from "next/server"
import {
  APICallError,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
  type UIMessageStreamWriter,
} from "ai"
import { nanoid } from "nanoid"
import { auth } from "@/auth"
import {
  generateChatTitle,
  parseShoppingList,
  parseReceiptImage,
  lookupProducts,
} from "@/lib/ai/tools"
import { computeOptimization } from "@/lib/ai/optimize"
import { STALE_DAY_THRESHOLD } from "@/lib/receipt-staleness"
import type {
  MatchResult,
  OptimizationSummary,
  ParsedItem,
  ReceiptOCR,
  ReceiptComparison,
} from "@/lib/ai/schemas"
import {
  appendMessages,
  createConversation,
  setConversationTitle,
} from "@/lib/actions/conversations"
import { and, eq } from "drizzle-orm"
import { db, conversations } from "@/lib/db"

export const runtime = "nodejs"
export const maxDuration = 60

const FALLBACK_TEXT =
  'Sana yardım edebilmem için alışveriş listeni yazar mısın? Örnek: "2 ekmek, 1 lt süt, 500g beyaz peynir".'

const MODEL_BUSY_TEXT =
  "Yapay zeka servisi şu an yoğun (geçici bir durum). Birkaç dakika sonra tekrar dener misin?"

/**
 * Google Gemini "yüksek talep" hatası (503 / UNAVAILABLE) — model geçici
 * olarak meşgul demek; kullanıcı hatası değil. AI SDK retry'ları tükettiğinde
 * bu hata dışarı düşer.
 */
function isModelOverloaded(err: unknown): boolean {
  if (APICallError.isInstance(err)) {
    return err.statusCode === 503 || err.statusCode === 429
  }
  return false
}

type LastUserMode =
  | { kind: "receiptApproval"; payload: ReceiptApprovalPayload }
  | { kind: "receiptImage"; imageUrl: string; imageR2Key?: string; text: string }
  | { kind: "basketApproval"; payload: BasketApprovalPayload }
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

type BasketApprovalPayload = {
  items: Array<{
    rawName: string
    searchQuery: string
    quantity: number
    unit: ParsedItem["unit"]
  }>
}

function detectLastUserMode(messages: UIMessage[]): LastUserMode {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== "user") continue

    const meta = (m as { metadata?: unknown }).metadata as
      | {
          kind?: string
          payload?: ReceiptApprovalPayload | BasketApprovalPayload
        }
      | undefined
    if (meta?.kind === "receiptApproval" && meta.payload) {
      return {
        kind: "receiptApproval",
        payload: meta.payload as ReceiptApprovalPayload,
      }
    }
    if (meta?.kind === "basketApproval" && meta.payload) {
      return {
        kind: "basketApproval",
        payload: meta.payload as BasketApprovalPayload,
      }
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
  if (comp.staleness?.isStale) {
    if (comp.staleness.reason === "date" && comp.staleness.ageLabel) {
      return `Bu fiş ${comp.staleness.ageLabel} öncesine ait — o dönemin fiyatları bugünkü piyasayla karşılaştırılamaz. Aşağıdaki rakamlar yalnızca bugünün fiyatlarını gösterir, tasarruf hesabı anlamlı değil.`
    }
    return `Fişindeki tutar bugünkü fiyatlarla kıyaslanamayacak kadar düşük görünüyor — büyük olasılıkla farklı bir döneme ait. Aşağıdaki en iyi fiyatlar yalnızca güncel piyasa için geçerli; tasarruf hesabı yapmıyoruz.`
  }
  if (comp.totalSavingsTL <= 0) {
    return `Fişindeki ${formatTL(comp.totalReceiptAmount)} TL'lik harcamana karşılık bulduğumuz en iyi fiyatlar zaten yakın — ek bir kazanç çıkmadı.`
  }
  return `Bu fişinde ${formatTL(comp.totalReceiptAmount)} TL harcamışsın. Bulduğumuz en iyi fiyatlarla aynı sepet ${formatTL(comp.totalBestAmount)} TL'ye geliyordu — yaklaşık ${formatTL(comp.totalSavingsTL)} TL tasarruf mümkündü.`
}

const STALE_RATIO_THRESHOLD = 3

function formatAgeLabel(days: number): string {
  if (days < 30) return `~${Math.max(1, Math.round(days / 7))} hafta`
  if (days < 365) return `~${Math.round(days / 30)} ay`
  return `~${Math.round(days / 365)} yıl`
}

function computeStaleness(input: {
  purchaseDate: string | null
  totalReceiptAmount: number
  totalBestAmount: number
  itemCount: number
}): ReceiptComparison["staleness"] {
  if (input.itemCount === 0) return null

  let ageDays: number | null = null
  let ageLabel: string | null = null
  if (input.purchaseDate) {
    const d = new Date(input.purchaseDate)
    if (!Number.isNaN(d.getTime())) {
      ageDays = Math.floor((Date.now() - d.getTime()) / 86_400_000)
      if (ageDays >= 0) ageLabel = formatAgeLabel(ageDays)
    }
  }

  const priceRatio =
    input.totalReceiptAmount > 0
      ? input.totalBestAmount / input.totalReceiptAmount
      : null

  let reason: "date" | "ratio" | null = null
  if (ageDays != null && ageDays >= STALE_DAY_THRESHOLD) reason = "date"
  else if (priceRatio != null && priceRatio >= STALE_RATIO_THRESHOLD) reason = "ratio"

  return { isStale: reason !== null, reason, ageDays, ageLabel, priceRatio }
}

function computeReceiptComparison(
  payloadItems: ReceiptApprovalPayload["items"],
  matches: MatchResult[],
  purchaseDate: string | null,
  receiptTotalAmount: number | null,
): ReceiptComparison {
  const items = payloadItems.map((it, idx) => {
    const match = matches[idx]
    const best = match?.bestMatch ?? null
    const sizeMismatch = match?.sizeMismatch ?? false
    const minPrice = best?.minPrice ?? null
    const marketWithMin = best
      ? match.marketPrices.find((mp) => mp.price === minPrice) ?? null
      : null
    const bestMarket = marketWithMin?.market ?? null
    const bestPrice = minPrice ?? null
    const bestUrl = marketWithMin?.sourceUrl ?? null
    // Fişteki toplam tutarla en iyi (birim fiyat * quantity) karşılaştır
    const receiptTotal =
      it.totalPrice ??
      (it.unitPrice != null ? it.unitPrice * it.quantity : null)
    const bestTotal = bestPrice != null ? bestPrice * it.quantity : null
    // Farklı boyutlu ürünle eşleşmişse fiyatlar kıyaslanamaz — tasarruf yazma.
    const savingsTL =
      !sizeMismatch && receiptTotal != null && bestTotal != null
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
      bestUrl,
      savingsTL,
      sizeMismatch,
    }
  })

  const lineItemsTotal = items.reduce(
    (sum, i) => sum + (i.receiptTotalPrice ?? 0),
    0,
  )
  // Onay ekranında kalem silinince fişin basılı genel toplamı artık güncel
  // kalem listesini yansıtmaz. Tüm kalemlerin tutarı biliniyorsa satır
  // toplamını kullan; bir kısmı OCR'dan okunamadıysa basılı toplama düş.
  const allLineTotalsKnown =
    items.length > 0 && items.every((i) => i.receiptTotalPrice != null)
  const totalReceiptAmount = allLineTotalsKnown
    ? lineItemsTotal
    : receiptTotalAmount != null && receiptTotalAmount > 0
      ? receiptTotalAmount
      : lineItemsTotal
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

  const staleness = computeStaleness({
    purchaseDate,
    totalReceiptAmount,
    totalBestAmount,
    itemCount: items.length,
  })

  return { items, totalReceiptAmount, totalBestAmount, totalSavingsTL, staleness }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  let payload: { messages?: UIMessage[]; conversationId?: string }
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

  const lastUserMessage = findLastUserMessage(messages)
  if (!lastUserMessage) {
    return NextResponse.json({ error: "no_user_message" }, { status: 400 })
  }

  let conversationId = payload.conversationId
  let createdNewConversation = false
  let createdTitle: string | null = null
  if (conversationId) {
    const [owned] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
        ),
      )
      .limit(1)
    if (!owned) {
      return NextResponse.json(
        { error: "conversation_not_found" },
        { status: 404 },
      )
    }
  } else {
    const created = await createConversation({
      firstUserMessage: lastUserMessage,
    })
    conversationId = created.id
    createdTitle = created.title
    createdNewConversation = true
  }

  // Persist the user message immediately so it survives a stream abort.
  try {
    await appendMessages(conversationId, userId, [
      {
        role: "user",
        parts: lastUserMessage.parts as unknown,
        metadata: (lastUserMessage as { metadata?: unknown }).metadata,
      },
    ])
  } catch (err) {
    console.error("[assistant/chat] user message persist failed", err)
  }

  const newConversationId = conversationId
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const recorder = createAssistantRecorder()
      const wrappedWriter = wrapWriter(writer, recorder)

      writer.write({ type: "start" })

      // Send the conversation id to the client as a transient data event so
      // the client can update the URL without persisting an extra part. The
      // initial title (extracted from the first user message) tags along so
      // the sidebar can show the new conversation immediately without an RSC
      // refresh — the AI-generated title arrives later via the title event.
      if (createdNewConversation) {
        writer.write({
          type: "data-conversation-id",
          data: { id: newConversationId, title: createdTitle },
          transient: true,
        } as Parameters<typeof writer.write>[0])
      }

      // Yeni sohbet için: AI başlığını ana cevap stream'i ile paralel üret ve
      // hazır olduğunda hem DB'ye yaz hem client'a transient event olarak emit
      // et. Hata olursa sohbet yine çalışsın — başlık silently fallback'e düşer
      // (createConversation'ın yazdığı extract title DB'de zaten var).
      const titlePromise = createdNewConversation
        ? resolveAndEmitTitle({
            mode,
            writer,
            conversationId: newConversationId,
            userId,
          })
        : Promise.resolve()

      await Promise.all([
        runAssistantTurn({ writer: wrappedWriter, mode }),
        titlePromise,
      ])

      // Persist the assistant message before signalling finish.
      const parts = recorder.finalize()
      if (parts.length > 0) {
        try {
          await appendMessages(newConversationId, userId, [
            { role: "assistant", parts },
          ])
        } catch (err) {
          console.error("[assistant/chat] assistant message persist failed", err)
        }
      }

      writer.write({ type: "finish" })
    },
    onError: (error) => {
      console.error("[assistant/chat] stream error", error)
      return "Asistan şu an cevap veremiyor. Lütfen biraz sonra tekrar deneyin."
    },
  })

  return createUIMessageStreamResponse({ stream })
}

function findLastUserMessage(messages: UIMessage[]): UIMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i]
  }
  return null
}

type AnyChunk = UIMessageChunk

type StoredTextPart = { type: "text"; text: string }
type StoredFilePart = {
  type: "file"
  mediaType: string
  url: string
  filename?: string
}
type StoredToolPart = {
  type: string
  toolCallId: string
  state: "input-available" | "output-available" | "output-error"
  input?: unknown
  output?: unknown
  errorText?: string
}
type StoredPart = StoredTextPart | StoredFilePart | StoredToolPart

type AssistantRecorder = {
  handle: (chunk: AnyChunk) => void
  finalize: () => StoredPart[]
}

function createAssistantRecorder(): AssistantRecorder {
  const parts: StoredPart[] = []
  const textIndex = new Map<string, number>()
  const toolIndex = new Map<string, number>()

  function handle(chunkRaw: AnyChunk) {
    const c = chunkRaw as unknown as { type: string } & Record<string, unknown>
    switch (c.type) {
      case "text-start": {
        const id = c.id as string
        const idx = parts.length
        parts.push({ type: "text", text: "" })
        textIndex.set(id, idx)
        return
      }
      case "text-delta": {
        const id = c.id as string
        const idx = textIndex.get(id)
        if (idx == null) return
        const p = parts[idx] as StoredTextPart
        p.text += (c.delta as string) ?? ""
        return
      }
      case "text-end":
        return
      case "tool-input-available": {
        const toolCallId = c.toolCallId as string
        const toolName = c.toolName as string
        const idx = parts.length
        parts.push({
          type: `tool-${toolName}`,
          toolCallId,
          state: "input-available",
          input: c.input,
        })
        toolIndex.set(toolCallId, idx)
        return
      }
      case "tool-output-available": {
        const toolCallId = c.toolCallId as string
        const idx = toolIndex.get(toolCallId)
        if (idx == null) return
        const p = parts[idx] as StoredToolPart
        p.state = "output-available"
        p.output = c.output
        return
      }
      case "tool-output-error": {
        const toolCallId = c.toolCallId as string
        const idx = toolIndex.get(toolCallId)
        if (idx == null) return
        const p = parts[idx] as StoredToolPart
        p.state = "output-error"
        p.errorText = c.errorText as string
        return
      }
      default:
        return
    }
  }

  return { handle, finalize: () => parts }
}

type WriterLike = Pick<UIMessageStreamWriter, "write">

function wrapWriter(
  writer: UIMessageStreamWriter,
  recorder: AssistantRecorder,
): WriterLike {
  return {
    write(chunk) {
      recorder.handle(chunk as AnyChunk)
      writer.write(chunk)
    },
  }
}

async function runAssistantTurn({
  writer,
  mode,
}: {
  writer: WriterLike
  mode: Exclude<LastUserMode, { kind: "empty" }>
}) {
  if (mode.kind === "receiptImage") {
    const parseCallId = nanoid()
    writer.write({
      type: "tool-input-available",
      toolCallId: parseCallId,
      toolName: "parseReceipt",
      input: { imageUrl: mode.imageUrl },
    } as AnyChunk)

    let ocr: ReceiptOCR
    try {
      ocr = await parseReceiptImage(mode.imageUrl)
    } catch (err) {
      console.error("[assistant/chat] receipt OCR failed", err)
      writer.write({
        type: "tool-output-error",
        toolCallId: parseCallId,
        errorText: isModelOverloaded(err)
          ? MODEL_BUSY_TEXT
          : "Fişi okuyamadım. Daha net bir fotoğrafla tekrar deneyebilir misin?",
      } as AnyChunk)
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
    } as AnyChunk)

    await emitText(
      writer,
      ocr.items.length === 0
        ? "Fişten ürün çıkartamadım. Lütfen tüm satırların net göründüğü bir kare çek."
        : "Fişindeki kalemleri çıkardım. Aşağıdan kontrol et ve düzeltmelerini yap — ardından karşılaştırma için onayla.",
    )
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
    } as AnyChunk)

    const { matches } = await lookupProducts(parsedItems)

    writer.write({
      type: "tool-output-available",
      toolCallId: lookupCallId,
      output: { matches },
    } as AnyChunk)

    const summarizeCallId = nanoid()
    writer.write({
      type: "tool-input-available",
      toolCallId: summarizeCallId,
      toolName: "summarizeOptimization",
      input: { matches },
    } as AnyChunk)

    const summary = computeOptimization(matches)

    writer.write({
      type: "tool-output-available",
      toolCallId: summarizeCallId,
      output: summary,
    } as AnyChunk)

    const comparison = computeReceiptComparison(
      p.items,
      matches,
      p.purchaseDate ?? null,
      p.totalAmount ?? null,
    )
    const compareCallId = nanoid()
    writer.write({
      type: "tool-input-available",
      toolCallId: compareCallId,
      toolName: "receiptComparison",
      input: {},
    } as AnyChunk)
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
    } as AnyChunk)

    await emitText(writer, buildReceiptComparisonText(comparison))
    return
  }

  if (mode.kind === "basketApproval") {
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
    } as AnyChunk)

    const { matches } = await lookupProducts(parsedItems)

    writer.write({
      type: "tool-output-available",
      toolCallId: lookupCallId,
      output: { matches },
    } as AnyChunk)

    const summarizeCallId = nanoid()
    writer.write({
      type: "tool-input-available",
      toolCallId: summarizeCallId,
      toolName: "summarizeOptimization",
      input: { matches },
    } as AnyChunk)

    const summary = computeOptimization(matches)

    writer.write({
      type: "tool-output-available",
      toolCallId: summarizeCallId,
      output: summary,
    } as AnyChunk)

    // Save kartı için tüm bağlamı tek bir tool-output'ta topla.
    const contextCallId = nanoid()
    writer.write({
      type: "tool-input-available",
      toolCallId: contextCallId,
      toolName: "basketContext",
      input: {},
    } as AnyChunk)
    writer.write({
      type: "tool-output-available",
      toolCallId: contextCallId,
      output: { items: p.items, matches, summary },
    } as AnyChunk)

    await emitText(writer, buildSummaryText(summary, matches))
    return
  }

  // Text mode — parse'ta dur, kullanıcının onayını bekle.
  const rawText = mode.text
  const parseCallId = nanoid()
  writer.write({
    type: "tool-input-available",
    toolCallId: parseCallId,
    toolName: "parseShoppingList",
    input: { rawText },
  } as AnyChunk)

  let basket: Awaited<ReturnType<typeof parseShoppingList>>
  try {
    basket = await parseShoppingList(rawText)
  } catch (err) {
    console.error("[assistant/chat] parse failed", err)
    const busy = isModelOverloaded(err)
    writer.write({
      type: "tool-output-error",
      toolCallId: parseCallId,
      errorText: busy
        ? MODEL_BUSY_TEXT
        : "Listeyi okuyamadım, tekrar yazabilir misin?",
    } as AnyChunk)
    await emitText(writer, busy ? MODEL_BUSY_TEXT : FALLBACK_TEXT)
    return
  }

  writer.write({
    type: "tool-output-available",
    toolCallId: parseCallId,
    output: basket,
  } as AnyChunk)

  if (basket.items.length === 0) {
    await emitText(writer, basket.chatResponse?.trim() || FALLBACK_TEXT)
    return
  }

  await emitText(
    writer,
    `${basket.items.length} kalem çıkardım. Kontrol edip düzeltmelerini yap — ardından karşılaştırma için onayla.`,
  )
}

async function resolveAndEmitTitle(opts: {
  mode: Exclude<LastUserMode, { kind: "empty" }>
  writer: UIMessageStreamWriter
  conversationId: string
  userId: string
}): Promise<void> {
  const { mode, writer, conversationId, userId } = opts

  let title: string | null = null

  if (mode.kind === "text") {
    try {
      title = await generateChatTitle(mode.text)
    } catch (err) {
      console.error("[assistant/chat] title generation failed", err)
    }
  } else if (mode.kind === "receiptImage") {
    title = "Fiş analizi"
  }
  // receiptApproval / basketApproval modları mevcut bir sohbeti devam ettirir;
  // bu yola hiç gelinmez (yalnızca createdNewConversation === true iken çağrılır).

  if (!title) return

  try {
    await setConversationTitle(conversationId, userId, title)
  } catch (err) {
    console.error("[assistant/chat] title persist failed", err)
  }

  writer.write({
    type: "data-conversation-title",
    data: { id: conversationId, title },
    transient: true,
  } as Parameters<typeof writer.write>[0])
}

async function emitText(writer: WriterLike, text: string) {
  const id = nanoid()
  writer.write({ type: "text-start", id } as AnyChunk)
  const tokens = text.match(/\S+\s*/g) ?? [text]
  const groupSize = 3
  for (let i = 0; i < tokens.length; i += groupSize) {
    const delta = tokens.slice(i, i + groupSize).join("")
    writer.write({ type: "text-delta", id, delta } as AnyChunk)
    if (i + groupSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 18))
    }
  }
  writer.write({ type: "text-end", id } as AnyChunk)
}
