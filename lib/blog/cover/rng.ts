// Tohumlu sözde rastgele sayı üreteci. Kapakların tek rastgelelik kaynağı.

export function hash32(input: string): number {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h1 ^ h2) >>> 0
}

/** mulberry32. `fork` bağımsız alt akış açar: palet kararı, desen kararını kaydırmaz. */
export class Rng {
  private state: number
  constructor(readonly key: string) {
    this.state = hash32(key)
  }
  fork(label: string): Rng {
    return new Rng(`${this.key}/${label}`)
  }
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next()
  }
  int(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1))
  }
  chance(p: number): boolean {
    return this.next() < p
  }
  sign(): number {
    return this.next() < 0.5 ? -1 : 1
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }
  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((sum, [, w]) => sum + w, 0)
    let r = this.next() * total
    for (const [value, w] of items) {
      r -= w
      if (r < 0) return value
    }
    return items[items.length - 1][0]
  }
}
