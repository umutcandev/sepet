import { test } from "node:test"
import assert from "node:assert/strict"
import { getTableColumns } from "drizzle-orm"
import { users } from "../db/schema"
import { EXCLUDED_USER_COLUMNS, EXPORTED_USER_COLUMNS } from "./user-columns"

test("export never includes credential secrets", () => {
  for (const key of EXCLUDED_USER_COLUMNS) {
    assert.ok(!(key in EXPORTED_USER_COLUMNS), key)
  }
})

test("every user column is classified as exported or excluded", () => {
  const classified = new Set<string>([
    ...Object.keys(EXPORTED_USER_COLUMNS),
    ...EXCLUDED_USER_COLUMNS,
  ])
  const unclassified = Object.keys(getTableColumns(users)).filter(
    (k) => !classified.has(k),
  )
  assert.deepEqual(unclassified, [])
})
