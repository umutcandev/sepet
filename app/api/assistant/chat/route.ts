import { NextResponse } from "next/server"
import {
  APICallError,
  NoObjectGeneratedError,
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
  MAX_APPROVAL_ITEMS,
  MAX_ITEM_NAME,
  MAX_SEARCH_QUERY,
} from "@/lib/assistant/approval-limits"
import type { AiCallOptions } from "@/lib/ai/models"
import {
  generateChatTitle,
  parseShoppingList,
  analyzeImage,
  lookupProducts,
  suggestQueries,
} from "@/lib/ai/tools"
import { packageSizeOf } from "@/lib/ai/effective-cost"
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
import { buildDraftText, buildSummaryText } from "@/lib/assistant/summary-text"
import {
  buildConversationContext,
  lastBasketItems,
  type PreviousListItem,
} from "@/lib/assistant/conversation-context"
import { collectUserSelections } from "@/lib/assistant/user-selections"
import type { CarriedSelection } from "@/lib/ai/match-result"
import {
  buildReceiptComparisonText,
  computeReceiptComparison,
} from "@/lib/assistant/receipt-comparison"
import {
  STOPPED_PART_TYPE,
  approvalKind,
  statusAfterStop,
} from "@/lib/assistant/turn-state"
import { isAbortError, logError } from "@/lib/ai/telemetry"
import { getUserLocationContext } from "@/lib/auth/location"
import type { LocationContext } from "@/lib/marketfiyati/client"
import type { BasketDraft, ImageAnalysis, ParsedItem } from "@/lib/ai/schemas"
import { createConversation } from "@/lib/actions/conversations"
import {
  appendMessages,
  setConversationTitle,
  setConversationStatus,
} from "@/lib/data/conversations"
import type { ConversationStatus } from "@/lib/assistant/conversation-status"
import { and, eq } from "drizzle-orm"
import { db, conversations } from "@/lib/db"
import { reserveQuota, refundQuota } from "@/lib/usage/usage"
import type { MeteredMetric } from "@/lib/usage/limits"

export const runtime = "nodejs"
// Haiku eşleştirme parçası ~35 sn; uzun listede arama ve Flash yedeğiyle 60 sn
// yetmeyebiliyor. Hobby + Fluid compute tavanı 300 sn.
export const maxDuration = 120

const FALLBACK_TEXT =
  "Ne almak ya da pişirmek istediğini söylersen hemen bakarım. Örneğin: 2 ekmek, 1 lt süt, 500 g beyaz peynir."

const MODEL_BUSY_TEXT =
  "Yapay zeka servisi şu an yoğun (geçici bir durum). Birkaç dakika sonra tekrar dener misin?"

/**
 * Kota iadesi alan hata mı. İptal almaz (bkz. refundReservation). Model
 * çıktısının şemaya uymaması / kesilmesi (NoObjectGeneratedError) de almaz:
 * çağrı tamamlanmış, token faturalanmıştır. İade edilseydi bu hatayı
 * güvenilir biçimde tetikleyebilen bir girdi pahalı çağrıyı bedavaya çevirirdi.
 */
function isRefundableError(err: unknown): boolean {
  return !isAbortError(err) && !NoObjectGeneratedError.isInstance(err)
}

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
    note?: string | null
  }>
}

// Onay payload'ları client'tan ham JSON olarak gelir; hesaba girmeden önce
// runtime'da doğrula (TS cast yeterli değil). quantity/fiyatlar sonlu sayı
// olmalı — NaN/Infinity/negatif değerler kayıtlı veriyi bozmasın.
const finiteNum = z.number().refine(Number.isFinite, "sonlu sayı olmalı")
const unitSchema = z.enum(UNIT_VALUES)

// Boyut tavanları (bkz. lib/assistant/approval-limits.ts). Kalem sayısı
// aşılırsa istek reddedilir; metin alanları sessizce kırpılır (kartlardaki
// bir giriş alanı sınırı kaçırsa bile onay reddedilmesin). Kalem metinlerinin
// prompt'a güvenli basılması lib/ai/prompts.ts'te.
const cappedText = (max: number) =>
  z.string().transform((s) => s.slice(0, max))
