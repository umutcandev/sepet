import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { formatMessageTime, formatMessageTimeFull } from "./message-time"

// Yerel saatle kurulur: etiket tarayıcının saat diliminde çizilir.
const now = new Date(2026, 9, 16, 15, 0)

describe("formatMessageTime", () => {
  test("bugün yalnızca saat", () => {
    assert.equal(formatMessageTime(new Date(2026, 9, 16, 9, 5), now), "09:05")
  })

  test("dün kelimeyle", () => {
    assert.equal(
      formatMessageTime(new Date(2026, 9, 15, 23, 59), now),
      "Dün 23:59"
    )
  })

  test("aynı yıl gün ve ay, eski yıl yılla birlikte", () => {
    assert.equal(
      formatMessageTime(new Date(2026, 9, 12, 14, 32), now),
      "12 Eki 14:32"
    )
    assert.equal(
      formatMessageTime(new Date(2025, 11, 31, 8, 0), now),
      "31 Ara 2025 08:00"
    )
  })

  test("ISO metni de okur, geçersiz tarihte boş döner", () => {
    assert.equal(
      formatMessageTime(new Date(2026, 9, 16, 10, 0).toISOString(), now),
      "10:00"
    )
    assert.equal(formatMessageTime("bozuk", now), "")
  })
})

describe("formatMessageTimeFull", () => {
  test("gün adı ve tam tarih", () => {
    assert.equal(
      formatMessageTimeFull(new Date(2026, 9, 16, 14, 32)),
      "16 Ekim 2026 Cuma, 14:32"
    )
  })
})
