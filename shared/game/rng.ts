/** mulberry32: returns [0..1) and the next state. */
export function nextRandom(state: number): [number, number] {
  const next = (state + 0x6D2B79F5) | 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** Random source that advances `holder.rng` so the sequence survives save/load. */
export function makeRand(holder: { rng: number }): () => number {
  return () => {
    const [v, s] = nextRandom(holder.rng)
    holder.rng = s
    return v
  }
}
