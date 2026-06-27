import { gateway } from "ai"

export const GEMINI_FLASH = "google/gemini-2.5-flash"
export const GEMINI_FLASH_LITE = "google/gemini-2.5-flash-lite"

export const geminiFlash = gateway(GEMINI_FLASH)
export const geminiFlashLite = gateway(GEMINI_FLASH_LITE)

/**
 * Her LLM çağrısının retry sayısı. AI SDK varsayılanı 2'dir; burada AÇIK ve TEK
 * yerden ayarlanabilir tutuyoruz çünkü onay turunda çağrılar SIRALI zincirleniyor
 * (lookupProducts → selectMatches) ve route `maxDuration=60` ile sınırlı. Üst üste
 * binen exponential backoff + 503/429 retry'leri bu duvara yaklaşabilir; tamponu
 * daraltmak/genişletmek gerekirse burayı değiştir (telemetri `ms=` değerleri ile
 * birlikte izlenir).
 */
export const AI_MAX_RETRIES = 2

/**
 * Tüm LLM yardımcı fonksiyonlarına geçirilen ortak çağrı seçenekleri. `signal`
 * istek iptalinde (kullanıcı sekmeyi kapatınca / stream abort) arka plandaki
 * generateObject çağrısını durdurup boşa token yakmayı engeller.
 */
export type AiCallOptions = {
  signal?: AbortSignal
  maxRetries?: number
}
