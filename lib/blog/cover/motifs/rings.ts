import { Rng } from "../rng"
import {
  balance,
  clamp01,
  coverageTarget,
  makeShaping,
  meanOfSamples,
  type Sample,
  shaped,
  TAU,
  type Field,
} from "../field"
import {
  cornerReach,
  metricNorm,
  PathData,
  ringShape,
  type Frame,
  type Layer,
  type Vec,
} from "../geometry"
import type { RingsSpec } from "../spec"

export function ringCenter(
  spec: RingsSpec,
  cell: Frame,
  col: number,
  row: number
): Vec {
  let ncx = spec.cx
  let ncy = spec.cy
  if (spec.mirror && col % 2 === 1) ncx = 1 - ncx
  if (spec.mirror && row % 2 === 1) ncy = 1 - ncy
  return [cell.x + ncx * cell.w, cell.y + ncy * cell.h]
}

/**
 * Dengeleme için örnek noktaları: her hücrede düzgün ızgara. Halkanın alanı
 * yarıçapla büyüdüğü ve hücre kenarında kırpıldığı için t'yi eşit aralıklı
 * örneklemek dış halkaları az sayar; düzlemde örneklemek gerçek alanı tartar.
 */
export function ringSamples(spec: RingsSpec, fr: Frame, n = 12): Sample[] {
  const cw = fr.w / spec.cols
  const ch = fr.h / spec.rows
  const out: Sample[] = []
  for (let row = 0; row < spec.rows; row++)
    for (let col = 0; col < spec.cols; col++) {
      const cell: Frame = {
        x: fr.x + col * cw,
        y: fr.y + row * ch,
        w: cw,
        h: ch,
      }
      const [cx, cy] = ringCenter(spec, cell, col, row)
      const reach = cornerReach(spec.shape, cell, cx, cy)
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const x = cell.x + ((i + 0.5) / n) * cw
          const y = cell.y + ((j + 0.5) / n) * ch
          const d = metricNorm(spec.shape, x - cx, y - cy)
          const t = Math.min(1, d / reach) + spec.cellPhase * (col + row)
          out.push([0.5, t, col, row])
        }
    }
  return out
}

export function renderRings(spec: RingsSpec, fr: Frame): Layer[] {
  const layers: Layer[] = []
  const cw = fr.w / spec.cols
  const ch = fr.h / spec.rows
  const dirX = Math.cos(spec.driftAngle)
  const dirY = Math.sin(spec.driftAngle)
  const dirNorm = metricNorm(spec.shape, dirX, dirY) || 1
  const [tx, ty] = spec.tunnel
  const step = metricNorm(spec.shape, tx, ty) * spec.pitch
  for (let row = 0; row < spec.rows; row++)
    for (let col = 0; col < spec.cols; col++) {
      const cell: Frame = {
        x: fr.x + col * cw,
        y: fr.y + row * ch,
        w: cw,
        h: ch,
      }
      const [cx, cy] = ringCenter(spec, cell, col, row)
      const reach = cornerReach(spec.shape, cell, cx, cy)
      const path = new PathData()
      let prevOuter = 0
      for (let j = 0; j < 400; j++) {
        const r = (j + 0.5) * spec.pitch
        if (r - spec.pitch > reach + j * step) break
        const ox = cx + j * tx * spec.pitch
        const oy = cy + j * ty * spec.pitch
        const t = Math.min(1, r / reach) + spec.cellPhase * (col + row)
        const f = shaped(spec.shaping, 0.5, t, col, row, 1)
        const T = Math.min(
          spec.pitch * (spec.tMin + (spec.tMax - spec.tMin) * f),
          spec.pitch - 1.5
        )
        const rOut = r + T / 2
        const rIn = r - T / 2
        ringShape(path, spec.shape, ox, oy, rOut)
        if (rIn > 0.3) {
          // Kayan iç şekil kendi dış şeklinin içinde kalmalı ve önceki halkayı
          // tamamen içermeli; yoksa evenodd çakışan yeri siler ve halkalar kıl
          // inceliğine düşer. Normlu uzaklıkta bu iki koşul kaymayı sınırlar.
          const room = Math.min(rOut - rIn, rIn - prevOuter) - 0.5
          const shift = Math.min(spec.drift * Math.min(T, rIn) * 0.9, room)
          const d = Math.max(0, shift) / dirNorm
          ringShape(path, spec.shape, ox + dirX * d, oy + dirY * d, rIn)
        }
        prevOuter = rOut
      }
      layers.push({
        d: path.toString(),
        clip: spec.cols * spec.rows > 1 ? cell : undefined,
      })
    }
  return layers
}

