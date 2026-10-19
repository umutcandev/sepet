import { Rng } from "../rng"
import { TAU } from "../field"
import {
  cornerReach,
  PathData,
  rotated,
  simplify,
  type Frame,
  type Layer,
  type Vec,
} from "../geometry"
import type { MoireSpec } from "../spec"

/** Halka sistemi: dolu halkalar evenodd ile ikinci sistemle XOR'lanır. */
export function annuli(
  path: PathData,
  cx: number,
  cy: number,
  pitch: number,
  thick: number,
  reach: number
): void {
  for (let r = pitch / 2; r - pitch < reach; r += pitch) {
    path.circle(cx, cy, r + (thick * pitch) / 2)
    if (r - (thick * pitch) / 2 > 0.3)
      path.circle(cx, cy, r - (thick * pitch) / 2)
  }
}

export function grating(
  path: PathData,
  fr: Frame,
  pitch: number,
  thick: number,
  angle: number,
  curve: number,
  curveK: number
): void {
  const cx = fr.x + fr.w / 2
  const cy = fr.y + fr.h / 2
  const half = Math.hypot(fr.w, fr.h) / 2 + pitch * (2 + Math.abs(curve))
  const n = Math.ceil(half / pitch)
  const samples = curve ? 48 : 1
  for (let k = -n; k <= n; k++) {
    const y0 = k * pitch - (thick * pitch) / 2
    const y1 = y0 + thick * pitch
    const top: Vec[] = []
    const bot: Vec[] = []
    for (let i = 0; i <= samples; i++) {
      const x = -half + (2 * half * i) / samples
      const off = curve
        ? curve * pitch * Math.sin((TAU * curveK * (x + half)) / (2 * half))
        : 0
      top.push([x, y0 + off])
      bot.push([x, y1 + off])
    }
    path.poly(
      rotated(
        cx,
        cy,
        simplify(top, 0.3).concat(simplify(bot, 0.3).reverse()),
        angle
      )
    )
  }
}

export function renderMoire(spec: MoireSpec, fr: Frame): Layer[] {
  const path = new PathData()
  const P = (c: [number, number]): Vec => [
    fr.x + c[0] * fr.w,
    fr.y + c[1] * fr.h,
  ]
  const reachOf = ([x, y]: Vec) => cornerReach("circle", fr, x, y)
  if (spec.mode === "rings2") {
    const a = P(spec.c1)
    const b = P(spec.c2)
    annuli(path, a[0], a[1], spec.pitch, spec.thick, reachOf(a))
    annuli(path, b[0], b[1], spec.pitch, spec.thick, reachOf(b))
  } else if (spec.mode === "lines2") {
    grating(path, fr, spec.pitch, spec.thick, 0, 0, 0)
    grating(
      path,
      fr,
      spec.pitch,
      spec.thick,
      spec.angle,
      spec.curve,
      spec.curveK
    )
  } else {
    const a = P(spec.c1)
    annuli(path, a[0], a[1], spec.pitch, spec.thick, reachOf(a))
    grating(
      path,
      fr,
      spec.pitch * 1.04,
      spec.thick,
      spec.angle,
      spec.curve,
      spec.curveK
    )
  }
  return [{ d: path.toString() }]
}

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
