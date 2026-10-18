import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { isCategoryId } from "../categories"
import {
  COVER_SIZE,
  design,
  MOTIF_TYPES,
  OG_SIZE,
  POLARITIES,
  render,
  type MotifType,
  type Polarity,
} from "./covergen"

// Yayındaki her yazının kapağının ve paylaşım görseli zemininin parmak izi.
// Motor bir yazının kapağını değiştirirse bu test kırılır: değişiklik bilinçli
// ise parmak izlerini yeniden kaydet, değilse motordaki değişikliği geri al.
//
//   UPDATE_COVER_SNAPSHOTS=1 pnpm test
//
// Yeni yazı eklendiğinde de aynı komutla kaydedilir.

const CONTENT = fileURLToPath(
  new URL("../../../content/blog/", import.meta.url)
)
const SNAPSHOT = fileURLToPath(
  new URL("./covers.snapshot.json", import.meta.url)
)

type Fingerprint = { cover: string; og: string }

function frontmatter(source: string, key: string): string | undefined {
  const head = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? ""
  return new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m").exec(head)?.[1]
}

function fingerprints(): Record<string, Fingerprint> {
  const out: Record<string, Fingerprint> = {}
  const hash = (svg: string) =>
    createHash("sha256").update(svg).digest("hex").slice(0, 16)
  for (const file of readdirSync(CONTENT).filter((f) => f.endsWith(".mdx"))) {
    const source = readFileSync(CONTENT + file, "utf8")
    const slug = file.replace(/\.mdx$/, "")
    const category = frontmatter(source, "category")
    assert.ok(category && isCategoryId(category), `${slug}: kategori`)
    const variant = frontmatter(source, "coverVariant")
    const motif = frontmatter(source, "coverMotif")
    const polarity = frontmatter(source, "coverPolarity")
    assert.ok(
      !motif || MOTIF_TYPES.includes(motif as MotifType),
      `${slug}: coverMotif`
    )
    assert.ok(
      !polarity || POLARITIES.includes(polarity as Polarity),
      `${slug}: coverPolarity`
    )
    const opts = {
      variant: variant ? Number(variant) : undefined,
      motif: motif as MotifType | undefined,
      polarity: polarity as Polarity | undefined,
    }
    out[slug] = {
      cover: hash(render(design(slug, category, { ...opts, ...COVER_SIZE }))),
      og: hash(render(design(slug, category, { ...opts, ...OG_SIZE }))),
    }
  }
  return out
}

test("yayındaki kapaklar değişmedi", () => {
  const current = fingerprints()
  if (process.env.UPDATE_COVER_SNAPSHOTS) {
    writeFileSync(SNAPSHOT, JSON.stringify(current, null, 2) + "\n")
    return
  }
  const saved = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Record<
    string,
    Fingerprint
  >
  const hint = "Bilinçliyse: UPDATE_COVER_SNAPSHOTS=1 pnpm test"
  for (const slug of Object.keys(current)) {
    assert.ok(
      saved[slug],
      `${slug}: kayıtlı parmak izi yok (yeni yazı?). ${hint}`
    )
    assert.deepEqual(
      current[slug],
      saved[slug],
      `${slug}: kapak değişti. ${hint}`
    )
  }
  for (const slug of Object.keys(saved))
    assert.ok(
      current[slug],
      `${slug}: yazı yok ama parmak izi kayıtlı. ${hint}`
    )
})
