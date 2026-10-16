import assert from "node:assert/strict"
import { test, describe, beforeEach } from "node:test"

import { loginDialog } from "./login-dialog"

type Snapshot = { open: boolean; pendingToken: string | null }

function capture() {
  const seen: Snapshot[] = []
  const unsubscribe = loginDialog.subscribe((s) => seen.push(s))
  return { seen, unsubscribe }
}

describe("loginDialog", () => {
  beforeEach(() => loginDialog.close())

  test("openTwoFactor modalı token'la açar", () => {
    const { seen, unsubscribe } = capture()
    loginDialog.openTwoFactor("tok")
    unsubscribe()
    assert.deepEqual(seen, [{ open: true, pendingToken: "tok" }])
    assert.equal(loginDialog.isOpen, true)
  })

  test("kapanınca token temizlenir (close ve set(false))", () => {
    loginDialog.openTwoFactor("tok")
    const a = capture()
    loginDialog.close()
    a.unsubscribe()
    assert.deepEqual(a.seen, [{ open: false, pendingToken: null }])

    loginDialog.openTwoFactor("tok")
    const b = capture()
    loginDialog.set(false)
    b.unsubscribe()
    assert.deepEqual(b.seen, [{ open: false, pendingToken: null }])
  })

  test("normal açılış token taşımaz; değişmeyen durum bildirilmez", () => {
    const { seen, unsubscribe } = capture()
    loginDialog.open()
    loginDialog.open()
    loginDialog.set(true)
    unsubscribe()
    assert.deepEqual(seen, [{ open: true, pendingToken: null }])
  })
})
