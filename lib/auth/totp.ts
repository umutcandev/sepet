import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
} from "node:crypto"
import * as OTPAuth from "otpauth"

import { hashSecret } from "@/lib/auth/codes"

const ISSUER = "Sepet"
const PERIOD = 30
const DIGITS = 6

// AES-256-GCM anahtarı (TOTP_ENCRYPTION_KEY, 32 bayt base64). Tembel okunur: env
// yoksa modül yüklenirken değil, yalnız 2FA işlemi çalışırken hata verir (uygulama
// TOTP_ENCRYPTION_KEY olmadan da açılır, 2FA devre dışı kalır).
function getKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY
  if (!raw) throw new Error("TOTP_ENCRYPTION_KEY is not set")
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("TOTP_ENCRYPTION_KEY 32 bayt (base64) olmalı")
  }
  return key
}

// secret (base32) → "iv.ct.tag" (base64 parçalar).
export function encryptSecret(secretB32: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ct = Buffer.concat([cipher.update(secretB32, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    iv.toString("base64"),
    ct.toString("base64"),
    tag.toString("base64"),
  ].join(".")
}

export function decryptSecret(enc: string): string {
  const key = getKey()
  const [ivB64, ctB64, tagB64] = enc.split(".")
  if (!ivB64 || !ctB64 || !tagB64) throw new Error("Bozuk TOTP secret")
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64"),
  )
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const out = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ])
  return out.toString("utf8")
}

// Yeni rastgele TOTP secret (base32, 20 bayt / 160 bit).
export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32
}

export function createTotp(secretB32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secretB32),
  })
}

// Geçerli mutlak TOTP adımı (sayaç). Replay koruması için totpLastUsedStep ile
// karşılaştırılır.
export function currentTotpStep(): number {
  return Math.floor(Date.now() / 1000 / PERIOD)
}

// Kodu window: 1 ile doğrular; eşleşen MUTLAK adımı döner (yoksa null). Çağıran,
// totpLastUsedStep'ten büyük mü diye bakıp yeni adımı yazar (aynı kodu tekrar
// oynatma engellenir).
export function verifyTotp(secretB32: string, token: string): number | null {
  const totp = createTotp(secretB32, ISSUER)
  const delta = totp.validate({ token, window: 1 })
  if (delta === null) return null
  return currentTotpStep() + delta
}

// Kurtarma kodu alfabesi: karışan karakterler (I, O, 0, 1) yok.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function randomPart(len: number): string {
  let s = ""
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return s
}

// Karşılaştırma/hash için kanonik biçim: büyük harf, yalnız alfasayısal (tire
// atılır) → "abcde-fghij" ile "ABCDEFGHIJ" aynı hash'e gider.
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

// 10 adet XXXXX-XXXXX kod. plaintext kullanıcıya BİR KEZ gösterilir; hashes
// (HMAC) DB'ye yazılır.
export function generateRecoveryCodes(count = 10): {
  plaintext: string[]
  hashes: string[]
} {
  const plaintext: string[] = []
  const hashes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = `${randomPart(5)}-${randomPart(5)}`
    plaintext.push(code)
    hashes.push(hashSecret(normalizeRecoveryCode(code)))
  }
  return { plaintext, hashes }
}
