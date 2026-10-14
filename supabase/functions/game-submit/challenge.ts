// Weekly Shadow Challenge definitions: derived only from the ISO week id, so every server
// instance creates the same challenge for the same week.
import { EQUIPMENT, MEDIUM_CODE, STARTER, STRAINS } from '../../../shared/game/content/catalog.ts'
import { nextRandom } from '../../../shared/game/rng.ts'
import type { ChallengeDef, Medium } from '../../../shared/game/types.ts'

export const WEEK_ID = /^(\d{4})-W(\d{2})$/
const DAY_MS = 86_400_000
/** strains a beginner can already grow; autos keep the run inside one week */
const MAX_STRAIN_LEVEL = 5
const MEDIUM_OF = Object.fromEntries(Object.entries(MEDIUM_CODE).map(([m, code]) => [code, m])) as Record<number, Medium>

/** ISO 8601 week of a UTC instant, e.g. 2026-W42, with its Monday 00:00 UTC start. */
export function isoWeek(ms: number): { id: string, startsAt: number, endsAt: number } {
  const d = new Date(ms)
  const day = (d.getUTCDay() + 6) % 7
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - day * DAY_MS
  const thursday = new Date(monday + 3 * DAY_MS)
  const year = thursday.getUTCFullYear()
  const week = 1 + Math.floor((thursday.getTime() - Date.UTC(year, 0, 1)) / DAY_MS / 7)
  return { id: `${year}-W${String(week).padStart(2, '0')}`, startsAt: monday, endsAt: monday + 7 * DAY_MS }
}

/** FNV-1a, 32 bit, unsigned. */
export function hashSeed(text: string): number {
  let h = 0x811C9DC5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function challengeForWeek(weekId: string): ChallengeDef {
  let rng = hashSeed(`shadow-grow:${weekId}`)
  const next = () => {
    const [v, s] = nextRandom(rng)
    rng = s
    return v
  }
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)]!
  const pool = STRAINS.filter(s => s.unlockLevel <= MAX_STRAIN_LEVEL)
  const autos = pool.filter(s => s.genome.kind === 'auto')
  const strain = (autos.length ? autos : pool).length ? pick(autos.length ? autos : pool) : null
  // the pot is part of the gear: sowing needs a matching one
  const pots = EQUIPMENT.filter(e => e.slot === 'pot' && e.unlockLevel <= MAX_STRAIN_LEVEL && e.stats.liters! >= 11 && MEDIUM_OF[e.stats.medium ?? 0])
  const pot = pots.length ? pick(pots) : null
  return {
    id: weekId,
    week: weekId,
    seed: hashSeed(`seed:${weekId}`),
    strainId: strain?.id ?? STARTER.strainId,
    medium: pot ? MEDIUM_OF[pot.stats.medium ?? 0]! : 'soil',
    potL: pot?.stats.liters ?? 11,
    tentItem: STARTER.tentItem,
    light: STARTER.light,
    gear: [...STARTER.gear, ...(pot ? [pot.id] : [])],
    startCoins: STARTER.coins,
    eventsSeed: hashSeed(`events:${weekId}`)
  }
}
