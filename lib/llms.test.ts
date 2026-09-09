import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { buildLlmsTxt, LLMS_MAX_POSTS, type LlmsPost } from "./llms"
import { SITE_URL } from "./site"
import { PLAN_LIMITS } from "./usage/limits"

const post = (n: number): LlmsPost => ({
  title: `Yazı ${n}`,
  description: `Açıklama ${n}`,
  permalink: `/blog/yazi-${n}`,
})

const posts = (count: number) =>
  Array.from({ length: count }, (_, i) => post(i + 1))

describe("buildLlmsTxt — biçim", () => {
  test("llmstxt.org iskeleti: tek H1 ve hemen ardından özet alıntısı", () => {
    const out = buildLlmsTxt(posts(1))
    const lines = out.split("\n")

    assert.equal(lines[0], "# Sepet")
    // Tek bir H1 olmalı; alt başlıkların hepsi H2.
    assert.equal(out.split("\n").filter((l) => /^# /.test(l)).length, 1)
    assert.match(out, /\n> /)
  })

  test("araç seçimi için gereken bölümlerin hepsi var", () => {
    const out = buildLlmsTxt(posts(1))
    for (const heading of [
      "## Ne zaman kullanılır",
      "## Ne zaman uygun değildir",
      "## Bir ajan nasıl kullanmalı",
      "## Planlar ve limitler",
      "## Sayfalar",
      "## Blog yazıları",
      "## Yasal",
      "## Makine tarafından okunabilir",
      "## When to use (English)",
    ]) {
      assert.ok(out.includes(heading), `eksik bölüm: ${heading}`)
    }
  })

  test("dosya sonu tek satırsonuyla biter", () => {
    const out = buildLlmsTxt(posts(1))
    assert.ok(out.endsWith("\n"))
    assert.ok(!out.endsWith("\n\n"))
  })
})

describe("buildLlmsTxt — bağlantılar", () => {
  test("tüm bağlantılar mutlak URL'dir (göreli yol kalmaz)", () => {
    const out = buildLlmsTxt(posts(3))
    const urls = [...out.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1])

    assert.ok(urls.length > 0)
    for (const url of urls) {
      assert.ok(
        url.startsWith(SITE_URL),
        `göreli ya da yabancı bağlantı: ${url}`,
      )
    }
  })

  test("yazılar başlık ve açıklamalarıyla listelenir", () => {
    const out = buildLlmsTxt(posts(2))
    assert.ok(out.includes(`[Yazı 1](${SITE_URL}/blog/yazi-1): Açıklama 1`))
    assert.ok(out.includes(`[Yazı 2](${SITE_URL}/blog/yazi-2): Açıklama 2`))
  })
})

describe("buildLlmsTxt — yazı tavanı", () => {
  test("tavanın altında hepsi listelenir, 'tüm yazılar' satırı eklenmez", () => {
    const out = buildLlmsTxt(posts(LLMS_MAX_POSTS))
    assert.ok(out.includes(`Yazı ${LLMS_MAX_POSTS}`))
    assert.ok(!out.includes("Tüm yazılar"))
  })

  test("tavan aşılırsa kesilir ve blog dizinine havale edilir", () => {
    const out = buildLlmsTxt(posts(LLMS_MAX_POSTS + 5))
    assert.ok(out.includes(`Yazı ${LLMS_MAX_POSTS}`))
    assert.ok(!out.includes(`Yazı ${LLMS_MAX_POSTS + 1}`))
    assert.ok(out.includes(`[Tüm yazılar](${SITE_URL}/blog)`))
  })

  test("hiç yazı yoksa bölüm boş kalmaz", () => {
    const out = buildLlmsTxt([])
    assert.ok(out.includes("## Blog yazıları"))
    assert.ok(out.includes(`(${SITE_URL}/blog)`))
  })
})

describe("buildLlmsTxt — plan limitleri", () => {
  test("limitler PLAN_LIMITS'ten türetilir (ikinci kopya yok)", () => {
    const out = buildLlmsTxt(posts(1))
    assert.ok(
      out.includes(`ayda ${PLAN_LIMITS.free.textMessages} asistan mesajı`),
    )
    assert.ok(
      out.includes(`ayda ${PLAN_LIMITS.pro.textMessages} asistan mesajı`),
    )
  })

  test("null limit 'sınırsız' olarak yazılır, 'null' sızmaz", () => {
    assert.equal(PLAN_LIMITS.pro.savedBaskets, null)
    const out = buildLlmsTxt(posts(1))
    assert.ok(out.includes("sınırsız"))
    assert.ok(!/\bnull\b/.test(out))
  })

  test("fiyat yazılmaz — tutarlar tek kaynakta (Polar + ana sayfa) kalır", () => {
    const out = buildLlmsTxt(posts(1))
    assert.ok(!out.includes("₺"))
  })
})
