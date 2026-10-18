import type { CategoryId } from "../categories"

import { Rng } from "./rng"

export type RGB = [number, number, number]

export function oklchToLinear(L: number, C: number, h: number): RGB {
  const hr = (h * Math.PI) / 180
  const a = C * Math.cos(hr)
  const b = C * Math.sin(hr)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

export const inGamut = (c: RGB) => c.every((v) => v >= -1e-4 && v <= 1 + 1e-4)

/** Verilen açıklık ve tonda sRGB'ye sığan en yüksek kroma. */
export function maxChroma(L: number, h: number): number {
  let lo = 0
  let hi = 0.4
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklchToLinear(L, mid, h))) lo = mid
    else hi = mid
  }
  return lo
}

export function encode(v: number): number {
  const x = Math.min(1, Math.max(0, v))
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
}

export function oklchHex(L: number, C: number, h: number): string {
  const rgb = oklchToLinear(L, Math.min(C, maxChroma(L, h)), h)
  return (
    "#" +
    rgb
      .map((v) =>
        Math.round(encode(v) * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  )
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

export interface HueAnchor {
  name: string
  /** zemin tonu (OKLCH hue, derece) */
  hue: number
  /** açık rengin koyuya göre ton kayması: maviler açıldıkça camgöbeğine kayar */
  fgShift: number
}

// Kategori yalnız renk ailesini belirler. Motif kategoriden bağımsız: on bir
// motifin her biri her kategoride eşit olasılıkla seçilir (bkz. design).
export interface CategoryStyle {
  anchors: HueAnchor[]
}

// Yeni kategori eklendiğinde burada stil tanımlamak zorunlu (Record<CategoryId>).
export const CATEGORY_STYLES: Record<CategoryId, CategoryStyle> = {
  teknik: {
    anchors: [
      { name: "Mor", hue: 299, fgShift: 0 },
      { name: "Lacivert", hue: 262, fgShift: -28 },
      { name: "Çivit", hue: 279, fgShift: -12 },
      { name: "Petrol", hue: 222, fgShift: -6 },
      { name: "Mürdüm", hue: 330, fgShift: -8 },
    ],
  },
  saglik: {
    anchors: [
      { name: "Yaprak", hue: 148, fgShift: -6 },
      { name: "Nane", hue: 172, fgShift: -8 },
      { name: "Çam", hue: 190, fgShift: -14 },
      { name: "Zeytin", hue: 122, fgShift: -4 },
      { name: "Okyanus", hue: 208, fgShift: -16 },
    ],
  },
  kesisim: {
    anchors: [
      { name: "Limon", hue: 99, fgShift: 4 },
      { name: "Kehribar", hue: 70, fgShift: 12 },
      { name: "Mercan", hue: 32, fgShift: 18 },
      { name: "Gül", hue: 8, fgShift: 14 },
      { name: "Tarçın", hue: 50, fgShift: 10 },
    ],
  },
}

export interface Palette {
  name: string
  bg: string
  fg: string
  /** açık zemin, koyu mürekkep */
  light: boolean
  /** düşük doygunluklu (kırık) ton */
  muted: boolean
}

export const POLARITIES = ["auto", "dark", "light"] as const
export type Polarity = (typeof POLARITIES)[number]

/**
 * Aynı tonun koyu-doygun ve açık-yumuşak hâli. Koyu: L≈0.22–0.30, kroma gamut
 * sınırına yakın. Açık: L≈0.80–0.90, kroma %55–80 (açık zeminde kâğıt gibi,
 * kroma yarıya iner). %20 olasılıkla kırık ton, %22 olasılıkla açık zemin.
 * Kontrast 7:1'in altına düşerse önce açık ton açılır, yetmezse koyu ton
 * koyulaşır. Bugünkü aralıklarda en kötü başlangıç 7,1'e 1; bu iki adım
 * aralıklar değişse de alt sınırı yapısal olarak korur.
 */
export function makePalette(
  rng: Rng,
  style: CategoryStyle,
  polarity: Polarity = "auto"
): Palette {
  const anchor = rng.pick(style.anchors)
  const h = anchor.hue + rng.range(-5, 5)
  const fh = h + anchor.fgShift + rng.range(-3, 3)
  const muted = rng.chance(0.2)
  const lightRoll = rng.chance(0.22)
  const light = polarity === "light" || (polarity === "auto" && lightRoll)
  let darkL = rng.range(0.22, 0.3)
  const darkF = muted ? rng.range(0.3, 0.46) : rng.range(0.76, 0.92)
  const fC = rng.range(0.55, 0.8)
  const cap =
    (muted ? rng.range(0.035, 0.06) : rng.range(0.1, 0.155)) * (light ? 0.5 : 1)
  let lightL = light ? rng.range(0.9, 0.95) : rng.range(0.8, 0.9)
  const darkHex = () => oklchHex(darkL, maxChroma(darkL, h) * darkF, h)
  const lightHex = () =>
    oklchHex(lightL, Math.min(cap, maxChroma(lightL, fh) * fC), fh)
  let dark = darkHex()
  let lite = lightHex()
  while (contrast(dark, lite) < 7 && lightL < 0.97) {
    lightL += 0.01
    lite = lightHex()
  }
  while (contrast(dark, lite) < 7 && darkL > 0.05) {
    darkL -= 0.01
    dark = darkHex()
  }
  return {
    name: anchor.name,
    bg: light ? lite : dark,
    fg: light ? dark : lite,
    light,
    muted,
  }
}
