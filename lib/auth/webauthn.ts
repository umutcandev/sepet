import "server-only"

import { randomBytes } from "node:crypto"
import { and, asc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server"
import { isoBase64URL } from "@simplewebauthn/server/helpers"

import { db, passkeys, users } from "@/lib/db"
import { redis } from "@/lib/redis"
import {
  resolveRelyingParty,
  type RelyingParty,
} from "@/lib/auth/webauthn-config"

// ─── WebAuthn tören (ceremony) çekirdeği ───
// Duruş:
// - Challenge sunucuda üretilir, Redis'te amaç (login/register/reauth) ve
//   gerekiyorsa kullanıcıya bağlı tutulur; TTL 5 dk. Doğrulamadan ÖNCE GETDEL
//   ile tüketilir → başarısız denemede de yanar, tekrar oynatılamaz.
// - userVerification her yerde "required": geçiş anahtarıyla giriş şifre + TOTP'nin
//   yerini aldığından biyometri/PIN doğrulanmamış bir imza kabul edilmez.
// - Algoritmalar sabit: v14 runtime destekliyorsa ML-DSA'yı başa koyuyor; o
//   anahtar başka bir runtime'da PQCNotSupportedError ile kullanılamaz kalırdı.
const CEREMONY_TIMEOUT_MS = 5 * 60 * 1000
const CHALLENGE_TTL_S = 5 * 60
const SUPPORTED_ALGORITHMS = [-8, -7, -257] // Ed25519, ES256, RS256
export const MAX_PASSKEYS = 20
// E-postasız kullanıcı pratikte yok (Facebook e-postasız girişi reddediliyor);
// yine de authenticator'a boş ad gitmesin.
const RP_FALLBACK_USER = "Sepet hesabı"

const KNOWN_TRANSPORTS = new Set([
  "ble",
  "cable",
  "hybrid",
  "internal",
  "nfc",
  "smart-card",
  "usb",
])

export function getRelyingParty(): RelyingParty | null {
  return resolveRelyingParty({
    WEBAUTHN_RP_ID: process.env.WEBAUTHN_RP_ID,
    WEBAUTHN_ORIGINS: process.env.WEBAUTHN_ORIGINS,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  })
}

// ─── Challenge deposu ───

type ChallengePurpose = "login" | "register" | "reauth"
// u: kullanıcı, s: cihaz oturumu (sid). Girişte ikisi de null.
type StoredChallenge = { u: string | null; s: string | null }

/**
 * Oturum içi törenin (kayıt, kimlik teyidi) sahibi. Challenge yalnız onu
 * isteyen cihaz oturumunda tüketilebilir: aynı kullanıcının sudo'suz başka bir
 * oturumu (ör. çalınmış cookie) onu kullanamaz.
 */
export type CeremonyOwner = { userId: string; sid: string }

function ownedBy(stored: StoredChallenge, owner: CeremonyOwner) {
  return stored.u === owner.userId && stored.s === owner.sid
}

// generateChallenge 32 bayt → 43 karakter base64url. Anahtara istemciden gelen
// değer girdiği için biçim sınırlı tutulur.
const CHALLENGE_RE = /^[A-Za-z0-9_-]{16,128}$/

function challengeKey(purpose: ChallengePurpose, challenge: string) {
  return `wa:${purpose}:${challenge}`
}

async function storeChallenge(
  purpose: ChallengePurpose,
  challenge: string,
  owner: CeremonyOwner | null
) {
  await redis.set<StoredChallenge>(
    challengeKey(purpose, challenge),
    { u: owner?.userId ?? null, s: owner?.sid ?? null },
    { ex: CHALLENGE_TTL_S, nx: true }
  )
}

async function consumeChallenge(
  purpose: ChallengePurpose,
  challenge: string
): Promise<StoredChallenge | null> {
  return redis.getdel<StoredChallenge>(challengeKey(purpose, challenge))
}

// clientDataJSON içindeki challenge: hangi Redis kaydının tüketileceğini bulmak
// için okunur. Asıl eşleşme (ve origin/type) kütüphane doğrulamasında yapılır.
function readChallenge(clientDataJSON: string): string | null {
  try {
    const data = JSON.parse(isoBase64URL.toUTF8String(clientDataJSON)) as {
      challenge?: unknown
    }
    return typeof data.challenge === "string" &&
      CHALLENGE_RE.test(data.challenge)
      ? data.challenge
      : null
  } catch {
    return null
  }
}

// ─── İstemci yanıtlarının şekli ───
// Yanıt dışarıdan gelir (server action argümanı / callback POST'u). Kütüphaneye
// yalnız beklenen alanlar, makul boyutlarla geçer; uzantı çıktıları istenmediği
// için atılır.

const credentialIdField = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^[A-Za-z0-9_-]+$/)
const encodedField = z.string().min(1).max(16_384)

