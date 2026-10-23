import { test } from "node:test"
import assert from "node:assert/strict"
import { isOwnedReceiptKey, sniffImageType } from "./r2"

test("accepts keys under the user's own folder", () => {
  assert.ok(isOwnedReceiptKey("receipts/me/0f1e.jpg", "me"))
})

test("rejects other users' keys and traversal out of the folder", () => {
  for (const key of [
    "receipts/victim/0f1e.jpg",
    "receipts/me/../victim/0f1e.jpg",
    "receipts/me/%2e%2e/victim/0f1e.jpg",
    "receipts/me/..\\victim/0f1e.jpg",
    "receipts/me/..",
    // URL ayrıştırıcı sekme ve satır sonunu siler: fetch'te `..` olurdu.
    "receipts/me/.\t./victim/0f1e.jpg",
    "receipts/me/.\n./victim/0f1e.jpg",
    "receipts/me/.\r./victim/0f1e.jpg",
    null,
  ]) {
    assert.equal(isOwnedReceiptKey(key, "me"), false, String(key))
  }
})

test("sniffs image type from the bytes, not the declared type", () => {
  const pad = (head: number[]) =>
    new Uint8Array([...head, ...Array(16).fill(0)])
  assert.equal(sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg")
  assert.equal(
    sniffImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/png"
  )
  const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")
  assert.equal(sniffImageType(webp), "image/webp")
  for (const text of [
    "<svg xmlns='http://www.w3.org/2000/svg'>",
    "<!doctype html><p>",
  ]) {
    assert.equal(sniffImageType(new TextEncoder().encode(text)), null)
  }
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8])), null)
})
