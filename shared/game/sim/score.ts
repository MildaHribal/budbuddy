import type { DryBatch, GameState, HarvestResult, PlantSim, ProblemId } from '../types.ts'
import { scoreCure } from '../drying.ts'
import { harvestCoins, harvestXp } from '../content/catalog.ts'
import { flowerProgress } from './plant.ts'

const W = { yield: 0.25, density: 0.15, terpenes: 0.15, cleanliness: 0.2, ripeness: 0.15, cure: 0.1 }

/**
 * Score by flowering progress at harvest. The plateau is wider than in a real garden (about two weeks of
 * game time) so a player checking in a few times a real day can hit it.
 */
const RIPE_CURVE: [number, number][] = [[0.5, 0.05], [0.8, 0.55], [0.9, 0.92], [0.93, 1], [1.3, 1], [1.45, 0.85], [1.7, 0.5], [2, 0.3]]

export function ripenessScore(fp: number): number {
  if (fp <= (RIPE_CURVE[0] as [number, number])[0]) return 0.05
  for (let i = 1; i < RIPE_CURVE.length; i++) {
    const [x1, y1] = RIPE_CURVE[i] as [number, number]
    const [x0, y0] = RIPE_CURVE[i - 1] as [number, number]
    if (fp <= x1) return y0 + ((fp - x0) / (x1 - x0)) * (y1 - y0)
  }
  return 0.3
}

/** problems that leave something in or on the buds at harvest */
const ON_BUDS = new Set<ProblemId>(['botrytis', 'powdery_mildew', 'caterpillars', 'spider_mites', 'whiteflies', 'aphids', 'mealybugs', 'russet_broad_mites', 'thrips', 'septoria'])

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))
const pct = (x: number): number => Math.round(clamp01(x) * 100)

/** Grams of dried bud a harvest yields. */
export function harvestGrams(p: PlantSim): number {
  return Math.max(0, p.budMass * (1 - 0.5 * p.damage))
}

/** Harvest result with every part but the cure (cure = 0.5 placeholder until finalized). */
export function draftResult(state: GameState, p: PlantSim): HarvestResult {
  const fp = flowerProgress(p, state.nowH) ?? 0
  const dryG = harvestGrams(p)
  const ideal = p.ideal?.bud ?? 0
  const acc = p.acc ?? { flowerH: 0, density: 0, terp: 0 }
  const fh = Math.max(1, acc.flowerH)
  let sev = 0
  for (const pr of p.problems) if (ON_BUDS.has(pr.id)) sev += pr.severity
  const rot = p.problems.find(x => x.id === 'botrytis')?.severity ?? 0
  const r: HarvestResult = {
    plantId: p.id,
    strainId: p.strainId,
    dryG: Math.round(dryG * 10) / 10,
    quality: 0,
    breakdown: {
      yield: pct(ideal > 0 ? dryG / ideal : 0),
      density: pct(acc.flowerH > 0 ? acc.density / fh : 0),
      terpenes: pct((acc.flowerH > 0 ? acc.terp / fh : 0) * (0.75 + 0.25 * p.genome.terpenes)),
      cleanliness: pct(1 - p.damage * 1.2 - sev * 0.5 - rot * 0.5 - (p.hermed ? 0.35 : 0)),
      ripeness: pct(ripenessScore(fp)),
      cure: 50
    },
    coins: 0,
    xp: 0,
    atH: state.nowH
  }
  if (p.label) r.label = p.label
  return finalizeScore(r, 0.5)
}

/** Fills quality, coins and xp for a cure score 0..1. */
export function finalizeScore(r: HarvestResult, cure: number): HarvestResult {
  const b = r.breakdown
  b.cure = pct(cure)
  const q = W.yield * b.yield + W.density * b.density + W.terpenes * b.terpenes + W.cleanliness * b.cleanliness + W.ripeness * b.ripeness + W.cure * b.cure
  r.quality = Math.round(q)
  r.coins = harvestCoins(r.dryG, r.quality)
  r.xp = harvestXp(r.dryG, r.quality)
  return r
}

export const cureScore = (batch: DryBatch | undefined, jar: Parameters<typeof scoreCure>[1]): number =>
  batch ? clamp01(scoreCure(batch, jar)) : 0.5
