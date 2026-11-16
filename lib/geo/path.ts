export type LatLngTuple = [number, number]

/** Her noktaya kadar birikmiş uzunluk; boylam enleme göre ölçeklenir. */
export function cumulativeLengths(path: LatLngTuple[]): number[] {
  const k = Math.cos(((path[0]?.[0] ?? 0) * Math.PI) / 180)
  const out = [0]
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1], path[i]]
    out.push(out[i - 1] + Math.hypot(b[0] - a[0], (b[1] - a[1]) * k))
  }
  return out
}

/** Yolun başından `fraction` kadarı; son nokta kesilen kenarın üstündedir. */
export function pathUntil(
  path: LatLngTuple[],
  cum: number[],
  fraction: number,
): LatLngTuple[] {
  const total = cum[cum.length - 1] ?? 0
  if (fraction >= 1 || total === 0) return path
  if (fraction <= 0) return []
  const d = total * fraction
  let i = 1
  while (i < cum.length - 1 && cum[i] < d) i++
  const seg = cum[i] - cum[i - 1]
  const t = seg ? (d - cum[i - 1]) / seg : 0
  const [a, b] = [path[i - 1], path[i]]
  return [...path.slice(0, i), [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]]
}

/** a'dan b'ye hafif kavisli yol (ikinci derece Bézier); boylam enleme göre ölçeklenir. */
export function curveBetween(
  a: LatLngTuple,
  b: LatLngTuple,
  bend = 0.3,
  steps = 16,
): LatLngTuple[] {
  const k = Math.cos((a[0] * Math.PI) / 180) || 1
  const [ax, ay, bx, by] = [a[1] * k, a[0], b[1] * k, b[0]]
  const cx = (ax + bx) / 2 - (by - ay) * bend
  const cy = (ay + by) / 2 + (bx - ax) * bend
  const out: LatLngTuple[] = [a]
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push([u * u * ay + 2 * u * t * cy + t * t * by, (u * u * ax + 2 * u * t * cx + t * t * bx) / k])
  }
  out.push(b)
  return out
}

export const pointAt =(path: LatLngTuple[], cum: number[], fraction: number) =>
  pathUntil(path, cum, fraction).at(-1) ?? path[0]
