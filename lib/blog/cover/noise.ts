// 2B simplex gürültüsü (Ashima Arts GLSL uygulamasının karşılığı) ve fBm.
// Pürüzlü kenarı ve kıvrımı üretir; tohum koordinata eklenen bir kaydırma.

const C0 = 0.211324865405187 // (3 - √3) / 6
const C1 = 0.366025403784439 // (√3 - 1) / 2
const C2 = -0.577350269189626 // -1 + 2 * C0
const C3 = 0.024390243902439 // 1 / 41

const mod289 = (x: number) => x - Math.floor(x / 289) * 289
const permute = (x: number) => mod289((x * 34 + 1) * x)
const fract = (x: number) => x - Math.floor(x)

export function snoise(vx: number, vy: number): number {
  const s = (vx + vy) * C1
  let ix = Math.floor(vx + s)
  let iy = Math.floor(vy + s)
  const t = (ix + iy) * C0
  const x0x = vx - ix + t
  const x0y = vy - iy + t
  const i1x = x0x > x0y ? 1 : 0
  const i1y = 1 - i1x
  const x1x = x0x + C0 - i1x
  const x1y = x0y + C0 - i1y
  const x2x = x0x + C2
  const x2y = x0y + C2
  ix = mod289(ix)
  iy = mod289(iy)
  const p0 = permute(permute(iy) + ix)
  const p1 = permute(permute(iy + i1y) + ix + i1x)
  const p2 = permute(permute(iy + 1) + ix + 1)
  let m0 = Math.max(0.5 - (x0x * x0x + x0y * x0y), 0)
  let m1 = Math.max(0.5 - (x1x * x1x + x1y * x1y), 0)
  let m2 = Math.max(0.5 - (x2x * x2x + x2y * x2y), 0)
  m0 *= m0 * m0 * m0
  m1 *= m1 * m1 * m1
  m2 *= m2 * m2 * m2
  return (
    130 *
    (grad(p0, m0, x0x, x0y) + grad(p1, m1, x1x, x1y) + grad(p2, m2, x2x, x2y))
  )
}

function grad(p: number, m: number, x: number, y: number): number {
  if (m === 0) return 0
  const gx = 2 * fract(p * C3) - 1
  const h = Math.abs(gx) - 0.5
  const a0 = gx - Math.floor(gx + 0.5)
  return (
    m *
    (1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h)) *
    (a0 * x + h * y)
  )
}

/** 4 oktav: frekans 2,07 kat artar, genlik yarıya iner. */
export function fbm(x: number, y: number): number {
  let s = 0
  let a = 0.5
  for (let i = 0; i < 4; i++) {
    s += a * snoise(x, y)
    x = x * 2.07 + 13.7
    y = y * 2.07 + 7.3
    a *= 0.5
  }
  return s
}
