import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto"

// Kod/token HMAC'leri AUTH_SECRET ile pepper'lanır (ayrı bir değişken gerekmez).
const rawSecret = process.env.AUTH_SECRET
if (!rawSecret) {
  throw new Error("AUTH_SECRET is not set")
}
// string-tipli binding: aşağıdaki closure'lar (hashSecret) modül kapsamındaki
// daraltmayı taşımadığı için değeri sabit-string olarak yakalıyoruz.
const secret: string = rawSecret

// E-posta normalizasyonu tek yerde: trim + lowercase. Kayıt, giriş ve doğrulama
// hep aynı biçimi kullanmalı (unique index ve token eşleşmeleri buna dayanır).
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Kriptografik olarak güvenli 6 haneli kod. Baştaki sıfırlar korunur (000123).
export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0")
}

// 32 baytlık URL-safe token (doğrulama/sıfırlama linklerinde ?token= olarak).
export function generateToken(): string {
  return randomBytes(32).toString("base64url")
}

// HMAC-SHA256 (AUTH_SECRET pepper'ı) — düz SHA-256 DEĞİL. DB dump'ı sızsa bile
// 6 haneli kod uzayı (10^6) pepper olmadan offline brute-force edilemez. Kod ve
// token DB'de yalnız bu değerle saklanır.
export function hashSecret(value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex")
}

// Sabit-süreli dizge karşılaştırması (timing saldırısı koruması). Uzunluk farkı
// erken false döner ama bu güvenli: değerler HMAC hex çıktısı (sabit uzunluk).
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}
