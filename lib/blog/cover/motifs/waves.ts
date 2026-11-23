import { Rng } from "../rng"
import { type Frame } from "../geometry"
import type { WavesSpec } from "./types"

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
