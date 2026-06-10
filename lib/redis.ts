import { Redis } from "@upstash/redis"

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error(
    "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN is not set",
  )
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Marketfiyati ücretsiz ve veriler ~günlük güncelleniyor — "kredi koruma" için
// uzun TTL'e gerek yok; daha kısa TTL = daha güncel fiyat.
export const MF_SEARCH_TTL = 60 * 60 // 1 saat
export const MF_PRODUCT_TTL = 60 * 60 * 3 // 3 saat
export const MF_MATCH_TTL = 60 * 60 * 3 // 3 saat — product cache ile senkron
export const MF_NEAREST_TTL = 60 * 60 * 24 // 24 saat
export const MF_BARCODE_TTL = 60 * 60 * 24 * 30 // 30 gün — barkod→id değişmez
