import type { L10n } from '../../types.ts'

export const MAX_LEVEL = 20

/** Total xp needed to reach `level` (level 1 = 0 xp). */
export function xpForLevel(level: number): number {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)))
  return l === 1 ? 0 : Math.round((100 * (l - 1) ** 1.5) / 10) * 10
}

export function levelForXp(xp: number): number {
  let level = 1
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++
  return level
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Coins for one harvested plant. Price per gram grows with the square of quality (0..100). */
export function harvestCoins(dryG: number, quality: number): number {
  const q = clamp(quality, 0, 100) / 100
  return Math.round(Math.max(0, dryG) * (1.2 + 3.8 * q * q))
}

/** Xp for one harvested plant. */
export function harvestXp(dryG: number, quality: number): number {
  if (dryG <= 0) return 0
  return Math.round(30 + 0.5 * dryG + clamp(quality, 0, 100))
}

/** Correct diagnosis pays once per problem instance; wrong guesses cost a little xp. */
export const DIAGNOSIS_REWARD = { coins: 10, xp: 15, wrongXp: -5 }

/** Bonus for a finished real journal grow (>= 28 days of entries, >= 5 own photos), max once per 30 days per tent. */
export const JOURNAL_BONUS = { coins: 150, xp: 100, minDays: 28, minPhotos: 5, cooldownDays: 30 }

export interface RandomEventDef {
  kind: 'power-cut' | 'heatwave' | 'cold-snap' | 'pest-hitchhiker' | 'humidity-spike'
  /** chance per game day (1 game day = 20 real minutes) */
  chancePerDay: number
  minLevel: number
  text: L10n
  /** game hours the event lasts (0 = instant) */
  durationH?: number
  /** °C for heat/cold, RH points for humidity */
  magnitude?: number
}

export const RANDOM_EVENTS: RandomEventDef[] = [
  {
    kind: 'power-cut', chancePerDay: 0.003, minLevel: 2, durationH: 6,
    text: { en: 'Power cut. Lamp, fans and climate gear are off until it comes back.', cs: 'Výpadek proudu. Lampa, ventilátory i klima stojí, dokud se proud nevrátí.' }
  },
  {
    kind: 'heatwave', chancePerDay: 0.005, minLevel: 3, durationH: 72, magnitude: 6,
    text: { en: 'Heatwave outside. The room runs several degrees warmer for a few days.', cs: 'Venku jsou vedra. Místnost bude pár dní o několik stupňů teplejší.' }
  },
  {
    kind: 'cold-snap', chancePerDay: 0.004, minLevel: 3, durationH: 48, magnitude: -7,
    text: { en: 'Cold snap. Nights in the room drop well below normal.', cs: 'Přišla zima. Noci v místnosti jsou mnohem chladnější než obvykle.' }
  },
  {
    kind: 'pest-hitchhiker', chancePerDay: 0.003, minLevel: 4, durationH: 0,
    text: { en: 'Something came in on your clothes. Check the leaf undersides over the next days.', cs: 'Něco se dostalo dovnitř na oblečení. Příští dny kontroluj spodní strany listů.' }
  },
  {
    kind: 'humidity-spike', chancePerDay: 0.005, minLevel: 2, durationH: 36, magnitude: 15,
    text: { en: 'Rainy days. Room humidity is much higher than usual.', cs: 'Deštivé dny. Vlhkost v místnosti je mnohem vyšší než obvykle.' }
  }
]
