import { hash32, Rng } from "../rng"
import { TAU } from "../field"
import {
  hatch,
  PathData,
  rectPoly,
  type Frame,
  type Layer,
  type Vec,
} from "../geometry"
import type { TruchetSpec } from "../spec"

export function truchetOrientation(
  spec: TruchetSpec,
  i: number,
  j: number,
  cols: number,
  rows: number
): number {
  const u = (i + 0.5) / cols
  const v = (j + 0.5) / rows
  switch (spec.rule) {
    case "random":
      return hash32(`${spec.salt}:${i}:${j}`) & 3
    case "checker":
      return (
        ((i + j) % 2) | (((Math.floor(i / 2) + Math.floor(j / 2)) % 2) << 1)
      )
    case "rows":
      return (j % 2) | ((i % 2) << 1)
    case "radial": {
      const qx = u > 0.5 ? 1 : 0
      const qy = v > 0.5 ? 1 : 0
      return (qx ^ qy) | (qy << 1)
    }
    case "wave": {
      const a =
        Math.sin(TAU * (spec.waveK[0] * u + spec.phase)) +
        Math.sin(TAU * spec.waveK[1] * v * (rows / cols))
      const b =
        Math.sin(TAU * (spec.waveK[1] * u - spec.phase)) -
        Math.cos(TAU * spec.waveK[0] * v)
      return (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0)
    }
  }
}

export function renderTruchet(spec: TruchetSpec, fr: Frame): Layer[] {
  const path = new PathData()
  const s = fr.w / spec.cols
  const rows = Math.ceil(fr.h / s)
  const y0 = fr.y + (fr.h - rows * s) / 2
  const g = (spec.spread * s) / spec.bands
  const w = spec.bandWidth * s
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < spec.cols; i++) {
      const x = fr.x + i * s
      const y = y0 + j * s
      const o = truchetOrientation(spec, i, j, spec.cols, rows)
      if (spec.tile === "arc") {
        // o&1 = 0 → sol üst + sağ alt köşe; 1 → sağ üst + sol alt
        const corners: [number, number, number][] =
          o & 1
            ? [
                [x + s, y, 90],
                [x, y + s, 270],
              ]
            : [
                [x, y, 0],
                [x + s, y + s, 180],
              ]
        for (const [cx, cy, a0] of corners) {
          for (let k = 0; k < spec.bands; k++) {
            const m = s / 2 - (spec.spread * s) / 2 + g * (k + 0.5)
            path.quarter(cx, cy, m - w / 2, m + w / 2, a0)
          }
          if (spec.corners) {
            const rc = s / 2 - (spec.spread * s) / 2 - (g - w)
            if (rc > 2) path.quarter(cx, cy, 0, rc, a0)
          }
        }
      } else if (spec.tile === "triangle") {
        const c: Vec[] = [
          [x, y],
          [x + s, y],
          [x + s, y + s],
          [x, y + s],
        ]
        path.poly([c[o], c[(o + 1) % 4], c[(o + 3) % 4]])
      } else {
        const angle = o & 1 ? Math.PI / 4 : -Math.PI / 4
        hatch(
          path,
          rectPoly({ x, y, w: s, h: s }),
          angle,
          (s * Math.SQRT1_2) / spec.hatch,
          spec.duty
        )
      }
    }
  return [{ d: path.toString() }]
}

export function designTruchet(r: Rng): TruchetSpec {
  const tile = r.weighted([
    ["arc", 3],
    ["triangle", 1.5],
    ["diag", 1.5],
  ] as const)
  const rule =
    tile === "arc"
      ? r.weighted([
          ["random", 2],
          ["checker", 1],
          ["radial", 1],
          ["wave", 1.5],
          ["rows", 0.8],
        ] as const)
      : tile === "triangle"
        ? r.weighted([
            ["random", 1.5],
            ["checker", 1.5],
            ["radial", 1.5],
            ["wave", 1.5],
            ["rows", 1],
          ] as const)
        : r.weighted([
            ["rows", 1.5],
            ["checker", 1.5],
            ["radial", 1],
            ["wave", 1.2],
            ["random", 0.6],
          ] as const)
  const bands = r.weighted([
    [1, 2],
    [2, 2],
    [3, 1.5],
    [4, 1],
  ] as const)
  const cols =
    tile === "arc"
      ? r.pick(bands >= 3 ? [7, 8, 10, 12] : [8, 10, 12, 14, 16])
      : tile === "triangle"
        ? r.int(10, 24)
        : r.pick([5, 6, 8, 10])
  const spread = r.range(0.34, 0.4)
  // çeyrek bant alanı: kaplama ≈ π·w·b / (2s) → w = 2c / (π b)
  const bandWidth = Math.min(
    (0.85 * spread) / bands,
    (2 * r.range(0.42, 0.5)) / (Math.PI * bands)
  )
  return {
    type: "truchet",
    tile,
    cols,
    rule,
    bands,
    bandWidth,
    spread,
    corners: bands <= 2 && r.chance(0.4),
    hatch: r.int(2, 4),
    duty: r.range(0.42, 0.6),
    waveK: [r.range(0.6, 2), r.range(0.6, 2)],
    phase: r.next(),
    salt: ((r.next() * 2 ** 32) >>> 0).toString(36),
  }
}
