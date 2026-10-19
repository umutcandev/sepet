import { Rng } from "../rng"
import {
  balance,
  makeShaping,
  meanOfSamples,
  randomField,
  type Sample,
  shaped,
} from "../field"
import {
  PathData,
  ringShape,
  rotated,
  type Frame,
  type Layer,
  type Vec,
} from "../geometry"
import type { DotsSpec } from "../spec"

interface Dot {
  cx: number
  cy: number
  /** hücre içi konum ve hücre indeksleri: alanın okunduğu yer */
  sample: Sample
  angle: number
}

/**
 * Izgaradaki noktaların yeri. Render ile dengeleme aynı listeyi kullanır, böylece
 * alan tam olarak çizilen noktalarda ölçülür. Kaydırmalı satırlarda tek
 * satırlar yarım aralık sağa kayar; baklavalarda satır aralığı yarıya iner ve
 * baklavalar köşegenleriyle birbirine değebilir (kaplama %90'ın üstüne çıkabilir).
 */
function dotLattice(
  spec: Pick<
    DotsSpec,
    "cellsA" | "cellsB" | "perCellX" | "perCellY" | "stagger" | "rotate"
  >,
  fr: Frame
) {
  const nx = spec.cellsA * spec.perCellX
  const ny = spec.cellsB * spec.perCellY
  const px = fr.w / nx
  const py = fr.h / ny
  const dots: Dot[] = []
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const ca = Math.floor(i / spec.perCellX)
      const cb = Math.floor(j / spec.perCellY)
      const shiftX = spec.stagger && j % 2 === 1 ? 0.5 : 0
      const s = ((i % spec.perCellX) + 0.5 + shiftX) / spec.perCellX
      const t = ((j % spec.perCellY) + 0.5) / spec.perCellY
      dots.push({
        cx: fr.x + (i + 0.5 + shiftX) * px,
        cy: fr.y + (j + 0.5) * py,
        sample: [Math.min(s, 1), t, ca, cb],
        angle: spec.rotate * ((i + 0.5) / nx + (j + 0.5) / ny) * 0.5,
      })
    }
  return { dots, px, py, ar: (spec.perCellX * px) / (spec.perCellY * py) }
}

export function renderDots(spec: DotsSpec, fr: Frame): Layer[] {
  const { dots, px, py, ar } = dotLattice(spec, fr)
  const p = Math.min(px, py)
  const cell = px * py
  const path = new PathData()
  const shape = (cx: number, cy: number, angle: number, pts: Vec[]) =>
    path.poly(rotated(cx, cy, pts, angle))
  for (const { cx, cy, sample, angle } of dots) {
    const f = shaped(spec.shaping, ...sample, ar)
    // a: noktanın kendi hücresine oranla alanı; her şekil bu alanı tam verir
    const area = (spec.aMin + (spec.aMax - spec.aMin) * f) * cell
    switch (spec.shape) {
      case "circle":
        path.circle(cx, cy, Math.sqrt(area / Math.PI))
        break
      case "square": {
        const h = Math.sqrt(area) / 2
        shape(cx, cy, angle, [
          [-h, -h],
          [h, -h],
          [h, h],
          [-h, h],
        ])
        break
      }
      case "diamond":
        ringShape(path, "diamond", cx, cy, Math.sqrt(area / 2))
        break
      case "plus": {
        // kollar 0.88p boyunda; alan = 0.88p·2w·2 − (2w)²
        const L = 0.44 * p
        const span = 2 * L
        const w = (span - Math.sqrt(Math.max(0, span * span - 4 * area))) / 4
        if (w < 0.2) break
        shape(cx, cy, angle, [
          [-w, -L],
          [w, -L],
          [w, -w],
          [L, -w],
          [L, w],
          [w, w],
          [w, L],
          [-w, L],
          [-w, w],
          [-L, w],
          [-L, -w],
          [-w, -w],
        ])
        break
      }
      case "bar": {
        const L = 0.45 * p
        const w = area / (4 * L)
        if (w < 0.2) break
        shape(cx, cy, angle, [
          [-L, -w],
          [L, -w],
          [L, w],
          [-L, w],
        ])
        break
      }
    }
  }
  // Dönen şekiller komşusuna değebilir; evenodd orayı silerdi, nonzero birleştirir.
  return [{ d: path.toString(), fillRule: "nonzero" }]
}

export function designDots(r: Rng, fr: Frame): DotsSpec {
  const shape = r.weighted([
    ["circle", 2],
    ["square", 2],
    ["diamond", 0.7],
    ["plus", 1.4],
    ["bar", 1.2],
  ] as const)
  let cellsA = r.pick([1, 2, 3, 4])
  const cellsB = r.pick([1, 1, 2])
  const pitch =
    fr.h * (shape === "plus" ? r.range(0.05, 0.07) : r.range(0.036, 0.062))
  const field = randomField(r, [
    "radial",
    "diamond",
    "wave",
    "ramp",
    "pillow",
    "ripple",
    "spiral",
    "eggcrate",
  ])
  if (field.kind === "ramp" && cellsA === 1) cellsA = r.pick([2, 3, 4])
  const perCellX = Math.max(3, Math.round(fr.w / cellsA / pitch))
  const baseY = Math.max(3, Math.round(fr.h / cellsB / pitch))
  const shaping = makeShaping(
    field,
    r.chance(0.25) ? r.int(3, 5) : 0,
    cellsA > 1 ? r.pick(["invert", "flipS", "none"] as const) : "none",
    cellsB > 1 ? r.pick(["invert", "flipT", "none"] as const) : "none"
  )
  const canRotate = shape === "square" || shape === "plus" || shape === "bar"
  const rotate =
    canRotate && r.chance(shape === "bar" ? 0.8 : 0.4)
      ? r.pick([0.5, 1, 2, 3]) * Math.PI * r.sign()
      : 0
  // Alan tavanı: şekil komşusuna değmeden (dönenlerde neredeyse değmeden)
  // ulaşabileceği en büyük pay.
  const aMax = {
    circle: 0.72,
    square: rotate ? 0.6 : 0.86,
    diamond: 0.92,
    plus: 0.7,
    bar: rotate ? 0.55 : 0.8,
  }[shape]
  const aMin = r.range(0.01, 0.05)
  const spec: DotsSpec = {
    type: "dots",
    shape,
    cellsA,
    cellsB,
    perCellX,
    // baklavalar yarım satır aralıklı kaydırmalı ızgarada
    perCellY: shape === "diamond" ? baseY * 2 : baseY,
    stagger: shape === "diamond" || (shape === "circle" && r.chance(0.3)),
    aMin,
    aMax,
    rotate,
    shaping,
  }
  // Noktalar çizgilerden biraz hafif durur: hedef kaplama %38–48.
  const target = Math.min(
    0.9,
    Math.max(0.15, (r.range(0.38, 0.48) - aMin) / (aMax - aMin))
  )
  const { dots, ar } = dotLattice(spec, fr)
  const samples = dots.map((d) => d.sample)
  balance(shaping, (sh) => meanOfSamples(sh, samples, ar), target)
  return spec
}
