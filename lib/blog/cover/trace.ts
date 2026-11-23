import { fmt, simplify, type Vec } from "./geometry"
import type { Field } from "./sdf"

// Mesafe alanı → SVG yolu: marching squares ile kapalı halkalar, evenodd
// dolgu (iç içe halkalar delik olur). Kenardan uzak kaba hücreler ince
// ızgarada yeniden okunmaz.

export interface TraceOptions {
  /** ince ızgaranın adımı, piksel */
  step: number
  /** kaba ızgaranın ince adım cinsinden katı */
  coarse: number
  /** RDP sadeleştirme toleransı, piksel */
  tolerance: number
  /** kenara bu kadar yakın kaba hücreler incelenir (kısa kenar biriminde) */
  margin: number
}

export function traceField(
  field: Field,
  width: number,
  height: number,
  opts: TraceOptions
): string {
  const S = Math.min(width, height)
  const { step, coarse } = opts
  // kenar düğümleri dışarıda sayılır: kenara değen şekiller de kapanır
  const gx = Math.ceil(width / step) + 3
  const gy = Math.ceil(height / step) + 3
  const X = (i: number) => (i - 1) * step
  const Y = (j: number) => (j - 1) * step
  const W = gx + 1
  const F = new Float32Array(W * (gy + 1))
  const border = (i: number, j: number) =>
    i === 0 || j === 0 || i === gx || j === gy

  const cgx = Math.ceil(gx / coarse)
  const cgy = Math.ceil(gy / coarse)
  const CW = cgx + 1
  const C = new Float32Array(CW * (cgy + 1))
  for (let cj = 0; cj <= cgy; cj++)
    for (let ci = 0; ci <= cgx; ci++)
      C[cj * CW + ci] = field(
        X(Math.min(ci * coarse, gx)),
        Y(Math.min(cj * coarse, gy))
      )
  const margin = opts.margin + (coarse * step * 1.5) / S
  const exact = new Uint8Array(W * (gy + 1))
  for (let cj = 0; cj < cgy; cj++)
    for (let ci = 0; ci < cgx; ci++) {
      const a = C[cj * CW + ci]
      const b = C[cj * CW + ci + 1]
      const c = C[(cj + 1) * CW + ci + 1]
      const d = C[(cj + 1) * CW + ci]
      const near =
        Math.min(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) < margin ||
        Math.sign(a) !== Math.sign(b) ||
        Math.sign(a) !== Math.sign(c) ||
        Math.sign(a) !== Math.sign(d)
      const sign = a > 0 ? 1 : -1
      for (let j = cj * coarse; j <= Math.min((cj + 1) * coarse, gy); j++)
        for (let i = ci * coarse; i <= Math.min((ci + 1) * coarse, gx); i++) {
          const idx = j * W + i
          if (near && !exact[idx]) {
            F[idx] = field(X(i), Y(j))
            exact[idx] = 1
          } else if (!exact[idx]) F[idx] = sign
        }
    }
  for (let j = 0; j <= gy; j++)
    for (let i = 0; i <= gx; i++) if (border(i, j)) F[j * W + i] = -1

  // kenar anahtarı: yatay j*W+i, dikey base+j*W+i
  const base = (gy + 1) * W
  const point = (key: number): Vec => {
    if (key < base) {
      const i = key % W
      const j = (key - i) / W
      const a = F[j * W + i]
      const b = F[j * W + i + 1]
      return [X(i + a / (a - b)), Y(j)]
    }
    const k = key - base
    const i = k % W
    const j = (k - i) / W
    const a = F[j * W + i]
    const b = F[(j + 1) * W + i]
    return [X(i), Y(j + a / (a - b))]
  }
  const next = new Map<number, number[]>()
  const link = (p: number, q: number) => {
    const lp = next.get(p)
    if (lp) lp.push(q)
    else next.set(p, [q])
    const lq = next.get(q)
    if (lq) lq.push(p)
    else next.set(q, [p])
  }
  for (let j = 0; j < gy; j++)
    for (let i = 0; i < gx; i++) {
      const a = F[j * W + i] > 0
      const b = F[j * W + i + 1] > 0
      const c = F[(j + 1) * W + i + 1] > 0
      const d = F[(j + 1) * W + i] > 0
      const code = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0)
      if (code === 0 || code === 15) continue
      const top = j * W + i
      const bottom = (j + 1) * W + i
      const left = base + j * W + i
      const right = base + j * W + i + 1
      switch (code) {
        case 1:
        case 14:
          link(left, bottom)
          break
        case 2:
        case 13:
          link(bottom, right)
          break
        case 3:
        case 12:
          link(left, right)
          break
        case 4:
        case 11:
          link(top, right)
          break
        case 6:
        case 9:
          link(top, bottom)
          break
        case 7:
        case 8:
          link(left, top)
          break
        case 5:
        case 10: {
          const center =
            (F[j * W + i] +
              F[j * W + i + 1] +
              F[(j + 1) * W + i + 1] +
              F[(j + 1) * W + i]) /
              4 >
            0
          if ((code === 5) === center) {
            link(left, top)
            link(bottom, right)
          } else {
            link(left, bottom)
            link(top, right)
          }
          break
        }
      }
    }

  let d = ""
  const seen = new Set<number>()
  for (const startKey of next.keys()) {
    if (seen.has(startKey)) continue
    const loop: Vec[] = []
    let prev = -1
    let cur = startKey
    while (!seen.has(cur)) {
      seen.add(cur)
      loop.push(point(cur))
      const ns = next.get(cur)!
      const nxt = ns[0] !== prev ? ns[0] : ns[1]
      prev = cur
      cur = nxt
      if (cur === undefined) break
    }
    if (loop.length < 3) continue
    const half = Math.floor(loop.length / 2)
    const pts = simplify(loop.slice(0, half + 1), opts.tolerance).concat(
      simplify(loop.slice(half).concat([loop[0]]), opts.tolerance).slice(1, -1)
    )
    if (pts.length < 3) continue
    // göreli koordinat; fark yuvarlanmış noktadan alınır, hata birikmez
    let px = Math.round(pts[0][0] * 10)
    let py = Math.round(pts[0][1] * 10)
    d += `M${fmt(px / 10)} ${fmt(py / 10)}l`
    for (let i = 1; i < pts.length; i++) {
      const nx = Math.round(pts[i][0] * 10)
      const ny = Math.round(pts[i][1] * 10)
      if (nx === px && ny === py) continue
      const sx = fmt((nx - px) / 10)
      const sy = fmt((ny - py) / 10)
      d +=
        (i > 1 && sx[0] !== "-" ? " " : "") +
        sx +
        (sy[0] === "-" ? "" : " ") +
        sy
      px = nx
      py = ny
    }
    d += "z"
  }
  return d
}
