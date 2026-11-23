import { Rng } from "../rng"
import {
  balance,
  clamp01,
  makeShaping,
  meanOfSamples,
  randomField,
  type Sample,
} from "../field"
import { type Frame } from "../geometry"
import type { WeaveSpec } from "./types"

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
  // harita sürekli ortalamaya değil, dokumanın okunduğu karo merkezlerine göre
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
