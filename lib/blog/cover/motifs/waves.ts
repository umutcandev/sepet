import { Rng } from "../rng"
import { clamp01, TAU } from "../field"
import {
  PathData,
  simplify,
  type Frame,
  type Layer,
  type Vec,
} from "../geometry"
import type { WavesSpec } from "../spec"

export function waveProfile(kind: WavesSpec["profile"], x: number): number {
  const a = TAU * x
  switch (kind) {
    case "sine":
      return Math.sin(a)
    case "triangle":
      return (2 / Math.PI) * Math.asin(Math.sin(a))
    case "square":
      return Math.tanh(3 * Math.sin(a)) / Math.tanh(3)
    case "skew":
      return Math.sin(a + 0.85 * Math.cos(a)) * 0.98
  }
}

export function renderWaves(spec: WavesSpec, fr: Frame): Layer[] {
  const horiz = spec.orient === "h"
  const lenA = horiz ? fr.w : fr.h
  const lenB = horiz ? fr.h : fr.w
  const oA = horiz ? fr.x : fr.y
  const oB = horiz ? fr.y : fr.x
  const p = lenB / spec.count
  const cellA = lenA / spec.cells
  const pad = Math.ceil(spec.amp) + 2
  const toXY = (a: number, b: number): Vec => (horiz ? [a, b] : [b, a])
  const path = new PathData()
  const N = Math.max(
    60,
    Math.round(
      (spec.profile === "sine" || spec.profile === "skew" ? 200 : 300) /
        spec.cells
    )
  )
  const env = (s: number, t: number) => {
    switch (spec.envelope) {
      case "const":
        return 1
      case "bulge":
        return Math.sin(Math.PI * s)
      case "ramp":
        return 0.15 + 0.85 * t
      case "swell":
        return 0.5 - 0.5 * Math.cos(TAU * t)
    }
  }
  for (let c = 0; c < spec.cells; c++) {
    const a0 = oA + c * cellA
    const odd = c % 2 === 1
    const lines: number[][] = []
    const ids: number[] = []
    for (let j = -pad; j < spec.count + pad; j++) {
      const t = clamp01((j + 0.5) / spec.count)
      const row: number[] = []
      for (let k = 0; k <= N; k++) {
        const s = k / N
        let ph = spec.k * s + spec.phaseStep * j
        if (odd && spec.cellOp === "shift") ph += 0.25
        let off = spec.amp * p * env(s, t) * waveProfile(spec.profile, ph)
        if (odd && spec.cellOp === "invert") off = -off
        row.push((j + 0.5) * p + off)
      }
      lines.push(row)
      ids.push(j)
    }
    for (let li = 1; li < lines.length - 1; li++) {
      const top: Vec[] = []
      const bot: Vec[] = []
      const t = clamp01((ids[li] + 0.5) / spec.count)
      for (let k = 0; k <= N; k++) {
        const s = k / N
        const y = lines[li][k]
        const gap = Math.min(y - lines[li - 1][k], lines[li + 1][k] - y)
        const base =
          spec.thick * (1 + spec.thickMod * Math.sin(TAU * (t * 1.5 + s * 0.5)))
        const T = Math.max(0, Math.min(p * base, gap - 1.5))
        const a = a0 + s * cellA
        top.push([a, oB + y - T / 2])
        bot.push([a, oB + y + T / 2])
      }
      const edge = simplify(top, 0.45).concat(simplify(bot, 0.45).reverse())
      path.poly(edge.map(([a, b]) => toXY(a, b)))
    }
  }
  return [{ d: path.toString() }]
}

export function designWaves(r: Rng, fr: Frame): WavesSpec {
  const orient: "h" | "v" = r.chance(0.78) ? "h" : "v"
  const lenB = orient === "h" ? fr.h : fr.w
  const cells = r.weighted([
    [1, 3],
    [2, 2],
    [3, 1],
    [4, 1.2],
  ] as const)
  const envelope = r.weighted([
    ["const", 0.8],
    ["bulge", 2],
    ["ramp", 1.2],
    ["swell", 1.4],
  ] as const)
  const profile = r.weighted([
    ["sine", 3],
    ["triangle", 2],
    ["square", 1.2],
    ["skew", 1.2],
  ] as const)
  return {
    type: "waves",
    orient,
    profile,
    count: Math.round(lenB / (fr.h * r.range(0.028, 0.042))),
    cells,
    cellOp: cells > 1 ? r.pick(["invert", "shift"] as const) : "none",
    k:
      profile === "square"
        ? r.pick([2, 3, 4]) / cells
        : r.pick([0.5, 1, 1, 1.5, 2]) * (cells > 1 ? 1 : r.pick([1, 2])),
    amp: profile === "square" ? r.range(1.2, 2) : r.range(0.9, 2.4),
    // sabit zarfta faz kayması şart: yoksa sıradan dalgalı çizgi olur
    phaseStep:
      envelope === "const" || r.chance(0.5)
        ? r.sign() * r.range(0.012, 0.035)
        : 0,
    envelope,
    thick: r.range(0.4, 0.56),
    thickMod: r.chance(0.4) ? r.range(0.25, 0.5) : 0,
  }
}
