import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { stripMdx } from "./markdown"
import { absoluteUrl } from "../site"

const img = (alt: string, path: string) => `![${alt}](${absoluteUrl(path)})`

describe("stripMdx", () => {
  test("Slide görsele ve alt yazıya iner", () => {
    const md = stripMdx(
      `<Slider label="L">\n  <Slide src="/a.svg" alt="A">Birinci.</Slide>\n</Slider>`
    )
    assert.equal(md, `${img("A", "/a.svg")}\nBirinci.`)
  })

  test("kendini kapatan Slide sonrakini yutmaz", () => {
    const md = stripMdx(
      `<Slide src="/a.svg" alt="A" />\n<Slide src="/b.svg" alt="B">İkinci.</Slide>`
    )
    assert.equal(md, `${img("A", "/a.svg")}\n\n${img("B", "/b.svg")}\nİkinci.`)
  })

  test("alt metinde > ve tek tırnaklı öznitelik", () => {
    const md = stripMdx(`<Slide src='/a.svg' alt="ok -> yön">Yazı</Slide>`)
    assert.equal(md, `${img("ok -> yön", "/a.svg")}\nYazı`)
  })

  test("alt metindeki köşeli parantez Markdown'ı bozmaz", () => {
    const md = stripMdx(`<Slide src="/a.svg" alt="[1] örnek">x</Slide>`)
    assert.equal(md, `${img("\\[1\\] örnek", "/a.svg")}\nx`)
  })

  test("kaynaksız Slide görsel üretmez, alt yazıyı korur", () => {
    assert.equal(stripMdx(`<Slide alt="A">Yalnız yazı</Slide>`), "Yalnız yazı")
  })

  test("diğer bileşenler ayıklanır, içerikleri kalır", () => {
    assert.equal(
      stripMdx(`<Callout variant="warning">Dikkat</Callout>`),
      "Dikkat"
    )
  })
})
