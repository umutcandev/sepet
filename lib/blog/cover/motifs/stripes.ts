import { Rng } from "../rng"
import {
  balance,
  clamp01,
  coverageTarget,
  makeShaping,
  meanOverCells,
  randomField,
  shaped,
  TAU,
  type CellOp,
} from "../field"
import {
  PathData,
  simplify,
  trace,
  type Frame,
  type Layer,
  type Vec,
} from "../geometry"
import type { StripesSpec } from "../spec"

export interface Slot {
  c: number
  p: number
  t: number
}

export function placeStripes(spec: StripesSpec, len: number): Slot[] {
  const n = spec.count
  const w = spec.warp
  const W = (u: number) =>
    w
      ? u +
        (w.amp / (TAU * w.k)) *
          (Math.sin(TAU * (w.k * u + w.phase)) - Math.sin(TAU * w.phase))
      : u
  const dW = (u: number) =>
    w ? 1 + w.amp * Math.cos(TAU * (w.k * u + w.phase)) : 1
  const slots: Slot[] = []
  if (spec.place === "edges") {
    const p = len / (n - 1)
    for (let j = 0; j < n; j++) {
      const u = j / (n - 1)
      slots.push({ c: W(u) * len, p: p * dW(u), t: u })
    }
  } else {
    for (let j = 0; j < n; j++) {
      const a = W(j / n)
      const b = W((j + 1) / n)
      slots.push({
        c: W((j + 0.5) / n) * len,
        p: (b - a) * len,
        t: (j + 0.5) / n,
      })
    }
  }
  return slots
}

export function renderStripes(spec: StripesSpec, fr: Frame, rng: Rng): Layer[] {
  const horiz = spec.orient === "h"
  const lenA = horiz ? fr.w : fr.h
  const lenB = horiz ? fr.h : fr.w
  const oA = horiz ? fr.x : fr.y
  const oB = horiz ? fr.y : fr.x
  const cellA = lenA / spec.cellsA
  const cellB = lenB / spec.cellsB
  const ar = cellA / cellB
  const sh = spec.shaping
  const stepped = sh.levels > 0
  const frac = (f: number) => spec.tMin + (spec.tMax - spec.tMin) * f
  const slots = placeStripes(spec, cellB)
  const jit = slots.map(() => 1 + spec.jitter * (rng.next() * 2 - 1))
  const toXY = (a: number, b: number): Vec => (horiz ? [a, b] : [b, a])
  const path = new PathData()

  for (let cb = 0; cb < spec.cellsB; cb++) {
    const b0 = oB + cb * cellB
    for (let ca = 0; ca < spec.cellsA; ca++) {
      const a0 = oA + ca * cellA
      slots.forEach((slot, j) => {
        const minGap = Math.max(1.5, slot.p * 0.05)
        const F = (s: number) => shaped(sh, s, slot.t, ca, cb, ar)
        const prof = trace(F, stepped, stepped ? 96 : 160)
        const top: Vec[] = []
        const bot: Vec[] = []
        let any = false
        for (const [s, f] of prof) {
          const T = Math.max(
            0,
            Math.min(slot.p * frac(f) * jit[j], slot.p - minGap)
          )
          const start = slot.c - slot.p / 2 + spec.anchor * (slot.p - T)
          const lo = Math.min(cellB, Math.max(0, start))
          const hi = Math.max(lo, Math.min(cellB, start + T))
          if (hi - lo > 0.05) any = true
          const a = a0 + s * cellA
          top.push([a, b0 + lo])
          bot.push([a, b0 + hi])
        }
        if (!any) return
        const edge = simplify(top, 0.3).concat(simplify(bot, 0.3).reverse())
        path.poly(edge.map(([a, b]) => toXY(a, b)))
      })
    }
  }
  return [{ d: path.toString() }]
}

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
