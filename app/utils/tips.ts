import type { StageId } from '../types/grow'

export type TipGroupId = 'seedling' | 'veg' | 'flower' | 'cure'

/** `stage` picks the glyph and colour shown for the group. */
export interface TipGroup { id: TipGroupId, stages: StageId[], stage: StageId }

export const TIP_GROUPS: TipGroup[] = [
  { id: 'seedling', stages: ['germination', 'seedling'], stage: 'seedling' },
  { id: 'veg', stages: ['vegetative'], stage: 'vegetative' },
  { id: 'flower', stages: ['flowering'], stage: 'flowering' },
  { id: 'cure', stages: ['drying', 'curing'], stage: 'curing' }
]

export function isTipGroup(v: unknown): v is TipGroupId {
  return TIP_GROUPS.some(g => g.id === v)
}

export function tipGroupOf(stage: string | null | undefined): TipGroup | null {
  return TIP_GROUPS.find(g => (g.stages as string[]).includes(stage ?? '')) ?? null
}

/** Accepts a group id or a stage id (TopTips links with ?stage=flowering). */
export function parseTipGroup(v: unknown): TipGroupId | null {
  if (isTipGroup(v)) return v
  return typeof v === 'string' ? tipGroupOf(v)?.id ?? null : null
}

/** Symptom chips match keywords in the tip body (tips have no symptom tags). */
export const TIP_SYMPTOMS: Record<string, string[]> = {
  yellowing: ['yellow', 'chlorosis'],
  spots: ['spot', 'rust'],
  burn: ['burn', 'crisp'],
  claw: ['claw'],
  droop: ['droop', 'wilt', 'overwater'],
  curl: ['curl', 'taco'],
  purple: ['purple'],
  pests: ['pest', 'mites', 'gnat', 'thrip', 'aphid'],
  mould: ['mold', 'mould', 'mildew', 'budrot'],
  slow: ['slow', 'stunt']
}
export type TipSymptom = keyof typeof TIP_SYMPTOMS

/** PostgREST or() filter for a symptom's keywords. */
export function symptomFilter(s: string): string | null {
  const words = TIP_SYMPTOMS[s]
  if (!words) return null
  return words.map(w => `body.ilike.*${w.replace(/[^a-z]/gi, '')}*`).join(',')
}

/** Share of growers who voted "helpful", or null without votes. */
export function helpfulShare(up: number, down: number): { pct: number, n: number } | null {
  const n = up + down
  return n > 0 ? { pct: Math.round((up / n) * 100), n } : null
}
