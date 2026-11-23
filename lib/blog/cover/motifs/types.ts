import type { Shaping } from "../field"

// Eski motorun motif tanımları; design.ts bunları alan ayarlarına çevirir.

export interface StripesSpec {
  type: "stripes"
  orient: "h" | "v"
  cellsA: number
  cellsB: number
  count: number
  place: "slots" | "edges"
  anchor: number
  tMin: number
  tMax: number
  shaping: Shaping
  warp: { amp: number; k: number; phase: number } | null
  jitter: number
}

export interface WavesSpec {
  type: "waves"
  orient: "h" | "v"
  profile: "sine" | "triangle" | "square" | "skew"
  count: number
  cells: number
  cellOp: "none" | "invert" | "shift"
  k: number
  amp: number
  phaseStep: number
  envelope: "const" | "bulge" | "ramp" | "swell"
  thick: number
  thickMod: number
}

export interface DotsSpec {
  type: "dots"
  shape: "circle" | "square" | "diamond" | "plus" | "bar"
  cellsA: number
  cellsB: number
  perCellX: number
  perCellY: number
  stagger: boolean
  aMin: number
  aMax: number
  rotate: number
  shaping: Shaping
}

export interface MoireSpec {
  type: "moire"
  mode: "rings2" | "lines2" | "ringsLines"
  pitch: number
  thick: number
  c1: [number, number]
  c2: [number, number]
  angle: number
  curve: number
  curveK: number
}

export interface TruchetSpec {
  type: "truchet"
  tile: "arc" | "triangle" | "diag"
  cols: number
  rule: "random" | "checker" | "rows" | "radial" | "wave"
  bands: number
  bandWidth: number
  spread: number
  corners: boolean
  hatch: number
  duty: number
  waveK: [number, number]
  phase: number
  salt: string
}

export interface WeaveSpec {
  type: "weave"
  rule: "plain" | "basket" | "twill" | "herringbone"
  cols: number
  bars: number
  duty: number
  run: number
  shaping: Shaping | null
}

export interface DitherSpec {
  type: "dither"
  cols: number
  rows: number
  matrix: number
  shape: "square" | "circle" | "dash" | "plus"
  cellsA: number
  cellsB: number
  shaping: Shaping
}
