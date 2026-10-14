import type { HarvestRating, HarvestScoreKey, JournalEntry, Plant } from '../types/grow'
import { daysBetween } from './date'

// Stars come from the AI's look at the buds; points add what the journal can prove (yield, care, cure).

export const SCORE_KEYS: HarvestScoreKey[] = ['structure', 'frost', 'trimCure', 'health']
const WEIGHTS: Record<HarvestScoreKey, number> = { structure: 0.3, frost: 0.3, trimCure: 0.2, health: 0.2 }

export function overallScore(scores: Record<HarvestScoreKey, number>): number {
  return Math.round(SCORE_KEYS.reduce((s, k) => s + scores[k] * WEIGHTS[k], 0) * 10) / 10
}

export function starsFor(overall: number): number {
  if (overall >= 8.5) return 5
  if (overall >= 7) return 4
  if (overall >= 5.5) return 3
  if (overall >= 4) return 2
  return 1
}

/** "11 L", "3 gal" → litres */
export function potLitres(potSize: string): number | null {
  const m = potSize.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(l|litre|liter|gal)/i)
  if (!m) return null
  const n = Number(m[1])
  return /gal/i.test(m[2]!) ? n * 3.785 : n
}

export interface Bonus { key: string, points: number }

export function harvestBonuses(plant: Plant, entries: readonly JournalEntry[], today: string): Bonus[] {
  const out: Bonus[] = []
  const dry = plant.harvest?.dryWeight ?? null
  if (dry != null && dry > 0) {
    out.push({ key: 'weighed', points: 10 })
    const yieldPts = dry >= 150 ? 40 : dry >= 80 ? 25 : dry >= 30 ? 10 : 0
    if (yieldPts) out.push({ key: 'yield', points: yieldPts })
    const litres = potLitres(plant.potSize)
    if (litres) {
      const perL = dry / litres
      const eff = perL >= 10 ? 15 : perL >= 6 ? 8 : 0
      if (eff) out.push({ key: 'efficiency', points: eff })
    }
  }
  const logged = entries.filter(e => e.type !== 'stage' && e.type !== 'harvest').length
  if (logged >= 15) out.push({ key: 'journal', points: 15 })
  else if (logged >= 6) out.push({ key: 'journal', points: 8 })
  const photos = entries.reduce((n, e) => n + e.photoIds.length, 0)
  if (photos >= 6) out.push({ key: 'photos', points: 10 })
  const cureStart = plant.stageHistory.findLast(h => h.stage === 'curing')?.date
  if (cureStart && daysBetween(cureStart, today) >= 14) out.push({ key: 'cured', points: 10 })
  return out
}

/** Final rating from the AI scores and the journal. */
export function scoreHarvest(
  plant: Plant,
  entries: readonly JournalEntry[],
  ai: Pick<HarvestRating, 'scores' | 'summary' | 'good' | 'improve'>,
  extra: Pick<HarvestRating, 'photoIds' | 'aroma'>,
  today: string,
  now = new Date()
): HarvestRating {
  const overall = overallScore(ai.scores)
  const bonuses = harvestBonuses(plant, entries, today)
  return {
    ratedAt: now.toISOString(),
    photoIds: extra.photoIds,
    scores: ai.scores,
    aroma: extra.aroma,
    stars: starsFor(overall),
    points: Math.round(overall * 10) + bonuses.reduce((s, b) => s + b.points, 0),
    bonuses,
    summary: ai.summary,
    good: ai.good,
    improve: ai.improve
  }
}

/** Points over all rated harvests in the garden. */
export function totalHarvestPoints(plants: readonly Plant[]): { points: number, rated: number } {
  const rated = plants.filter(p => p.harvest?.rating)
  return { points: rated.reduce((s, p) => s + p.harvest!.rating!.points, 0), rated: rated.length }
}
