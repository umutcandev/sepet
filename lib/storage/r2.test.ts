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
    null,
  ]) {
    assert.equal(isOwnedReceiptKey(key, "me"), false, String(key))
  }
})
