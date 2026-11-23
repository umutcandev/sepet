import type { CategoryId } from "../categories"

import { balance } from "./balance"
import { makePalette } from "./color"
import { canvasFrame, type Frame } from "./geometry"
import { Rng } from "./rng"
import { DEFAULTS } from "./sdf"
import {
  MOTIF_TYPES,
  type CoverSpec,
  type FieldParams,
  type MotifSpec,
  type MotifType,
} from "./spec"
import { designDither } from "./motifs/dither"
import { designDots } from "./motifs/dots"
import { designMoire } from "./motifs/moire"
import { designStripes } from "./motifs/stripes"
import { designTruchet } from "./motifs/truchet"
import { designWaves } from "./motifs/waves"
import { designWeave } from "./motifs/weave"
import type { Shaping } from "./field"

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
}

const TAU = Math.PI * 2

// Ortak pürüz: genlik kısa kenarın %0,7-1'i.
function surface(r: Rng): Pick<FieldParams, "seed" | "rough" | "roughF"> {
  return {
    seed: r.range(0, 90),
    rough: r.range(0.007, 0.01),
    roughF: r.range(40, 55),
  }
}

/** Ailenin alan ayarları; eski motordan gelenler seyreltilir. */
function designField(type: MotifType, r: Rng, fr: Frame): Partial<FieldParams> {
  const ar = fr.w / fr.h
  switch (type) {
    case "rings":
      return {
        mode: "rings",
        cx: r.range(-0.35, 0.35),
        cy: r.range(-0.15, 0.15),
        asp: r.range(1, 1.5),
        freq: r.range(5, 8),
        ratio: r.range(0.27, 0.37),
        bead: r.range(0, 0.5),
        warp: r.range(0, 0.025),
        warpF: 1.8,
        minT: 1,
      }
    case "star":
      return {
        mode: "rings",
        n: r.int(5, 12),
        sharp: r.range(0.2, 1),
        star: r.range(0.3, 0.55),
        cx: r.range(-0.25, 0.25),
        cy: r.range(-0.12, 0.12),
        freq: r.range(6, 8.5),
        ratio: r.range(0.3, 0.38),
        warp: r.range(0, 0.05),
        warpF: r.range(1, 2),
        rot: r.range(0, TAU),
        minT: 1,
      }
    case "tunnel": {
      const metric = r.pick([0, 0, 1, 2])
      return {
        mode: "onion",
        metric,
        ecc: r.range(0.2, 0.42),
        asp: metric ? 1 : r.range(1, 1.2),
        freq: r.range(7, 10),
        ratio: r.range(0.3, 0.36),
        cx: r.range(-0.35, 0.35),
        cy: r.range(-0.1, 0.15),
        rot: r.range(0, TAU),
        minT: 0,
      }
    }
    case "citrus":
      return {
        mode: "citrus",
        r0: r.range(0.3, 0.38),
        n: r.int(8, 11),
        freq: r.range(7, 9),
        ratio: r.range(0.3, 0.36),
        cx: r.range(-0.45, 0.45),
        cy: r.range(-0.08, 0.08),
        rot: r.range(0, TAU),
      }
    case "squares": {
      const [cellCx, cellCy] = r.pick([
        [0, 0],
        [0, 1],
        [0.5, 1.15],
        [0.5, -0.15],
        [0, 0.5],
      ] as const)
      return {
        mode: "targets",
        metric: r.pick([0, 1, 1, 2]),
        cols: r.pick([1, 2]),
        rows: 1,
        cellCx,
        cellCy,
        mirror: 1,
        freq: r.range(10, 14),
        ratio: r.range(0.32, 0.4),
        thickMod: r.range(0, 0.35),
        k: r.pick([1.5, 2, 3]),
        phaseStep: r.range(0.08, 0.25),
      }
    }
    case "rays": {
      const [x, y] = r.pick([
        [0.5, 0.5],
        [0.5, 1.12],
        [0, 1],
        [0.33, 0.5],
        [0.7, 0.36],
      ] as const)
      return {
        mode: "polar",
        cx: x * ar - ar / 2,
        cy: y - 0.5,
        n: 2 * r.int(12, 26),
        ratio: r.range(0.34, 0.42),
        pulse: r.chance(0.5) ? r.range(0.12, 0.25) : 0,
        pulseK: r.int(2, 6),
        r0: 0.005,
      }
    }
    case "spiral": {
      const n = 2 * r.int(5, 9)
      const ratio = r.range(0.34, 0.42)
      return {
        mode: "polar",
        cx: r.range(-0.3, 0.3),
        cy: r.range(-0.1, 0.1),
        n,
        ratio,
        twist: r.sign() * r.range(1, 2.2),
        r0: 0.005,
        // kollar merkezde kesilir, ortaya göz konur
        eye: Math.max(0.035, ((4 * n) / (ratio * 1.25 * TAU) / 768) * 2.4),
      }
    }
    case "waves": {
      const m = designWaves(r, fr)
      return {
        mode: "waves",
        horiz: m.orient === "h" ? 1 : 0,
        prof: ["sine", "triangle", "square", "skew"].indexOf(m.profile),
        // çizgi sayısı dik kenar boyunca; sıklık kısa kenara göre okunur
        freq: (m.count * 0.46) / (m.orient === "h" ? 1 : fr.w / fr.h),
        cells: m.cells,
        cellOp: ["none", "invert", "shift"].indexOf(m.cellOp),
        k: m.k,
        amp: m.amp * 0.8,
        phaseStep: m.phaseStep / 0.46,
        env: ["const", "bulge", "ramp", "swell"].indexOf(m.envelope),
        ratio: m.thick * 0.78,
        thickMod: m.thickMod,
      }
    }
    case "weave": {
      const m = designWeave(r, fr)
      return {
        mode: "weave",
        rule: ["plain", "basket", "twill", "herringbone"].indexOf(m.rule),
        cols: 14,
        bars: Math.max(2, m.bars - 2),
        run: m.run,
        ratio: m.duty * 0.8,
      }
    }
    case "truchet": {
      // yalnız yay karosu
      let m = designTruchet(r.fork("karo"))
      for (let i = 1; m.tile !== "arc"; i++)
        m = designTruchet(r.fork(`karo${i}`))
      return {
        mode: "truchet",
        truchet: m,
        cols: Math.max(6, Math.round(m.cols * 0.75)),
        bars: m.bands,
        spread: m.spread,
        bandW: m.bandWidth * 1.1,
        rough: 0.007,
      }
    }
    case "dots": {
      const m = designDots(r, fr)
      const perX = Math.max(2, Math.round(m.perCellX * 0.4))
      const perY = Math.max(2, Math.round(m.perCellY * 0.4))
      return {
        mode: "dots",
        shaping: m.shaping,
        nx: perX * m.cellsA,
        ny: perY * m.cellsB,
        cellsA: m.cellsA,
        cellsB: m.cellsB,
        stagger: m.stagger ? 1 : 0,
        dotShape: ["circle", "square", "diamond", "plus", "bar"].indexOf(
          m.shape
        ),
        aMin: m.aMin,
        aMax: m.aMax * 0.8,
        dotRot: m.rotate,
        rough: 0.0055,
        roughF: 60,
      }
    }
    case "stripes": {
      const m = designStripes(r, fr)
      return {
        mode: "stripes",
        shaping: m.shaping,
        horiz: m.orient === "h" ? 1 : 0,
        cellsA: m.cellsA,
        cellsB: m.cellsB,
        ny: Math.max(6, Math.round(m.count * 0.5)),
        aMin: m.tMin,
        aMax: m.tMax * 0.8,
        anchor: m.anchor,
      }
    }
    case "moire": {
      // yalnız iki halkalı moiré
      let m = designMoire(r.fork("moire"), fr)
      for (let i = 1; m.mode !== "rings2"; i++)
        m = designMoire(r.fork(`moire${i}`), fr)
      return {
        mode: "moire",
        c1: [m.c1[0] * ar, m.c1[1]],
        c2: [m.c2[0] * ar, m.c2[1]],
        pitch: (m.pitch / fr.h) * 1.7,
        ratio: m.thick * 0.8,
        rough: 0.007,
      }
    }
    case "dither": {
      const m = designDither(r, fr)
      return {
        mode: "dither",
        shaping: m.shaping as Shaping,
        nx: Math.round((m.cols * 0.5) / m.cellsA) * m.cellsA,
        ny: Math.round((m.rows * 0.5) / m.cellsB) * m.cellsB,
        cellsA: m.cellsA,
        cellsB: m.cellsB,
        matrix: m.matrix,
        dotShape: ["square", "circle", "dash", "plus"].indexOf(m.shape),
        rough: 0.007,
      }
    }
  }
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
  const key = `${category}:${seed}:${opts.variant ?? 0}`
  const root = new Rng(key)
  const palette = makePalette(root.fork("palette"), category)
  const type = opts.motif ?? root.fork("motif").pick(MOTIF_TYPES)
  const r = root.fork(type)
  // Kararlar hep 16:9 kartta alınır: kart ve paylaşım görseli aynı desen.
  const fr = canvasFrame(COVER_SIZE.width, COVER_SIZE.height)
  const base = surface(r.fork("yuzey"))
  const raw: FieldParams = { ...DEFAULTS, ...base, ...designField(type, r, fr) }
  const target = r.fork("kaplama").range(0.26, 0.38)
  const field = balance(raw, target, fr.w, fr.h)
  const motif: MotifSpec = { type, field }
  return { seed: key, category, width, height, palette, motif }
}
