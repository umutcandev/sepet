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
import { z } from "zod"
import { auth } from "@/auth"
import { isOwnedReceiptUrl } from "@/lib/storage/r2"
import { UNIT_VALUES } from "@/lib/ai/schemas"
import {
  generateChatTitle,
  parseShoppingList,
  analyzeImage,
  lookupProducts,
} from "@/lib/ai/tools"
import { computeOptimization } from "@/lib/ai/optimize"
import { getUserLocationContext } from "@/lib/auth/location"
import type { LocationContext } from "@/lib/marketfiyati/client"
import { STALE_DAY_THRESHOLD } from "@/lib/receipt-staleness"
import type {
  BasketDraft,
  ImageAnalysis,
  MatchResult,
  OptimizationSummary,
  ParsedItem,
  ReceiptComparison,
} from "@/lib/ai/schemas"
import {
  appendMessages,
  createConversation,
  setConversationTitle,
  setConversationStatus,
} from "@/lib/actions/conversations"
import type { ConversationStatus } from "@/lib/assistant/conversation-status"
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

// Onay payload'ları client'tan ham JSON olarak gelir; hesaba girmeden önce
// runtime'da doğrula (TS cast yeterli değil). quantity/fiyatlar sonlu sayı
// olmalı — NaN/Infinity/negatif değerler kayıtlı veriyi bozmasın.
const finiteNum = z.number().refine(Number.isFinite, "sonlu sayı olmalı")
const unitSchema = z.enum(UNIT_VALUES)

const basketApprovalPayloadSchema = z.object({
  items: z.array(
    z.object({
      rawName: z.string(),
      searchQuery: z.string(),
      quantity: finiteNum.refine((n) => n >= 0, "negatif olamaz"),
      unit: unitSchema,
    }),
  ),
})

const receiptApprovalPayloadSchema = z.object({
  receiptImageUrl: z.string(),
  receiptImageR2Key: z.string(),
  marketName: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  totalAmount: finiteNum.nullable(),
  items: z.array(
    z.object({
      rawName: z.string(),
      searchQuery: z.string(),
      quantity: finiteNum.refine((n) => n >= 0, "negatif olamaz"),
      unit: unitSchema,
      unitPrice: finiteNum.nullable(),
      totalPrice: finiteNum.nullable(),
    }),
  ),
})

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

function formatRequestedQty(qty: number, unit: MatchResult["unit"]): string {
  return `${qty} ${unit}`
}

function buildSizeMismatchNote(matches: MatchResult[]): string {
  const mismatches = matches.filter(
    (m) => m.sizeMismatch && m.bestMatch && m.lookupStatus === "ok",
  )
  if (mismatches.length === 0) return ""
  const lines = mismatches.map((m) => {
    const requested = formatRequestedQty(m.quantity, m.unit)
    return `- "${m.rawName}" için ${requested} istedin; aramamda tam o boyut yoktu, en yakın olarak "${m.bestMatch!.name}" ile eşleştirdim.`
  })
  return `\n\n**Not:** Aşağıdaki kalemlerde istediğin tam boyutu/miktarı bulamadım — kontrol et, gerekirse kartlardan değiştir:\n${lines.join("\n")}`
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
  const mismatchNote = buildSizeMismatchNote(matches)

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
    return head + comboPart + missingPart + mismatchNote
  }

  if (hasFullCombo) {
    const head = `${matchedCount} kalemli sepetini hazırladım. Tek bir markette tüm sepetini bulamadım, ama iki market kombinasyonuyla (${combo.markets.join(" + ")}) tamamı ${formatTL(combo.total)} TL'ye geliyor.`
    return head + missingPart + mismatchNote
  }

  const head = `${matchedCount} kalemli sepetini hazırladım. Tek bir markette tüm sepetini bulamadım — en iyi durumda ${single.market}'ten ${single.itemCount}/${matchedCount} kalem ${formatTL(single.total)} TL'ye alınıyor.`
  return head + missingPart + mismatchNote
}

