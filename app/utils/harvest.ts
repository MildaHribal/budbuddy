import type { Plant } from '../types/grow'
import { addDays, daysBetween, todayISO } from './date'
import { stageStartDate } from './stages'

/** Typical flowering length for photoperiods, in days from the flip. */
export const PHOTO_FLOWER_DAYS: [number, number] = [56, 70]
/** Typical seed-to-harvest age for autoflowers, in days. */
export const AUTO_TOTAL_DAYS: [number, number] = [63, 77]

export interface HarvestEstimate {
  /** flowering start (YYYY-MM-DD) */
  start: string
  /** earliest / latest likely harvest day */
  from: string
  to: string
  /** days from today, never negative */
  inMin: number
  inMax: number
  /** 0–1: today within start → to */
  position: number
  /** 0–1: where the window opens within start → to */
  windowStart: number
  status: 'ahead' | 'window' | 'past'
}

export function harvestEstimate(
  plant: Pick<Plant, 'stage' | 'type' | 'startDate' | 'stageHistory' | 'archived'>,
  today = todayISO()
): HarvestEstimate | null {
  if (plant.archived || plant.stage !== 'flowering') return null
  const start = stageStartDate(plant)
  const auto = plant.type === 'autoflower'
  const base = auto ? plant.startDate : start
  const [lo, hi] = auto ? AUTO_TOTAL_DAYS : PHOTO_FLOWER_DAYS
  // an auto flipped late still needs a few weeks of bloom
  let from = addDays(base, lo)
  let to = addDays(base, hi)
  if (auto && daysBetween(start, from) < 28) {
    from = addDays(start, 28)
    to = addDays(start, 28 + (hi - lo))
  }
  const span = Math.max(1, daysBetween(start, to))
  const inMin = Math.max(0, daysBetween(today, from))
  const inMax = Math.max(0, daysBetween(today, to))
  return {
    start,
    from,
    to,
    inMin,
    inMax,
    position: Math.min(1, Math.max(0, daysBetween(start, today) / span)),
    windowStart: Math.min(1, Math.max(0, daysBetween(start, from) / span)),
    status: today > to ? 'past' : today >= from ? 'window' : 'ahead'
  }
}
