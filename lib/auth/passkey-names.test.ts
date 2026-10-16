import assert from "node:assert/strict"
import { test, describe } from "node:test"

import {
  PASSKEY_NAME_MAX,
  defaultPasskeyName,
  normalizePasskeyName,
  providerNameFromAaguid,
} from "./passkey-names"

const GOOGLE = "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4"

describe("defaultPasskeyName", () => {
  test("bilinen AAGUID sağlayıcı adını verir (büyük/küçük harf duyarsız)", () => {
    assert.equal(
      providerNameFromAaguid(GOOGLE.toUpperCase()),
      "Google Şifre Yöneticisi"
    )
    assert.equal(
      defaultPasskeyName({ aaguid: GOOGLE }, []),
      "Google Şifre Yöneticisi"
    )
  })

  test("aynı ad varsa numaralanır", () => {
    assert.equal(
      defaultPasskeyName({ aaguid: GOOGLE }, [
        "Google Şifre Yöneticisi",
        "Google Şifre Yöneticisi 2",
      ]),
      "Google Şifre Yöneticisi 3"
    )
  })

  test("yalnız harici taşıma bildiren anahtar donanım anahtarıdır", () => {
    assert.equal(
      defaultPasskeyName(
        { transports: ["usb", "nfc"], deviceLabel: "Chrome · macOS" },
        []
      ),
      "Güvenlik anahtarı"
    )
    assert.equal(
      defaultPasskeyName(
        { transports: ["internal", "hybrid"], deviceLabel: "Chrome · macOS" },
        []
      ),
      "Chrome · macOS"
    )
  })

  test("hiçbir ipucu yoksa jenerik ad", () => {
    assert.equal(defaultPasskeyName({}, []), "Geçiş anahtarı")
  })
})

describe("normalizePasskeyName", () => {
  test("kırpar, boşlukları sadeleştirir, sınırlar", () => {
    assert.equal(normalizePasskeyName("  İş   YubiKey'i "), "İş YubiKey'i")
    assert.equal(
      normalizePasskeyName("x".repeat(100))?.length,
      PASSKEY_NAME_MAX
    )
  })

  test("boş ya da metin olmayan değer null", () => {
    assert.equal(normalizePasskeyName("   "), null)
    assert.equal(normalizePasskeyName(42), null)
  })
})