function buildReceiptComparisonText(comp: ReceiptComparison): string {
  if (comp.items.length === 0) {
    return "Fişindeki kalemleri çıkardım ama eşleşen ürün bulamadım."
  }
  if (comp.staleness?.isStale) {
    // İşaretli fark: pozitif → bugün daha ucuz (tasarruf mümkün), negatif →
    // bugün daha pahalı. comp.totalSavingsTL kalem bazında Math.max(0, …) ile
    // toplandığı için her zaman ≥ 0; "iki tutar neredeyse aynı" mı yoksa
    // "bugün çok daha pahalı" mı ayrımı için ham farkı kullanmamız şart.
    const diff = comp.totalReceiptAmount - comp.totalBestAmount
    const tolerance = Math.max(
      1,
      Math.max(comp.totalReceiptAmount, comp.totalBestAmount) * 0.02,
    )
    const figuresPart = (() => {
      const head = `Yine de bilgi amaçlı: fişinde ${formatTL(comp.totalReceiptAmount)} TL harcamışsın, aynı sepet bugünün en iyi fiyatlarıyla ${formatTL(comp.totalBestAmount)} TL'ye geliyor`
      if (Math.abs(diff) <= tolerance) {
        return `${head} — iki tutar neredeyse aynı.`
      }
      if (diff > 0) {
        return `${head} — bugüne kıyasla yaklaşık ${formatTL(diff)} TL tasarruf mümkün olurdu.`
      }
      return `${head} — bugün aynı sepeti almak yaklaşık ${formatTL(Math.abs(diff))} TL daha pahalıya geliyor.`
    })()
    if (comp.staleness.reason === "date" && comp.staleness.ageLabel) {
      return `Bu fiş ${comp.staleness.ageLabel} öncesine ait — o dönemin fiyatları bugünkü piyasayla birebir karşılaştırılamaz, bu yüzden tasarruf hesabı tam olarak anlamlı değil. ${figuresPart}`
    }
    return `Fişindeki tutar bugünkü fiyatlarla kıyaslanamayacak kadar düşük görünüyor — büyük olasılıkla farklı bir döneme ait, tasarruf hesabı birebir anlamlı değil. ${figuresPart}`
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
      matchedProductId: best?.productId ?? null,
      matchedName: best?.name ?? null,
      bestMarket,
      bestPrice,
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

  // SSRF koruması: görsel modunda sunucu (ya da AI Gateway) client'ın verdiği
  // URL'i fetch eder. Yalnızca bu kullanıcının R2 klasöründeki görseller
  // (`{R2_PUBLIC_BASE_URL}/receipts/{userId}/...`) kabul edilir; aksi halde iç
  // ağ / cloud metadata adresleri taranabilir.
  if (mode.kind === "receiptImage" && !isOwnedReceiptUrl(mode.imageUrl, userId)) {
    return NextResponse.json({ error: "invalid_image_url" }, { status: 400 })
  }

  // Onay payload'larını hesaba/kayda almadan önce runtime'da doğrula.
  if (
    mode.kind === "receiptApproval" &&
    !receiptApprovalPayloadSchema.safeParse(mode.payload).success
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
  }
  if (
    mode.kind === "basketApproval" &&
    !basketApprovalPayloadSchema.safeParse(mode.payload).success
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
  }

  const lastUserMessage = findLastUserMessage(messages)
  if (!lastUserMessage) {
    return NextResponse.json({ error: "no_user_message" }, { status: 400 })
  }

  // Kullanıcının kayıtlı konumu — ürün eşleştirme/optimizasyon bu koordinat ve
  // seçili şubelerle çalışır. Konum yoksa env fallback'e düşer.
  const loc = await getUserLocationContext()

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
      //
      // Görsel modunda başlık vision sonucuna bağlı (receipt → "Fiş analizi",
      // food → "<dishName> malzemeleri", unknown → "Görsel analizi"). Bu yüzden
      // text modunda paralel üretilir; görsel modunda runAssistantTurn vision
      // bittikten sonra `onImageKind` ile başlığı bildirir.
      let titlePromise: Promise<void> = Promise.resolve()
      const emitTitleIfNew = async (title: string) => {
        if (!createdNewConversation) return
        try {
          await setConversationTitle(newConversationId, userId, title)
        } catch (err) {
          console.error("[assistant/chat] title persist failed", err)
        }
        writer.write({
          type: "data-conversation-title",
          data: { id: newConversationId, title },
          transient: true,
        } as Parameters<typeof writer.write>[0])
      }

      if (createdNewConversation && mode.kind === "text") {
        titlePromise = (async () => {
          try {
            const title = await generateChatTitle(mode.text)
            await emitTitleIfNew(title)
          } catch (err) {
            console.error("[assistant/chat] title generation failed", err)
          }
        })()
      }

      const handleImageKind = createdNewConversation
        ? async (
            kind: ImageAnalysis["kind"],
            analysis?: ImageAnalysis,
          ) => {
            const title =
              kind === "receipt"
                ? "Fiş analizi"
                : kind === "food" && analysis?.food?.dishName
                  ? `${analysis.food.dishName} malzemeleri`
                  : "Görsel analizi"
            await emitTitleIfNew(title)
          }
        : undefined

      const [turn] = await Promise.all([
        runAssistantTurn({
          writer: wrappedWriter,
          mode,
          loc,
          onImageKind: handleImageKind,
        }),
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

      // Sidebar ikon durumunu yaz ve client'a transient event olarak ilet —
      // store anında güncellensin (RSC refresh gerektirmeden). Turn bir onay
      // kartında bittiyse "awaiting", terminal sonuçta bittiyse "completed".
      const status: ConversationStatus = turn.awaiting ? "awaiting" : "completed"
      try {
        await setConversationStatus(newConversationId, userId, status)
      } catch (err) {
        console.error("[assistant/chat] status persist failed", err)
      }
      writer.write({
        type: "data-conversation-status",
        data: { id: newConversationId, status },
        transient: true,
      } as Parameters<typeof writer.write>[0])

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
type StoredReasoningPart = {
  type: "reasoning"
  text: string
  state?: "streaming" | "done"
}
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
type StoredPart =
  | StoredTextPart
  | StoredReasoningPart
  | StoredFilePart
  | StoredToolPart

type AssistantRecorder = {
  handle: (chunk: AnyChunk) => void
  finalize: () => StoredPart[]
}

function createAssistantRecorder(): AssistantRecorder {
  const parts: StoredPart[] = []
  const textIndex = new Map<string, number>()
  const reasoningIndex = new Map<string, number>()
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
      case "reasoning-start": {
        const id = c.id as string
        const idx = parts.length
        parts.push({ type: "reasoning", text: "", state: "streaming" })
        reasoningIndex.set(id, idx)
        return
      }
      case "reasoning-delta": {
        const id = c.id as string
        const idx = reasoningIndex.get(id)
        if (idx == null) return
        const p = parts[idx] as StoredReasoningPart
        p.text += (c.delta as string) ?? ""
        return
      }
      case "reasoning-end": {
        const id = c.id as string
        const idx = reasoningIndex.get(id)
        if (idx == null) return
        const p = parts[idx] as StoredReasoningPart
        p.state = "done"
        return
      }
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

/**
 * Bir asistan turn'ünü çalıştırır ve terminal durumu döndürür.
 * `awaiting: true` → turn kullanıcıdan onay bekleyen bir kartla bitti
 * (sepet/fiş/yemek onayı). `awaiting: false` → terminal sonuç (karşılaştırma,
 * optimizasyon, ya da kapanış/hata mesajı). Sidebar ikonu buna göre seçilir.
 */
type TurnResult = { awaiting: boolean }

async function runAssistantTurn({
  writer,
  mode,
  loc,
  onImageKind,
}: {
  writer: WriterLike
  mode: Exclude<LastUserMode, { kind: "empty" }>
  loc: LocationContext
  onImageKind?: (
    kind: ImageAnalysis["kind"],
    analysis?: ImageAnalysis,
  ) => Promise<void> | void
}): Promise<TurnResult> {
  if (mode.kind === "receiptImage") {
    const analyzeCallId = nanoid()
    writer.write({
      type: "tool-input-available",
      toolCallId: analyzeCallId,
      toolName: "analyzeImage",
      input: { imageUrl: mode.imageUrl },
    } as AnyChunk)

    let analysis: ImageAnalysis
    let parseReasoning: string | null = null
    try {
      const result = await analyzeImage(mode.imageUrl)
      analysis = result.analysis
      parseReasoning = result.reasoning
    } catch (err) {
      console.error("[assistant/chat] image analysis failed", err)
      writer.write({
        type: "tool-output-error",
        toolCallId: analyzeCallId,
        errorText: isModelOverloaded(err)
          ? MODEL_BUSY_TEXT
          : "Görseli okuyamadım. Daha net bir fotoğrafla tekrar deneyebilir misin?",
      } as AnyChunk)
      if (onImageKind) await onImageKind("unknown")
      return { awaiting: false }
    }

    if (parseReasoning) {
      await emitReasoning(writer, parseReasoning)
    }

    writer.write({
      type: "tool-output-available",
      toolCallId: analyzeCallId,
      output: {
        analysis,
        receiptImageUrl: mode.imageUrl,
        receiptImageR2Key: mode.imageR2Key ?? null,
      },
    } as AnyChunk)

    if (onImageKind) await onImageKind(analysis.kind, analysis)

    if (analysis.kind === "receipt") {
      const ocr = analysis.receipt
      const hasItems = !!ocr && ocr.items.length > 0
      await emitText(
        writer,
        !hasItems
          ? "Fişten ürün çıkartamadım. Lütfen tüm satırların net göründüğü bir kare çek."
          : "Fişindeki kalemleri çıkardım. Aşağıdan kontrol et ve düzeltmelerini yap — ardından karşılaştırma için onayla.",
      )
      // Kalem çıktıysa onay kartı gösterilir → awaiting; çıkmadıysa terminal.
      return { awaiting: hasItems }
    }

    if (analysis.kind === "food") {
      const food = analysis.food
      if (!food || food.items.length === 0) {
        await emitText(
          writer,
          "Görseldeki yemeği tanıdım ama malzemelerini çıkaramadım. Yemeğin adını yazar mısın? Sana malzeme listesini hazırlayayım.",
        )
        return { awaiting: false }
      }
      await emitText(
        writer,
        `Görseldeki yemeği "${food.dishName}" olarak tanıdım. Evde yapman için temel malzemelerini çıkardım — miktarları tek porsiyona göre tahmin ettim, market paket boyutları farklı olabilir. Kontrol et, düzeltmelerini yap ve karşılaştırma için onayla.`,
      )
      return { awaiting: true }
    }

    // kind === "unknown" — model ya bir yemek/fiş tanıyamadı, ya da fiş
    // market dışı bir sektörden (giyim, akaryakıt, eczane, restoran vb.).
    // unknownReason zaten kullanıcıya hitap eden tam bir Türkçe cümle —
    // varsa onu direkt göster, yoksa generic fallback.
    const reason = analysis.unknownReason?.trim()
    await emitText(
      writer,
      reason && reason.length > 0
        ? reason
        : "Bu görseldeki yemeği ya da fişi tanıyamadım. Bana yemeğin adını yazar mısın, ya da bir market fişi fotoğrafı yüklemek ister misin?",
    )
    return { awaiting: false }
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

    const { matches } = await lookupProducts(parsedItems, loc)

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
    return { awaiting: false }
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

    const { matches } = await lookupProducts(parsedItems, loc)

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
    return { awaiting: false }
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

  let basket: BasketDraft
  let parseReasoning: string | null = null
  try {
    const result = await parseShoppingList(rawText)
    basket = result.draft
    parseReasoning = result.reasoning
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
    return { awaiting: false }
  }

  if (parseReasoning) {
    await emitReasoning(writer, parseReasoning)
  }

  writer.write({
    type: "tool-output-available",
    toolCallId: parseCallId,
    output: basket,
  } as AnyChunk)

  if (basket.items.length === 0) {
    await emitText(writer, basket.chatResponse?.trim() || FALLBACK_TEXT)
    return { awaiting: false }
  }

  await emitText(
    writer,
    `${basket.items.length} kalem çıkardım. Kontrol edip düzeltmelerini yap, ardından karşılaştırma için onayla.`,
  )
  // Sepet onay kartı gösterildi → kullanıcının "Onayla" aksiyonunu bekliyoruz.
  return { awaiting: true }
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

/**
 * Gemini'nin thought summary'sini kullanıcıya kelime kelime akıt. generateObject
 * sonrası bütün halinde elimize geçtiği için yapay bir gecikme ile word-by-word
 * yayınlanır — kullanıcı modelin düşündüğü adımları okuyabilsin.
 */
async function emitReasoning(writer: WriterLike, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  const id = nanoid()
  writer.write({ type: "reasoning-start", id } as AnyChunk)
  const tokens = trimmed.match(/\S+\s*/g) ?? [trimmed]
  const groupSize = 2
  for (let i = 0; i < tokens.length; i += groupSize) {
    const delta = tokens.slice(i, i + groupSize).join("")
    writer.write({ type: "reasoning-delta", id, delta } as AnyChunk)
    if (i + groupSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 22))
    }
  }
  writer.write({ type: "reasoning-end", id } as AnyChunk)
}
