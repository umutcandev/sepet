import { parseSummary, recommendedPlan } from "@/lib/basket-plan"

/**
 * Asistanın "hafızası": sohbetin önceki turlarını, metin turunu ayrıştıran
 * modele (PARSE_PROMPT) verilecek kısa bir dökümle özetler.
 *
 * Eskiden model yalnızca son mesajı görüyordu. "Selam, canım peynirli börek
 * çekti" → "listeyi sen hazırla" akışında ikinci mesajda börekten habersizdi
 * ve listeyi tekrar istiyordu; kullanıcı aynı şeyi üçüncü kez söylemek
 * zorunda kalıyordu. "Bir de ayran ekle" gibi düzenlemeler de önceki listeyi
 * bilmeden yapılamıyordu.
 *
 * Döküm istemcinin gönderdiği mesajlardan kurulur, yani kullanıcının kendi
 * girdisidir; o yüzden boyu sınırlanır ve onay payload'ları gibi yapısal
 * alanlar tipleri tek tek doğrulanarak okunur.
 */

type PartLike = {
  type: string
  text?: unknown
  state?: unknown
  output?: unknown
  mediaType?: unknown
}

export type ContextMessage = {
  role: string
  parts?: readonly PartLike[]
  metadata?: unknown
}

/** En fazla bu kadar önceki mesaj dökülür; daha eskisi son mesajı nadiren açıklar. */
const MAX_MESSAGES = 12
/** Tek satırın üst sınırı (karakter). */
const MAX_LINE = 400
/** Dökümün toplam üst sınırı; aşılırsa en eski satırlar düşer. */
const MAX_TOTAL = 4000
/** Bir listenin özetinde yazılacak en fazla kalem. */
const MAX_ITEMS = 25

function clip(text: string, max = MAX_LINE): string {
  const t = text.replace(/\s+/g, " ").trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

function formatQuantity(quantity: unknown, unit: unknown): string {
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) return ""
  const q = quantity.toLocaleString("tr-TR", { maximumFractionDigits: 2 })
  return typeof unit === "string" && unit ? `${q} ${unit}` : q
}

/**
 * Kalem listesini "yufka 1 paket, beyaz peynir 250 g" biçiminde yazar. Taslak
 * kalemlerinde ad `name`, onay payload'ında `rawName` alanındadır.
 */
function formatItems(items: unknown): string {
  if (!Array.isArray(items)) return ""
  const out: string[] = []
  for (const raw of items.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== "object") continue
    const it = raw as Record<string, unknown>
    const name =
      typeof it.name === "string"
        ? it.name
        : typeof it.rawName === "string"
          ? it.rawName
          : ""
    if (!name.trim()) continue
    const qty = formatQuantity(it.quantity, it.unit)
    // Not, kalemi revize ederken korunması gereken veridir (bkz. PARSE_PROMPT
    // bağlam kuralları); dökümde görünmezse model onu sessizce düşürür.
    const note =
      typeof it.note === "string" && it.note.trim()
        ? ` (not: ${clip(it.note, 80)})`
        : ""
    out.push(`${qty ? `${name.trim()} ${qty}` : name.trim()}${note}`)
  }
  if (items.length > MAX_ITEMS)
    out.push(`ve ${items.length - MAX_ITEMS} kalem daha`)
  return out.join(", ")
}

function textOf(parts: readonly PartLike[]): string {
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join(" ")
}

function outputOf(parts: readonly PartLike[], type: string): unknown {
  return parts.find((p) => p.type === type && p.state === "output-available")
    ?.output
}

function userLines(m: ContextMessage): string[] {
  const parts = m.parts ?? []
  const meta = (m.metadata ?? null) as {
    kind?: unknown
    payload?: { items?: unknown }
  } | null
  if (meta?.kind === "basketApproval") {
    const items = formatItems(meta.payload?.items)
    return items ? [`[Kullanıcı sepeti onayladı: ${clip(items)}]`] : []
  }
  if (meta?.kind === "receiptApproval") {
    const items = formatItems(meta.payload?.items)
    return items
      ? [`[Kullanıcı fişteki kalemleri onayladı: ${clip(items)}]`]
      : []
  }
  const hasImage = parts.some(
    (p) =>
      p.type === "file" &&
      typeof p.mediaType === "string" &&
      p.mediaType.startsWith("image/")
  )
  const text = clip(textOf(parts))
  if (hasImage) return [`Kullanıcı: (fotoğraf gönderdi) ${text}`.trim()]
  return text ? [`Kullanıcı: ${text}`] : []
}

