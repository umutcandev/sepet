import { Rng } from "./rng"

/**
 * Skaler alan: hücre içinde s (yatay/çizgi boyunca) ve t (dikey/çizgiler arası)
 * ∈ [0,1] için 0..1 değer. Kalınlık, boyut ya da yoğunluk buradan okunur.
 */
export type Field =
  | { kind: "ramp" }
  | { kind: "wave"; kt: number; ks: number; phase: number }
  | { kind: "diamond"; cx: number; cy: number; gain: number }
  | { kind: "radial"; cx: number; cy: number; radius: number }
  | { kind: "pillow"; power: number }
  | { kind: "ripple"; cx: number; cy: number; k: number; phase: number }
  | { kind: "spiral"; cx: number; cy: number; arms: number; k: number }
  | { kind: "saddle"; k: number; phase: number }
  | { kind: "eggcrate"; ks: number; kt: number; phase: number }

/** Tek indeksli hücrelere uygulanan simetri işlemi. */
export type CellOp = "none" | "flipS" | "flipT" | "invert" | "shift"

export interface Shaping {
  field: Field
  /** ton eğrisi f^gamma — görsel ağırlığı dengelemek için otomatik çözülür */
  gamma: number
  /** gamma yetmediğinde doğrusal düzeltme: >0 tabanı kaldırır, <0 tavanı indirir */
  bias: number
  /** 0 = sürekli; n = 0..n arası n+1 basamak */
  levels: number
  /** yatay eksende tek indeksli hücreler */
  opA: CellOp
  /** dikey eksende tek indeksli hücreler */
  opB: CellOp
}

export const TAU = Math.PI * 2
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

export const PHASED = new Set<Field["kind"]>([
  "wave",
  "ripple",
  "spiral",
  "saddle",
  "eggcrate",
])

export function fieldValue(
  f: Field,
  s: number,
  t: number,
  ar: number,
  shift: number
): number {
  switch (f.kind) {
    case "ramp":
      return t
    case "wave":
      return 0.5 + 0.5 * Math.sin(TAU * (f.kt * t + f.ks * s + f.phase + shift))
    case "diamond":
      return clamp01(
        1 - f.gain * (Math.abs(s - f.cx) * ar + Math.abs(t - f.cy))
      )
    case "radial": {
      const d = Math.hypot((s - f.cx) * ar, t - f.cy) / f.radius
      return d >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d)
    }
    case "pillow":
      return (Math.sin(Math.PI * s) * Math.sin(Math.PI * t)) ** f.power
    case "ripple":
      return (
        0.5 +
        0.5 *
          Math.cos(
            TAU *
              (f.k * Math.hypot((s - f.cx) * ar, t - f.cy) + f.phase + shift)
          )
      )
    case "spiral": {
      const dx = (s - f.cx) * ar
      const dy = t - f.cy
      return (
        0.5 +
        0.5 *
          Math.sin(
            f.arms * Math.atan2(dy, dx) +
              TAU * (f.k * Math.hypot(dx, dy) + shift)
          )
      )
    }
    case "saddle": {
      const x = (s - 0.5) * ar
      const y = t - 0.5
      return (
        0.5 +
        0.5 * Math.cos(TAU * (2 * f.k * (x * x - y * y) + f.phase + shift))
      )
    }
    case "eggcrate":
      return (
        0.5 +
        0.5 *
          Math.sin(TAU * (f.ks * s + f.phase + shift)) *
          Math.sin(TAU * f.kt * t)
      )
  }
}

export function shaped(
  sh: Shaping,
  s: number,
  t: number,
  ca: number,
  cb: number,
  ar: number
): number {
  let inv = false
  let shift = 0
  const ops: CellOp[] = [ca % 2 ? sh.opA : "none", cb % 2 ? sh.opB : "none"]
  for (const op of ops) {
    if (op === "flipS") s = 1 - s
    else if (op === "flipT") t = 1 - t
    else if (op === "invert") inv = !inv
    else if (op === "shift") {
      if (PHASED.has(sh.field.kind)) shift += 0.25
      else t = 1 - t
    }
  }
  let v = fieldValue(sh.field, s, t, ar, shift)
  if (inv) v = 1 - v
  v = v ** sh.gamma
  if (sh.bias > 0) v = sh.bias + (1 - sh.bias) * v
  else if (sh.bias < 0) v *= 1 + sh.bias
  if (sh.levels > 0)
    v = Math.min(Math.floor(v * (sh.levels + 1)), sh.levels) / sh.levels
  return v
}

