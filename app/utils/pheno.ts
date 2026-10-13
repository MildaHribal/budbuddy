import type { PhenoCandidate, PhenoCriterion, PhenoHunt, Plant } from '../types/grow'
import { daysBetween } from './date'
import { createId } from './id'

export const PHENO_CRITERIA: PhenoCriterion[] = ['vigour', 'structure', 'smell', 'resin', 'yield', 'resistance']

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const score = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : null
}
const weight = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 && n <= 3 ? Math.round(n) : null
}

function normalizeCandidate(raw: Record<string, unknown>, i: number): PhenoCandidate {
  const scores: PhenoCandidate['scores'] = {}
  const r = (raw.scores ?? {}) as Record<string, unknown>
  for (const c of PHENO_CRITERIA) {
    const s = score(r[c])
    if (s !== null) scores[c] = s
  }
  return {
    plantId: String(raw.plantId ?? ''),
    tag: str(raw.tag).trim().slice(0, 12) || `#${i + 1}`,
    scores,
    notes: str(raw.notes).slice(0, 1000)
  }
}

/** Drops candidates whose plant no longer exists. */
export function normalizeHunt(raw: Record<string, unknown>, plantIds: Set<string>): PhenoHunt {
  const now = new Date().toISOString()
  const list = Array.isArray(raw.candidates) ? raw.candidates.filter((c): c is Record<string, unknown> => !!c && typeof c === 'object') : []
  const seen = new Set<string>()
  const candidates = list.map(normalizeCandidate).filter((c) => {
    if (!plantIds.has(c.plantId) || seen.has(c.plantId)) return false
    seen.add(c.plantId)
    return true
  })
  const w = (raw.weights ?? {}) as Record<string, unknown>
  const weights: PhenoHunt['weights'] = {}
  for (const c of PHENO_CRITERIA) {
    const v = weight(w[c])
    if (v !== null && v !== 1) weights[c] = v
  }
  const k = raw.keeper as Record<string, unknown> | null | undefined
  const keeper = k && typeof k === 'object' && seen.has(String(k.plantId))
    ? { plantId: String(k.plantId), role: k.role === 'clone' ? 'clone' as const : 'mother' as const }
    : null
  return {
    id: str(raw.id) || createId(),
    name: str(raw.name).trim().slice(0, 60) || 'Pheno hunt',
    strain: str(raw.strain).trim().slice(0, 60),
    source: str(raw.source).trim().slice(0, 80),
    candidates,
    weights,
    keeper,
    done: raw.done === true,
    notes: str(raw.notes).slice(0, 1000),
    createdAt: str(raw.createdAt) || now,
    updatedAt: str(raw.updatedAt) || now
  }
}

export const criterionWeight = (hunt: Pick<PhenoHunt, 'weights'>, c: PhenoCriterion) => hunt.weights[c] ?? 1

/** Weighted mean of the scored criteria (1–5), null until something is scored. */
export function candidateScore(c: Pick<PhenoCandidate, 'scores'>, hunt: Pick<PhenoHunt, 'weights'>): number | null {
  let sum = 0
  let total = 0
  for (const k of PHENO_CRITERIA) {
    const s = c.scores[k]
    const w = criterionWeight(hunt, k)
    if (s == null || !w) continue
    sum += s * w
    total += w
  }
  return total ? Math.round((sum / total) * 10) / 10 : null
}

/** Share of weighted criteria that have a score, 0–1. */
export function scoredShare(c: Pick<PhenoCandidate, 'scores'>, hunt: Pick<PhenoHunt, 'weights'>): number {
  const active = PHENO_CRITERIA.filter(k => criterionWeight(hunt, k) > 0)
  if (!active.length) return 0
  return active.filter(k => c.scores[k] != null).length / active.length
}

export interface RankedCandidate {
  candidate: PhenoCandidate
  score: number | null
  rank: number | null
}

/** Best first; unscored candidates go last in their original order. Ties share a rank. */
export function rankCandidates(hunt: Pick<PhenoHunt, 'candidates' | 'weights'>): RankedCandidate[] {
  const rows = hunt.candidates.map((candidate, i) => ({ candidate, score: candidateScore(candidate, hunt), i }))
  rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.i - b.i)
  let rank = 0
  let prev: number | null = null
  return rows.map((r, idx) => {
    if (r.score !== null && r.score !== prev) rank = idx + 1
    prev = r.score
    return { candidate: r.candidate, score: r.score, rank: r.score === null ? null : rank }
  })
}

/** Highest score per criterion across candidates (for highlighting the column winner). */
export function bestPerCriterion(hunt: Pick<PhenoHunt, 'candidates'>): Partial<Record<PhenoCriterion, number>> {
  const best: Partial<Record<PhenoCriterion, number>> = {}
  for (const c of hunt.candidates) {
    for (const k of PHENO_CRITERIA) {
      const s = c.scores[k]
      if (s != null && s > (best[k] ?? 0)) best[k] = s
    }
  }
  return best
}

/** Days from the switch to flower until harvest (or today while still flowering). */
export function floweringDays(plant: Pick<Plant, 'stageHistory' | 'harvest'>, today: string): number | null {
  const start = plant.stageHistory.find(h => h.stage === 'flowering')?.date
  if (!start) return null
  const end = plant.harvest?.date ?? today
  return Math.max(0, daysBetween(start, end))
}

/** Plants that look like one seed pack: same strain (case-insensitive), not archived first. */
export function sameStrain<P extends Pick<Plant, 'strain'>>(plants: readonly P[], strain: string): P[] {
  const s = strain.trim().toLowerCase()
  return s ? plants.filter(p => p.strain.trim().toLowerCase() === s) : []
}

export function nextTag(hunt: Pick<PhenoHunt, 'candidates'>): string {
  const used = new Set(hunt.candidates.map(c => c.tag))
  let n = hunt.candidates.length + 1
  while (used.has(`#${n}`)) n++
  return `#${n}`
}
