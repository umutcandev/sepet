import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

// Every export of a "use server" module is a publicly callable endpoint, so
// identity must come from the session, never from an argument.

const ACTIONS_DIR = path.join(process.cwd(), "lib/actions")

const PUBLIC_ACTIONS = new Set([
  "signInWithGoogleAction",
  "signInWithFacebookAction",
  "registerAction",
  "verifySignupAction",
  "verifySignupByTokenAction",
  "resendSignupCodeAction",
  "loginAction",
  "verifyTwoFactorAction",
  "forgotPasswordAction",
  "resetPasswordAction",
  "beginPasskeyLoginAction",
  "passkeyLoginAction",
])

const AUTH_CALL = /\bawait (auth|requireReauth|requireUserId)\(/

type ExportedFn = { file: string; name: string; params: string; body: string }

function exportedFunctions(): ExportedFn[] {
  const out: ExportedFn[] = []
  for (const file of readdirSync(ACTIONS_DIR)) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue
    const src = readFileSync(path.join(ACTIONS_DIR, file), "utf8")
    if (!/^["']use server["']/m.test(src)) continue
    const re = /export async function (\w+)\s*\(([^)]*)\)/g
    const hits = [...src.matchAll(re)]
    hits.forEach((m, i) => {
      const end = hits[i + 1]?.index ?? src.length
      out.push({ file, name: m[1], params: m[2], body: src.slice(m.index, end) })
    })
  }
  return out
}

test("finds the server action modules", () => {
  assert.ok(exportedFunctions().length > 30)
})

test("no server action accepts a userId argument", () => {
  const offenders = exportedFunctions()
    .filter((f) => /\buserId\b/.test(f.params))
    .map((f) => `${f.file}#${f.name}`)
  assert.deepEqual(offenders, [])
})

test("every non-public server action authenticates", () => {
  const offenders = exportedFunctions()
    .filter((f) => !PUBLIC_ACTIONS.has(f.name) && !AUTH_CALL.test(f.body))
    .map((f) => `${f.file}#${f.name}`)
  assert.deepEqual(offenders, [])
})
