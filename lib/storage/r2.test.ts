import { test } from "node:test"
import assert from "node:assert/strict"
import { isOwnedReceiptKey } from "./r2"

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
