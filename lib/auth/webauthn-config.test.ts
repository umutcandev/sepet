import assert from "node:assert/strict"
import { test, describe } from "node:test"

import {
  isRpIdValidForHost,
  isValidRpId,
  passkeysUsableOnHost,
  resolveRelyingParty,
} from "./webauthn-config"

describe("resolveRelyingParty", () => {
  test("üretimde www sitesinden apex rpID türetir", () => {
    const rp = resolveRelyingParty({
      NEXT_PUBLIC_SITE_URL: "https://www.trysepet.com",
    })
    assert.deepEqual(rp, {
      id: "trysepet.com",
      name: "Sepet",
      origins: ["https://www.trysepet.com"],
    })
  })

  test("açık WEBAUTHN_RP_ID ve origin listesi önceliklidir", () => {
    const rp = resolveRelyingParty({
      WEBAUTHN_RP_ID: "TrySepet.com",
      WEBAUTHN_ORIGINS: "https://www.trysepet.com, https://trysepet.com/",
      NEXT_PUBLIC_SITE_URL: "https://sepet-abc.vercel.app",
    })
    assert.equal(rp?.id, "trysepet.com")
    assert.deepEqual(rp?.origins, [
      "https://www.trysepet.com",
      "https://trysepet.com",
    ])
  })

  test("site adresi yoksa preview host'u, o da yoksa localhost kullanılır", () => {
    assert.equal(
      resolveRelyingParty({ VERCEL_URL: "sepet-abc.vercel.app" })?.id,
      "sepet-abc.vercel.app"
    )
    const local = resolveRelyingParty({})
    assert.equal(local?.id, "localhost")
    assert.deepEqual(local?.origins, ["http://localhost:3000"])
  })

  test("rpID origin'lerin üst alan adı değilse kapalı kalır", () => {
    assert.equal(
      resolveRelyingParty({
        WEBAUTHN_RP_ID: "trysepet.com",
        NEXT_PUBLIC_SITE_URL: "https://sepet-abc.vercel.app",
      }),
      null
    )
  })

  test("güvensiz origin ve IP adresi reddedilir", () => {
    assert.equal(
      resolveRelyingParty({ NEXT_PUBLIC_SITE_URL: "http://trysepet.com" }),
      null
    )
    assert.equal(
      resolveRelyingParty({ NEXT_PUBLIC_SITE_URL: "https://192.168.1.20" }),
      null
    )
    assert.equal(
      resolveRelyingParty({
        WEBAUTHN_ORIGINS: "https://www.trysepet.com,bozuk",
      }),
      null
    )
  })
})

describe("rpID kuralları", () => {
  test("alan adı biçimi", () => {
    assert.ok(isValidRpId("trysepet.com"))
    assert.ok(isValidRpId("localhost"))
    assert.ok(!isValidRpId("com"))
    assert.ok(!isValidRpId("10.0.0.1"))
    assert.ok(!isValidRpId("-bad.com"))
  })

  test("rpID host'a eşit ya da onun üst alan adı olmalı", () => {
    assert.ok(isRpIdValidForHost("trysepet.com", "www.trysepet.com"))
    assert.ok(isRpIdValidForHost("trysepet.com", "trysepet.com"))
    assert.ok(!isRpIdValidForHost("trysepet.com", "eviltrysepet.com"))
    assert.ok(!isRpIdValidForHost("trysepet.com", "192.168.1.20"))
  })
})

describe("passkeysUsableOnHost", () => {
  const PROD = {
    WEBAUTHN_RP_ID: "trysepet.com",
    NEXT_PUBLIC_SITE_URL: "https://www.trysepet.com",
  }

  test("üretim alan adında açık", () => {
    assert.ok(passkeysUsableOnHost(PROD, "www.trysepet.com"))
    assert.ok(passkeysUsableOnHost(PROD, "trysepet.com"))
  })

  test("preview production SITE_URL'ünü taşısa da vercel.app'te kapalı", () => {
    assert.ok(
      !passkeysUsableOnHost(
        { NEXT_PUBLIC_SITE_URL: "https://www.trysepet.com" },
        "sepet-git-feat-passkey-team.vercel.app"
      )
    )
  })

  test("SITE_URL'süz preview yalnız kendi deployment adresinde açık", () => {
    const env = { VERCEL_URL: "sepet-abc123-team.vercel.app" }
    assert.ok(passkeysUsableOnHost(env, "sepet-abc123-team.vercel.app"))
    assert.ok(
      !passkeysUsableOnHost(env, "sepet-git-feat-passkey-team.vercel.app")
    )
  })

  test("geçersiz yapılandırmada kapalı", () => {
    assert.ok(
      !passkeysUsableOnHost(
        { NEXT_PUBLIC_SITE_URL: "http://192.168.1.20:3000" },
        "192.168.1.20"
      )
    )
  })
})