const assertionSchema = z.object({
  id: credentialIdField,
  rawId: credentialIdField,
  type: z.literal("public-key"),
  response: z.object({
    clientDataJSON: encodedField,
    authenticatorData: encodedField,
    signature: encodedField,
    userHandle: z.string().max(256).nullish(),
  }),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).nullish(),
})

const attestationSchema = z.object({
  id: credentialIdField,
  rawId: credentialIdField,
  type: z.literal("public-key"),
  response: z.object({
    clientDataJSON: encodedField,
    attestationObject: z.string().min(1).max(65_536),
    authenticatorData: encodedField.optional(),
    publicKey: encodedField.optional(),
    publicKeyAlgorithm: z.number().int().optional(),
    transports: z.array(z.string().max(32)).max(10).optional(),
  }),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).nullish(),
})

function parseAssertion(input: unknown): AuthenticationResponseJSON | null {
  const parsed = assertionSchema.safeParse(input)
  if (!parsed.success) return null
  const p = parsed.data
  return {
    id: p.id,
    rawId: p.rawId,
    type: "public-key",
    response: {
      clientDataJSON: p.response.clientDataJSON,
      authenticatorData: p.response.authenticatorData,
      signature: p.response.signature,
      userHandle: p.response.userHandle ?? undefined,
    },
    authenticatorAttachment: p.authenticatorAttachment ?? undefined,
    clientExtensionResults: {},
  }
}

function parseAttestation(input: unknown): RegistrationResponseJSON | null {
  const parsed = attestationSchema.safeParse(input)
  if (!parsed.success) return null
  const p = parsed.data
  return {
    id: p.id,
    rawId: p.rawId,
    type: "public-key",
    response: {
      clientDataJSON: p.response.clientDataJSON,
      attestationObject: p.response.attestationObject,
      authenticatorData: p.response.authenticatorData,
      publicKey: p.response.publicKey,
      publicKeyAlgorithm: p.response.publicKeyAlgorithm,
      transports: p.response.transports?.filter((t) =>
        KNOWN_TRANSPORTS.has(t)
      ) as RegistrationResponseJSON["response"]["transports"],
    },
    authenticatorAttachment: p.authenticatorAttachment ?? undefined,
    clientExtensionResults: {},
  }
}

// ─── Seçenek (options) üretimi ───

/** Kullanıcı adı yazmadan giriş (discoverable): allowCredentials boş → enumeration yok. */
export async function createLoginOptions(): Promise<PublicKeyCredentialRequestOptionsJSON | null> {
  const rp = getRelyingParty()
  if (!rp) return null
  const options = await generateAuthenticationOptions({
    rpID: rp.id,
    userVerification: "required",
    timeout: CEREMONY_TIMEOUT_MS,
  })
  await storeChallenge("login", options.challenge, null)
  return options
}

/** Oturum açıkken kimlik teyidi: yalnız bu kullanıcının anahtarları. */
export async function createReauthOptions(
  owner: CeremonyOwner
): Promise<PublicKeyCredentialRequestOptionsJSON | null> {
  const rp = getRelyingParty()
  if (!rp) return null
  const rows = await db
    .select({
      credentialId: passkeys.credentialId,
      transports: passkeys.transports,
    })
    .from(passkeys)
    .where(eq(passkeys.userId, owner.userId))
  if (rows.length === 0) return null
  const options = await generateAuthenticationOptions({
    rpID: rp.id,
    allowCredentials: rows.map((r) => ({
      id: r.credentialId,
      transports: r.transports ?? undefined,
    })),
    userVerification: "required",
    timeout: CEREMONY_TIMEOUT_MS,
  })
  await storeChallenge("reauth", options.challenge, owner)
  return options
}

