import { gateway, type LanguageModel } from "ai"
export const GEMINI_FLASH_LITE = "google/gemini-2.5-flash-lite"
export const geminiFlashLite = gateway(GEMINI_FLASH_LITE)

/**
 * Ürün eşleştirme ve görsel analizinde kullanılır. Golden set ölçümü
 * (lib/ai/eval): aynı prompt ve aynı adaylarla flash-lite 77 ürünü yanlış
 * kabul ederken flash 3'te kalıyor.
 *
 * DÜŞÜNME BÜTÇESİ ZORUNLU: flash'ta düşünme varsayılan olarak AÇIK ve
 * sınırsıza yakın — çağrı başına ~23K çıktı token'ı yakıyor, yani kaliteyi
 * hiç artırmadan maliyeti 3,5 katına çıkarıyor. 2048'de kalite birebir aynı
 * (3 yanlış kabul, 4 kaçırma) ama maliyet %71 daha düşük. Bütçe vermeden
 * flash kullanan her yeni çağrı bu tuzağa düşer.
 */
export const GEMINI_FLASH = "google/gemini-2.5-flash"
export const geminiFlash = gateway(GEMINI_FLASH)
export const FLASH_THINKING_BUDGET = 2048
export const OCR_MODEL_NAME = GEMINI_FLASH_LITE.replace(/^[^/]+\//, "")
export const AI_MAX_RETRIES = 2
export type AiCallOptions = {
  signal?: AbortSignal
  maxRetries?: number
  /** Yalnız eval koşucusu için (--model): üretim varsayılanı geçersiz kılar. */
  model?: LanguageModel
  modelId?: string
  /**
   * Yalnız eval koşucusu için (--thinking). Verilmezse modelin KENDİ
   * varsayılanı geçerli: flash-lite kapalı, flash açık. Bu fark tek başına
   * çıktı token'ını ~9 katına çıkarıyor, yani maliyet karşılaştırmasında
   * model değişimiyle karıştırılmamalı.
   */
  thinkingBudget?: number
}
