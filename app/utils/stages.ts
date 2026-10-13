import type { GlyphName } from './glyphs'
import type { HealthLevel, Plant, StageId } from '../types/grow'
import { daysSince, todayISO } from './date'
import { locale } from './locale'

export interface StageInfo {
  id: StageId
  label: string
  /** compact label for tight rails/steppers; the same word family as label */
  short: string
  icon: string
  glyph: GlyphName
  color: string
  /** typical length in days, used for the progress bar */
  days: number
  range: string
  light: string
  description: string
  tips: string[]
}

export const STAGES: StageInfo[] = [
  {
    id: 'germination',
    label: 'Germination',
    short: 'Germ.',
    icon: 'i-tabler-seeding',
    glyph: 'germination',
    color: '#d9c46b',
    days: 7,
    range: '3–10 days',
    light: '18/6 or 24/0, low intensity',
    description: 'The seed cracks open and pushes out its taproot and first round leaves.',
    tips: ['Keep humidity at 70–90 %', 'Temperature 22–25 °C', 'Do not let the medium dry out']
  },
  {
    id: 'seedling',
    label: 'Seedling',
    short: 'Seedling',
    icon: 'i-tabler-plant',
    glyph: 'seedling',
    color: '#8fd97a',
    days: 21,
    range: '2–3 weeks',
    light: '18/6, gentle light',
    description: 'First true serrated leaves appear and the root system establishes.',
    tips: ['Water small amounts around the stem', 'Very light feeding, if any', 'Keep RH around 65–70 %']
  },
  {
    id: 'vegetative',
    label: 'Vegetative',
    short: 'Veg',
    icon: 'i-tabler-trees',
    glyph: 'vegetative',
    color: '#3dd173',
    days: 42,
    range: '3–16 weeks',
    light: '18/6',
    description: 'Rapid growth of stems and leaves. The best time for training.',
    tips: ['Nitrogen-rich feed', 'Top, LST or SCROG now', 'Transplant before roots circle the pot']
  },
  {
    id: 'flowering',
    label: 'Flowering',
    short: 'Flower',
    icon: 'i-tabler-flower',
    glyph: 'flowering',
    color: '#b58cf5',
    days: 63,
    range: '7–11 weeks',
    light: '12/12 (photoperiod)',
    description: 'Buds form and fatten. Watch humidity and trichomes closely.',
    tips: ['Switch to bloom nutrients (P & K)', 'Keep RH 40–50 % to prevent mould', 'Check trichomes from week 6']
  },
  {
    id: 'drying',
    label: 'Drying',
    short: 'Drying',
    icon: 'i-tabler-wind',
    glyph: 'drying',
    color: '#d9a06a',
    days: 10,
    range: '7–14 days',
    light: 'Dark',
    description: 'Harvested branches hang in a dark room until small stems snap.',
    tips: ['18–20 °C and 55–60 % RH', 'Gentle air movement, not on the buds', 'Weigh before and after']
  },
  {
    id: 'curing',
    label: 'Curing',
    short: 'Curing',
    icon: 'i-tabler-bottle',
    glyph: 'curing',
    color: '#f2b544',
    days: 28,
    range: '2–8 weeks',
    light: 'Dark',
    description: 'Buds rest in sealed jars to develop flavour and smoothness.',
    tips: ['Fill jars ~75 %', 'Burp daily during the first week', 'Aim for 58–62 % RH inside the jar']
  }
]

type StageText = Pick<StageInfo, 'label' | 'short' | 'range' | 'light' | 'description' | 'tips'>

const STAGES_CS: Record<StageId, StageText> = {
  germination: {
    label: 'Klíčení',
    short: 'Klíčení',
    range: '3–10 dní',
    light: '18/6 nebo 24/0, slabé světlo',
    description: 'Semínko praskne, vystrčí kořínek a první kulaté lístky.',
    tips: ['Vlhkost drž na 70–90 %', 'Teplota 22–25 °C', 'Substrát nesmí vyschnout']
  },
  seedling: {
    label: 'Sazenice',
    short: 'Sazenice',
    range: '2–3 týdny',
    light: '18/6, jemné světlo',
    description: 'Objevují se první pravé zubaté listy a zakořeňuje se.',
    tips: ['Zalévej po troškách kolem stonku', 'Hnojit jen velmi slabě, nebo vůbec', 'Vzdušná vlhkost kolem 65–70 %']
  },
  vegetative: {
    label: 'Vegetace',
    short: 'Vegetace',
    range: '3–16 týdnů',
    light: '18/6',
    description: 'Rychle přibývají stonky i listy. Nejlepší čas na tvarování.',
    tips: ['Hnojivo bohaté na dusík', 'Teď je čas na topping, LST nebo SCROG', 'Přesaď dřív, než kořeny obkrouží květináč']
  },
  flowering: {
    label: 'Kvetení',
    short: 'Kvetení',
    range: '7–11 týdnů',
    light: '12/12 (fotoperioda)',
    description: 'Tvoří se a nabírají palice. Hlídej vlhkost a trichomy.',
    tips: ['Přejdi na květové hnojivo (P a K)', 'Vlhkost 40–50 %, ať nechytí plíseň', 'Od 6. týdne kontroluj trichomy']
  },
  drying: {
    label: 'Sušení',
    short: 'Sušení',
    range: '7–14 dní',
    light: 'Tma',
    description: 'Sklizené větve visí v temné místnosti, dokud tenké stonky nepraskají.',
    tips: ['18–20 °C a 55–60 % vlhkosti', 'Mírné proudění vzduchu, ne přímo na palice', 'Zvaž před sušením i po něm']
  },
  curing: {
    label: 'Zrání',
    short: 'Zrání',
    range: '2–8 týdnů',
    light: 'Tma',
    description: 'Palice odpočívají v uzavřených sklenicích a získávají chuť i jemnost.',
    tips: ['Sklenice plň zhruba ze 3/4', 'První týden denně větrej', 'Uvnitř sklenice cil na 58–62 % vlhkosti']
  }
}

const BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s])) as Record<StageId, StageInfo>

function localize(s: StageInfo): StageInfo {
  return locale.value === 'cs' ? { ...s, ...STAGES_CS[s.id] } : s
}

/** Localized stage list; STAGES stays the English base. */
export function stages(): StageInfo[] {
  return STAGES.map(localize)
}

export function stageInfo(stage: StageId | string | null | undefined): StageInfo {
  return localize(BY_ID[stage as StageId] ?? BY_ID.seedling)
}

export function isStageId(v: unknown): v is StageId {
  return typeof v === 'string' && v in BY_ID
}

export function nextStage(stage: StageId): StageId | null {
  const i = STAGES.findIndex(s => s.id === stage)
  return STAGES[i + 1]?.id ?? null
}

/** Stages a plant can still be growing in (before harvest). */
export const GROWING_STAGES: StageId[] = ['germination', 'seedling', 'vegetative', 'flowering']

export function isGrowing(plant: Pick<Plant, 'stage' | 'archived'>): boolean {
  return !plant.archived && GROWING_STAGES.includes(plant.stage)
}

/** Date the current stage began. */
export function stageStartDate(plant: Pick<Plant, 'stageHistory' | 'startDate' | 'stage'>): string {
  for (let i = plant.stageHistory.length - 1; i >= 0; i--) {
    const h = plant.stageHistory[i]
    if (h && h.stage === plant.stage) return h.date
  }
  return plant.startDate
}

export interface StageProgress {
  /** days since the plant was started */
  age: number
  /** days in the current stage */
  dayInStage: number
  /** typical length of the current stage */
  stageDays: number
  /** 0–100, capped */
  percent: number
  overdue: boolean
}

export function stageProgress(plant: Pick<Plant, 'stageHistory' | 'startDate' | 'stage'>, today = todayISO()): StageProgress {
  const info = stageInfo(plant.stage)
  const dayInStage = daysSince(stageStartDate(plant), today)
  return {
    age: daysSince(plant.startDate, today),
    dayInStage,
    stageDays: info.days,
    percent: Math.min(100, Math.round((dayInStage / info.days) * 100)),
    overdue: dayInStage > info.days
  }
}

export interface HealthInfo { value: HealthLevel, label: string, icon: string, color: string }

export const HEALTH_LEVELS: HealthInfo[] = [
  { value: 5, label: 'Thriving', icon: 'i-tabler-mood-happy', color: '#3dd173' },
  { value: 4, label: 'Good', icon: 'i-tabler-mood-smile', color: '#8fd97a' },
  { value: 3, label: 'Fair', icon: 'i-tabler-mood-neutral', color: '#f2b544' },
  { value: 2, label: 'Struggling', icon: 'i-tabler-mood-sad', color: '#f0905a' },
  { value: 1, label: 'Critical', icon: 'i-tabler-mood-cry', color: '#f2626a' }
]

const HEALTH_CS: Record<HealthLevel, string> = { 5: 'Výborné', 4: 'Dobré', 3: 'Ujde', 2: 'Trápí se', 1: 'Kritické' }

const localizeHealth = (h: HealthInfo): HealthInfo => (locale.value === 'cs' ? { ...h, label: HEALTH_CS[h.value] } : h)

export function healthLevels(): HealthInfo[] {
  return HEALTH_LEVELS.map(localizeHealth)
}

export function healthInfo(level: number): HealthInfo {
  return localizeHealth(HEALTH_LEVELS.find(h => h.value === Math.round(level)) ?? HEALTH_LEVELS[1]!)
}
