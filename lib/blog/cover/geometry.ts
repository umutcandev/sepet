export type Vec = [number, number]

export interface Frame {
  x: number
  y: number
  w: number
  h: number
}

/** Tuvalin tamamı; kapakta çerçeve yok. */
export const canvasFrame = (width: number, height: number): Frame => ({
  x: 0,
  y: 0,
  w: width,
  h: height,
})

export const fmt = (n: number) => {
  const r = Math.round(n * 10) / 10
  return Object.is(r, -0) ? "0" : String(r)
}

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
