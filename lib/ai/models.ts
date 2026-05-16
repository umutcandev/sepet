import { gateway } from "ai"

export const GEMINI_FLASH = "google/gemini-2.5-flash"
export const GEMINI_FLASH_LITE = "google/gemini-2.5-flash-lite"

export const geminiFlash = gateway(GEMINI_FLASH)
export const geminiFlashLite = gateway(GEMINI_FLASH_LITE)
