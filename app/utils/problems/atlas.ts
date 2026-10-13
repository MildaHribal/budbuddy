// UI helpers for the problem atlas: categories, symptom checker, treatment templates.
import type { StageId } from '../../types/grow'
import type { IssueId } from '../treatment'
import type { Problem, ProblemArea, ProblemCategory } from './types'

export const CATEGORIES: ProblemCategory[] = ['nutrient', 'water', 'light', 'climate', 'pest', 'disease', 'plant']

export const CATEGORY_META: Record<ProblemCategory, { glyph: string, tone: string }> = {
  nutrient: { glyph: 'feed', tone: '#b58cf5' },
  water: { glyph: 'water', tone: 'var(--blue)' },
  light: { glyph: 'lamp', tone: 'var(--amber)' },
  climate: { glyph: 'i-tabler-temperature', tone: '#5fd9c4' },
  pest: { glyph: 'pest', tone: '#f0905a' },
  disease: { glyph: 'i-tabler-virus', tone: '#d9a06a' },
  plant: { glyph: 'vegetative', tone: 'var(--green)' }
}

export const SEVERITY_TONE: Record<Problem['severity'], string> = {
  low: '#8fd97a',
  medium: 'var(--amber)',
  high: 'var(--red)'
}

const SEVERITY_RANK: Record<Problem['severity'], number> = { high: 0, medium: 1, low: 2 }

/** Checker choices; soil and roots are one question for the grower. */
export const CHECK_AREAS: { id: string, areas: ProblemArea[] }[] = [
  { id: 'old-leaves', areas: ['old-leaves'] },
  { id: 'new-leaves', areas: ['new-leaves'] },
  { id: 'leaf-tips', areas: ['leaf-tips'] },
  { id: 'underside', areas: ['underside'] },
  { id: 'top-canopy', areas: ['top-canopy'] },
  { id: 'whole-plant', areas: ['whole-plant'] },
  { id: 'buds', areas: ['buds'] },
  { id: 'stems', areas: ['stems'] },
  { id: 'soil', areas: ['soil', 'roots'] }
]

export const CHECK_STAGES: StageId[] = ['seedling', 'vegetative', 'flowering', 'drying']

/**
 * Problems that start in one of `areas` and occur in `stage` (null = any stage), best match first:
 * the area listed first in the problem, then a stage the problem names, then severity.
 */
export function matchProblems(problems: readonly Problem[], areas: readonly ProblemArea[], stage: StageId | null = null): Problem[] {
  return problems
    .filter(p => p.areas.some(a => areas.includes(a)) && (!stage || !p.stages.length || p.stages.includes(stage)))
    .map((p) => {
      const at = p.areas.findIndex(a => areas.includes(a))
      const score = (at === 0 ? 4 : at === 1 ? 2 : 1) + (stage && p.stages.includes(stage) ? 1 : 0)
      return { p, score }
    })
    .sort((a, b) => b.score - a.score || SEVERITY_RANK[a.p.severity] - SEVERITY_RANK[b.p.severity] || a.p.name.localeCompare(b.p.name))
    .map(x => x.p)
}

const fold = (v: string) => v.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

/** Text search over name, other names, summary and symptoms. */
export function searchProblems(problems: readonly Problem[], query: string): Problem[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return [...problems]
  return problems.filter((p) => {
    const hay = fold([p.name, ...(p.aka ?? []), p.summary, ...p.symptoms].join(' '))
    return words.every(w => hay.includes(w))
  })
}

/** Problems that have a treatment plan template. */
export const TREATMENT_FOR: Record<string, IssueId> = {
  n_def: 'nitrogen',
  ca_def: 'calcium',
  mg_def: 'magnesium',
  overwatering: 'overwatering',
  light_burn: 'lightBurn',
  nutrient_burn: 'nutrientBurn',
  spider_mites: 'spiderMites',
  fungus_gnats: 'fungusGnats',
  powdery_mildew: 'powderyMildew',
  botrytis: 'budRot'
}
