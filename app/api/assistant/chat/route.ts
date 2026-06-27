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
import type { AiCallOptions } from "@/lib/ai/models"
import {
  generateChatTitle,
  parseShoppingList,
  analyzeImage,
  lookupProducts,
} from "@/lib/ai/tools"
import {
  textStart,
  textDelta,
  textEnd,
  reasoningStart,
  reasoningDelta,
  reasoningEnd,
  toolInputAvailable,
  toolOutputAvailable,
  toolOutputError,
  dataPart,
} from "@/lib/assistant/ui-chunks"
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
import { reserveQuota, refundQuota } from "@/lib/usage/usage"
import type { MeteredMetric } from "@/lib/usage/limits"

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

  // Var olan bir sohbete yazılıyorsa sahipliği KOTADAN ÖNCE doğrula — aksi halde
  // 404 ile dönen (ya da konum/payload hatasıyla düşen) bir istek boşuna bir
  // kota slotu yakardı.
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
  }

  // Kota: pahalı AI çağrısından önce atomik rezerve et. Görsel modu (analyzeImage)
  // imageAnalyses, diğer tüm LLM turları (parse / sepet / fiş onayı) textMessages
  // sayar — "mesaj mesajdır". Kota doluysa LLM hiç çağrılmadan 402 döner. Tüm ucuz
  // doğrulama (payload, SSRF, sahiplik, konum) bu noktadan önce bittiği için
  // rezerve edilen slot yalnızca gerçekten AI'ya gidecek bir istekte harcanır.
  const meteredMetric: MeteredMetric =
    mode.kind === "receiptImage" ? "imageAnalyses" : "textMessages"
  const reservation = await reserveQuota(userId, meteredMetric)
  if (!reservation.ok) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        metric: meteredMetric,
        resetAt: reservation.resetAt.toISOString(),
      },
      { status: 402 }, // Payment Required → istemci Pro CTA kartını gösterir
    )
  }

  // Yeni sohbeti kota ONAYLANDIKTAN sonra oluştur — kota doluysa boş bir sohbet
  // kaydı kalmaz. createConversation beklenmedik bir hatayla düşerse henüz hiç AI
  // çağrılmadığı için rezerve edilen slotu iade et.
  if (!conversationId) {
    try {
      const created = await createConversation({
        firstUserMessage: lastUserMessage,
      })
      conversationId = created.id
      createdTitle = created.title
      createdNewConversation = true
    } catch (err) {
      await refundQuota(userId, meteredMetric).catch(() => {})
      throw err
    }
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

  // İstek iptal sinyali — kullanıcı sekmeyi kapatınca / stream abort olunca
  // tetiklenir. LLM çağrılarına bağlanır ki arka planda boşa token/maliyet
  // yakılmasın (özellikle onay turundaki selectMatches).
  const requestSignal = req.signal

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
        writer.write(
          dataPart("conversation-id", {
            id: newConversationId,
            title: createdTitle,
          }),
        )
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
        writer.write(dataPart("conversation-title", { id: newConversationId, title }))
      }

      if (createdNewConversation && mode.kind === "text") {
        titlePromise = (async () => {
          try {
            const title = await generateChatTitle(mode.text, {
              signal: requestSignal,
            })
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

      let turn: TurnResult
      try {
        const [result] = await Promise.all([
          runAssistantTurn({
            writer: wrappedWriter,
            mode,
            loc,
            onImageKind: handleImageKind,
            signal: requestSignal,
          }),
          titlePromise,
        ])
        turn = result
      } catch (err) {
        // Sert hata (örn. lookupProducts exception) çıktı üretilmeden düştü →
        // rezerve edilen slotu iade et, sonra hatayı stream onError'a ilet.
        await refundQuota(userId, meteredMetric).catch(() => {})
        throw err
      }
      // Turn içeride yakalanan bir sert AI hatasıyla (model 503/429, parse
      // exception) bittiyse de slotu iade et — başarısız istek kotayı yakmasın.
      if (turn.hardError) {
        await refundQuota(userId, meteredMetric).catch(() => {})
      }

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
      writer.write(dataPart("conversation-status", { id: newConversationId, status }))

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
  handle: (chunk: UIMessageChunk) => void
  finalize: () => StoredPart[]
}

/**
 * Elle yazdığımız stream chunk'larını kalıcılaştırılacak mesaj part'larına
 * yeniden birleştirir (SDK'nın tool-loop'unu kullanmadığımız için bu adımı kendimiz
 * yapıyoruz). `chunk` artık `UIMessageChunk` union'ı olarak tipli — `switch
 * (chunk.type)` her kolu ilgili üyeye daraltır, eskiden gereken alan-bazlı cast'ler
 * (c.id/c.delta/...) kalktı.
 */
function createAssistantRecorder(): AssistantRecorder {
  const parts: StoredPart[] = []
  const textIndex = new Map<string, number>()
  const reasoningIndex = new Map<string, number>()
  const toolIndex = new Map<string, number>()

  function handle(chunk: UIMessageChunk) {
    switch (chunk.type) {
      case "text-start": {
        const idx = parts.length
        parts.push({ type: "text", text: "" })
        textIndex.set(chunk.id, idx)
        return
      }
      case "text-delta": {
        const idx = textIndex.get(chunk.id)
        if (idx == null) return
        const p = parts[idx] as StoredTextPart
        p.text += chunk.delta
        return
      }
      case "text-end":
        return
      case "reasoning-start": {
        const idx = parts.length
        parts.push({ type: "reasoning", text: "", state: "streaming" })
        reasoningIndex.set(chunk.id, idx)
        return
      }
      case "reasoning-delta": {
        const idx = reasoningIndex.get(chunk.id)
        if (idx == null) return
        const p = parts[idx] as StoredReasoningPart
        p.text += chunk.delta
        return
      }
      case "reasoning-end": {
        const idx = reasoningIndex.get(chunk.id)
        if (idx == null) return
        const p = parts[idx] as StoredReasoningPart
        p.state = "done"
        return
      }
      case "tool-input-available": {
        const idx = parts.length
        parts.push({
          type: `tool-${chunk.toolName}`,
          toolCallId: chunk.toolCallId,
          state: "input-available",
          input: chunk.input,
        })
        toolIndex.set(chunk.toolCallId, idx)
        return
      }
      case "tool-output-available": {
        const idx = toolIndex.get(chunk.toolCallId)
        if (idx == null) return
        const p = parts[idx] as StoredToolPart
        p.state = "output-available"
        p.output = chunk.output
        return
      }
      case "tool-output-error": {
        const idx = toolIndex.get(chunk.toolCallId)
        if (idx == null) return
        const p = parts[idx] as StoredToolPart
        p.state = "output-error"
        p.errorText = chunk.errorText
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
      recorder.handle(chunk)
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
type TurnResult = { awaiting: boolean; hardError?: boolean }

async function runAssistantTurn({
  writer,
  mode,
  loc,
  onImageKind,
  signal,
}: {
  writer: WriterLike
  mode: Exclude<LastUserMode, { kind: "empty" }>
  loc: LocationContext
  onImageKind?: (
    kind: ImageAnalysis["kind"],
    analysis?: ImageAnalysis,
  ) => Promise<void> | void
  signal?: AbortSignal
}): Promise<TurnResult> {
  // İstek iptal sinyalini tüm LLM çağrılarına taşı — abort'ta boşa token yanmasın.
  const aiOpts: AiCallOptions = { signal }

  if (mode.kind === "receiptImage") {
    const analyzeCallId = nanoid()
    writer.write(
      toolInputAvailable(analyzeCallId, "analyzeImage", {
        imageUrl: mode.imageUrl,
      }),
    )

    let analysis: ImageAnalysis
    let parseReasoning: string | null = null
    try {
      const result = await analyzeImage(mode.imageUrl, aiOpts)
      analysis = result.analysis
      parseReasoning = result.reasoning
    } catch (err) {
      console.error("[assistant/chat] image analysis failed", err)
      writer.write(
        toolOutputError(
          analyzeCallId,
          isModelOverloaded(err)
            ? MODEL_BUSY_TEXT
            : "Görseli okuyamadım. Daha net bir fotoğrafla tekrar deneyebilir misin?",
        ),
      )
      if (onImageKind) await onImageKind("unknown")
      // Çıktı üretilmeden düşen AI hatası → kota slotu iade edilir.
      return { awaiting: false, hardError: true }
    }

    if (parseReasoning) {
      await emitReasoning(writer, parseReasoning)
    }

    writer.write(
      toolOutputAvailable(analyzeCallId, {
        analysis,
        receiptImageUrl: mode.imageUrl,
        receiptImageR2Key: mode.imageR2Key ?? null,
      }),
    )

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
    writer.write(
      toolInputAvailable(lookupCallId, "lookupProducts", { items: parsedItems }),
    )

    const { matches } = await lookupProducts(parsedItems, loc, aiOpts)

    writer.write(toolOutputAvailable(lookupCallId, { matches }))

    const summarizeCallId = nanoid()
    writer.write(
      toolInputAvailable(summarizeCallId, "summarizeOptimization", { matches }),
    )

    const summary = computeOptimization(matches)

    writer.write(toolOutputAvailable(summarizeCallId, summary))

    const comparison = computeReceiptComparison(
      p.items,
      matches,
      p.purchaseDate ?? null,
      p.totalAmount ?? null,
    )
    const compareCallId = nanoid()
    writer.write(toolInputAvailable(compareCallId, "receiptComparison", {}))
    writer.write(
      toolOutputAvailable(compareCallId, {
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
      }),
    )

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
    writer.write(
      toolInputAvailable(lookupCallId, "lookupProducts", { items: parsedItems }),
    )

    const { matches } = await lookupProducts(parsedItems, loc, aiOpts)

    writer.write(toolOutputAvailable(lookupCallId, { matches }))

    const summarizeCallId = nanoid()
    writer.write(
      toolInputAvailable(summarizeCallId, "summarizeOptimization", { matches }),
    )

    const summary = computeOptimization(matches)

    writer.write(toolOutputAvailable(summarizeCallId, summary))

    // Save kartı için tüm bağlamı tek bir tool-output'ta topla.
    const contextCallId = nanoid()
    writer.write(toolInputAvailable(contextCallId, "basketContext", {}))
    writer.write(
      toolOutputAvailable(contextCallId, { items: p.items, matches, summary }),
    )

    await emitText(writer, buildSummaryText(summary, matches))
    return { awaiting: false }
  }

  // Text mode — parse'ta dur, kullanıcının onayını bekle.
  const rawText = mode.text
  const parseCallId = nanoid()
  writer.write(toolInputAvailable(parseCallId, "parseShoppingList", { rawText }))

  let basket: BasketDraft
  let parseReasoning: string | null = null
  try {
    const result = await parseShoppingList(rawText, aiOpts)
    basket = result.draft
    parseReasoning = result.reasoning
  } catch (err) {
    console.error("[assistant/chat] parse failed", err)
    const busy = isModelOverloaded(err)
    writer.write(
      toolOutputError(
        parseCallId,
        busy ? MODEL_BUSY_TEXT : "Listeyi okuyamadım, tekrar yazabilir misin?",
      ),
    )
    await emitText(writer, busy ? MODEL_BUSY_TEXT : FALLBACK_TEXT)
    // Çıktı üretilmeden düşen AI hatası → kota slotu iade edilir.
    return { awaiting: false, hardError: true }
  }

  if (parseReasoning) {
    await emitReasoning(writer, parseReasoning)
  }

  writer.write(toolOutputAvailable(parseCallId, basket))

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

// Typewriter (kelime kelime akıtma) yapay gecikmesinin TOPLAM bütçesi. Adım başı
// gecikme bu bütçeyi aşmayacak şekilde otomatik küçülür: kısa metinde akıcı
// kademeli görünüm korunur, uzun metinde toplam bekleme bu tavanı geçmez.
const TEXT_STREAM_BUDGET_MS = 1500
const REASONING_STREAM_BUDGET_MS = 1200

/** Adımlar arası gecikme = min(temel, bütçe / boşluk sayısı). */
function perStepDelay(gaps: number, baseMs: number, budgetMs: number): number {
  if (gaps <= 0) return 0
  return Math.min(baseMs, Math.floor(budgetMs / gaps))
}

async function emitText(writer: WriterLike, text: string) {
  const id = nanoid()
  writer.write(textStart(id))
  const tokens = text.match(/\S+\s*/g) ?? [text]
  const groupSize = 3
  const gaps = Math.max(0, Math.ceil(tokens.length / groupSize) - 1)
  const delayMs = perStepDelay(gaps, 18, TEXT_STREAM_BUDGET_MS)
  for (let i = 0; i < tokens.length; i += groupSize) {
    writer.write(textDelta(id, tokens.slice(i, i + groupSize).join("")))
    if (i + groupSize < tokens.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  writer.write(textEnd(id))
}

/**
 * Gemini'nin thought summary'sini kullanıcıya kelime kelime akıt. generateObject
 * sonrası bütün halinde elimize geçtiği için yapay bir gecikme ile word-by-word
 * yayınlanır — kullanıcı modelin düşündüğü adımları okuyabilsin. Reasoning sonuç
 * KARTINDAN ÖNCE yayınlandığı için toplam gecikme REASONING_STREAM_BUDGET_MS ile
 * sınırlandırılır: uzun bir özet kartın görünmesini saniyelerce geciktirmesin.
 */
async function emitReasoning(writer: WriterLike, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  const id = nanoid()
  writer.write(reasoningStart(id))
  const tokens = trimmed.match(/\S+\s*/g) ?? [trimmed]
  const groupSize = 2
  const gaps = Math.max(0, Math.ceil(tokens.length / groupSize) - 1)
  const delayMs = perStepDelay(gaps, 22, REASONING_STREAM_BUDGET_MS)
  for (let i = 0; i < tokens.length; i += groupSize) {
    writer.write(reasoningDelta(id, tokens.slice(i, i + groupSize).join("")))
    if (i + groupSize < tokens.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  writer.write(reasoningEnd(id))
}
