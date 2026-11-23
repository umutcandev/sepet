import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { CATEGORY_IDS } from "../categories"
import {
  CATEGORY_PALETTES,
  contrast,
  COVER_SIZE,
  design,
  inkOn,
  MOTIF_TYPES,
  OG_SIZE,
  PALETTES,
  render,
} from "./covergen"

// Sitenin kullandığı boyutlar ve bir kare.
const SIZES = [COVER_SIZE, OG_SIZE, { width: 1080, height: 1080 }]

const ELEMENTS = new Set(["svg", "rect", "path"])
const ATTRS = new Set([
  "xmlns",
  "viewBox",
  "width",
  "height",
  "fill",
  "fill-rule",
  "d",
])

/**
 * Motorun ürettiği SVG'nin dilbilgisi: yalnız beklenen etiket ve öznitelikler,
 * etiketler arasında metin yok, açılan her etiket kapanıyor, sayılar sonlu,
 * path verisi yalnız komut harfleri ve sayılardan oluşuyor.
 */
function assertWellFormed(svg: string, where: string) {
  const tag = /<(\/?)([a-zA-Z]+)((?:\s+[\w:-]+="[^"<>]*")*)\s*(\/?)>/y
  const stack: string[] = []
  let pos = 0
  let paths = 0
  while (pos < svg.length) {
    tag.lastIndex = pos
    const m = tag.exec(svg)
    assert.ok(m, `${where}: ${pos}. karakterde beklenmeyen içerik`)
    const [, closing, name, attrs, selfClosing] = m
    assert.ok(ELEMENTS.has(name), `${where}: beklenmeyen etiket <${name}>`)
    for (const [, attr, value] of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) {
      assert.ok(ATTRS.has(attr), `${where}: beklenmeyen öznitelik ${attr}`)
      assert.ok(!/NaN|Infinity/.test(value), `${where}: ${attr}="${value}"`)
      if (attr === "d") {
        assert.match(value, /^[MLZlz0-9 .-]+$/, `${where}: path verisi`)
        if (value.length > 40) paths++
      }
    }
    if (closing) assert.equal(stack.pop(), name, `${where}: kapanış </${name}>`)
    else if (!selfClosing) stack.push(name)
    pos = tag.lastIndex
  }
  assert.equal(stack.length, 0, `${where}: kapanmayan etiket`)
  assert.ok(paths > 0, `${where}: desen boş`)
}

describe("covergen", () => {
  test("aynı girdi her zaman aynı SVG'yi verir", () => {
    const a = render(design("bir-yazi", "teknik"))
    const b = render(design("bir-yazi", "teknik"))
    assert.equal(a, b)
  })

  test("varsayılan boyut kart boyutu", () => {
    const spec = design("bir-yazi", "teknik")
    assert.equal(spec.width, COVER_SIZE.width)
    assert.equal(spec.height, COVER_SIZE.height)
  })

  test("varyant ve kategori görseli değiştirir, slug aynı kalsa da", () => {
    const base = render(design("bir-yazi", "teknik"))
    assert.notEqual(render(design("bir-yazi", "teknik", { variant: 1 })), base)
    assert.notEqual(render(design("bir-yazi", "saglik")), base)
  })

  // kapak yavaş: her motif bir kez, boyutlar tek motifle
  test("her motifte geçerli ve dolu bir SVG", () => {
    MOTIF_TYPES.forEach((motif, i) => {
      const category = CATEGORY_IDS[i % CATEGORY_IDS.length]
      const spec = design(`test-${i}`, category, { motif })
      assert.equal(spec.motif.type, motif, motif)
      assertWellFormed(render(spec), `${category}/${motif}`)
    })
  })

  test("her boyutta geçerli ve dolu bir SVG", () => {
    for (const size of SIZES) {
      const where = `${size.width}x${size.height}`
      assertWellFormed(
        render(design("boyut", "saglik", { motif: "rings", ...size })),
        where
      )
    }
  })

  test("hiçbir palet iki kategoride birden kullanılmaz", () => {
    const all = Object.values(CATEGORY_PALETTES).flat()
    assert.equal(new Set(all).size, all.length)
  })

  test("her kategori kendi paletinden seçer", () => {
    for (const category of CATEGORY_IDS) {
      const allowed: string[] = CATEGORY_PALETTES[category].map(
        (id) => PALETTES[id].bg
      )
      for (let i = 0; i < 12; i++) {
        const { palette } = design(`palet-${i}`, category)
        assert.ok(
          allowed.includes(palette.bg),
          `${category}/${i}: ${palette.bg}`
        )
      }
    }
  })

  test("her zeminde yazı rengi en az 4,5'e 1", () => {
    for (const [id, p] of Object.entries(PALETTES))
      assert.ok(contrast(p.bg, inkOn(p.bg)) >= 4.5, `${id}: ${p.bg}`)
  })

  test("geçersiz boyut hata verir, sonsuz döngüye girmez", () => {
    for (const [width, height] of [
      [0, 864],
      [1536, 0],
      [Number.NaN, 864],
      [Infinity, 864],
      [4000, 100],
      [32, 32],
    ])
      assert.throws(
        () => design("bir-yazi", "teknik", { width, height }),
        RangeError,
        `${width}x${height}`
      )
  })
})
