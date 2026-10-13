// Home "coming up": repeating care dates for the next days and the next stage milestones.
import type { Plant, StageId } from '../types/grow'
import { addDays, daysBetween } from './date'
import { harvestEstimate } from './harvest'
import { isGrowing, nextStage, stageInfo, stageStartDate } from './stages'

/** Dates in (today, today + days] for a rhythm that is next due on `next`; overdue rhythms restart from today. */
export function repeatDates(next: string, interval: number, today: string, days: number): string[] {
  if (interval <= 0) return []
  const end = addDays(today, days)
  let d = next <= today ? addDays(today, interval) : next
  const out: string[] = []
  while (d <= end) {
    out.push(d)
    d = addDays(d, interval)
  }
  return out
}

export interface Milestone {
  plantId: string
  kind: 'stage' | 'harvest'
  /** the stage the plant is expected to move to; null for harvest */
  stage: StageId | null
  date: string
  /** days from today, at least 1 */
  inDays: number
}

/** Next expected stage change or harvest window per growing plant, after today and within `horizon` days. */
export function milestones(plants: readonly Plant[], today: string, horizon = 90): Milestone[] {
  const out: Milestone[] = []
  for (const p of plants) {
    if (!isGrowing(p)) continue
    let m: Omit<Milestone, 'inDays'> | null = null
    if (p.stage === 'flowering') {
      const h = harvestEstimate(p, today)
      if (h?.status === 'ahead') m = { plantId: p.id, kind: 'harvest', stage: null, date: h.from }
    } else {
      const next = nextStage(p.stage)
      if (next) m = { plantId: p.id, kind: 'stage', stage: next, date: addDays(stageStartDate(p), stageInfo(p.stage).days) }
    }
    if (!m) continue
    const inDays = daysBetween(today, m.date)
    if (inDays >= 1 && inDays <= horizon) out.push({ ...m, inDays })
  }
  return out.sort((a, b) => a.inDays - b.inDays)
}
