import type { ProblemId, ProblemPresentation, ProblemRule } from '../types.ts'
import { ENVIRONMENT_RULES, NUTRIENT_RULES } from './problems/rules-plant.ts'
import { DISEASE_RULES, PEST_RULES } from './problems/rules-pests.ts'
import { PLANT_PRESENTATION } from './problems/presentation-plant.ts'
import { PEST_PRESENTATION } from './problems/presentation-pests.ts'

export { PROBLEM_TREATMENTS } from './problems/treatments.ts'
export { MAX_RATE_EARLY, MAX_RATE_LATE, PHASES, SEED_LOAD } from './problems/core.ts'

export const PROBLEM_RULES: ProblemRule[] = [...NUTRIENT_RULES, ...ENVIRONMENT_RULES, ...PEST_RULES, ...DISEASE_RULES]

export const PROBLEM_PRESENTATION: Partial<Record<ProblemId, ProblemPresentation>>
  = Object.fromEntries([...PLANT_PRESENTATION, ...PEST_PRESENTATION].map(p => [p.id, p]))
