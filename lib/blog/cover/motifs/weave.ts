import { Rng } from "../rng"
import {
  balance,
  clamp01,
  makeShaping,
  meanOfSamples,
  randomField,
  type Sample,
  shaped,
} from "../field"
import { hatch, PathData, rectPoly, type Frame, type Layer } from "../geometry"
import type { WeaveSpec } from "../spec"

/** Karo merkezleri: kalınlık haritası karo başına tek noktadan okunur. */
function weaveSamples(cols: number, fr: Frame): Sample[] {
  const s = fr.w / cols
  const rows = Math.ceil(fr.h / s)
  const y0 = fr.y + (fr.h - rows * s) / 2
  const out: Sample[] = []
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++)
      out.push([
        (i + 0.5) / cols,
        clamp01((y0 + j * s + s / 2 - fr.y) / fr.h),
        0,
        0,
      ])
  return out
}

export function renderWeave(spec: WeaveSpec, fr: Frame): Layer[] {
  const path = new PathData()
  const s = fr.w / spec.cols
  const rows = Math.ceil(fr.h / s)
  const y0 = fr.y + (fr.h - rows * s) / 2
  const slot = s / spec.bars
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < spec.cols; i++) {
      const x = fr.x + i * s
      const y = y0 + j * s
      const u = (i + 0.5) / spec.cols
      const v = (y + s / 2 - fr.y) / fr.h
      const duty = spec.shaping
        ? 0.16 + 0.72 * shaped(spec.shaping, u, clamp01(v), 0, 0, fr.w / fr.h)
        : spec.duty
      let dir: number
      switch (spec.rule) {
        case "plain":
          dir = (i + j) % 2
          break
        case "basket":
          dir = (Math.floor(i / 2) + Math.floor(j / 2)) % 2
          break
        case "twill":
          dir = Math.floor((i + j) / spec.run) % 2
          break
        case "herringbone":
          dir = Math.floor(i / spec.run) % 2
          break
      }
      if (spec.rule === "herringbone") {
        hatch(
          path,
          rectPoly({ x, y, w: s, h: s }),
          dir ? Math.PI / 4 : -Math.PI / 4,
          (s * Math.SQRT1_2) / spec.bars,
          duty
        )
        continue
      }
      const th = slot * duty
      for (let k = 0; k < spec.bars; k++) {
        const off = k * slot + (slot - th) / 2
        if (dir) path.rect(x + off, y, th, s)
        else path.rect(x, y + off, s, th)
      }
    }
  return [{ d: path.toString() }]
}

export function designWeave(r: Rng, fr: Frame): WeaveSpec {
  const rule = r.weighted([
    ["plain", 2],
    ["basket", 1.5],
    ["twill", 2],
    ["herringbone", 2],
  ] as const)
  // balıksırtı tek başına tekdüze bir dokudur: her zaman bir kalınlık haritası taşır
  const shaping =
    rule === "herringbone" || r.chance(0.45)
      ? makeShaping(
          randomField(r, ["radial", "diamond", "wave", "ripple", "saddle"]),
          r.chance(0.3) ? r.int(3, 5) : 0
        )
      : null
  const cols = rule === "herringbone" ? r.int(6, 12) : r.int(10, 22)
  // Kalınlık = 0.16 + 0.72·f. Balıksırtında yalnız 6–12 sütun olduğu için
  // harita sürekli ortalamaya değil, render'ın okuduğu karo merkezlerine göre
  // dengelenir; yoksa kaplama %26 ile %83 arasında savrulur.
  if (shaping) {
    const samples = weaveSamples(cols, fr)
    balance(
      shaping,
      (sh) => meanOfSamples(sh, samples, fr.w / fr.h),
      (r.range(0.46, 0.54) - 0.16) / 0.72
    )
  }
  const maxBars = Math.max(
    2,
    Math.floor(fr.w / cols / (fr.h * (rule === "herringbone" ? 0.03 : 0.016)))
  )
  return {
    type: "weave",
    rule,
    cols,
    bars: Math.min(maxBars, r.int(2, 5)),
    duty: r.range(0.44, 0.58),
    run: r.int(2, 3),
    shaping,
  }
}
