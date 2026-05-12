import { createGoogleGenerativeAI } from "@ai-sdk/google"

export const GEMINI_FLASH = "gemini-2.5-flash"
export const GEMINI_FLASH_LITE = "gemini-2.5-flash-lite"

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const geminiFlash = google(GEMINI_FLASH)
export const geminiFlashLite = google(GEMINI_FLASH_LITE)
