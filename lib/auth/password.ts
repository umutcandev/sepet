import { hash, verify } from "@node-rs/argon2"
import { z } from "zod"

// argon2id parametreleri (OWASP asgarisi: 19 MiB bellek, 2 iterasyon, 1 paralel).
// @node-rs/argon2 prebuilt napi binary kullanır → Vercel'de derleme gerektirmez
// (next.config serverExternalPackages ile bundle dışında tutulur). Build sorununda
// bu iki sarmalayıcı fonksiyonun içi tek dosyalık bir bcryptjs geçişiyle değişebilir.
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTS)
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    // Parametreler hash dizesinde kodlu olduğundan verify'a ayrıca geçmeye gerek
    // yok; bozuk/uyumsuz hash gelirse throw yerine false döneriz.
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

// Var olmayan e-posta (veya passwordHash'i olmayan hesap) için de gerçek bir
// argon2 doğrulaması çalıştırıp yanıt süresini eşitler → timing ile kullanıcı
// enumeration'ı engellenir. İlk çağrıda bir kez hesaplanır ve süreç ömrü boyunca
// cache'lenir (deterministik sabit metinden türetildiği için değer önemsiz).
let dummyHashCache: Promise<string> | undefined
export function dummyHash(): Promise<string> {
  return (dummyHashCache ??= hashPassword(
    "sepet::timing-safety::do-not-use::c9f1a4e7",
  ))
}

// Zod şifre kuralı: 8-128 karakter, en az bir harf ve bir rakam. Türkçe mesajlar.
export const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı.")
  .max(128, "Şifre en fazla 128 karakter olabilir.")
  .regex(/\p{L}/u, "Şifre en az bir harf içermeli.")
  .regex(/[0-9]/, "Şifre en az bir rakam içermeli.")
