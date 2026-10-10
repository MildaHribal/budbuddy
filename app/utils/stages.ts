import type { HealthLevel, Plant, StageId } from '../types/grow'
import { daysSince, todayISO } from './date'

export interface StageInfo {
  id: StageId
  label: string
  icon: string
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
    color: '#b5e48c',
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
    color: '#7bc74d',
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
    color: '#4fc3f7',
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
    color: '#f472b6',
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
    color: '#fbbf24',
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
    color: '#c084fc',
    days: 28,
    range: '2–8 weeks',
    light: 'Dark',
    description: 'Buds rest in sealed jars to develop flavour and smoothness.',
    tips: ['Fill jars ~75 %', 'Burp daily during the first week', 'Aim for 58–62 % RH inside the jar']
  }
]

const BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s])) as Record<StageId, StageInfo>

export function stageInfo(stage: StageId | string | null | undefined): StageInfo {
  return BY_ID[stage as StageId] ?? BY_ID.seedling
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

export const HEALTH_LEVELS: { value: HealthLevel, label: string, icon: string, color: string }[] = [
  { value: 5, label: 'Thriving', icon: 'i-tabler-mood-happy', color: '#7bc74d' },
  { value: 4, label: 'Good', icon: 'i-tabler-mood-smile', color: '#a3d977' },
  { value: 3, label: 'Fair', icon: 'i-tabler-mood-neutral', color: '#fbbf24' },
  { value: 2, label: 'Struggling', icon: 'i-tabler-mood-sad', color: '#fb923c' },
  { value: 1, label: 'Critical', icon: 'i-tabler-mood-cry', color: '#ef4444' }
]

export function healthInfo(level: number) {
  return HEALTH_LEVELS.find(h => h.value === Math.round(level)) ?? HEALTH_LEVELS[1]!
}
