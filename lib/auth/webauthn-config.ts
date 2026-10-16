// WebAuthn relying party (RP) ayarları: rpID + izinli origin'ler. Saf modül
// (env'i parametre olarak alır) — sunucu (lib/auth/webauthn.ts) ve istemci
// (rpID'nin bu sayfada geçerli olup olmadığı) aynı kurala bakar.
//
// rpID GERİ ALINAMAZ: değişirse kayıtlı bütün geçiş anahtarları geçersizleşir.
// Üretimde `trysepet.com` (apex) — www ve gelecekteki alt alan adlarında da
// geçerli. Origin'ler ve rpID asla istek başlıklarından türetilmez (OWASP):
// yalnız env'den.

export const RP_NAME = "Sepet"

export type RelyingParty = {
  id: string
  name: string
  origins: string[]
}

type RpEnv = {
  WEBAUTHN_RP_ID?: string
  WEBAUTHN_ORIGINS?: string
  NEXT_PUBLIC_SITE_URL?: string
  VERCEL_URL?: string
}

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

// Alan adı biçimi; IP adresi rpID olamaz (LAN'dan 192.168.x ile test bu yüzden
// çalışmaz). Tek etiketli adlardan yalnız localhost kabul edilir.
export function isValidRpId(id: string): boolean {
  if (id === "localhost") return true
  if (id.length > 253) return false
  const labels = id.split(".")
  if (labels.length < 2) return false
  if (labels.every((l) => /^\d+$/.test(l))) return false
  return labels.every((l) => LABEL.test(l))
}

// rpID, sayfanın host'una eşit ya da onun üst alan adı olmalı (WebAuthn §5.1.3).
export function isRpIdValidForHost(rpId: string, host: string): boolean {
  const h = host.toLowerCase()
  return h === rpId || h.endsWith(`.${rpId}`)
}

// Güvenli bağlam şartı: https, ya da yalnız localhost için http.
function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim())
    if (url.protocol === "https:") return url.origin
    if (url.protocol === "http:" && url.hostname === "localhost") {
      return url.origin
    }
    return null
  } catch {
    return null
  }
}

function siteUrl(env: RpEnv): string {
  // lib/site.ts SITE_URL ile aynı geri düşüş sırası.
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`
  return "http://localhost:3000"
}

/**
 * Yapılandırma geçersizse null döner → geçiş anahtarları o ortamda kapalı
 * (ör. env'i olmayan bir preview). Yanlış rpID ile kayıt açmaktansa kapalı
 * kalmak doğru: yanlış rpID'yle oluşan anahtar sonra hiç kullanılamaz.
 */
export function resolveRelyingParty(env: RpEnv): RelyingParty | null {
  const raw = env.WEBAUTHN_ORIGINS?.trim()
    ? env.WEBAUTHN_ORIGINS.split(",")
    : [siteUrl(env)]
  const origins = raw.map(normalizeOrigin)
  if (origins.length === 0 || origins.some((o) => o === null)) return null
  const valid = [...new Set(origins as string[])]

  const host = new URL(valid[0]).hostname
  const id =
    env.WEBAUTHN_RP_ID?.trim().toLowerCase() ||
    (host.startsWith("www.") ? host.slice(4) : host)
  if (!isValidRpId(id)) return null
  if (!valid.every((o) => isRpIdValidForHost(id, new URL(o).hostname))) {
    return null
  }
  return { id, name: RP_NAME, origins: valid }
}
