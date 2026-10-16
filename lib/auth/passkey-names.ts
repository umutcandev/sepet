// Geçiş anahtarına otomatik ad: authenticator'ın AAGUID'inden sağlayıcı adı
// (iCloud Anahtar Zinciri, Google Şifre Yöneticisi…). Kullanıcı sonradan
// yeniden adlandırabilir; ad kayıt anında hesaplanıp DB'ye yazılır.
//
// Kaynak: passkeydeveloper/passkey-authenticator-aaguids (aaguid.json), yalnız
// yaygın sağlayıcılar. Liste "yalnız gösterim içindir" — güvenlik kararı AAGUID'e
// dayanmaz (attestation "none": AAGUID authenticator'ın beyanıdır, kanıt değil).
const AAGUID_NAMES: Record<string, string> = {
  "fbfc3007-154e-4ecc-8c0b-6e020557d7bd": "iCloud Anahtar Zinciri",
  "dd4ec289-e01d-41c9-bb89-70fa845d4bf2": "iCloud Anahtar Zinciri (Yönetilen)",
  "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4": "Google Şifre Yöneticisi",
  "adce0002-35bc-c60a-648b-0b25f1f05503": "Chrome (Mac)",
  "b5397666-4885-aa6b-cebf-e52262a439a2": "Chromium",
  "771b48fd-d3d4-4f74-9232-fc157ab0507a": "Edge (Mac)",
  "08987058-cadc-4b81-b6e1-30de50dcbe96": "Windows Hello",
  "9ddd1817-af5a-4672-a2b9-3e3dd95000a9": "Windows Hello",
  "6028b017-b1d4-4c02-b4b3-afcdafc96bb2": "Windows Hello",
  "d3452668-01fd-4c12-926c-83a4204853aa": "Microsoft Password Manager",
  "53414d53-554e-4700-0000-000000000000": "Samsung Pass",
  "bada5566-a7aa-401f-bd96-45619a55120d": "1Password",
  "d548826e-79b4-db40-a3d8-11116f7e8349": "Bitwarden",
  "531126d6-e717-415c-9320-3d9aa6981239": "Dashlane",
  "b84e4048-15dc-4dd0-8640-f4f60813c8af": "NordPass",
  "0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6": "Keeper",
  "f3809540-7f14-49c1-a8b3-8f813b225541": "Enpass",
  "50726f74-6f6e-5061-7373-50726f746f6e": "Proton Pass",
  "b78a0a55-6ef8-d246-a042-ba0f6d55050c": "LastPass",
  "fdb141b2-5d84-443e-8a35-4698c205a502": "KeePassXC",
  "eaecdef2-1c31-5634-8639-f1cbd9c00a08": "KeePassDX",
  "b35a26b2-8f6e-4697-ab1d-d44db4da28c6": "Zoho Vault",
  "a10c6dd9-465e-4226-8198-c7c44b91c555": "Kaspersky Password Manager",
  "fa37f553-f9b6-4adb-ac53-8bbb57ebdf0d": "Norton Password Manager",
  "a4a2d88e-9796-4356-9164-e2a5a8bd019c": "Avast Password Manager",
}

export const PASSKEY_NAME_MAX = 64

export function providerNameFromAaguid(
  aaguid: string | null | undefined
): string | null {
  if (!aaguid) return null
  return AAGUID_NAMES[aaguid.toLowerCase()] ?? null
}

// Yalnız harici taşıma bildiren (USB/NFC/BLE) authenticator donanım anahtarıdır
// (YubiKey vb.); platform ve telefon (hybrid) anahtarları "internal"/"hybrid" taşır.
const SECURITY_KEY_TRANSPORTS = new Set(["usb", "nfc", "ble"])

function isSecurityKey(transports: readonly string[] | null | undefined) {
  return (
    !!transports &&
    transports.length > 0 &&
    transports.every((t) => SECURITY_KEY_TRANSPORTS.has(t))
  )
}

/**
 * Sağlayıcı adı → donanım anahtarı → kaydın yapıldığı tarayıcı/OS etiketi
 * ("Chrome · macOS") → jenerik ad. Aynı ad hesapta varsa numaralanır
 * ("Google Şifre Yöneticisi 2") ki liste ayırt edilebilsin.
 */
export function defaultPasskeyName(
  input: {
    aaguid?: string | null
    transports?: readonly string[] | null
    deviceLabel?: string | null
  },
  existingNames: readonly string[]
): string {
  const base =
    providerNameFromAaguid(input.aaguid) ??
    (isSecurityKey(input.transports) ? "Güvenlik anahtarı" : null) ??
    input.deviceLabel ??
    "Geçiş anahtarı"
  const taken = new Set(existingNames)
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`
    if (!taken.has(candidate)) return candidate
  }
}

/** Kullanıcının verdiği ad: kırp, boşlukları sadeleştir, sınırla. Boşsa null. */
export function normalizePasskeyName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const name = value.replace(/\s+/g, " ").trim().slice(0, PASSKEY_NAME_MAX)
  return name || null
}
