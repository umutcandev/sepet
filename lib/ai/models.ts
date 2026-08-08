import { gateway } from "ai"
export const GEMINI_FLASH_LITE = "google/gemini-2.5-flash-lite"
export const geminiFlashLite = gateway(GEMINI_FLASH_LITE)
export const OCR_MODEL_NAME = GEMINI_FLASH_LITE.replace(/^[^/]+\//, "")
export const AI_MAX_RETRIES = 2
export type AiCallOptions = {
  signal?: AbortSignal
  maxRetries?: number
}
