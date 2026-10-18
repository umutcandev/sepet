import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { CATEGORY_IDS } from "../categories"
import { CATEGORY_STYLES, makePalette, POLARITIES } from "./color"
import {
  contrast,
  COVER_SIZE,
  design,
  MOTIF_TYPES,
  OG_SIZE,
  render,
} from "./covergen"
import { Rng } from "./rng"

// Sitenin kullandığı boyutlar ve bir kare.
const SIZES = [COVER_SIZE, OG_SIZE, { width: 1080, height: 1080 }]

const ELEMENTS = new Set(["svg", "defs", "clipPath", "rect", "g", "path"])
const ATTRS = new Set([
  "xmlns",
  "viewBox",
  "width",
  "height",
  "x",
  "y",
  "id",
  "fill",
  "fill-rule",
  "clip-path",
  "d",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
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
        assert.match(value, /^[MLZAahv0-9 .-]+$/, `${where}: path verisi`)
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

  test("her kategori, motif ve boyutta geçerli ve dolu bir SVG", () => {
    for (const category of CATEGORY_IDS)
      for (const motif of MOTIF_TYPES)
        for (const size of SIZES)
          for (let i = 0; i < 3; i++) {
            const spec = design(`test-${i}`, category, { motif, ...size })
            const where = `${category}/${motif}/${size.width}x${size.height}/${i}`
            assert.equal(spec.motif.type, motif, where)
            assertWellFormed(render(spec), where)
          }
  })

  test("kontrast her palette en az 7'ye 1", () => {
    for (const category of CATEGORY_IDS)
      for (const polarity of POLARITIES)
        for (let i = 0; i < 2000; i++) {
          const p = makePalette(
            new Rng(`palet-${i}`),
            CATEGORY_STYLES[category],
            polarity
          )
          assert.ok(
            contrast(p.bg, p.fg) >= 7,
            `${category}/${polarity}/${i}: ${p.bg} ${p.fg}`
          )
        }
  })

  test("zemin tercihi uygulanır", () => {
    const light = design("bir-yazi", "kesisim", { polarity: "light" })
    const dark = design("bir-yazi", "kesisim", { polarity: "dark" })
    assert.equal(light.palette.light, true)
    assert.equal(dark.palette.light, false)
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