// Serbest metin turu: tek mesaj parse modeline olduğu gibi gider.
const MAX_INPUT_TEXT = 4000
// Son kullanıcı mesajı (parts + metadata) AI çağrısından önce, olduğu gibi
// kaydedilir; kota yalnız tur başarılı olursa düşer (başarısız turda iade).
// Boyut burada sınırlanır ki istek gövdesi kadar büyük satırlar paylaşılan
// veritabanına bedavaya yazılamasın. Metin/görsel turu en fazla MAX_INPUT_TEXT
// karakter metin + bir dosya parçası taşır; onay turlarının tavanı en büyük
// meşru payload'ın (100 kalem) rahatça üstünde.
const MAX_USER_MESSAGE_CHARS = { input: 16_000, approval: 128_000 }

const basketApprovalPayloadSchema = z.object({
  items: z
    .array(
      z.object({
        rawName: cappedText(MAX_ITEM_NAME),
        searchQuery: cappedText(MAX_SEARCH_QUERY),
        quantity: finiteNum.refine((n) => n >= 0, "negatif olamaz"),
        unit: unitSchema,
        // Eşleştirme modeline giden tercih notu. Prompt'a tek satır olarak
        // basıldığından uzunluğu sınırlı.
        note: z.string().max(200).nullish(),
      }),
    )
    .max(MAX_APPROVAL_ITEMS),
})

const receiptApprovalPayloadSchema = z.object({
  receiptImageUrl: z.string().max(2048),
  receiptImageR2Key: z.string().max(512),
  marketName: cappedText(MAX_ITEM_NAME).nullable(),
  purchaseDate: z.string().max(64).nullable(),
  totalAmount: finiteNum.nullable(),
  items: z
    .array(
      z.object({
        rawName: cappedText(MAX_ITEM_NAME),
        searchQuery: cappedText(MAX_SEARCH_QUERY),
        quantity: finiteNum.refine((n) => n >= 0, "negatif olamaz"),
        unit: unitSchema,
        unitPrice: finiteNum.nullable(),
        totalPrice: finiteNum.nullable(),
      }),
    )
    .max(MAX_APPROVAL_ITEMS),
})