// İlk geçiş anahtarında bir kez üretilir; tek UPDATE ile yarışa kapalı (COALESCE
// mevcut değeri korur → paralel iki istek aynı değeri görür).
async function ensureWebauthnUserId(userId: string): Promise<string | null> {
  const fresh = randomBytes(32).toString("base64url")
  const [row] = await db
    .update(users)
    .set({ webauthnUserId: sql`COALESCE(${users.webauthnUserId}, ${fresh})` })
    .where(eq(users.id, userId))
    .returning({ webauthnUserId: users.webauthnUserId })
  return row?.webauthnUserId ?? null
}

export type RegistrationOptionsResult =
  | { ok: true; options: PublicKeyCredentialCreationOptionsJSON }
  | { ok: false; reason: "disabled" | "limit" | "no_user" }

export async function createRegistrationOptions(
  owner: CeremonyOwner
): Promise<RegistrationOptionsResult> {
  const rp = getRelyingParty()
  if (!rp) return { ok: false, reason: "disabled" }
  const { userId } = owner

  const [[user], existing] = await Promise.all([
    db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        credentialId: passkeys.credentialId,
        transports: passkeys.transports,
      })
      .from(passkeys)
      .where(eq(passkeys.userId, userId)),
  ])
  if (!user) return { ok: false, reason: "no_user" }
  if (existing.length >= MAX_PASSKEYS) return { ok: false, reason: "limit" }

  const webauthnUserId = await ensureWebauthnUserId(userId)
  if (!webauthnUserId) return { ok: false, reason: "no_user" }

  // Şifre yöneticisinde görünen ad: hesabı tanıtan e-posta.
  const userName = user.email ?? user.name ?? RP_FALLBACK_USER
  const options = await generateRegistrationOptions({
    rpName: rp.name,
    rpID: rp.id,
    userName,
    userDisplayName: user.name?.trim() || userName,
    userID: isoBase64URL.toBuffer(webauthnUserId),
    attestationType: "none",
    // Bu cihazda zaten bir anahtar varsa tarayıcı ikincisini oluşturmaz
    // (InvalidStateError → istemcide "zaten var" mesajı).
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports ?? undefined,
    })),
    authenticatorSelection: {
      residentKey: "required",
      requireResidentKey: true,
      userVerification: "required",
    },
    supportedAlgorithmIDs: SUPPORTED_ALGORITHMS,
    timeout: CEREMONY_TIMEOUT_MS,
  })
  await storeChallenge("register", options.challenge, owner)
  return { ok: true, options }
}

// ─── Doğrulama ───

export type VerifiedRegistration = {
  credentialId: string
  publicKey: string
  counter: number
  transports: string[] | null
  aaguid: string | null
  deviceType: "singleDevice" | "multiDevice"
  backedUp: boolean
}

export type RegistrationResult =
  | { ok: true; credential: VerifiedRegistration }
  | { ok: false; code: "disabled" | "expired" | "invalid" }

export async function verifyRegistration(
  owner: CeremonyOwner,
  input: unknown
): Promise<RegistrationResult> {
  const rp = getRelyingParty()
  if (!rp) return { ok: false, code: "disabled" }
  const response = parseAttestation(input)
  if (!response) return { ok: false, code: "invalid" }
  const challenge = readChallenge(response.response.clientDataJSON)
  if (!challenge) return { ok: false, code: "invalid" }

  // Challenge başka bir kullanıcıya ya da aynı kullanıcının başka bir cihaz
  // oturumuna verilmişse de süresi dolmuş sayılır.
  const stored = await consumeChallenge("register", challenge)
  if (!stored || !ownedBy(stored, owner)) return { ok: false, code: "expired" }

  try {
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origins,
      expectedRPID: rp.id,
      requireUserVerification: true,
      supportedAlgorithmIDs: SUPPORTED_ALGORITHMS,
    })
    if (!verified) return { ok: false, code: "invalid" }
    const { credential, aaguid, credentialDeviceType, credentialBackedUp } =
      registrationInfo
    return {
      ok: true,
      credential: {
        credentialId: credential.id,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports?.length
          ? credential.transports.filter((t) => KNOWN_TRANSPORTS.has(t))
          : null,
        // Hepsi sıfır AAGUID "bilinmiyor" demek (bazı sağlayıcılar vermez).
        aaguid: /^[0-]+$/.test(aaguid) ? null : aaguid,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      },
    }
  } catch {
    return { ok: false, code: "invalid" }
  }
}

