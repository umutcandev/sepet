import type { CategoryId } from "../categories"

import type { Palette } from "./color"
import type { Shaping } from "./field"

export type MotifType =
  | "stripes"
  | "rings"
  | "waves"
  | "dots"
  | "moire"
  | "polar"
  | "truchet"
  | "quilt"
  | "weave"
  | "contour"
  | "dither"

// Velite şeması (`coverMotif`) bunu enum olarak kullanır; tuple kalmalı.
export const MOTIF_TYPES = [
  "stripes",
  "rings",
  "waves",
  "dots",
  "moire",
  "polar",
  "truchet",
  "quilt",
  "weave",
  "contour",
  "dither",
] as const satisfies readonly MotifType[]

export interface StripesSpec {
  type: "stripes"
  orient: "h" | "v"
  cellsA: number
  cellsB: number
  count: number
  /** slots: eşit yuvalar · edges: uç çizgiler çerçevede, yarısı kırpılır */
  place: "slots" | "edges"
  anchor: number
  tMin: number
  tMax: number
  shaping: Shaping
  warp: { amp: number; k: number; phase: number } | null
  jitter: number
}

export interface RingsSpec {
  type: "rings"
  /** single: tek merkez · tunnel: merkez halka halka kayar · grid: hedef ızgarası */
  mode: "single" | "tunnel" | "grid"
  shape: "circle" | "square" | "diamond"
  cols: number
  rows: number
  cx: number
  cy: number
  mirror: boolean
  pitch: number
  tMin: number
  tMax: number
  shaping: Shaping
  drift: number
  driftAngle: number
  /** tünel: halka başına merkez kayması, aralık cinsinden */
  tunnel: [number, number]
  /** ızgara: hücre başına alan fazı */
  cellPhase: number
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
  /** kare/artı/çubuk: tuval boyunca en fazla bu kadar döner (radyan) */
  rotate: number
  shaping: Shaping
}

export interface MoireSpec {
  type: "moire"
  /** rings2: iki halka sistemi · lines2: iki ızgara · ringsLines: halka × ızgara */
  mode: "rings2" | "lines2" | "ringsLines"
  pitch: number
  thick: number
  c1: [number, number]
  c2: [number, number]
  angle: number
  curve: number
  curveK: number
}

export interface PolarSpec {
  type: "polar"
  /** rays: güneş ışını · checker: dart tahtası · vortex: logaritmik girdap · spiral: spiral kollar */
  mode: "rays" | "checker" | "vortex" | "spiral"
  cx: number
  cy: number
  wedges: number
  duty: number
  pulse: number
  pulseK: number
  ringPitch: number
  growth: number
  twist: number
}

export interface TruchetSpec {
  type: "truchet"
  /** arc: çeyrek yay bantları · triangle: köşegen yarım · diag: köşegen tarama */
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

export interface QuiltSpec {
  type: "quilt"
  salt: string
  depth: number
  minSide: number
  pitch: number
  gap: number
  /** derece */
  angles: number[]
  duties: number[]
  solid: number
  empty: number
  splits: number[]
  /** hedef kaplama; taranan parçaların yoğunluğu buna göre ölçeklenir */
  cover: number
}

export interface WeaveSpec {
  type: "weave"
  rule: "plain" | "basket" | "twill" | "herringbone"
  cols: number
  bars: number
  duty: number
  run: number
  /** varsa çubuk kalınlığı tuval boyunca bu alanla değişir */
  shaping: Shaping | null
}

export interface ContourSpec {
  type: "contour"
  /** [x, y, yarıçap, genlik] — çerçeve yüksekliği birimiyle */
  hills: [number, number, number, number][]
  /** [kx, ky, genlik, faz] */
  wave: [number, number, number, number]
  levels: number
  /** hedef kaplama: çizgi kalınlığı toplam çizgi boyundan çözülür */
  cover: number
  /** her n'inci eğri kalın (0 = yok) */
  major: number
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

export type MotifSpec =
  | StripesSpec
  | RingsSpec
  | WavesSpec
  | DotsSpec
  | MoireSpec
  | PolarSpec
  | TruchetSpec
  | QuiltSpec
  | WeaveSpec
  | ContourSpec
  | DitherSpec

export interface CoverSpec {
  seed: string
  category: CategoryId
  width: number
  height: number
  palette: Palette
  motif: MotifSpec
}
