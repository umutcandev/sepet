import type { ThemeRegistrationRaw } from "shiki"

// Blog kod bloklarının Shiki temaları. Önceden hazır `github-light` /
// `github-dark` kullanılıyordu; GitHub'ın mavi-gri paleti sitenin sıcak kahve
// paletinin üstünde yabancı duruyordu. Buradaki iki tema token renklerini
// tasarım sisteminin tonlarına oturtur: nötrler ve "sıcak" uçlar paletten
// (foreground/muted-foreground akrabası), ayırt edici uçlar (yeşil/mor/teal/
// indigo) ise sıcak zemine göre desatüre edilmiş hâlleriyle seçilmiştir.
//
// Kontrast, kod zemininin gerçek değerine göre ölçüldü
// (globals.css `--code-surface`: light #FAF1E6, dark #221A13). Tüm token
// renkleri WCAG AA'yı (≥4.5:1) geçer; en düşükleri light comment 4.97 ve
// light punctuation 4.76. Satır numarası gutter'ı yardımcı bir işaret olduğu
// için 3:1 eşiğinde tutulur (globals.css `--code-gutter`).

/** Bir rengi TextMate scope kümesine bağlayan kısayol. */
function rule(scope: string[], foreground: string, fontStyle?: string) {
  return { scope, settings: { foreground, ...(fontStyle ? { fontStyle } : {}) } }
}

type Palette = {
  fg: string
  comment: string
  punctuation: string
  keyword: string
  string: string
  number: string
  function: string
  type: string
  property: string
  invalid: string
  inserted: string
  deleted: string
}

const light: Palette = {
  fg: "#3D2418", // --foreground
  comment: "#7D6353",
  punctuation: "#7A6857",
  keyword: "#A6371C", // yanık kiremit
  string: "#4C6B21", // zeytin
  number: "#7B3E8F", // erik
  function: "#0F6478", // derin teal
  type: "#3A4BA0", // indigo
  property: "#54382A", // yumuşatılmış foreground
  invalid: "#B8442E", // --destructive
  inserted: "#3F6B1F",
  deleted: "#A6371C",
}

const dark: Palette = {
  fg: "#F5E8DA", // --foreground (dark)
  comment: "#9A8370",
  punctuation: "#A6907C",
  keyword: "#FF9877",
  string: "#B6CE78",
  number: "#DDA0EE",
  function: "#6FC7DE",
  type: "#9FAEF5",
  property: "#EBDBCB",
  invalid: "#E07259", // --destructive (dark)
  inserted: "#A8CE7C",
  deleted: "#F0876A",
}

// Scope'lar uzunluğa göre çözülür: `punctuation.definition.string`,
// `punctuation`ı yener; bu yüzden tırnak işaretleri string rengini,
// yorum işaretçileri yorum rengini alır.
function build(name: string, type: "light" | "dark", p: Palette): ThemeRegistrationRaw {
  return {
    name,
    type,
    colors: { "editor.foreground": p.fg },
    settings: [
      { settings: { foreground: p.fg } },

      rule(
        ["comment", "punctuation.definition.comment", "string.comment"],
        p.comment,
      ),

      rule(
        [
          "punctuation",
          "meta.brace",
          "meta.delimiter",
          "punctuation.separator",
          "punctuation.terminator",
          "punctuation.accessor",
          "punctuation.definition.tag",
        ],
        p.punctuation,
      ),

      rule(
        [
          "keyword",
          "keyword.control",
          "keyword.operator",
          "storage",
          "storage.type",
          "storage.modifier",
          "variable.language.this",
          "variable.language.super",
          "constant.language.import-export-all",
          "meta.import keyword",
          "meta.export keyword",
        ],
        p.keyword,
      ),

      rule(
        [
          "string",
          "string.quoted",
          "string.template",
          "punctuation.definition.string",
          "constant.other.symbol",
          "markup.inline.raw",
          "meta.embedded.line",
        ],
        p.string,
      ),

      rule(
        [
          "constant.numeric",
          "constant.language",
          "constant.character",
          "constant.character.escape",
          "constant.other",
          "support.constant",
          "keyword.other.unit",
        ],
        p.number,
      ),

      rule(
        [
          "entity.name.function",
          "variable.function",
          "support.function",
          "meta.function-call.generic",
          "meta.function-call entity.name.function",
        ],
        p.function,
      ),

      rule(
        [
          "entity.name.type",
          "entity.name.class",
          "entity.name.namespace",
          "entity.other.inherited-class",
          "support.type",
          "support.class",
          "entity.name.scope-resolution",
        ],
        p.type,
      ),

      rule(
        [
          "variable",
          "variable.other",
          "variable.parameter",
          "meta.object-literal.key",
          "support.variable",
          "entity.name.label",
        ],
        p.property,
      ),

      // JSX/HTML: etiket adı anahtar kelime, öznitelik adı sabit rengiyle.
      rule(["entity.name.tag", "support.class.component"], p.keyword),
      rule(["entity.other.attribute-name"], p.number),

      // Markdown / diff
      rule(["markup.heading", "entity.name.section"], p.keyword, "bold"),
      rule(["markup.bold"], p.fg, "bold"),
      rule(["markup.italic"], p.fg, "italic"),
      rule(["markup.underline.link", "string.other.link"], p.function, "underline"),
      rule(["markup.inserted", "meta.diff.header.to-file"], p.inserted),
      rule(["markup.deleted", "meta.diff.header.from-file"], p.deleted),
      rule(["markup.changed"], p.number),

      rule(["invalid", "invalid.illegal"], p.invalid),
    ],
  }
}

export const codeThemeLight = build("sepet-light", "light", light)
export const codeThemeDark = build("sepet-dark", "dark", dark)