const CONVERSATION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  // Onay payload'larını hesaba/kayda almadan önce runtime'da doğrula. Bundan
  // sonra ham payload değil, doğrulanmış (yalnız bilinen alanlar) hali
  // kullanılır.
  if (mode.kind === "receiptApproval") {
    const parsed = receiptApprovalPayloadSchema.safeParse(mode.payload)
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
    }
    mode.payload = parsed.data
    // Onay turunda sunucu görseli fetch etmez, ama aynı URL tool çıktısıyla
    // istemciye geri döner ve oradan saveReceipt'e gider. Sahiplik burada da
    // zorlanır ki iki uçtan biri atlanamasın.
    if (!isOwnedReceiptUrl(mode.payload.receiptImageUrl, userId)) {
      return NextResponse.json({ error: "invalid_image_url" }, { status: 400 })
    }
  }
  if (mode.kind === "basketApproval") {
    const parsed = basketApprovalPayloadSchema.safeParse(mode.payload)
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
    }
    mode.payload = parsed.data
  }
  if (
    (mode.kind === "text" || mode.kind === "receiptImage") &&
    mode.text.length > MAX_INPUT_TEXT
  ) {
    return NextResponse.json({ error: "input_too_long" }, { status: 400 })
  }
  if (
    payload.conversationId !== undefined &&
    (typeof payload.conversationId !== "string" ||
      !CONVERSATION_ID_RE.test(payload.conversationId))
  ) {
    return NextResponse.json(
      { error: "conversation_not_found" },
      { status: 404 },
    )
  }

  const lastUserMessage = findLastUserMessage(messages)
  if (!lastUserMessage) {
    return NextResponse.json({ error: "no_user_message" }, { status: 400 })
  }
  if (
    JSON.stringify({
      parts: lastUserMessage.parts,
      metadata: (lastUserMessage as { metadata?: unknown }).metadata,
    }).length >
    (mode.kind === "text" || mode.kind === "receiptImage"
      ? MAX_USER_MESSAGE_CHARS.input
      : MAX_USER_MESSAGE_CHARS.approval)
  ) {
    return NextResponse.json({ error: "input_too_long" }, { status: 413 })
  }
  // Metin turunun hafızası: son mesajdan önceki konuşma (bkz.
  // buildConversationContext). Yalnızca metin turunda modele gider.
  const earlier = messages.slice(0, messages.lastIndexOf(lastUserMessage))
  const history = mode.kind === "text" ? buildConversationContext(earlier) : ""
  // Metin turunda taslak cümlesi gerçekte neyin değiştiğini söyleyebilsin diye
  // sohbetteki son liste (bkz. buildDraftText).
  const previousItems = mode.kind === "text" ? lastBasketItems(earlier) : null
  // Sepet onayında: kullanıcının önceki Sepet Özeti'lerinde elle seçtiği
  // ürünler. Aynı kalem yeniden eşleştirilirken asistana bırakılmaz.
  const carried =
    mode.kind === "basketApproval"
      ? collectUserSelections(earlier)
      : new Map<string, CarriedSelection>()

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
      await refundQuota(userId, meteredMetric, reservation.period).catch(() => {})
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
    logError("[assistant/chat] user message persist failed", err)
  }

  // İstek iptal sinyali — kullanıcı sekmeyi kapatınca / stream abort olunca
  // tetiklenir. LLM çağrılarına bağlanır ki arka planda boşa token/maliyet
  // yakılmasın (özellikle onay turundaki selectMatches).
  const requestSignal = req.signal

  /**
   * Kota iadesi — YALNIZCA bizim tarafımızdan kaynaklanan başarısızlıklarda.
   *
   * İstek iptal edildiyse iade YOK: model çağrısı çoktan gönderilmiştir ve
   * token faturası yanmıştır. İade edilseydi "istek at → hemen abort et"
   * döngüsü kotayı hiç tüketmeden sınırsız AI maliyeti üretirdi (kota bu
   * uçtaki tek maliyet tavanı olduğu için bu delik kritikti).
   *
   * Model 503/429 ve bizim taraftaki istisnalar iade ALIR — orada kullanıcı bir
   * çıktı almadı ve hatanın sahibi biziz. Model çıktısının parse edilememesi
   * (NoObjectGeneratedError) almaz: token yanmıştır (bkz. isRefundableError).
   */
  const refundReservation = async (err?: unknown) => {
    if (requestSignal?.aborted || (err !== undefined && !isRefundableError(err)))
      return
    await refundQuota(userId, meteredMetric, reservation.period).catch(() => {})
  }

  const newConversationId = conversationId
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const recorder = createAssistantRecorder()
      const wrappedWriter = wrapWriter(writer, recorder, requestSignal)

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
          logError("[assistant/chat] title persist failed", err)
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
            if (!isAbortError(err)) {
              logError("[assistant/chat] title generation failed", err)
            }
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
            history,
            previousItems,
            carried,
            loc,
            userId,
            onImageKind: handleImageKind,
            signal: requestSignal,
          }),
          titlePromise,
        ])
        turn = result
      } catch (err) {
        // Sert hata (örn. lookupProducts exception) çıktı üretilmeden düştü →
        // rezerve edilen slotu iade et, sonra hatayı stream onError'a ilet.
        // İptal kaynaklı hatalar refundReservation içinde elenir.
        await refundReservation(err)
        throw err
      }
      // Turn içeride yakalanan bir sert AI hatasıyla (model 503/429, parse
      // exception) bittiyse de slotu iade et — başarısız istek kotayı yakmasın.
      // runAssistantTurn iptali `hardError` saymaz (bkz. isAbortError).
      if (turn.hardError) {
        await refundReservation()
      }

      // Kullanıcı Stop'a bastıysa istemci bağlantıyı kesti: kayıt, istemcinin
      // o ana kadar gördüğüyle aynı olsun (wrapWriter iptalden sonrasını
      // yazmıyor) ve turun yarıda kaldığı işaretlensin. Aksi halde sayfa
      // yenilenince durdurulan cevap tamamlanmış gibi geri gelirdi.
      const stopped = requestSignal.aborted
      // Persist the assistant message before signalling finish.
      const parts = stopped ? recorder.finalizeStopped() : recorder.finalize()
      if (parts.length > 0) {
        try {
          await appendMessages(newConversationId, userId, [
            { role: "assistant", parts },
          ])
        } catch (err) {
          logError("[assistant/chat] assistant message persist failed", err)
        }
      }

      // Sidebar ikon durumunu yaz ve client'a transient event olarak ilet —
      // store anında güncellensin (RSC refresh gerektirmeden). Turn bir onay
      // kartında bittiyse "awaiting", terminal sonuçta bittiyse "completed".
      const status: ConversationStatus = stopped
        ? statusAfterStop(parts, approvalKind(lastUserMessage) !== null)
        : turn.awaiting
          ? "awaiting"
          : "completed"
      try {
        await setConversationStatus(newConversationId, userId, status)
      } catch (err) {
        logError("[assistant/chat] status persist failed", err)
      }
      writer.write(dataPart("conversation-status", { id: newConversationId, status }))

      writer.write({ type: "finish" })
    },
    onError: (error) => {
      logError("[assistant/chat] stream error", error)
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
type StoredStoppedPart = { type: typeof STOPPED_PART_TYPE; data: object }
type StoredPart =
  | StoredTextPart
  | StoredReasoningPart
  | StoredFilePart
  | StoredToolPart
  | StoredStoppedPart

type AssistantRecorder = {
  handle: (chunk: UIMessageChunk) => void
  finalize: () => StoredPart[]
  /**
   * Durdurulan tur: yalnız tamamlanmış part'lar kalır (çıktısı gelmemiş tool
   * çağrısı yeniden yüklemede sonsuz bir "yükleniyor" demek olurdu) ve sonuna
   * durdurma işareti eklenir.
   */
  finalizeStopped: () => StoredPart[]
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

  function finalizeStopped(): StoredPart[] {
    const kept: StoredPart[] = []
    for (const p of parts) {
      if (p.type === "text") {
        if ((p as StoredTextPart).text) kept.push(p)
      } else if (p.type === "reasoning") {
        const r = p as StoredReasoningPart
        if (r.text) kept.push({ ...r, state: "done" })
      } else if ((p as StoredToolPart).state !== "input-available") {
        kept.push(p)
      }
    }
    kept.push({ type: STOPPED_PART_TYPE, data: {} })
    return kept
  }

  return { handle, finalize: () => parts, finalizeStopped }
}

type WriterLike = Pick<UIMessageStreamWriter, "write">

function wrapWriter(
  writer: UIMessageStreamWriter,
  recorder: AssistantRecorder,
  signal: AbortSignal,
): WriterLike {
  return {
    write(chunk) {
      // İptalden sonra yazılan hiçbir şey istemciye ulaşmıyor; kayda da
      // girmesin.
      if (signal.aborted) return
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

/**
 * Kullanıcı Stop'a bastı: kalan adımlar (eşleştirme sonrası hesap, metin)
 * çalıştırılmaz. Sidebar durumu bu dönüşten değil kaydedilen part'lardan
 * çıkarılır (bkz. statusAfterStop), o yüzden `awaiting` burada önemsiz.
 */
const STOPPED_TURN: TurnResult = { awaiting: false }

async function runAssistantTurn({
  writer,
  mode,
  history,
  previousItems,
  carried,
  loc,
  userId,
  onImageKind,
  signal,
}: {
  writer: WriterLike
  mode: Exclude<LastUserMode, { kind: "empty" }>
  /** Önceki konuşmanın özeti; yalnızca metin turunda kullanılır. */
  history: string
  /** Sohbetteki son liste; yalnızca metin turunda kullanılır. */
  previousItems: PreviousListItem[] | null
  /** Kullanıcının önceki turlarda elle seçtiği ürünler; sepet onayında. */
  carried: ReadonlyMap<string, CarriedSelection>
  loc: LocationContext
  /** Kullanıcıya özel match-cache kapsamı (bkz. lookupProducts). */
  userId: string
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
      if (signal?.aborted) return STOPPED_TURN
      logError("[assistant/chat] image analysis failed", err)
      writer.write(
        toolOutputError(
          analyzeCallId,
          isModelOverloaded(err)
            ? MODEL_BUSY_TEXT
            : "Görseli okuyamadım. Daha net bir fotoğrafla tekrar deneyebilir misin?",
        ),
      )
      if (onImageKind) await onImageKind("unknown")
      // Çıktı üretilmeden düşen AI hatası → kota slotu iade edilir. İptal
      // (kullanıcı sekmeyi kapattı / stream'i kesti) hardError DEĞİLDİR: model
      // çağrısı gitti, token yandı — iade edilirse kota maliyet tavanı olmaktan
      // çıkar.
      return { awaiting: false, hardError: isRefundableError(err) }
    }
    if (signal?.aborted) return STOPPED_TURN

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
          ? "Bu fişteki ürün satırlarını okuyamadım. Satırların net göründüğü bir fotoğrafla tekrar dener misin?"
          : "Fişindeki kalemleri çıkardım. Bir göz atıp gerekirse düzeltebilirsin. Onayladığında aynı ürünleri bugünkü fiyatlarla karşılaştırırım.",
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
        `Görseldeki yemek ${food.dishName} gibi görünüyor. Evde yapman için temel malzemelerini tek porsiyona göre çıkardım, market paketleri farklı boyutta olabilir. Dilersen düzenleyebilirsin, hazır olduğunda Onayla'ya basman yeterli.`,
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
      // Fişte quantity adettir (karşılaştırma onu kullanır); eşleştirme aynı
      // boyuttaki ürünü seçsin diye boyut satırın adından okunur.
      ...(packageSizeOf(it.rawName) ?? { quantity: it.quantity, unit: it.unit }),
    }))

    const lookupCallId = nanoid()
    writer.write(
      toolInputAvailable(lookupCallId, "lookupProducts", { items: parsedItems }),
    )

    // lookupProducts iptalde patlamaz (eşleştirme LLM'i düşerse ilk adaya
    // geri döner); durdurulduysa sonucu burada bırak.
    const { matches } = await lookupProducts(
      parsedItems,
      loc,
      aiOpts,
      undefined,
      userId,
    )
    if (signal?.aborted) return STOPPED_TURN

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
      note: it.note?.trim() || null,
    }))

    const lookupCallId = nanoid()
    writer.write(
      toolInputAvailable(lookupCallId, "lookupProducts", { items: parsedItems }),
    )

    // Kullanıcının bu sohbette Sepet Özeti'nden elle seçtiği ürünler aynı
    // kalem tekrar geçince yeniden asistana bırakılmaz (bkz. collectUserSelections).
    const { matches: found } = await lookupProducts(
      parsedItems,
      loc,
      aiOpts,
      carried,
      userId,
    )
    if (signal?.aborted) return STOPPED_TURN // bkz. fiş onayındaki aynı kontrol

    // Eşleşmeyen kalemlere "… mı demek istedin?" önerisi. Fiş turunda
    // eşleşmeyenler karşılaştırma tablosunda kalıyor, orada öneri yok.
    const matches = await suggestQueries(found, loc, aiOpts)
    if (signal?.aborted) return STOPPED_TURN

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
    const result = await parseShoppingList(rawText, aiOpts, history)
    basket = result.draft
    parseReasoning = result.reasoning
  } catch (err) {
    if (signal?.aborted) return STOPPED_TURN
    logError("[assistant/chat] parse failed", err)
    const busy = isModelOverloaded(err)
    writer.write(
      toolOutputError(
        parseCallId,
        busy ? MODEL_BUSY_TEXT : "Listeyi okuyamadım, tekrar yazabilir misin?",
      ),
    )
    await emitText(writer, busy ? MODEL_BUSY_TEXT : FALLBACK_TEXT)
    // Çıktı üretilmeden düşen AI hatası → kota slotu iade edilir. İptal
    // hardError DEĞİLDİR (bkz. receiptImage kolundaki aynı gerekçe).
    return { awaiting: false, hardError: isRefundableError(err) }
  }
  if (signal?.aborted) return STOPPED_TURN

  if (parseReasoning) {
    await emitReasoning(writer, parseReasoning)
  }

  writer.write(toolOutputAvailable(parseCallId, basket))

  if (basket.items.length === 0) {
    await emitText(writer, basket.chatResponse?.trim() || FALLBACK_TEXT)
    return { awaiting: false }
  }

  await emitText(writer, buildDraftText(basket, previousItems))
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
 * Modelin kullanıcıya yazdığı "Düşündüm" notunu (bkz. lib/ai/user-thought.ts)
 * kelime kelime akıt. generateObject sonrası bütün halinde elimize geçtiği için
 * yapay bir gecikme ile word-by-word yayınlanır. Reasoning sonuç
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
