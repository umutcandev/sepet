import { Rng } from "../rng"
import { coverageTarget } from "../field"
import { hatch, PathData, rectPoly, type Frame, type Layer } from "../geometry"
import type { QuiltSpec } from "../spec"

interface Leaf {
  rect: Frame
  kind: "solid" | "empty" | "hatch"
  angle: number
  duty: number
}

export function renderQuilt(spec: QuiltSpec, fr: Frame): Layer[] {
  const rng = new Rng(spec.salt)
  const area = fr.w * fr.h
  const leaves: Leaf[] = []
  const leaf = (rect: Frame) => {
    const roll = rng.next()
    const share = (rect.w * rect.h) / area
    if (roll < spec.solid && share < 0.16)
      leaves.push({ rect, kind: "solid", angle: 0, duty: 1 })
    else if (roll < spec.solid + spec.empty && share < 0.08)
      leaves.push({ rect, kind: "empty", angle: 0, duty: 0 })
    else
      leaves.push({
        rect,
        kind: "hatch",
        angle: (rng.pick(spec.angles) * Math.PI) / 180,
        duty: rng.pick(spec.duties),
      })
  }
  const split = (r: Frame, depth: number) => {
    const canW = r.w > spec.minSide * 2 + spec.gap
    const canH = r.h > spec.minSide * 2 + spec.gap
    if (
      depth >= spec.depth ||
      (!canW && !canH) ||
      (depth > 1 && rng.chance(0.18))
    )
      return leaf(r)
    const alongW =
      canW && (!canH || (r.w >= r.h ? rng.chance(0.78) : rng.chance(0.22)))
    const ratio = rng.pick(spec.splits)
    if (alongW) {
      const a = Math.max(
        spec.minSide,
        Math.min(r.w - spec.minSide - spec.gap, (r.w - spec.gap) * ratio)
      )
      split({ x: r.x, y: r.y, w: a, h: r.h }, depth + 1)
      split(
        { x: r.x + a + spec.gap, y: r.y, w: r.w - a - spec.gap, h: r.h },
        depth + 1
      )
    } else {
      const a = Math.max(
        spec.minSide,
        Math.min(r.h - spec.minSide - spec.gap, (r.h - spec.gap) * ratio)
      )
      split({ x: r.x, y: r.y, w: r.w, h: a }, depth + 1)
      split(
        { x: r.x, y: r.y + a + spec.gap, w: r.w, h: r.h - a - spec.gap },
        depth + 1
      )
    }
  }
  split(fr, 0)

  // Dolu ve boş parçaların payı bölünmeye göre savrulur. Taranan parçaların
  // yoğunluğu ortak bir katsayıyla ölçeklenir, böylece toplam kaplama hedefe
  // oturur; parçalar arasındaki oran ve ritim korunur.
  const dutyAt = (l: Leaf, k: number) =>
    Math.min(0.88, Math.max(0.12, l.duty * k))
  const coverAt = (k: number) =>
    leaves.reduce(
      (sum, l) =>
        sum +
        l.rect.w * l.rect.h * (l.kind === "hatch" ? dutyAt(l, k) : l.duty),
      0
    ) / area
  let lo = 0.2
  let hi = 3
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (coverAt(mid) > spec.cover) hi = mid
    else lo = mid
  }
  const k = (lo + hi) / 2

  const path = new PathData()
  for (const l of leaves) {
    if (l.kind === "solid") path.rect(l.rect.x, l.rect.y, l.rect.w, l.rect.h)
    else if (l.kind === "hatch")
      hatch(path, rectPoly(l.rect), l.angle, spec.pitch, dutyAt(l, k))
  }
  return [{ d: path.toString() }]
}

export function designQuilt(r: Rng, fr: Frame): QuiltSpec {
  const pitch = fr.h * r.range(0.014, 0.026)
  return {
    type: "quilt",
    salt: ((r.next() * 2 ** 32) >>> 0).toString(36),
    depth: r.int(3, 6),
    minSide: fr.h * r.range(0.08, 0.14),
    pitch,
    gap: pitch * r.range(0.6, 1.6),
    angles: r.pick([
      [0, 90],
      [45, 135],
      [0, 90, 45, 135],
      [0, 45],
      [90, 135],
      [0, 60, 120],
    ]),
    duties: r.pick([[0.5], [0.35, 0.65], [0.25, 0.5, 0.75]]),
    solid: r.range(0.04, 0.12),
    empty: r.range(0.03, 0.09),
    splits: r.pick([[0.5], [0.382, 0.618], [0.333, 0.5, 0.667]]),
    cover: coverageTarget(r),
  }
}
