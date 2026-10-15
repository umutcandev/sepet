import type { ConversationStatus } from "./conversation-status"

/**
 * Kullanıcının Stop ile kestiği asistan turu.
 *
 * İstemci iptal edince bağlantı kapanır; sunucu o ana kadar akıttığı part'ları
 * bu işaretle birlikte kaydeder. Canlı oturumda istemci aynı durumu useChat'in
 * `onFinish({ isAbort })` sinyalinden bilir, yeniden yüklenen sohbette bu
 * part'tan. İki taraf da aşağıdaki kurallarla aynı sonuca varır: hangi kart
 * yeniden açılır, sohbetin sidebar durumu ne olur.
 */
export const STOPPED_PART_TYPE = "data-stopped"

export type PartLike = {
  type: string
  state?: string
  output?: unknown
}

export type MessageLike = {
  id: string
  role: string
  parts: readonly PartLike[]
  metadata?: unknown
}

export type ApprovalKind = "basketApproval" | "receiptApproval"

export function hasStoppedMarker(parts: readonly PartLike[]): boolean {
  return parts.some((p) => p.type === STOPPED_PART_TYPE)
}

function outputOf(parts: readonly PartLike[], type: string): unknown {
  const part = parts.find(
    (p) => p.type === type && p.state === "output-available"
  )
  return part?.output
}

/** Tur terminal sonucunu (Sepet Özeti / fiş karşılaştırması) üretti mi. */
export function hasTurnResult(parts: readonly PartLike[]): boolean {
  return (
    outputOf(parts, "tool-summarizeOptimization") !== undefined ||
    outputOf(parts, "tool-receiptComparison") !== undefined
  )
}

/**
 * Tur kullanıcıdan onay bekleyen bir kart (sepet/fiş/yemek) gösterdi mi.
 * Sunucunun normal turda döndürdüğü `awaiting` ile aynı koşullar.
 */
export function hasApprovalCard(parts: readonly PartLike[]): boolean {
  const draft = outputOf(parts, "tool-parseShoppingList") as
    | { items?: unknown[] }
    | undefined
  if ((draft?.items?.length ?? 0) > 0) return true
  if (outputOf(parts, "tool-parseReceipt") !== undefined) return true
  const image = outputOf(parts, "tool-analyzeImage") as
    | {
        analysis?: {
          kind?: string
          receipt?: { items?: unknown[] } | null
          food?: { items?: unknown[] } | null
        }
      }
    | undefined
  const a = image?.analysis
  if (a?.kind === "receipt") return (a.receipt?.items?.length ?? 0) > 0
  if (a?.kind === "food") return (a.food?.items?.length ?? 0) > 0
  return false
}

export function approvalKind(message: MessageLike): ApprovalKind | null {
  if (message.role !== "user") return null
  const kind = (message.metadata as { kind?: unknown } | null | undefined)?.kind
  return kind === "basketApproval" || kind === "receiptApproval" ? kind : null
}

/**
 * Durdurulan turun ardından sohbetin sidebar durumu. Onay turu sonuç
 * üretmeden kesildiyse kart yeniden açılır (bkz. resolveApprovalCard), yani
 * sohbet hâlâ kullanıcıyı bekliyor.
 */
export function statusAfterStop(
  parts: readonly PartLike[],
  approvalTurn: boolean
): ConversationStatus {
  if (hasTurnResult(parts)) return "completed"
  return approvalTurn || hasApprovalCard(parts) ? "awaiting" : "completed"
}

/**
 * `index`teki asistan mesajının onay kartı kilitli mi ve en son hangi onayla
 * gönderildi.
 *
 * Kart, ardından gelen onay turu cevaplanınca kilitlenir. Cevap Stop ile
 * sonuç üretmeden kesildiyse (ya da hiç gelmediyse) kart yeniden açılır:
 * kullanıcı listeyi baştan yazmadan düzeltip tekrar onaylayabilsin. Açılan
 * kart son gönderilen kalemleri gösterir. Kullanıcı arada başka bir şey
 * yazdıysa kart eskisi gibi kilitli kalır.
 */
export function resolveApprovalCard(
  messages: readonly MessageLike[],
  index: number,
  opts: { busy: boolean; isStopped: (message: MessageLike) => boolean }
): { locked: boolean; approval: MessageLike | null } {
  let approval: MessageLike | null = null
  for (let j = index + 1; j < messages.length; j++) {
    const next = messages[j]
    if (next.role === "user") {
      if (!approvalKind(next)) return { locked: true, approval }
      approval = next
      continue
    }
    if (opts.isStopped(next) && !hasTurnResult(next.parts)) continue
    return { locked: true, approval }
  }
  // Sohbetin sonu: onay yoksa kart açık; onay varsa yalnızca o istek hâlâ
  // sürüyorsa kilitli.
  return { locked: approval !== null && opts.busy, approval }
}
