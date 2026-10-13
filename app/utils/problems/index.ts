import { NUTRIENT_PROBLEMS } from './nutrients'
import { GROW_PROBLEMS } from './environment'
import { PEST_PROBLEMS } from './pests'
import type { Problem } from './types'

export * from './types'

export const PROBLEMS: Problem[] = [...NUTRIENT_PROBLEMS, ...GROW_PROBLEMS, ...PEST_PROBLEMS]

const byId = new Map(PROBLEMS.map(p => [p.id, p]))
export const getProblem = (id: string) => byId.get(id)
