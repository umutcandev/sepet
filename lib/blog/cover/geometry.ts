export type Vec = [number, number]

export interface Frame {
  x: number
  y: number
  w: number
  h: number
}

export interface Layer {
  d: string
  clip?: Frame
  /** varsa dolgu yerine bu kalınlıkta çizgi */
  stroke?: number
  /** varsayılan evenodd (çakışan iki şekil birbirini siler); nonzero birleştirir */
  fillRule?: "nonzero"
}

export const fmt = (n: number) => {
  const r = Math.round(n * 10) / 10
  return Object.is(r, -0) ? "0" : String(r)
}
export const pt = (p: Vec) => `${fmt(p[0])} ${fmt(p[1])}`

export class PathData {
  private parts: string[] = []
  poly(pts: Vec[], close = true): void {
    if (pts.length < (close ? 3 : 2)) return
    let d = `M${pt(pts[0])}L`
    for (let i = 1; i < pts.length; i++) d += (i > 1 ? " " : "") + pt(pts[i])
    this.parts.push(close ? d + "Z" : d)
  }
  rect(x: number, y: number, w: number, h: number): void {
    if (w < 0.05 || h < 0.05) return
    this.poly([
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ])
  }
  circle(cx: number, cy: number, r: number): void {
    if (r < 0.05) return
    const R = fmt(r)
    this.parts.push(
      `M${fmt(cx - r)} ${fmt(cy)}a${R} ${R} 0 1 0 ${fmt(2 * r)} 0a${R} ${R} 0 1 0 ${fmt(-2 * r)} 0Z`
    )
  }
  /** Köşesi (cx,cy) olan çeyrek halka; a0 = 0, 90, 180, 270 derece. rIn ≤ 0 → çeyrek disk. */
  quarter(cx: number, cy: number, rIn: number, rOut: number, a0: number): void {
    if (rOut < 0.3) return
    const P = (r: number, a: number): Vec => [
      cx + r * Math.cos((a * Math.PI) / 180),
      cy + r * Math.sin((a * Math.PI) / 180),
    ]
    const R = fmt(rOut)
    let d = `M${pt(P(rOut, a0))}A${R} ${R} 0 0 1 ${pt(P(rOut, a0 + 90))}`
    if (rIn > 0.3) {
      const r = fmt(rIn)
      d += `L${pt(P(rIn, a0 + 90))}A${r} ${r} 0 0 0 ${pt(P(rIn, a0))}Z`
    } else d += `L${pt([cx, cy])}Z`
    this.parts.push(d)
  }
  /** Eksene hizalı artı: kol yarı boyu L, kol yarı kalınlığı w. */
  plus(cx: number, cy: number, L: number, w: number): void {
    const a = fmt(2 * w)
    const b = fmt(L - w)
    const na = fmt(-2 * w)
    const nb = fmt(w - L)
    this.parts.push(
      `M${fmt(cx - w)} ${fmt(cy - L)}h${a}v${b}h${b}v${a}h${nb}v${b}h${na}v${nb}h${nb}v${na}h${b}Z`
    )
  }
  get size(): number {
    return this.parts.length
  }
  toString(): string {
    return this.parts.join("")
  }
}

/** Ramer–Douglas–Peucker: düz giden noktaları atar, kıvrımı korur. */
export function simplify(pts: Vec[], eps: number): Vec[] {
  if (pts.length <= 2) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = pts[a]
    const dx = pts[b][0] - ax
    const dy = pts[b][1] - ay
    const len = Math.hypot(dx, dy) || 1
    let idx = -1
    let dmax = eps
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len
      if (d > dmax) {
        dmax = d
        idx = i
      }
    }
    if (idx >= 0) {
      keep[idx] = 1
      stack.push([a, idx], [idx, b])
    }
  }
  return pts.filter((_, i) => keep[i])
}

/** Chaikin köşe kesme: açık eğride uç noktalar korunur. */
export function chaikin(pts: Vec[], closed: boolean): Vec[] {
  if (pts.length < 3) return pts
  const out: Vec[] = closed ? [] : [pts[0]]
  const n = closed ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    out.push(
      [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]],
      [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]
    )
  }
  if (!closed) out.push(pts[pts.length - 1])
  return out
}

