import type { UIMessageChunk } from "ai"

/**
 * Stream chunk'larını TEK yerden, tip güvenli üreten yardımcılar.
 *
 * Asistan turn'ü SDK'nın tool-loop'unu kullanmıyor; chunk'ları deterministik
 * orkestrasyonla elle yazıyoruz. Eskiden bu chunk literal'leri route.ts boyunca
 * dağılmış `as AnyChunk` cast'leriyle yazılıyordu — AI SDK chunk şekli değişirse
 * (büyük sürüm yükseltmesi) derleyici uyarmazdı. Artık tüm chunk üretimi bu
 * fonksiyonların ardında: şekil değişirse derleyici BURADA, tek noktada patlar.
 */

export function textStart(id: string): UIMessageChunk {
  return { type: "text-start", id }
}

export function textDelta(id: string, delta: string): UIMessageChunk {
  return { type: "text-delta", id, delta }
}

export function textEnd(id: string): UIMessageChunk {
  return { type: "text-end", id }
}

export function reasoningStart(id: string): UIMessageChunk {
  return { type: "reasoning-start", id }
}

export function reasoningDelta(id: string, delta: string): UIMessageChunk {
  return { type: "reasoning-delta", id, delta }
}

export function reasoningEnd(id: string): UIMessageChunk {
  return { type: "reasoning-end", id }
}

export function toolInputAvailable(
  toolCallId: string,
  toolName: string,
  input: unknown,
): UIMessageChunk {
  return { type: "tool-input-available", toolCallId, toolName, input }
}

export function toolOutputAvailable(
  toolCallId: string,
  output: unknown,
): UIMessageChunk {
  return { type: "tool-output-available", toolCallId, output }
}

export function toolOutputError(
  toolCallId: string,
  errorText: string,
): UIMessageChunk {
  return { type: "tool-output-error", toolCallId, errorText }
}

/**
 * Transient `data-*` part'ı (conversation id/başlık/durum senkronu). Client
 * store'u anında günceller; mesaj part'ı olarak kalıcılaşmaz. Default UIDataTypes
 * gevşek tiplendiği için `data` burada `unknown` — cast gerekmez.
 */
export function dataPart(
  name: string,
  data: unknown,
  transient = true,
): UIMessageChunk {
  return { type: `data-${name}`, data, transient }
}
