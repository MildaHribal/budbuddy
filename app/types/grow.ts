import type { EnvironmentData } from './environment'

export type StageId
  = | 'germination'
    | 'seedling'
    | 'vegetative'
    | 'flowering'
    | 'drying'
    | 'curing'

export type PlantType = 'photoperiod' | 'autoflower'
export type Medium = 'soil' | 'coco' | 'hydro' | 'other'
export type Location = 'indoor' | 'outdoor' | 'greenhouse'

/** 1 = critical … 5 = thriving */
export type HealthLevel = 1 | 2 | 3 | 4 | 5

export interface StageChange {
  stage: StageId
  /** YYYY-MM-DD (local) */
  date: string
}

export interface Harvest {
  /** YYYY-MM-DD the plant was chopped */
  date: string
  /** grams */
  wetWeight: number | null
  /** grams */
  dryWeight: number | null
  notes: string
}

export interface Plant {
  id: string
  name: string
  strain: string
  type: PlantType
  stage: StageId
  /** Ordered history, first item is the starting stage. */
  stageHistory: StageChange[]
  /** YYYY-MM-DD – germination / planting date */
  startDate: string
  potSize: string
  medium: Medium
  location: Location
  /** Reminder interval in days, null = no reminder */
  wateringInterval: number | null
  health: HealthLevel
  photoId: string | null
  notes: string
  harvest: Harvest | null
  archived: boolean
  createdAt: string
  updatedAt: string
  /** set while the plant is shared to the community */
  sharing?: PlantSharing | null
}

export interface PlantSharing {
  /** public_plants.id */
  publicId: string
  syncedAt: string
}

export type EntryType
  = | 'water'
    | 'feed'
    | 'train'
    | 'pest'
    | 'measure'
    | 'note'
    | 'photo'
    | 'stage'
    | 'harvest'

export type TrainingMethod
  = | 'topping'
    | 'fim'
    | 'lst'
    | 'scrog'
    | 'defoliation'
    | 'lollipop'
    | 'transplant'
    | 'other'

export interface JournalEntry {
  id: string
  plantId: string
  type: EntryType
  /** YYYY-MM-DD (local) */
  date: string
  note: string
  /** water / feed volume in millilitres */
  amountMl: number | null
  ph: number | null
  /** mS/cm */
  ec: number | null
  /** e.g. "Grow 2 ml/L, CalMag 1 ml/L" */
  nutrients: string
  method: TrainingMethod | null
  /** pest / disease treatment product */
  product: string
  heightCm: number | null
  tempC: number | null
  humidity: number | null
  photoIds: string[]
  /** stage entries only */
  stage: StageId | null
  createdAt: string
}

export interface Task {
  id: string
  title: string
  /** YYYY-MM-DD */
  date: string
  plantId: string | null
  done: boolean
  createdAt: string
}

export interface Settings {
  growerName: string
  /** true once demo data was offered, so it never re-seeds after the user deletes everything */
  initialized: boolean
  /** tent light schedule: lights-on time (HH:MM) and hours of light per day */
  lightsOn: string
  lightHours: number
  language: 'en' | 'cs'
  reminders: boolean
  /** HH:MM */
  reminderTime: string
  /** first-run guide finished */
  onboarded: boolean
  /** data is the bundled demo garden */
  demo: boolean
}

export interface GuideProgress {
  /** finished lesson ids */
  done: string[]
  /** quiz key (lesson id) → best number of correct answers */
  quiz: Record<string, number>
  /** checklist id → ticked item indexes */
  checks: Record<string, number[]>
  environment: Location | null
  medium: Exclude<Medium, 'other'> | null
}

export interface GrowData {
  version: 2
  plants: Plant[]
  entries: JournalEntry[]
  tasks: Task[]
  settings: Settings
  guide: GuideProgress
  /** Environment area (weather, sensors, light meter); absent in saves made before it existed */
  environment?: EnvironmentData
}