export type AssertionResult =
  | { ok: true; userId: string; passkeyId: string }
  | {
      ok: false
      code: "disabled" | "malformed" | "expired" | "unknown" | "invalid"
    }

/**
 * Giriş (purpose "login") ve oturum içi kimlik teyidi (purpose "reauth", owner
 * zorunlu) için ortak imza doğrulaması. "malformed" = yanıt biçimsiz, challenge'a
 * hiç bakılmadı. "unknown" = kimlik bilgisi bizde yok (silinmiş) → istemci şifre
 * yöneticisine signalUnknownCredential gönderir. "invalid" = challenge geçerliydi
 * ve tüketildi, ama imza / userHandle / sayaç doğrulanamadı.
 */
export async function verifyAssertion(
  input: unknown,
  purpose: "login" | "reauth",
  owner?: CeremonyOwner
): Promise<AssertionResult> {
  const rp = getRelyingParty()
  if (!rp) return { ok: false, code: "disabled" }
  const response = parseAssertion(input)
  if (!response) return { ok: false, code: "malformed" }
  const challenge = readChallenge(response.response.clientDataJSON)
  if (!challenge) return { ok: false, code: "malformed" }

  const stored = await consumeChallenge(purpose, challenge)
  if (!stored) return { ok: false, code: "expired" }
  if (purpose === "reauth" && (!owner || !ownedBy(stored, owner))) {
    return { ok: false, code: "expired" }
  }

  const [row] = await db
    .select({
      id: passkeys.id,
      userId: passkeys.userId,
      publicKey: passkeys.publicKey,
      counter: passkeys.counter,
      transports: passkeys.transports,
      webauthnUserId: users.webauthnUserId,
    })
    .from(passkeys)
    .innerJoin(users, eq(users.id, passkeys.userId))
    .where(eq(passkeys.credentialId, response.id))
    .limit(1)
  if (!row) return { ok: false, code: "unknown" }
  if (purpose === "reauth" && row.userId !== owner?.userId) {
    return { ok: false, code: "unknown" }
  }

  // Kullanıcı adsız (discoverable) girişte authenticator userHandle döndürmek
  // ZORUNDA ve kimlik bilgisinin sahibine ait olmalı (L3 §7.2, OWASP).
  const userHandle = response.response.userHandle
  if (purpose === "login" && !userHandle) return { ok: false, code: "invalid" }
  if (userHandle && userHandle !== row.webauthnUserId) {
    return { ok: false, code: "invalid" }
  }

  let info: Awaited<
    ReturnType<typeof verifyAuthenticationResponse>
  >["authenticationInfo"]
  try {
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origins,
      expectedRPID: rp.id,
      credential: {
        id: response.id,
        publicKey: isoBase64URL.toBuffer(row.publicKey),
        counter: row.counter,
        transports: row.transports ?? undefined,
      },
      requireUserVerification: true,
    })
    if (!result.verified) return { ok: false, code: "invalid" }
    info = result.authenticationInfo
  } catch {
    // Sıfırdan farklı sayaç gerilemesi (klon şüphesi) de buraya düşer.
    return { ok: false, code: "invalid" }
  }

  // Koşullu tek UPDATE (neon-http'de transaction yok): aynı sayaçla paralel
  // ikinci doğrulama kaybeder. Senkronize anahtarlarda sayaç 0'da kalır.
  const [updated] = await db
    .update(passkeys)
    .set({
      counter: info.newCounter,
      backedUp: info.credentialBackedUp,
      lastUsedAt: new Date(),
    })
    .where(and(eq(passkeys.id, row.id), eq(passkeys.counter, row.counter)))
    .returning({ id: passkeys.id })
  if (!updated) return { ok: false, code: "invalid" }

  return { ok: true, userId: row.userId, passkeyId: row.id }
}

/** Kullanıcının anahtarları, eklenme sırasıyla (Ayarlar listesi). */
export function listUserPasskeys(userId: string) {
  return db
    .select({
      id: passkeys.id,
      credentialId: passkeys.credentialId,
      name: passkeys.name,
      aaguid: passkeys.aaguid,
      deviceType: passkeys.deviceType,
      backedUp: passkeys.backedUp,
      createdAt: passkeys.createdAt,
      lastUsedAt: passkeys.lastUsedAt,
    })
    .from(passkeys)
    .where(eq(passkeys.userId, userId))
    .orderBy(asc(passkeys.createdAt))
}
