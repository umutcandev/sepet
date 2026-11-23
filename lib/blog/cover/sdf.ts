import { bayer, DASH_H, DASH_INSET, PLUS_L, PLUS_W } from "./motifs/dither"
import { truchetOrientation } from "./motifs/truchet"
import { shaped, TAU } from "./field"
import { fbm, snoise } from "./noise"
import type { FieldParams } from "./spec"

// Kapağın mesafe alanı: pozitif değer desen rengi, birim kısa kenar. Pürüz
// alana değil okunduğu koordinata uygulanır: nokta önce kıvrılır, sonra fBm
// ile titrer.

export const DEFAULTS: FieldParams = {
  mode: "rings",
  seed: 7,
  rough: 0.008,
  roughF: 45,
  warp: 0,
  warpF: 1.6,
  freq: 7,
  ratio: 0.34,
  bead: 0,
  minT: -1e4,
  maxT: 1e4,
  cx: 0,
  cy: 0,
  asp: 1,
  rot: 0,
  metric: 0,
  n: 6,
  sharp: 0,
  star: 0,
  ecc: 0,
  r0: 0.3,
  cols: 3,
  rows: 2,
  mirror: 0,
  cellCx: 0.5,
  cellCy: 0.5,
  thickMod: 0,
  k: 1.5,
  phaseStep: 0.02,
  twist: 0,
  pulse: 0,
  pulseK: 3,
  eye: 0,
  horiz: 1,
  prof: 0,
  env: 1,
  amp: 1.6,
  cells: 1,
  cellOp: 0,
  rule: 1,
  bars: 4,
  run: 2,
  spread: 0.37,
  bandW: 0.12,
  truchet: null,
  nx: 14,
  ny: 8,
  cellsA: 1,
  cellsB: 1,
  stagger: 0,
  dotShape: 0,
  aMin: 0.03,
  aMax: 0.6,
  dotRot: 0,
  anchor: 0.5,
  matrix: 4,
  gain: 1,
  shaping: null,
  c1: [0.8, 0.5],
  c2: [1, 0.5],
  pitch: 0.06,
}

const fract = (x: number) => x - Math.floor(x)
const hyp = (x: number, y: number) => Math.sqrt(x * x + y * y)
const mod = (x: number, m: number) => x - m * Math.floor(x / m)
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Periyodik bant: t'nin kesirli kısmı [0, r] aralığındayken içeride. */
function band(t: number, r: number): number {
  const c = r * 0.5
  return c - Math.abs(fract(t - c + 0.5) - 0.5)
}

function waveProfile(kind: number, ph: number): number {
  const x = TAU * ph
  if (kind < 0.5) return Math.sin(x)
  if (kind < 1.5) return (2 / Math.PI) * Math.asin(Math.sin(x))
  if (kind < 2.5) return Math.tanh(3 * Math.sin(x)) / Math.tanh(3)
  return Math.sin(x + 0.85 * Math.cos(x)) * 0.98
}

export type Field = (px: number, py: number) => number

