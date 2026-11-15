// Rota kutularının ekran pikselinde yerleşimi: kutu çizginin yanına, çizgiye
// dik yönde oturur; altında çizgi, işaretçi, kontrol ya da başka kutu kalmayan
// aday seçilir.

export type Pt = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

export type Placement = {
  rect: Rect
  /** Kutu çizginin solunda: renkli çizgi sağ kenarda, rotaya bakar. */
  barRight: boolean
}

/** Kutuyla çizgi arasındaki boşluk. */
const GAP = 6
// Orta noktaya yakın adaylar önce; "bacağın ortasında" görünsün.
const FRACTIONS = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.2, 0.8]

const inflate = (r: Rect, d: number): Rect => ({
  x: r.x - d,
  y: r.y - d,
  w: r.w + 2 * d,
  h: r.h + 2 * d,
})

export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

const inside = (p: Pt, r: Rect) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h

const contains = (outer: Rect, r: Rect) =>
  r.x >= outer.x &&
  r.y >= outer.y &&
  r.x + r.w <= outer.x + outer.w &&
  r.y + r.h <= outer.y + outer.h

const cross = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt) {
  return cross(p3, p4, p1) * cross(p3, p4, p2) < 0 && cross(p1, p2, p3) * cross(p1, p2, p4) < 0
}

export function segmentHitsRect(a: Pt, b: Pt, r: Rect): boolean {
  if (inside(a, r) || inside(b, r)) return true
  const c: Pt[] = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ]
  return c.some((p, i) => segmentsCross(a, b, p, c[(i + 1) % 4]))
}

/** Yolun `fraction` kadar ilerisindeki nokta ve oradaki birim yön. */
export function along(path: Pt[], fraction: number): { point: Pt; dir: Pt } {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y))
  let left = lengths.reduce((s, l) => s + l, 0) * fraction
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] === 0) continue
    if (left <= lengths[i] || i === lengths.length - 1) {
      const t = Math.min(1, left / lengths[i])
      const a = path[i]
      const b = path[i + 1]
      return {
        point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        dir: { x: (b.x - a.x) / lengths[i], y: (b.y - a.y) / lengths[i] },
      }
    }
    left -= lengths[i]
  }
  return { point: path[0], dir: { x: 0, y: 1 } }
}

export function placeLabel({
  path,
  size,
  segments,
  blocked,
  bounds,
}: {
  /** Kutunun ait olduğu bacak. */
  path: Pt[]
  size: { w: number; h: number }
  /** Haritadaki tüm rota çizgileri (bu bacak dahil). */
  segments: Pt[][]
  /** İşaretçiler, kontroller, yerleşmiş kutular. */
  blocked: Rect[]
  bounds: Rect
}): Placement | null {
  if (path.length < 2) return null
  const { w, h } = size
  let best: (Placement & { score: number }) | null = null

  for (const [k, f] of FRACTIONS.entries()) {
    const { point, dir } = along(path, f)
    for (const n of [{ x: -dir.y, y: dir.x }, { x: dir.y, y: -dir.x }]) {
      // Kutunun çizgiye bakan kenarı GAP kadar uzakta kalır.
      const reach = GAP + (Math.abs(n.x) * w) / 2 + (Math.abs(n.y) * h) / 2
      const rect = { x: point.x + n.x * reach - w / 2, y: point.y + n.y * reach - h / 2, w, h }
      const hit = inflate(rect, 3)
      let score = k * 0.5 + (n.x < 0 ? 0.1 : 0)
      for (const s of segments) {
        for (let i = 1; i < s.length; i++) if (segmentHitsRect(s[i - 1], s[i], hit)) score += 20
      }
      for (const b of blocked) if (overlaps(b, hit)) score += 200
      if (!contains(bounds, rect)) score += 1000
      if (!best || score < best.score) best = { rect, barRight: n.x < 0, score }
    }
  }
  return best && { rect: best.rect, barRight: best.barRight }
}
