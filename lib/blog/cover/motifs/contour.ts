import { Rng } from "../rng"
import { TAU } from "../field"
import {
  chaikin,
  PathData,
  simplify,
  type Frame,
  type Layer,
  type Vec,
} from "../geometry"
import type { ContourSpec } from "../spec"

export function contourField(spec: ContourSpec, u: number, v: number): number {
  let z =
    spec.wave[2] *
    Math.sin(TAU * (spec.wave[0] * u + spec.wave[1] * v) + spec.wave[3])
  for (const [hx, hy, r, a] of spec.hills)
    z += a * Math.exp(-((u - hx) ** 2 + (v - hy) ** 2) / (r * r))
  return z
}

/** Marching squares: bir seviye için eş yükselti çoklu çizgileri (ızgara koordinatı). */
export function isolines(
  F: Float64Array,
  gx: number,
  gy: number,
  level: number
): Vec[][] {
  const W = gx + 1
  const base = (gy + 1) * W
  const pointOf = (key: number): Vec => {
    if (key < base) {
      const i = key % W
      const j = Math.floor(key / W)
      const a = F[j * W + i]
      const b = F[j * W + i + 1]
      return [i + (level - a) / (b - a), j]
    }
    const k = key - base
    const i = k % W
    const j = Math.floor(k / W)
    const a = F[j * W + i]
    const b = F[(j + 1) * W + i]
    return [i, j + (level - a) / (b - a)]
  }
  const segs: [number, number][] = []
  for (let j = 0; j < gy; j++)
    for (let i = 0; i < gx; i++) {
      const a = F[j * W + i]
      const b = F[j * W + i + 1]
      const c = F[(j + 1) * W + i + 1]
      const d = F[(j + 1) * W + i]
      const code =
        (a > level ? 8 : 0) |
        (b > level ? 4 : 0) |
        (c > level ? 2 : 0) |
        (d > level ? 1 : 0)
      if (code === 0 || code === 15) continue
      const top = j * W + i
      const bottom = (j + 1) * W + i
      const left = base + j * W + i
      const right = base + j * W + i + 1
      const center = (a + b + c + d) / 4 > level
      switch (code) {
        case 1:
        case 14:
          segs.push([left, bottom])
          break
        case 2:
        case 13:
          segs.push([bottom, right])
          break
        case 3:
        case 12:
          segs.push([left, right])
          break
        case 4:
        case 11:
          segs.push([top, right])
          break
        case 6:
        case 9:
          segs.push([top, bottom])
          break
        case 7:
        case 8:
          segs.push([left, top])
          break
        case 5:
          if (center) segs.push([left, top], [bottom, right])
          else segs.push([left, bottom], [top, right])
          break
        case 10:
          if (center) segs.push([left, bottom], [top, right])
          else segs.push([left, top], [bottom, right])
          break
      }
    }
  const byKey = new Map<number, number[]>()
  segs.forEach(([p, q], idx) => {
    for (const k of [p, q]) {
      const list = byKey.get(k)
      if (list) list.push(idx)
      else byKey.set(k, [idx])
    }
  })
  const used = new Uint8Array(segs.length)
  const lines: Vec[][] = []
  const walk = (key: number, keys: number[]) => {
    for (;;) {
      const next = (byKey.get(key) ?? []).find((idx) => !used[idx])
      if (next === undefined) return
      used[next] = 1
      const [p, q] = segs[next]
      key = p === key ? q : p
      keys.push(key)
    }
  }
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue
    used[s] = 1
    const fwd = [segs[s][0], segs[s][1]]
    walk(fwd[1], fwd)
    const back: number[] = []
    walk(fwd[0], back)
    lines.push(back.reverse().concat(fwd).map(pointOf))
  }
  return lines
}

export function contourLines(
  spec: ContourSpec,
  fr: Frame
): { lines: Vec[][]; majors: boolean[] } {
  const gx = 132
  const gy = Math.round((gx * fr.h) / fr.w)
  const F = new Float64Array((gx + 1) * (gy + 1))
  let lo = Infinity
  let hi = -Infinity
  for (let j = 0; j <= gy; j++)
    for (let i = 0; i <= gx; i++) {
      const z = contourField(spec, ((i / gx) * fr.w) / fr.h, j / gy)
      F[j * (gx + 1) + i] = z
      lo = Math.min(lo, z)
      hi = Math.max(hi, z)
    }
  const lines: Vec[][] = []
  const majors: boolean[] = []
  for (let k = 0; k < spec.levels; k++) {
    const level = lo + ((k + 0.5) * (hi - lo)) / spec.levels
    for (const line of isolines(F, gx, gy, level)) {
      const closed =
        line.length > 3 &&
        line[0][0] === line[line.length - 1][0] &&
        line[0][1] === line[line.length - 1][1]
      const px = line.map(
        ([i, j]): Vec => [fr.x + (i / gx) * fr.w, fr.y + (j / gy) * fr.h]
      )
      const smooth = chaikin(
        chaikin(closed ? px.slice(0, -1) : px, closed),
        closed
      )
      const pts = simplify(closed ? smooth.concat([smooth[0]]) : smooth, 0.3)
      if (pts.length >= 2) {
        lines.push(pts)
        majors.push(spec.major > 0 && k % spec.major === spec.major - 1)
      }
    }
  }
  return { lines, majors }
}

