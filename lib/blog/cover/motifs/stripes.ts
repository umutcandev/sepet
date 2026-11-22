import { Rng } from "../rng"
import {
  balance,
  clamp01,
  coverageTarget,
  makeShaping,
  meanOverCells,
  randomField,
  type CellOp,
} from "../field"
import { type Frame } from "../geometry"
import type { StripesSpec } from "./types"

export function designStripes(r: Rng, fr: Frame): StripesSpec {
  const field = randomField(r, [
    "radial",
    "radial",
    "diamond",
    "pillow",
    "ripple",
    "ripple",
    "spiral",
    "saddle",
    "eggcrate",
  ])
  const orient: "h" | "v" = r.chance(0.7) ? "h" : "v"
  const lenA = orient === "h" ? fr.w : fr.h
  const lenB = orient === "h" ? fr.h : fr.w
  let cellsA = 1
  let cellsB = 1
  let opA: CellOp = "none"
  let opB: CellOp = "none"
  switch (field.kind) {
    case "radial":
    case "diamond":
      cellsA = r.pick([1, 1, 2, 3])
      opA = cellsA > 1 ? r.pick(["invert", "none"] as const) : "none"
      break
    case "pillow":
      cellsA = r.pick([2, 3, 4])
      cellsB = r.pick([1, 2])
      opA = r.pick(["invert", "none"] as const)
      opB = r.pick(["invert", "none"] as const)
      break
    case "ripple":
    case "saddle":
      cellsA = r.pick([1, 1, 2])
      opA = cellsA > 1 ? r.pick(["shift", "flipS"] as const) : "none"
      break
    default:
      break
  }
  const levels = r.chance(0.22) ? r.int(3, 6) : 0
  const pitch = fr.h * r.range(0.022, 0.04)
  const count = Math.max(8, Math.round(lenB / cellsB / pitch))
  const warp = r.chance(0.15)
    ? { amp: r.range(0.25, 0.5), k: r.int(1, 3), phase: r.next() }
    : null
  const jitter = r.chance(0.12) ? r.range(0.03, 0.08) : 0
  const shaping = makeShaping(field, levels, opA, opB)
  const tMin = r.range(0.06, 0.2)
  const tMax = r.range(0.84, 0.94)
  const target = clamp01((coverageTarget(r) - tMin) / (tMax - tMin))
  const ar = lenA / cellsA / (lenB / cellsB)
  balance(shaping, (sh) => meanOverCells(sh, cellsA, cellsB, ar), target)
  return {
    type: "stripes",
    orient,
    cellsA,
    cellsB,
    count,
    place: r.chance(0.5) ? "edges" : "slots",
    anchor: r.weighted([
      [0.5, 7],
      [0, 1.5],
      [1, 1.5],
    ] as const),
    tMin,
    tMax,
    shaping,
    warp,
    jitter,
  }
}
