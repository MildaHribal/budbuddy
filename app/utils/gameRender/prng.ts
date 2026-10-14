// Deterministic PRNG (mulberry32); the renderer never touches Math.random.
export type Rng = {
  (): number
  range: (lo: number, hi: number) => number
  pick: <T>(arr: readonly T[]) => T
  int: (lo: number, hi: number) => number
}

export function makeRng(seed: number): Rng {
  let a = (seed >>> 0) || 0x9e3779b9
  const next = () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const rng = next as Rng
  rng.range = (lo, hi) => lo + (hi - lo) * next()
  rng.pick = arr => arr[Math.floor(next() * arr.length)]!
  rng.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1))
  return rng
}

/** Sub-stream so symbol generation does not disturb the layout stream. */
export function hashSeed(seed: number, ...parts: (number | string)[]): number {
  let h = (seed ^ 0x85ebca6b) >>> 0
  for (const p of parts) {
    const s = String(p)
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
    }
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  }
  return h >>> 0
}