// Çizgi kalınlığı sınırları, çerçeve yüksekliğine oranla.
const W_MIN = 0.0035
const W_MAX = 0.03

const polyLength = (l: Vec[]) =>
  l.reduce(
    (sum, p, i) =>
      i ? sum + Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]) : 0,
    0
  )

/**
 * Çizgi kalınlığı elle seçilmez: toplam eğri boyundan (ana eğriler çift
 * sayılır) kaplama hedefini tutturan kalınlık hesaplanır. Kalınlığının
 * birkaç katından kısa eğriler kart boyutunda nokta kümesi gibi durduğu için
 * atılır ve kalınlık kalan eğrilere göre bir kez daha hesaplanır. `raw`,
 * sınırlara kırpılmadan önceki kalınlık; tasarımcı tavana takılan kapakta
 * seviye sayısını artırmak için kullanır.
 */
export function contourLayout(spec: ContourSpec, fr: Frame) {
  const { lines, majors } = contourLines(spec, fr)
  const lens = lines.map(polyLength)
  const isLong = (w: number, i: number) => lens[i] > w * (majors[i] ? 10 : 6)
  const solve = (keep: (i: number) => boolean) => {
    let total = 0
    lines.forEach((_, i) => {
      if (keep(i)) total += lens[i] * (majors[i] ? 2 : 1)
    })
    return (spec.cover * fr.w * fr.h) / Math.max(1, total)
  }
  const first = solve(() => true)
  const raw = solve((i) => isLong(first, i))
  const w = Math.min(fr.h * W_MAX, Math.max(fr.h * W_MIN, raw))
  return { lines, majors, keep: lines.map((_, i) => isLong(w, i)), w, raw }
}

export function renderContour(spec: ContourSpec, fr: Frame): Layer[] {
  const { lines, majors, keep, w } = contourLayout(spec, fr)
  const minor = new PathData()
  const major = new PathData()
  lines.forEach((l, i) => {
    if (keep[i]) (majors[i] ? major : minor).poly(l, false)
  })
  const layers: Layer[] = [{ d: minor.toString(), stroke: w }]
  if (major.size) layers.push({ d: major.toString(), stroke: w * 2 })
  return layers
}

export function designContour(r: Rng, fr: Frame): ContourSpec {
  const ar = fr.w / fr.h
  const hills: [number, number, number, number][] = Array.from(
    { length: r.int(2, 6) },
    () => [
      r.range(-0.1, ar + 0.1),
      r.range(-0.1, 1.1),
      r.range(0.15, 0.6),
      r.sign() * r.range(0.5, 1.2),
    ]
  )
  const spec: ContourSpec = {
    type: "contour",
    hills,
    // Dalgalı zemin her zaman var: yoksa tepelerden uzak bölgeler düz kalıyor
    // ve oraya hiç eş yükselti çizgisi düşmüyor, tuvalin yarısı boş görünüyor.
    wave: [
      r.range(0.5, 2),
      r.range(0.5, 2),
      r.range(0.15, 0.4),
      r.next() * TAU,
    ],
    levels: r.int(16, 34),
    cover: r.range(0.44, 0.54),
    major: r.weighted([
      [0, 3],
      [4, 1],
      [5, 1],
    ] as const),
  }
  // Eğriler kısa kalırsa kalınlık tavana takılır ve kaplama hedefe ulaşmaz.
  // O durumda seviye sayısı, gereken kalınlık oranında artırılır.
  for (let k = 0; k < 3; k++) {
    const { raw } = contourLayout(spec, fr)
    if (raw <= fr.h * W_MAX) break
    spec.levels = Math.min(
      90,
      Math.ceil(spec.levels * (raw / (fr.h * W_MAX)) * 1.05)
    )
  }
  return spec
}
