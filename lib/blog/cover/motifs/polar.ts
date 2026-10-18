import { Rng } from "../rng"
import { TAU } from "../field"
import {
  cornerReach,
  PathData,
  simplify,
  type Frame,
  type Layer,
  type Vec,
} from "../geometry"
import type { PolarSpec } from "../spec"

export function renderPolar(spec: PolarSpec, fr: Frame): Layer[] {
  const path = new PathData()
  const cx = fr.x + spec.cx * fr.w
  const cy = fr.y + spec.cy * fr.h
  const R = cornerReach("circle", fr, cx, cy) * 1.06 + 4
  const N = spec.wedges
  const period = TAU / N
  const twisted = spec.mode === "vortex" || spec.mode === "spiral"
  const halfDuty = spec.mode === "checker" || spec.mode === "vortex"
  const r0 = 4
  // bükülü kollar ve dart tahtası dilimleri, genişliği ~4 px'e indiği yerden
  // başlar: merkez piksel altı bulamaca dönmez, orada yalnız halkalar kalır
  const rMin =
    twisted || spec.mode === "checker" ? (4 * N) / (spec.duty * TAU) : 0
  for (let j = 0; j < N; j++) {
    const duty = halfDuty
      ? 0.5
      : Math.min(
          0.92,
          Math.max(
            0.08,
            spec.duty + spec.pulse * Math.sin((TAU * spec.pulseK * j) / N)
          )
        )
    const a0 = j * period
    const a1 = a0 + duty * period
    if (!twisted) {
      const pts: Vec[] = rMin
        ? [
            [cx + rMin * Math.cos(a1), cy + rMin * Math.sin(a1)],
            [cx + rMin * Math.cos(a0), cy + rMin * Math.sin(a0)],
          ]
        : [[cx, cy]]
      const steps = Math.max(1, Math.ceil((a1 - a0) / (Math.PI / 18)))
      for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps
        pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)])
      }
      path.poly(pts)
    } else {
      const M = 120
      const edge = (a: number): Vec[] => {
        const out: Vec[] = []
        for (let i = 0; i <= M; i++) {
          const r = rMin + (R - rMin) * (i / M) ** 1.6
          const th = a + spec.twist * Math.log((r + r0) / r0)
          out.push([cx + r * Math.cos(th), cy + r * Math.sin(th)])
        }
        return simplify(out, 0.35)
      }
      path.poly(edge(a0).concat(edge(a1).reverse()))
    }
  }
  if (spec.mode === "spiral") path.circle(cx, cy, rMin * 0.55)
  if (spec.mode === "checker" || spec.mode === "vortex") {
    const radii: number[] = [0]
    let r = spec.growth > 1 ? spec.ringPitch * 0.6 : spec.ringPitch
    while (radii[radii.length - 1] < R) {
      radii.push(r)
      r = spec.growth > 1 ? r * spec.growth : r + spec.ringPitch
    }
    for (let k = 0; k + 1 < radii.length; k += 2) {
      path.circle(cx, cy, radii[k + 1])
      if (radii[k] > 0.3) path.circle(cx, cy, radii[k])
    }
  }
  return [{ d: path.toString() }]
}

export function designPolar(r: Rng, fr: Frame): PolarSpec {
  const mode = r.weighted([
    ["rays", 2],
    ["checker", 2],
    ["vortex", 2.5],
    ["spiral", 2],
  ] as const)
  const [cx, cy] = r.weighted([
    [[0.5, 0.5], 3],
    [[0.5, 1.12], 1],
    [[0, 1], 0.8],
    [[0.33, 0.5], 1],
    [[0.7, 0.36], 1],
  ] as const) as [number, number]
  const wedges =
    2 *
    (mode === "rays"
      ? r.int(12, 36)
      : mode === "spiral"
        ? r.int(5, 14)
        : r.int(8, 24))
  const geometric = mode === "vortex" || (mode === "checker" && r.chance(0.5))
  return {
    type: "polar",
    mode,
    cx,
    cy,
    wedges,
    duty: r.range(0.42, 0.58),
    pulse: mode === "rays" && r.chance(0.5) ? r.range(0.15, 0.35) : 0,
    pulseK: r.int(2, 6),
    ringPitch: fr.h * (geometric ? r.range(0.02, 0.035) : r.range(0.03, 0.06)),
    growth: geometric ? r.range(1.09, 1.22) : 1,
    twist:
      mode === "vortex"
        ? r.sign() * r.range(0.6, 2.2)
        : mode === "spiral"
          ? r.sign() * r.range(1, 2.8)
          : 0,
  }
}
