import { hash32, Rng } from "../rng"
import { TAU } from "../field"
import type { TruchetSpec } from "./types"

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
