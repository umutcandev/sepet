import { makeField } from "./sdf"
import type { FieldParams } from "./spec"

// Desen payını hedefe oturtur: kalınlık düğmesi ikiye bölmeyle aranır,
// kaplama alanın kendisinden 160×90 ızgarada ölçülür.

const GRID_X = 160
const GRID_Y = 90

export function coverage(
  p: FieldParams,
  width: number,
  height: number
): number {
  const field = makeField(p, width, height)
  let on = 0
  for (let j = 0; j < GRID_Y; j++)
    for (let i = 0; i < GRID_X; i++)
      if (
        field(((i + 0.5) / GRID_X) * width, ((j + 0.5) / GRID_Y) * height) > 0
      )
        on++
  return on / (GRID_X * GRID_Y)
}

type Knob = [lo: number, hi: number, apply: (s: number) => FieldParams]

function knobOf(p: FieldParams): Knob {
  switch (p.mode) {
    case "truchet":
      return [0.01, (p.spread / p.bars) * 0.98, (s) => ({ ...p, bandW: s })]
    case "dots":
      return [p.aMin + 0.02, 0.95, (s) => ({ ...p, aMax: s })]
    case "stripes":
      return [
        0.2,
        3,
        (s) => ({ ...p, aMin: p.aMin * s, aMax: Math.min(0.95, p.aMax * s) }),
      ]
    case "dither":
      return [0.1, 4, (s) => ({ ...p, gain: s })]
    case "moire":
      // oran yarıyı geçince çakışan halkalar silinir, kaplama düşer
      return [0.06, 0.5, (s) => ({ ...p, ratio: s })]
    default:
      return [0.06, 0.9, (s) => ({ ...p, ratio: s })]
  }
}

export function balance(
  p: FieldParams,
  target: number,
  width: number,
  height: number
): FieldParams {
  const [lo0, hi0, apply] = knobOf(p)
  let lo = lo0
  let hi = hi0
  let best = p
  let bestErr = Infinity
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    const q = apply(mid)
    const c = coverage(q, width, height)
    const err = Math.abs(c - target)
    if (err < bestErr) {
      best = q
      bestErr = err
    }
    if (c > target) hi = mid
    else lo = mid
  }
  return best
}
