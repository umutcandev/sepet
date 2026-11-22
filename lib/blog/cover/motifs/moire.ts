import { Rng } from "../rng"
import { TAU } from "../field"
import { type Frame } from "../geometry"
import type { MoireSpec } from "./types"

export function designMoire(r: Rng, fr: Frame): MoireSpec {
  const mode = r.weighted([
    ["rings2", 3],
    ["lines2", 2],
    ["ringsLines", 2],
  ] as const)
  const pitch = fr.h * r.range(0.034, 0.052)
  const a = r.next() * TAU
  const d = r.range(0.06, 0.28)
  const mid: [number, number] = r.pick([
    [0.5, 0.5],
    [0.4, 0.55],
    [0.6, 0.45],
  ] as const) as [number, number]
  const c1: [number, number] = [
    mid[0] - (Math.cos(a) * d) / 2,
    mid[1] - (Math.sin(a) * d * fr.w) / fr.h / 2,
  ]
  const c2: [number, number] = [
    mid[0] + (Math.cos(a) * d) / 2,
    mid[1] + (Math.sin(a) * d * fr.w) / fr.h / 2,
  ]
  const curved = r.chance(0.4)
  return {
    type: "moire",
    mode,
    pitch,
    thick: r.range(0.42, 0.56),
    c1:
      mode === "ringsLines"
        ? (r.pick([
            [0.5, 0.5],
            [0.3, 0.6],
            [0.7, 0.4],
            [0.5, 1.1],
          ] as const) as [number, number])
        : c1,
    c2,
    angle:
      mode === "ringsLines"
        ? r.pick([0, Math.PI / 2, Math.PI / 4])
        : r.sign() * r.range(0.03, 0.16),
    curve: curved ? r.range(0.6, 2.2) : 0,
    curveK: r.pick([0.5, 1, 1.5, 2]),
  }
}
