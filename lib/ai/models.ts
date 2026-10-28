import { anthropic } from "@ai-sdk/anthropic"
import { gateway, type generateText, type LanguageModel } from "ai"

type ProviderOptions = NonNullable<Parameters<typeof generateText>[0]["providerOptions"]>
/** Ses transkripsiyonu (Claude ses almaz) ve liste ayrıştırma, başlık, öneri çağrılarının yedeği. */
export const GEMINI_FLASH_LITE = "google/gemini-2.5-flash-lite"
export const geminiFlashLite = gateway(GEMINI_FLASH_LITE)

export const GEMINI_FLASH = "google/gemini-2.5-flash"
export const FLASH_THINKING_BUDGET = 2048
export const AI_MAX_RETRIES = 2

export const CLAUDE_HAIKU = "anthropic/claude-haiku-5-5"
export const MATCH_MODEL = CLAUDE_HAIKU
export const VISION_MODEL = CLAUDE_HAIKU
export const OCR_MODEL_NAME = VISION_MODEL.replace(/^[^/]+\//, "")
export type ClaudeEffort = "low" | "medium" | "high" | "xhigh" | "max"
/** medium ve high holdout'ta low'dan iyi değil, ama 8 kalemde 34 sn → 43/55+ sn. */
export const CLAUDE_EFFORT: ClaudeEffort = "low"

export const isClaude = (modelId: string) => modelId.startsWith("anthropic/")
export const resolveModel = (modelId: string): LanguageModel =>
  isClaude(modelId) ? anthropic(modelId.slice("anthropic/".length)) : gateway(modelId)

/** Claude örnekleme parametresi almaz ve düşünmeyi effort ayarlar (budget 0 → kapalı); Gemini'de thinking budget. */
export function modelSettings(
  modelId: string,
  s: { temperature: number; thinkingBudget: number; effort?: ClaudeEffort },
): { temperature?: number; providerOptions: ProviderOptions } {
  return isClaude(modelId)
    ? {
        providerOptions: {
          anthropic: {
            effort: s.effort ?? CLAUDE_EFFORT,
            thinking: s.thinkingBudget === 0 ? { type: "disabled" } : undefined,
          },
        },
      }
    : {
        temperature: s.temperature,
        providerOptions: {
          google: { thinkingConfig: { thinkingBudget: s.thinkingBudget } },
        },
      }
}

export type AiCallOptions = {
  signal?: AbortSignal
  maxRetries?: number
  /** Yalnız eval koşucusu için (--model): üretim varsayılanı geçersiz kılar, Flash yedeği devre dışı kalır. */
  model?: LanguageModel
  modelId?: string
  /**
   * Yalnız eval koşucusu için (--thinking). Verilmezse modelin KENDİ
   * varsayılanı geçerli: flash-lite kapalı, flash açık. Bu fark tek başına
   * çıktı token'ını ~9 katına çıkarıyor, yani maliyet karşılaştırmasında
   * model değişimiyle karıştırılmamalı. Claude'da yalnız 0 anlamlı: düşünme kapalı.
   */
  thinkingBudget?: number
  /** Yalnız eval koşucusu için (--effort); verilmezse CLAUDE_EFFORT. */
  effort?: ClaudeEffort
}
