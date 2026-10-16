import { passkeysUsableOnHost } from "@/lib/auth/webauthn-config"

// Sunucunun rpID'yi çözdüğü env'in build sırasındaki kopyası. next.config.mjs
// ham değerleri NEXT_PUBLIC_PASSKEY_* adlarıyla aktarır; kural tek yerde
// (resolveRelyingParty). process.env.X yazımları bu haliyle kalmalı: Next
// yalnız birebir yazılmış anahtarları istemci bundle'ına gömer.
const BUILD_ENV = {
  WEBAUTHN_RP_ID: process.env.NEXT_PUBLIC_PASSKEY_RP_ID,
  WEBAUTHN_ORIGINS: process.env.NEXT_PUBLIC_PASSKEY_ORIGINS,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  VERCEL_URL: process.env.NEXT_PUBLIC_PASSKEY_VERCEL_URL,
}

/**
 * Geçiş anahtarı arayüzü bu sayfada gösterilebilir mi (yalnız istemcide).
 * Sunucuya gitmeden ilk çizimde karar verir; sunucudan gelen rpID kontrolü
 * ayrıca yerinde durur.
 */
export function passkeysUsableHere(): boolean {
  if (typeof window === "undefined") return false
  return passkeysUsableOnHost(BUILD_ENV, window.location.hostname)
}
