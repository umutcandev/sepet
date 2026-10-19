import { Rng } from "../rng"
import {
  balance,
  coverageTarget,
  makeShaping,
  meanOfSamples,
  randomField,
  type Sample,
  shaped,
} from "../field"
import { PathData, type Frame, type Layer } from "../geometry"
import type { DitherSpec } from "../spec"

export function bayer(n: number): number[][] {
  let m = [[0]]
  while (m.length < n) {
    const k = m.length
    const next: number[][] = Array.from({ length: 2 * k }, () =>
      new Array<number>(2 * k).fill(0)
    )
    for (let y = 0; y < k; y++)
      for (let x = 0; x < k; x++) {
        const v = 4 * m[y][x]
        next[y][x] = v
        next[y][x + k] = v + 2
        next[y + k][x] = v + 3
        next[y + k][x + k] = v + 1
      }
    m = next
  }
  return m
}

/** Tire ve artının boyutları, hücreye oranla. */
const DASH_H = 0.7
const DASH_INSET = 0.08
const PLUS_L = 0.48
const PLUS_W = 0.18

// Yanan bir hücrenin kapladığı pay: kare 1, daire 0,66, tire yaklaşık 0,64
// (iki ucu içeri çekik, ortalama iki hücrelik koşu), artı 0,56.

/** Hücre merkezleri: render ile dengeleme aynı noktaları kullanır. */
function ditherSamples(
  spec: Pick<DitherSpec, "cols" | "rows" | "cellsA" | "cellsB">
): Sample[] {
  const cellCols = spec.cols / spec.cellsA
  const cellRows = spec.rows / spec.cellsB
  const out: Sample[] = []
  for (let j = 0; j < spec.rows; j++)
    for (let i = 0; i < spec.cols; i++) {
      const ca = Math.min(spec.cellsA - 1, Math.floor(i / cellCols))
      const cb = Math.min(spec.cellsB - 1, Math.floor(j / cellRows))
      out.push([
        (i - ca * cellCols + 0.5) / cellCols,
        (j - cb * cellRows + 0.5) / cellRows,
        ca,
        cb,
      ])
    }
  return out
}

export function renderDither(spec: DitherSpec, fr: Frame): Layer[] {
  const path = new PathData()
  const B = bayer(spec.matrix)
  const m = spec.matrix
  const cw = fr.w / spec.cols
  const ch = fr.h / spec.rows
  const cellCols = spec.cols / spec.cellsA
  const cellRows = spec.rows / spec.cellsB
  const ar = (cellCols * cw) / (cellRows * ch)
  for (let j = 0; j < spec.rows; j++) {
    let run = -1
    for (let i = 0; i <= spec.cols; i++) {
      let on = false
      if (i < spec.cols) {
        const ca = Math.min(spec.cellsA - 1, Math.floor(i / cellCols))
        const cb = Math.min(spec.cellsB - 1, Math.floor(j / cellRows))
        const s = (i - ca * cellCols + 0.5) / cellCols
        const t = (j - cb * cellRows + 0.5) / cellRows
        on =
          shaped(spec.shaping, s, t, ca, cb, ar) >
          (B[j % m][i % m] + 0.5) / (m * m)
      }
      const x = fr.x + i * cw
      const y = fr.y + j * ch
      if (spec.shape === "square" || spec.shape === "dash") {
        if (on && run < 0) run = i
        if (!on && run >= 0) {
          const dash = spec.shape === "dash"
          const inset = dash ? cw * DASH_INSET : 0
          path.rect(
            fr.x + run * cw + inset,
            y + (dash ? (ch * (1 - DASH_H)) / 2 : 0),
            (i - run) * cw - 2 * inset,
            dash ? ch * DASH_H : ch
          )
          run = -1
        }
        continue
      }
      if (!on) continue
      const cx = x + cw / 2
      const cy = y + ch / 2
      const q = Math.min(cw, ch)
      if (spec.shape === "circle") path.circle(cx, cy, q * 0.46)
      else path.plus(cx, cy, q * PLUS_L, q * PLUS_W)
    }
  }
  return [{ d: path.toString() }]
}

export function designDither(r: Rng, fr: Frame): DitherSpec {
  const shape = r.weighted([
    ["square", 3],
    ["circle", 2],
    ["dash", 1.4],
    ["plus", 0.8],
  ] as const)
  const cell =
    fr.h *
    (shape === "square"
      ? r.range(0.018, 0.04)
      : shape === "plus"
        ? r.range(0.04, 0.055)
        : r.range(0.03, 0.045))
  const cellsA = r.pick([1, 1, 2, 3])
  const cellsB = r.pick([1, 1, 2])
  const cols = Math.round(fr.w / cell / cellsA) * cellsA
  const rows = Math.round(fr.h / cell / cellsB) * cellsB
  const field = randomField(r, [
    "radial",
    "diamond",
    "wave",
    "spiral",
    "ripple",
    "saddle",
    "eggcrate",
    "pillow",
  ])
  const shaping = makeShaping(
    field,
    0,
    cellsA > 1 ? r.pick(["invert", "flipS", "none"] as const) : "none",
    cellsB > 1 ? r.pick(["invert", "flipT"] as const) : "none"
  )
  // Yanan hücre oranı ≈ alan ortalaması (Bayer eşiği yerel ortalamayı korur).
  // Kare hücreyi tam doldurur ve kaplama hedefi doğrudan uygulanır. Diğer
  // şekiller hücrenin ancak bir kısmını kaplar; onlarda yanan hücre oranı
  // seçilir, kaplama şeklin payı kadar düşük kalır (%35–50).
  const target =
    shape === "square" ? coverageTarget(r) : Math.min(0.85, r.range(0.62, 0.82))
  const ar = fr.w / cellsA / (fr.h / cellsB)
  const samples = ditherSamples({ cols, rows, cellsA, cellsB })
  balance(shaping, (sh) => meanOfSamples(sh, samples, ar), target)
  return {
    type: "dither",
    cols,
    rows,
    matrix: r.weighted([
      [4, 2],
      [8, 2],
      [2, 0.6],
    ] as const),
    shape,
    cellsA,
    cellsB,
    shaping,
  }
}
