import type { CategoryId } from "../categories"

import { Rng } from "./rng"

// Pazar paleti. Kontrast bilerek düşük olabilir (Safran 2,4 : 1); kapağın
// üstüne yazı yazan yerler rengi `inkOn` ile zeminden seçer.

export interface Palette {
  name: string
  bg: string
  fg: string
}

export const PALETTES = {
  sumak: { name: "Sumak", bg: "#6b2620", fg: "#ec6a3c" },
  erik: { name: "Erik", bg: "#5a1d3c", fg: "#f0a3c0" },
  safran: { name: "Safran", bg: "#f2a53a", fg: "#c4481c" },
  tarcin: { name: "Tarçın", bg: "#3f2617", fg: "#d39a5f" },
  zeytin: { name: "Zeytin", bg: "#3e4824", fg: "#b3c25e" },
  limon: { name: "Limon", bg: "#efd35e", fg: "#7d6814" },
  cini: { name: "Çini", bg: "#1d4b50", fg: "#93ccc6" },
  lacivert: { name: "Lacivert", bg: "#1f3352", fg: "#9dbbe3" },
} as const

export type PaletteId = keyof typeof PALETTES

// Her kategorinin kendine ait iki paleti var; palet paylaşılmaz.
export const CATEGORY_PALETTES: Record<CategoryId, readonly PaletteId[]> = {
  teknik: ["cini", "lacivert"],
  saglik: ["zeytin", "limon"],
  kesisim: ["safran", "tarcin"],
  urun: ["sumak", "erik"],
}

export function relLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG kontrast oranı. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export const INK = { dark: "#3d2418", light: "#fff8f0" } as const

/** Zeminde daha okunaklı yazı rengi: espresso ya da krem. */
export function inkOn(bg: string): string {
  return contrast(bg, INK.dark) >= contrast(bg, INK.light)
    ? INK.dark
    : INK.light
}

export function makePalette(rng: Rng, category: CategoryId): Palette {
  const p = PALETTES[rng.pick(CATEGORY_PALETTES[category])]
  return { name: p.name, bg: p.bg, fg: p.fg }
}