export function makeField(
  params: FieldParams,
  width: number,
  height: number
): Field {
  const p = params
  const S = Math.min(width, height)
  const AR = width / S
  const HH = height / S
  const sdx = p.seed * 1.37
  const sdy = p.seed * 2.11
  const cr = Math.cos(p.rot)
  const sr = Math.sin(p.rot)
  const metric =
    p.metric < 0.5
      ? (x: number, y: number) => hyp(x, y)
      : p.metric < 1.5
        ? (x: number, y: number) => Math.max(Math.abs(x), Math.abs(y))
        : (x: number, y: number) => Math.abs(x) + Math.abs(y)

  // Hücre kararları bir kez hesaplanır.
  let dither: Uint8Array | null = null
  if (p.mode === "dither" && p.shaping) {
    const B = bayer(p.matrix)
    const m = p.matrix
    const cellCols = p.nx / p.cellsA
    const cellRows = p.ny / p.cellsB
    const cw = AR / p.nx
    const ch = HH / p.ny
    dither = new Uint8Array(p.nx * p.ny)
    for (let j = 0; j < p.ny; j++)
      for (let i = 0; i < p.nx; i++) {
        const ca = Math.min(p.cellsA - 1, Math.floor(i / cellCols))
        const cb = Math.min(p.cellsB - 1, Math.floor(j / cellRows))
        const f = shaped(
          p.shaping,
          (i - ca * cellCols + 0.5) / cellCols,
          (j - cb * cellRows + 0.5) / cellRows,
          ca,
          cb,
          (cellCols * cw) / (cellRows * ch)
        )
        dither[j * p.nx + i] =
          f * p.gain > (B[j % m][i % m] + 0.5) / (m * m) ? 1 : 0
      }
  }
  const ditherOn = (i: number, j: number) =>
    i < 0 || j < 0 || i >= p.nx || j >= p.ny ? 0 : dither![j * p.nx + i]

  let truchet: Uint8Array | null = null
  let truchetRows = 0
  if (p.mode === "truchet" && p.truchet) {
    const s = AR / p.cols
    truchetRows = Math.ceil(HH / s)
    truchet = new Uint8Array(p.cols * truchetRows)
    for (let j = 0; j < truchetRows; j++)
      for (let i = 0; i < p.cols; i++)
        truchet[j * p.cols + i] =
          truchetOrientation(p.truchet, i, j, p.cols, truchetRows) & 1
  }

  return (px, py) => {
    const ux = (px - width / 2) / S
    const uy = (py - height / 2) / S
    const wx = p.warp
      ? p.warp * snoise(ux * p.warpF + sdx, uy * p.warpF + sdy)
      : 0
    const wy = p.warp
      ? p.warp * snoise(ux * p.warpF + sdx + 5.2, uy * p.warpF + sdy + 1.3)
      : 0
    const rx = p.rough
      ? p.rough * fbm(ux * p.roughF + sdx + 3.1, uy * p.roughF + sdy + 7.7)
      : 0
    const ry = p.rough
      ? p.rough * fbm(ux * p.roughF + sdx + 11.4, uy * p.roughF + sdy + 2.9)
      : 0
    // pw: merkeze göre, F: sol üst köşeye göre
    const pwx = ux + wx + rx
    const pwy = uy + wy + ry
    const Fx = px / S + wx + rx
    const Fy = py / S + wy + ry
    const dx0 = pwx - p.cx
    const dy0 = pwy - p.cy
    const qpx = cr * dx0 + sr * dy0
    const qpy = -sr * dx0 + cr * dy0
    const qx = qpx / p.asp
    const qy = qpy
    const r = hyp(qx, qy)
    const a = Math.atan2(qy, qx)

    let t = 0
    let unit = 1 / p.freq
    let ratio = p.ratio
    let ranged = false
    let bx = qpx * 3
    let by = qpy * 3

    switch (p.mode) {
      case "rings": {
        ranged = true
        const prof =
          (1 - p.sharp) * (0.5 + 0.5 * Math.cos(p.n * a)) +
          p.sharp * Math.abs(fract((p.n * a) / TAU) * 2 - 1)
        const amt = p.star * smoothstep(0, 0.22, r)
        t = (metric(qx, qy) / (1 + amt * (prof - 0.5))) * p.freq
        bx = (qx / Math.max(r, 1e-3)) * 1.7
        by = (qy / Math.max(r, 1e-3)) * 1.7
        break
      }
      case "onion": {
        ranged = true
        t = (metric(qx, qy) + p.ecc * qy) * p.freq
        bx = (qx / Math.max(r, 1e-3)) * 1.7
        by = (qy / Math.max(r, 1e-3)) * 1.7
        break
      }
      case "citrus": {
        if (r < p.r0) {
          const seg = fract((a * p.n) / TAU)
          const dm = (Math.min(seg, 1 - seg) * r * TAU) / p.n
          const mem = 0.01 + (0.008 * r) / p.r0
          const sdm = Math.min(mem - dm, p.r0 - 0.075 - r)
          const sdc = 0.04 - r
          const sdr = Math.min(r - (p.r0 - 0.045), p.r0 - r)
          return Math.max(sdm, sdc, sdr)
        }
        t = (r - p.r0) * p.freq - 0.62
        if (t < 0) return -Math.min(r - p.r0, 0.01)
        bx = (qx / Math.max(r, 1e-3)) * 1.7
        by = (qy / Math.max(r, 1e-3)) * 1.7
        break
      }
      case "targets": {
        ranged = true
        const cw = AR / p.cols
        const ch = HH / p.rows
        const col = Math.floor(Fx / cw)
        const row = Math.floor(Fy / ch)
        let ccx = p.cellCx
        let ccy = p.cellCy
        if (p.mirror > 0.5) {
          if (mod(col, 2) > 0.5) ccx = 1 - ccx
          if (mod(row, 2) > 0.5) ccy = 1 - ccy
        }
        const ddx = Fx - (col + ccx) * cw
        const ddy = Fy - (row + ccy) * ch
        const d = metric(ddx, ddy)
        if (p.thickMod > 0) {
          const f =
            0.5 +
            0.5 *
              Math.sin(
                TAU * ((p.k * d) / Math.max(cw, ch) + p.phaseStep * (col + row))
              )
          ratio *= 1 - p.thickMod + 2 * p.thickMod * f
        }
        t = d * p.freq - 0.5 + ratio * 0.5
        const dl = hyp(ddx, ddy) || 1e-5
        bx = (ddx / dl) * 1.7 + col * 7.1
        by = (ddy / dl) * 1.7 + row * 3.3
        break
      }
      case "polar": {
        const dx = pwx - p.cx
        const dy = pwy - p.cy
        const rr = hyp(dx, dy)
        if (p.eye > 0 && rr < p.eye) return p.eye * 0.55 - rr
        const th = Math.atan2(dy, dx) - p.twist * Math.log((rr + p.r0) / p.r0)
        t = (th * p.n) / TAU
        const k = Math.floor(t)
        const rt = clamp(
          p.ratio + p.pulse * Math.sin((TAU * p.pulseK * k) / p.n),
          0.06,
          0.94
        )
        const tw = (p.twist * rr) / (rr + p.r0)
        return band(t, rt) * ((rr * TAU) / p.n / Math.sqrt(1 + tw * tw))
      }
      case "weave": {
        const s = AR / p.cols
        const rows = Math.ceil(HH / s)
        const y0 = (HH - rows * s) * 0.5
        const gx = Fx / s
        const gy = (Fy - y0) / s
        const i = Math.floor(gx)
        const j = Math.floor(gy)
        let dir: number
        if (p.rule < 0.5) dir = mod(i + j, 2)
        else if (p.rule < 1.5)
          dir = mod(Math.floor(i / 2) + Math.floor(j / 2), 2)
        else if (p.rule < 2.5) dir = mod(Math.floor((i + j) / p.run), 2)
        else dir = mod(Math.floor(i / p.run), 2)
        if (p.rule > 2.5) {
          const sp = (s * Math.SQRT1_2) / p.bars
          const n = (dir > 0.5 ? Fx + Fy : Fx - Fy) * Math.SQRT1_2
          t = n / sp
          unit = sp
        } else {
          t = (dir > 0.5 ? gx - i : gy - j) * p.bars - 0.5 + ratio * 0.5
          unit = s / p.bars
        }
        break
      }
      case "waves": {
        const hz = p.horiz > 0.5
        const A = hz ? Fx : Fy
        const B = hz ? Fy : Fx
        const lenA = hz ? AR : HH
        const lenB = hz ? HH : AR
        const pp = 1 / p.freq
        const cellA = lenA / p.cells
        const c = Math.floor(A / cellA)
        const s = fract(A / cellA)
        const odd = mod(c, 2) > 0.5
        const j0 = B / pp - 0.5
        const tt = clamp(((j0 + 0.5) * pp) / lenB, 0, 1)
        let ph = p.k * s + p.phaseStep * j0
        if (odd && p.cellOp > 1.5) ph += 0.25
        const env =
          p.env < 0.5
            ? 1
            : p.env < 1.5
              ? Math.sin(Math.PI * s)
              : p.env < 2.5
                ? 0.15 + 0.85 * tt
                : 0.5 - 0.5 * Math.cos(TAU * tt)
        let off = p.amp * pp * env * waveProfile(p.prof, ph)
        if (odd && p.cellOp > 0.5 && p.cellOp < 1.5) off = -off
        ratio =
          p.ratio * (1 + p.thickMod * Math.sin(TAU * (tt * 1.5 + s * 0.5)))
        t = (B - off) / pp - 0.5 + ratio * 0.5
        unit = pp
        break
      }
      case "truchet": {
        if (!truchet) return -1
        const s = AR / p.cols
        const y0 = (HH - truchetRows * s) * 0.5
        const gx = Fx / s
        const gy = (Fy - y0) / s
        const i = clamp(Math.floor(gx), 0, p.cols - 1)
        const j = clamp(Math.floor(gy), 0, truchetRows - 1)
        const lx = gx - i
        const ly = gy - j
        const o = truchet[j * p.cols + i]
        const d = o
          ? Math.min(hyp(lx - 1, ly), hyp(lx, ly - 1))
          : Math.min(hyp(lx, ly), hyp(lx - 1, ly - 1))
        const gg = p.spread / p.bars
        const m0 = 0.5 - p.spread * 0.5
        const tt = (d - m0) / gg
        const kk = Math.floor(tt)
        const bw = p.bandW / gg
        if (kk < 0 || kk > p.bars - 1)
          return -Math.min(Math.abs(d - m0), Math.abs(d - m0 - p.spread)) * s
        return band(tt - 0.5 + bw * 0.5, bw) * gg * s
      }
      case "dots": {
        if (!p.shaping) return -1
        const shaping = p.shaping
        const pxl = AR / p.nx
        const pyl = HH / p.ny
        const perX = p.nx / p.cellsA
        const perY = p.ny / p.cellsB
        const pm = Math.min(pxl, pyl)
        // Şekiller hücresinden taşabildiği için komşu hücreler de okunur.
        const dot = (i: number, j: number) => {
          if (i < 0 || j < 0 || i >= p.nx || j >= p.ny) return -1
          const shf = p.stagger > 0.5 && mod(j, 2) > 0.5 ? 0.5 : 0
          const f = shaped(
            shaping,
            Math.min((mod(i, perX) + 0.5 + shf) / perX, 1),
            (mod(j, perY) + 0.5) / perY,
            Math.floor(i / perX),
            Math.floor(j / perY),
            (perX * pxl) / (perY * pyl)
          )
          const area = (p.aMin + (p.aMax - p.aMin) * f) * pxl * pyl
          const ex = Fx - (i + 0.5 + shf) * pxl
          const ey = Fy - (j + 0.5) * pyl
          const an = p.dotRot * ((i + 0.5) / p.nx + (j + 0.5) / p.ny) * 0.5
          const dx = Math.cos(an) * ex + Math.sin(an) * ey
          const dy = -Math.sin(an) * ex + Math.cos(an) * ey
          const ax = Math.abs(dx)
          const ay = Math.abs(dy)
          if (p.dotShape < 0.5) return Math.sqrt(area / Math.PI) - hyp(dx, dy)
          if (p.dotShape < 1.5) return Math.sqrt(area) * 0.5 - Math.max(ax, ay)
          if (p.dotShape < 2.5)
            return (Math.sqrt(area * 0.5) - (ax + ay)) * Math.SQRT1_2
          if (p.dotShape < 3.5) {
            const L = 0.44 * pm
            const sp = 2 * L
            const w = (sp - Math.sqrt(Math.max(0, sp * sp - 4 * area))) / 4
            return Math.max(Math.min(w - ax, L - ay), Math.min(L - ax, w - ay))
          }
          const L = 0.45 * pm
          return Math.min(L - ax, area / (4 * L) - ay)
        }
        const j0 = Math.floor(Fy / pyl)
        let best = -Infinity
        for (let j = j0 - 1; j <= j0 + 1; j++) {
          const shf = p.stagger > 0.5 && mod(j, 2) > 0.5 ? 0.5 : 0
          const i0 = Math.floor(Fx / pxl - shf)
          for (let i = i0 - 1; i <= i0 + 1; i++)
            best = Math.max(best, dot(i, j))
        }
        return best
      }
      case "stripes": {
        if (!p.shaping) return -1
        const hz = p.horiz > 0.5
        const A = hz ? Fx : Fy
        const B = hz ? Fy : Fx
        const cellA = (hz ? AR : HH) / p.cellsA
        const cellB = (hz ? HH : AR) / p.cellsB
        const ca = Math.floor(A / cellA)
        const cb = Math.floor(B / cellB)
        const bl = B - cb * cellB
        const pp = cellB / p.ny
        const j = clamp(Math.floor(bl / pp), 0, p.ny - 1)
        const f = shaped(
          p.shaping,
          (A - ca * cellA) / cellA,
          (j + 0.5) / p.ny,
          ca,
          cb,
          cellA / cellB
        )
        const T = Math.min(pp * (p.aMin + (p.aMax - p.aMin) * f), pp * 0.95)
        const st = (j + 0.5) * pp - pp * 0.5 + p.anchor * (pp - T)
        return T * 0.5 - Math.abs(bl - (st + T * 0.5))
      }
      case "moire": {
        const ann = (cx: number, cy: number) =>
          band(hyp(Fx - cx, Fy - cy) / p.pitch - 0.5 + ratio * 0.5, ratio) *
          p.pitch
        const sA = ann(p.c1[0], p.c1[1])
        const sB = ann(p.c2[0], p.c2[1])
        // çakışan halkalar birbirini siler
        return Math.max(Math.min(sA, -sB), Math.min(-sA, sB))
      }
      case "dither": {
        if (!dither) return -1
        const cw = AR / p.nx
        const ch = HH / p.ny
        const i = Math.floor(Fx / cw)
        const j = Math.floor(Fy / ch)
        const on = ditherOn(i, j)
        const lx = Fx - (i + 0.5) * cw
        const ly = Fy - (j + 0.5) * ch
        const q = Math.min(cw, ch)
        if (p.dotShape < 0.5 || (p.dotShape > 1.5 && p.dotShape < 2.5)) {
          // yanan komşular birleşir: kenar yalnız durumu farklı komşuda
          const dash = p.dotShape > 0.5
          const ins = dash ? (on ? cw * DASH_INSET : -cw * DASH_INSET) : 0
          let dd = 1e3
          if (ditherOn(i - 1, j) !== on) dd = Math.min(dd, cw * 0.5 + lx - ins)
          if (ditherOn(i + 1, j) !== on) dd = Math.min(dd, cw * 0.5 - lx - ins)
          if (dash)
            return on
              ? Math.min(dd, (ch * DASH_H) / 2 - Math.abs(ly))
              : -Math.min(dd, (ch * (1 - DASH_H)) / 2)
          if (ditherOn(i, j - 1) !== on) dd = Math.min(dd, ch * 0.5 + ly)
          if (ditherOn(i, j + 1) !== on) dd = Math.min(dd, ch * 0.5 - ly)
          return on ? dd : -dd
        }
        if (p.dotShape < 1.5) return on ? q * 0.46 - hyp(lx, ly) : -q * 0.04
        const L = q * PLUS_L
        const W = q * PLUS_W
        const ax = Math.abs(lx)
        const ay = Math.abs(ly)
        return on
          ? Math.max(Math.min(W - ax, L - ay), Math.min(L - ax, W - ay))
          : -q * 0.02
      }
    }

    const k = Math.floor(t)
    if (p.bead > 0)
      ratio *= 1 + p.bead * snoise(bx + k * 3.7 + sdx, by + k * 1.9 + sdy)
    if (ranged && (k < p.minT || k > p.maxT)) return -0.02
    return band(t, ratio) * unit
  }
}
