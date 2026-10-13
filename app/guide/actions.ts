import type { EntryType } from '~/types/grow'

export type GuideTool = 'vpd' | 'nutrients' | 'dli' | 'convert' | 'curing' | 'treatment'

/** Ways to put a lesson into practice: open a calculator, log a journal entry, add a plant, update a plant's stage. */
export type GuideAction
  = | { kind: 'tool', tool: GuideTool }
    | { kind: 'log', entry: EntryType }
    | { kind: 'plant' }
    | { kind: 'stage' }

const tool = (t: GuideTool): GuideAction => ({ kind: 'tool', tool: t })
const log = (entry: EntryType): GuideAction => ({ kind: 'log', entry })

const ACTIONS: Record<string, GuideAction[]> = {
  'start-gear': [tool('dli')],
  'start-seeds': [{ kind: 'plant' }],
  'environment-light': [tool('dli')],
  'environment-climate': [tool('vpd'), log('measure')],
  'environment-ready': [log('measure')],
  'media-watering': [log('water')],
  'media-pots': [tool('convert')],
  'germination-planting': [{ kind: 'plant' }],
  'germination-seedling-care': [log('photo')],
  'vegetative-light-climate': [tool('vpd'), tool('dli')],
  'vegetative-watering-feeding': [tool('nutrients'), log('feed')],
  'vegetative-transplanting': [log('note')],
  'vegetative-sexing': [log('photo')],
  'training-lst': [log('train')],
  'training-topping': [log('train')],
  'training-fim': [log('train')],
  'training-scrog': [log('train')],
  'training-defoliation': [log('train')],
  'training-lollipopping': [log('train')],
  'training-supercropping': [log('train')],
  'nutrition-ph-ec': [log('feed')],
  'nutrition-schedule': [tool('nutrients'), log('feed')],
  'nutrition-calmag': [tool('nutrients')],
  'nutrition-overfeeding': [tool('treatment')],
  'nutrition-runoff': [log('water')],
  'nutrition-flush': [log('water')],
  'flowering-flip': [{ kind: 'stage' }],
  'flowering-climate': [tool('vpd'), log('measure')],
  'flowering-when-to-harvest': [log('photo')],
  'harvest-chop-day': [{ kind: 'stage' }],
  'harvest-drying': [tool('curing'), tool('vpd'), { kind: 'stage' }],
  'harvest-curing': [tool('curing'), log('note')],
  'problems-diagnose': [log('photo'), tool('treatment')],
  'problems-deficiencies': [tool('treatment')],
  'problems-burn-lockout': [tool('treatment')],
  'problems-pests': [log('pest'), tool('treatment')],
  'problems-mould': [tool('treatment')]
}

export function lessonActions(lessonId: string): GuideAction[] {
  return ACTIONS[lessonId] ?? []
}

/** Chapter that fits a plant's current stage. */
export const STAGE_CHAPTER: Record<string, string> = {
  germination: 'germination',
  seedling: 'germination',
  vegetative: 'vegetative',
  flowering: 'flowering',
  drying: 'harvest',
  curing: 'harvest'
}
