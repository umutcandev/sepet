import type { CategoryId } from "../categories"

import { Rng } from "./rng"
import { CATEGORY_STYLES, makePalette, type Polarity } from "./color"
import { frameOf } from "./geometry"
import {
  MOTIF_TYPES,
  type CoverSpec,
  type MotifSpec,
  type MotifType,
} from "./spec"
import { designContour } from "./motifs/contour"
import { designDither } from "./motifs/dither"
import { designDots } from "./motifs/dots"
import { designMoire } from "./motifs/moire"
import { designPolar } from "./motifs/polar"
import { designQuilt } from "./motifs/quilt"
import { designRings } from "./motifs/rings"
import { designStripes } from "./motifs/stripes"
import { designTruchet } from "./motifs/truchet"
import { designWaves } from "./motifs/waves"
import { designWeave } from "./motifs/weave"

/** Kart ve yazı içi kapak: 16:9. */
export const COVER_SIZE = { width: 1536, height: 864 } as const
/** Paylaşım görseli (OG/Twitter). */
export const OG_SIZE = { width: 1200, height: 630 } as const

export interface DesignOptions {
  width?: number
  height?: number
  motif?: MotifType
  /** aynı yazı için "başka bir tane": slug sabit kalır, varyant değişir */
  variant?: number
  polarity?: Polarity
}

export function design(
  seed: string,
  category: CategoryId,
  opts: DesignOptions = {}
): CoverSpec {
  const width = opts.width ?? COVER_SIZE.width
  const height = opts.height ?? COVER_SIZE.height
  // Desenler makul bir tuval varsayar: sıfır ya da sonsuz boyut döngüleri
  // sonsuza götürür, aşırı en-boy oranı megabaytlarca SVG üretir.
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    Math.min(width, height) < 64 ||
    Math.max(width, height) > 4096 ||
    Math.max(width / height, height / width) > 4
  )
    throw new RangeError(`Geçersiz kapak boyutu: ${width}×${height}`)
  const style = CATEGORY_STYLES[category]
  const key = `${category}:${seed}:${opts.variant ?? 0}`
  const root = new Rng(key)
  const fr = frameOf(width, height)
  const palette = makePalette(root.fork("palette"), style, opts.polarity)
  const type = opts.motif ?? root.fork("motif").pick(MOTIF_TYPES)
  const r = root.fork(type)
  let motif: MotifSpec
  switch (type) {
    case "stripes":
      motif = designStripes(r, fr)
      break
    case "rings":
      motif = designRings(r, fr)
      break
    case "waves":
      motif = designWaves(r, fr)
      break
    case "dots":
      motif = designDots(r, fr)
      break
    case "moire":
      motif = designMoire(r, fr)
      break
    case "polar":
      motif = designPolar(r, fr)
      break
    case "truchet":
      motif = designTruchet(r)
      break
    case "quilt":
      motif = designQuilt(r, fr)
      break
    case "weave":
      motif = designWeave(r, fr)
      break
    case "contour":
      motif = designContour(r, fr)
      break
    case "dither":
      motif = designDither(r, fr)
      break
  }
  return { seed: key, category, width, height, palette, motif }
}