function assistantLines(m: ContextMessage): string[] {
  const parts = m.parts ?? []
  const lines: string[] = []

  const text = clip(textOf(parts))
  if (text) lines.push(`Asistan: ${text}`)

  const draft = outputOf(parts, "tool-parseShoppingList") as
    | { items?: unknown; dishName?: unknown }
    | undefined
  const draftItems = formatItems(draft?.items)
  if (draftItems) {
    const dish =
      typeof draft?.dishName === "string" && draft.dishName.trim()
        ? ` (${draft.dishName.trim()})`
        : ""
    lines.push(`[Hazırlanan liste${dish}: ${clip(draftItems)}]`)
  }

  const products = formatPlanProducts(outputOf(parts, "tool-basketContext"))
  if (products)
    lines.push(`[Sepet Özeti'nde seçilen ürünler: ${clip(products)}]`)

  const image = outputOf(parts, "tool-analyzeImage") as
    | {
        analysis?: {
          kind?: unknown
          food?: { dishName?: unknown; items?: unknown } | null
          receipt?: { items?: unknown } | null
        }
      }
    | undefined
  const analysis = image?.analysis
  if (analysis?.kind === "food" && analysis.food) {
    const dish =
      typeof analysis.food.dishName === "string" ? analysis.food.dishName : ""
    const items = formatItems(analysis.food.items)
    if (items) {
      lines.push(
        `[Fotoğraftaki yemek${dish ? ` (${dish})` : ""} için hazırlanan liste: ${clip(items)}]`
      )
    }
  } else if (analysis?.kind === "receipt" && analysis.receipt) {
    const items = formatItems(analysis.receipt.items)
    if (items) lines.push(`[Fişten okunan kalemler: ${clip(items)}]`)
  }

  return lines
}

/**
 * Sepet Özeti'nin önerdiği plandaki ürünler: "kuru fasulye → Yurt Kuru
 * Fasulye 400 Gr (A101)". Kullanıcı "konserve olanı seçmişsin" diye itiraz
 * ettiğinde model hangi ürünün kastedildiğini ancak buradan bilir; eskiden
 * dökümde yalnızca kalem adları vardı.
 */
function formatPlanProducts(output: unknown): string {
  const ctx = output as { summary?: unknown; matches?: unknown } | undefined
  const plan = recommendedPlan(parseSummary(ctx?.summary))
  if (!plan) return ""
  const matches = Array.isArray(ctx?.matches) ? ctx.matches : []
  const out: string[] = []
  for (const a of plan.allocation.slice(0, MAX_ITEMS)) {
    const match =
      a.itemIndex != null
        ? (matches[a.itemIndex] as
            | { selection?: { userAcceptedProductIds?: unknown } | null }
            | undefined)
        : undefined
    const userPicked = Array.isArray(match?.selection?.userAcceptedProductIds)
    out.push(
      `${a.rawName} → ${a.productName} (${a.market}${userPicked ? ", kullanıcı seçti" : ""})`
    )
  }
  return out.join("; ")
}

export type PreviousListItem = {
  name: string
  searchQuery: string
  quantity: number
  unit: string
  note: string | null
}

function toListItems(items: unknown): PreviousListItem[] | null {
  if (!Array.isArray(items)) return null
  const out: PreviousListItem[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue
    const it = raw as Record<string, unknown>
    const name =
      typeof it.name === "string"
        ? it.name
        : typeof it.rawName === "string"
          ? it.rawName
          : ""
    if (!name.trim()) continue
    out.push({
      name,
      searchQuery: typeof it.searchQuery === "string" ? it.searchQuery : "",
      quantity: typeof it.quantity === "number" ? it.quantity : NaN,
      unit: typeof it.unit === "string" ? it.unit : "",
      note: typeof it.note === "string" && it.note.trim() ? it.note : null,
    })
  }
  return out
}

/**
 * Sohbette en son geçerli olan liste: son onaylanan sepet ya da son hazırlanan
 * taslak, hangisi daha yeniyse. Asistan "listeni güncelledim" demeden önce
 * gerçekten bir şeyin değişip değişmediğini bununla kıyaslar.
 */
export function lastBasketItems(
  messages: readonly ContextMessage[]
): PreviousListItem[] | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    const parts = m.parts ?? []
    if (m.role === "user") {
      const meta = (m.metadata ?? null) as {
        kind?: unknown
        payload?: { items?: unknown }
      } | null
      if (meta?.kind === "basketApproval") {
        const items = toListItems(meta.payload?.items)
        if (items) return items
      }
      continue
    }
    if (m.role !== "assistant") continue
    const draft = outputOf(parts, "tool-parseShoppingList") as
      | { items?: unknown }
      | undefined
    const draftItems = toListItems(draft?.items)
    if (draftItems && draftItems.length > 0) return draftItems
    const image = outputOf(parts, "tool-analyzeImage") as
      | { analysis?: { kind?: unknown; food?: { items?: unknown } | null } }
      | undefined
    if (image?.analysis?.kind === "food") {
      const foodItems = toListItems(image.analysis.food?.items)
      if (foodItems && foodItems.length > 0) return foodItems
    }
  }
  return null
}

/**
 * Son kullanıcı mesajından ÖNCEKİ mesajları (çağıran ayıklar) modelin
 * okuyacağı satırlara çevirir. Boş string: sohbetin ilk mesajı.
 */
export function buildConversationContext(
  messages: readonly ContextMessage[]
): string {
  const lines: string[] = []
  for (const m of messages.slice(-MAX_MESSAGES)) {
    if (m.role === "user") lines.push(...userLines(m))
    else if (m.role === "assistant") lines.push(...assistantLines(m))
  }
  let total = lines.reduce((n, l) => n + l.length + 1, 0)
  while (lines.length > 0 && total > MAX_TOTAL) {
    total -= lines.shift()!.length + 1
  }
  return lines.join("\n")
}
