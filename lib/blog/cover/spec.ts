import type { CategoryId } from "../categories"

import type { Palette } from "./color"
import type { Shaping } from "./field"
import type { TruchetSpec } from "./motifs/types"

export const MOTIF_TYPES = [
  "rings",
  "star",
  "tunnel",
  "citrus",
  "squares",
  "rays",
  "spiral",
  "waves",
  "weave",
  "truchet",
  "dots",
  "stripes",
  "moire",
  "dither",
] as const

export type MotifType = (typeof MOTIF_TYPES)[number]

/** Birkaç motif aynı kipi paylaşır. */
export type FieldMode =
  | "rings"
  | "onion"
  | "citrus"
  | "targets"
  | "polar"
  | "weave"
  | "waves"
  | "truchet"
  | "dots"
  | "stripes"
  | "moire"
  | "dither"

/** Uzunluklar kısa kenar biriminde; `cx`/`cy` merkeze göre. */
export interface FieldParams {
  mode: FieldMode
  seed: number
  // pürüz
  rough: number
  roughF: number
  // kıvrım
  warp: number
  warpF: number
  // bantlar
  freq: number
  ratio: number
  bead: number
  minT: number
  maxT: number
  // merkezli alanlar
  cx: number
  cy: number
  asp: number
  rot: number
  metric: number
  n: number
  sharp: number
  star: number
  ecc: number
  r0: number
  // kare halka
  cols: number
  rows: number
  mirror: number
  cellCx: number
  cellCy: number
  thickMod: number
  k: number
  phaseStep: number
  // ışın / spiral
  twist: number
  pulse: number
  pulseK: number
  eye: number
  // dalga
  horiz: number
  prof: number
  env: number
  amp: number
  cells: number
  cellOp: number
  // dokuma
  rule: number
  bars: number
  run: number
  // Truchet
  spread: number
  bandW: number
  truchet: TruchetSpec | null
  // nokta, çizgi alanı, piksel tarama
  nx: number
  ny: number
  cellsA: number
  cellsB: number
  stagger: number
  dotShape: number
  aMin: number
  aMax: number
  dotRot: number
  anchor: number
  matrix: number
  /** piksel taramada eşik çarpanı */
  gain: number
  shaping: Shaping | null
  // moiré
  c1: [number, number]
  c2: [number, number]
  pitch: number
}

export interface MotifSpec {
  type: MotifType
  field: FieldParams
}

export interface CoverSpec {
  seed: string
  category: CategoryId
  width: number
  height: number
  palette: Palette
  motif: MotifSpec
}