export function designRings(r: Rng, fr: Frame): RingsSpec {
  const mode = r.weighted([
    ["single", 3],
    ["tunnel", 2],
    ["grid", 2],
  ] as const)
  const shape = r.weighted([
    ["circle", 3],
    ["square", 2],
    ["diamond", 1.2],
  ] as const)
  let cols = 1
  let rows = 1
  let [cx, cy]: [number, number] = [0.5, 0.5]
  let mirror = false
  let pitch = fr.h * r.range(0.026, 0.05)
  let tMax = r.range(0.8, 0.92)
  let tunnel: [number, number] = [0, 0]
  let cellPhase = 0
  let field: Field = r.chance(0.6)
    ? { kind: "wave", kt: r.pick([1.5, 2, 2.5, 3, 4]), ks: 0, phase: r.next() }
    : { kind: "ramp" }
  if (mode === "single") {
    cols = r.weighted([
      [1, 3],
      [2, 2],
      [3, 0.6],
    ] as const)
    ;[cx, cy] = r.pick([
      [0.5, 0.5],
      [0, 0],
      [0, 1],
      [0.5, 1.15],
      [0.5, -0.15],
      [0, 0.5],
      [0.3, 0.7],
    ] as const) as [number, number]
    mirror = r.chance(0.7)
  } else if (mode === "tunnel") {
    ;[cx, cy] = r.pick([
      [0.5, 0.5],
      [0.36, 0.44],
      [0.64, 0.4],
      [0.5, 0.62],
    ] as const) as [number, number]
    const a = r.next() * TAU
    const mag = r.range(0.08, 0.2)
    tunnel = [Math.cos(a) * mag, Math.sin(a) * mag]
    // Komşu halkalar en çok 0.28 aralık kaydığı için kalınlık 0.72 aralığı
    // aşmamalı. Tavan kaplama hedefinin üstünde kalsın ki alan doymasın.
    tMax = r.range(0.62, 0.68)
  } else {
    cols = r.pick([3, 4, 5, 6])
    rows = Math.max(2, Math.round((cols * fr.h) / fr.w))
    ;[cx, cy] = r.chance(0.65) ? [0.5, 0.5] : [0, 0]
    mirror = cx === 0
    pitch = (fr.h / rows) * r.range(0.07, 0.12)
    field = { kind: "wave", kt: r.pick([1, 1.5, 2]), ks: 0, phase: r.next() }
    cellPhase = r.range(0.08, 0.25)
  }
  const shaping = makeShaping(
    field,
    r.chance(0.2) ? r.int(3, 5) : 0,
    cols > 1 && mode === "single"
      ? r.pick(["invert", "none"] as const)
      : "none",
    "none"
  )
  const tMin = r.range(0.08, 0.2)
  const target = clamp01((coverageTarget(r) - tMin) / (tMax - tMin))
  const spec: RingsSpec = {
    type: "rings",
    mode,
    shape,
    cols,
    rows,
    cx,
    cy,
    mirror,
    pitch,
    tMin,
    tMax,
    shaping,
    // Kayma yalnız ortalanmış dairelerde: merkez kenardaysa ince taraf
    // tuvalin içine düşer ve kaplama hedeften kaçar.
    drift:
      mode === "single" &&
      shape === "circle" &&
      cx === 0.5 &&
      cy === 0.5 &&
      r.chance(0.45)
        ? r.range(0.4, 0.95)
        : 0,
    driftAngle: r.pick([0.5, 1, 1.5, 2]) * Math.PI,
    tunnel,
    cellPhase,
  }
  const samples = ringSamples(spec, fr)
  balance(shaping, (sh) => meanOfSamples(sh, samples, 1), target)
  return spec
}
