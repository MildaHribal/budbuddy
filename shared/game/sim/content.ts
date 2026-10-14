import * as catalog from '../content/catalog.ts'
import type { RandomEventDef } from '../content/catalog.ts'
import { PROBLEM_PRESENTATION, PROBLEM_RULES } from '../content/problems.ts'
import type { EquipmentDef, GameState, ProblemId, ProblemPresentation, ProblemRule, ProductDef, StrainDef, TreatmentDef } from '../types.ts'

export interface SimContent {
  strains: StrainDef[]
  equipment: EquipmentDef[]
  products: ProductDef[]
  treatments: TreatmentDef[]
  scannerPrice: number
  starter: typeof catalog.STARTER
  levelForXp: (xp: number) => number
  randomEvents: RandomEventDef[]
  rules: ProblemRule[]
  presentation: Partial<Record<ProblemId, ProblemPresentation>>
}

let override: Partial<SimContent> = {}

/** Replace parts of the content (tests, dev tools). Pass {} to go back to the real catalog. */
export function setSimContent(c: Partial<SimContent>): void {
  override = c
}

export function content(): SimContent {
  return {
    strains: override.strains ?? catalog.STRAINS,
    equipment: override.equipment ?? catalog.EQUIPMENT,
    products: override.products ?? catalog.PRODUCTS,
    treatments: override.treatments ?? catalog.TREATMENTS,
    scannerPrice: override.scannerPrice ?? catalog.SCANNER_PRICE,
    starter: override.starter ?? catalog.STARTER,
    levelForXp: override.levelForXp ?? catalog.levelForXp,
    randomEvents: override.randomEvents ?? catalog.RANDOM_EVENTS,
    rules: override.rules ?? PROBLEM_RULES,
    presentation: override.presentation ?? PROBLEM_PRESENTATION
  }
}

const maps = new WeakMap<object, Map<string, unknown>>()
function byId<T extends { id: string }>(list: T[], id: string): T | undefined {
  let m = maps.get(list) as Map<string, T> | undefined
  if (!m || m.size !== list.length) {
    m = new Map(list.map(x => [x.id, x]))
    maps.set(list, m)
  }
  return m.get(id)
}

export const rules = (): ProblemRule[] => override.rules ?? PROBLEM_RULES
export const randomEvents = (): RandomEventDef[] => override.randomEvents ?? catalog.RANDOM_EVENTS
export const presentation = (): Partial<Record<ProblemId, ProblemPresentation>> => override.presentation ?? PROBLEM_PRESENTATION
export const equipmentDef = (id: string | null | undefined): EquipmentDef | undefined => id ? byId(override.equipment ?? catalog.EQUIPMENT, id) : undefined
export const productDef = (id: string): ProductDef | undefined => byId(override.products ?? catalog.PRODUCTS, id)
export const treatmentDef = (id: string): TreatmentDef | undefined => byId(override.treatments ?? catalog.TREATMENTS, id)
export const ruleDef = (id: ProblemId): ProblemRule | undefined => byId(rules(), id)

export function strainDef(state: GameState, id: string): StrainDef | undefined {
  return byId(override.strains ?? catalog.STRAINS, id) ?? state.customStrains.find(s => s.id === id)
}

export function levelFor(xp: number): number {
  return (override.levelForXp ?? catalog.levelForXp)(xp)
}

export const seedKey = (strainId: string): string => `seed:${strainId}`
export const SCANNER_ITEM = 'scanner-credit'
