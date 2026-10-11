import type { GlyphName } from './glyphs'
import type { HealthLevel, Plant, StageId } from '../types/grow'
import { daysSince, todayISO } from './date'
import { locale } from './locale'

export interface StageInfo {
  id: StageId
  label: string
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
    icon: 'i-tabler-seeding',
    glyph: 'germination',
    color: '#e9d68f',
    days: 7,
    range: '3–10 days',
    light: '18/6 or 24/0, low intensity',
    description: 'The seed cracks open and pushes out its taproot and first round leaves.',
    tips: ['Keep humidity at 70–90 %', 'Temperature 22–25 °C', 'Do not let the medium dry out']
  },
  {
    id: 'seedling',
    label: 'Seedling',
    icon: 'i-tabler-plant',
    glyph: 'seedling',
    color: '#c8f08f',
    days: 21,
    range: '2–3 weeks',
    light: '18/6, gentle light',
    description: 'First true serrated leaves appear and the root system establishes.',
    tips: ['Water small amounts around the stem', 'Very light feeding, if any', 'Keep RH around 65–70 %']
  },
  {
    id: 'vegetative',
    label: 'Vegetative',
    icon: 'i-tabler-trees',
    glyph: 'vegetative',
    color: '#9be36b',
    days: 42,
    range: '3–16 weeks',
    light: '18/6',
    description: 'Rapid growth of stems and leaves. The best time for training.',
    tips: ['Nitrogen-rich feed', 'Top, LST or SCROG now', 'Transplant before roots circle the pot']
  },
  {
    id: 'flowering',
    label: 'Flowering',
    icon: 'i-tabler-flower',
    glyph: 'flowering',
    color: '#c9a2ff',
    days: 63,
    range: '7–11 weeks',
    light: '12/12 (photoperiod)',
    description: 'Buds form and fatten. Watch humidity and trichomes closely.',
    tips: ['Switch to bloom nutrients (P & K)', 'Keep RH 40–50 % to prevent mould', 'Check trichomes from week 6']
  },
  {
    id: 'drying',
    label: 'Drying',
    icon: 'i-tabler-wind',
    glyph: 'drying',
    color: '#d9a76a',
    days: 10,
    range: '7–14 days',
    light: 'Dark',
    description: 'Harvested branches hang in a dark room until small stems snap.',
    tips: ['18–20 °C and 55–60 % RH', 'Gentle air movement, not on the buds', 'Weigh before and after']
  },
  {
    id: 'curing',
    label: 'Curing',
    icon: 'i-tabler-bottle',
    glyph: 'curing',
    color: '#f0b95e',
    days: 28,
    range: '2–8 weeks',
    light: 'Dark',
    description: 'Buds rest in sealed jars to develop flavour and smoothness.',
    tips: ['Fill jars ~75 %', 'Burp daily during the first week', 'Aim for 58–62 % RH inside the jar']
  }
]

type StageText = Pick<StageInfo, 'label' | 'range' | 'light' | 'description' | 'tips'>

const STAGES_CS: Record<StageId, StageText> = {
  germination: {
    label: 'Klíčení',
    range: '3–10 dní',
    light: '18/6 nebo 24/0, slabé světlo',
    description: 'Semínko praskne, vystrčí kořínek a první kulaté lístky.',
    tips: ['Vlhkost drž na 70–90 %', 'Teplota 22–25 °C', 'Substrát nesmí vyschnout']
  },
  seedling: {
    label: 'Sazenice',
    range: '2–3 týdny',
    light: '18/6, jemné světlo',
    description: 'Objevují se první pravé zubaté listy a zakořeňuje se.',
    tips: ['Zalévej po troškách kolem stonku', 'Hnojit jen velmi slabě, nebo vůbec', 'Vzdušná vlhkost kolem 65–70 %']
  },
  vegetative: {
    label: 'Vegetace',
    range: '3–16 týdnů',
    light: '18/6',
    description: 'Rychle přibývají stonky i listy. Nejlepší čas na tvarování.',
    tips: ['Hnojivo bohaté na dusík', 'Teď je čas na topping, LST nebo SCROG', 'Přesaď dřív, než kořeny obkrouží květináč']
  },
  flowering: {
    label: 'Kvetení',
    range: '7–11 týdnů',
    light: '12/12 (fotoperioda)',
    description: 'Tvoří se a nabírají palice. Hlídej vlhkost a trichomy.',
    tips: ['Přejdi na květové hnojivo (P a K)', 'Vlhkost 40–50 %, ať nechytí plíseň', 'Od 6. týdne kontroluj trichomy']
  },
  drying: {
    label: 'Sušení',
    range: '7–14 dní',
    light: 'Tma',
    description: 'Sklizené větve visí v temné místnosti, dokud tenké stonky nepraskají.',
    tips: ['18–20 °C a 55–60 % vlhkosti', 'Mírné proudění vzduchu, ne přímo na palice', 'Zvaž před sušením i po něm']
  },
  curing: {
    label: 'Zrání',
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
  { value: 5, label: 'Thriving', icon: 'i-tabler-mood-happy', color: '#9be36b' },
  { value: 4, label: 'Good', icon: 'i-tabler-mood-smile', color: '#c8f08f' },
  { value: 3, label: 'Fair', icon: 'i-tabler-mood-neutral', color: '#ffd28a' },
  { value: 2, label: 'Struggling', icon: 'i-tabler-mood-sad', color: '#ff9a62' },
  { value: 1, label: 'Critical', icon: 'i-tabler-mood-cry', color: '#ff5f6d' }
]

const HEALTH_CS: Record<HealthLevel, string> = { 5: 'Výborné', 4: 'Dobré', 3: 'Ujde', 2: 'Trápí se', 1: 'Kritické' }

const localizeHealth = (h: HealthInfo): HealthInfo => (locale.value === 'cs' ? { ...h, label: HEALTH_CS[h.value] } : h)

export function healthLevels(): HealthInfo[] {
  return HEALTH_LEVELS.map(localizeHealth)
}

export function healthInfo(level: number): HealthInfo {
  return localizeHealth(HEALTH_LEVELS.find(h => h.value === Math.round(level)) ?? HEALTH_LEVELS[1]!)
}