/** Sutherland–Hodgman: n·p ≥ c yarı düzlemini tutar. */
export function clipHalf(
  poly: Vec[],
  nx: number,
  ny: number,
  c: number
): Vec[] {
  const out: Vec[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const da = nx * a[0] + ny * a[1] - c
    const db = nx * b[0] + ny * b[1] - c
    if (da >= 0) out.push(a)
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

export const rectPoly = (f: Frame): Vec[] => [
  [f.x, f.y],
  [f.x + f.w, f.y],
  [f.x + f.w, f.y + f.h],
  [f.x, f.y + f.h],
]

/**
 * Dışbükey çokgeni `angle` yönünde paralel bantlarla tarar. Bantlar orijine
 * hizalı: aynı açılı komşu parçalarda çizgiler kesintisiz devam eder.
 */
export function hatch(
  path: PathData,
  poly: Vec[],
  angle: number,
  pitch: number,
  duty: number,
  offset = 0
): void {
  const nx = -Math.sin(angle)
  const ny = Math.cos(angle)
  const proj = poly.map(([x, y]) => nx * x + ny * y)
  const lo = Math.min(...proj)
  const hi = Math.max(...proj)
  for (
    let k = Math.floor((lo - offset) / pitch) - 1;
    k * pitch + offset < hi;
    k++
  ) {
    const a = k * pitch + offset
    const b = a + duty * pitch
    if (b <= lo) continue
    const band = clipHalf(clipHalf(poly, nx, ny, a), -nx, -ny, -b)
    if (band.length >= 3) path.poly(band)
  }
}

/**
 * s ∈ [0,1] boyunca alanı örnekler. Basamaklı alanlarda geçiş noktası ikiye
 * bölmeyle bulunur: basamak kenarları örnek ızgarasına değil gerçek eşiğe oturur.
 */
export function trace(
  F: (s: number) => number,
  stepped: boolean,
  n: number
): Vec[] {
  const out: Vec[] = [[0, F(0)]]
  let ps = 0
  let pv = out[0][1]
  for (let k = 1; k <= n; k++) {
    const s = k / n
    const v = F(s)
    if (!stepped) {
      out.push([s, v])
      continue
    }
    let guard = 0
    while (v !== pv && guard++ < 16) {
      let lo = ps
      let hi = s
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2
        if (F(mid) === pv) lo = mid
        else hi = mid
      }
      const nv = F(hi)
      out.push([hi, pv], [hi, nv])
      ps = hi
      pv = nv
    }
    ps = s
    pv = v
  }
  if (stepped) out.push([1, pv])
  return out
}

export function metricNorm(
  shape: "circle" | "square" | "diamond",
  dx: number,
  dy: number
): number {
  if (shape === "circle") return Math.hypot(dx, dy)
  if (shape === "square") return Math.max(Math.abs(dx), Math.abs(dy))
  return Math.abs(dx) + Math.abs(dy)
}

export function ringShape(
  path: PathData,
  shape: "circle" | "square" | "diamond",
  cx: number,
  cy: number,
  r: number
): void {
  if (r <= 0.05) return
  if (shape === "circle") path.circle(cx, cy, r)
  else if (shape === "square") path.rect(cx - r, cy - r, 2 * r, 2 * r)
  else
    path.poly([
      [cx, cy - r],
      [cx + r, cy],
      [cx, cy + r],
      [cx - r, cy],
    ])
}

export function cornerReach(
  shape: "circle" | "square" | "diamond",
  cell: Frame,
  cx: number,
  cy: number
): number {
  const corners: Vec[] = rectPoly(cell)
  return Math.max(...corners.map(([x, y]) => metricNorm(shape, x - cx, y - cy)))
}

export function rotated(
  cx: number,
  cy: number,
  pts: Vec[],
  angle: number
): Vec[] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c])
}

export function frameOf(width: number, height: number): Frame {
  const m = Math.round(Math.min(width, height) / 18)
  return { x: m, y: m, w: width - 2 * m, h: height - 2 * m }
}