/**
 * Görsel ağırlık dengesi: alanın ortalamasını hedefe oturtur. Önce ton eğrisi
 * (gamma; ortalama gamma ile azalır). Alanın büyük kısmı 0 ya da 1 ise gamma
 * yetmez; kalan fark bias ile kapatılır. İkisi de `meanOf` üzerinden ikiye
 * bölmeyle çözülür, yani basamaklama ve hücre işlemleri dahil gerçek ortalama
 * hedeflenir. `meanOf`, motifin gerçekten çizdiği örnek noktalarında ölçmeli.
 */
export function balance(
  sh: Shaping,
  meanOf: (sh: Shaping) => number,
  target: number
): void {
  // Basamaklı alanda ortalama parametreyle sıçrayarak değişir; ikiye bölme
  // sıçramanın iki yanında durur. Sonunda hedefe daha yakın olan yan seçilir.
  const settle = (set: (x: number) => void, lo: number, hi: number) => {
    set(lo)
    const atLo = Math.abs(meanOf(sh) - target)
    set(hi)
    if (Math.abs(meanOf(sh) - target) > atLo) set(lo)
  }
  sh.bias = 0
  let lo = Math.log(0.3)
  let hi = Math.log(3.5)
  // Ortalama gamma ile azalır.
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2
    sh.gamma = Math.exp(mid)
    if (meanOf(sh) > target) lo = mid
    else hi = mid
  }
  settle((x) => (sh.gamma = Math.exp(x)), lo, hi)
  if (Math.abs(meanOf(sh) - target) <= 0.02) return
  // Ortalama bias ile artar (bkz. shaped); uçlar alanı tamamen doyurmasın
  // diye ±0.98.
  lo = -0.98
  hi = 0.98
  for (let i = 0; i < 18; i++) {
    sh.bias = (lo + hi) / 2
    if (meanOf(sh) > target) hi = sh.bias
    else lo = sh.bias
  }
  settle((x) => (sh.bias = x), lo, hi)
}

/** Örnek noktası: hücre içi konum (s, t) ve hücre indeksleri. */
export type Sample = [s: number, t: number, ca: number, cb: number]

/** Verilen örnek noktalarında alan ortalaması. */
export function meanOfSamples(sh: Shaping, samples: Sample[], ar: number) {
  let sum = 0
  for (const [s, t, ca, cb] of samples) sum += shaped(sh, s, t, ca, cb, ar)
  return sum / samples.length
}

export function meanOverCells(
  sh: Shaping,
  cellsA: number,
  cellsB: number,
  ar: number,
  n = 16
): number {
  let sum = 0
  let count = 0
  for (let ca = 0; ca < cellsA; ca++)
    for (let cb = 0; cb < cellsB; cb++)
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          sum += shaped(sh, (i + 0.5) / n, (j + 0.5) / n, ca, cb, ar)
          count++
        }
  return sum / count
}

export function makeShaping(
  field: Field,
  levels = 0,
  opA: CellOp = "none",
  opB: CellOp = "none"
): Shaping {
  return { field, gamma: 1, bias: 0, levels, opA, opB }
}

/** Hedef kaplama: ön plan alanı / çerçeve alanı. */
export const coverageTarget = (r: Rng) => r.range(0.46, 0.57)

/** Çizgi/nokta/tarama motiflerinin ortak alan havuzu. */
export function randomField(r: Rng, pool: Field["kind"][]): Field {
  const kind = r.pick(pool)
  const center = (): [number, number] =>
    r.weighted([
      [[0.5, 0.5], 3],
      [[0.32, 0.5], 1],
      [[0.68, 0.42], 1],
      [[0, 0], 0.7],
      [[0, 1], 0.7],
      [[1, 0.5], 0.7],
    ] as const) as [number, number]
  switch (kind) {
    case "ramp":
      return { kind }
    case "wave":
      return {
        kind,
        kt: r.pick([1, 1.5, 2, 2.5]),
        ks: r.pick([0, 0.5, 1, -0.5]),
        phase: r.next(),
      }
    case "diamond": {
      const [cx, cy] = center()
      return { kind, cx, cy, gain: r.range(0.8, 1.5) }
    }
    case "radial": {
      const [cx, cy] = center()
      return { kind, cx, cy, radius: r.range(0.45, 0.85) }
    }
    case "pillow":
      return { kind, power: r.range(0.6, 1.5) }
    case "ripple": {
      const [cx, cy] = center()
      return { kind, cx, cy, k: r.range(1.6, 4.5), phase: r.next() }
    }
    case "spiral": {
      const [cx, cy] = r.chance(0.7) ? [0.5, 0.5] : center()
      return { kind, cx, cy, arms: r.int(1, 5), k: r.sign() * r.range(0.8, 3) }
    }
    case "saddle":
      return { kind, k: r.range(1, 3.2), phase: r.next() }
    case "eggcrate":
      return {
        kind,
        ks: r.pick([1, 1.5, 2, 3]),
        kt: r.pick([1, 1.5, 2]),
        phase: r.next(),
      }
  }
}
