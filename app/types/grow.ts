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
  /** grow space (tent) the plant stands in */
  spaceId?: string | null
  /** watering reminders follow the interval learned from the journal */
  wateringAuto?: boolean
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

export interface GrowSpace {
  id: string
  name: string
  location: Location
  /** free text, e.g. "80 × 80 × 160 cm" */
  size: string
  /** free text, e.g. "LED 240 W" */
  light: string
  /** HH:MM */
  lightsOn: string
  /** hours of light per day; null = natural light only */
  lightHours: number | null
  notes: string
  createdAt: string
  updatedAt: string
}

export type PhenoCriterion = 'vigour' | 'structure' | 'smell' | 'resin' | 'yield' | 'resistance'

export interface PhenoCandidate {
  plantId: string
  /** short pheno label, e.g. "#3" */
  tag: string
  /** 1–5 per criterion; missing = not scored yet */
  scores: Partial<Record<PhenoCriterion, number>>
  notes: string
}

export interface PhenoHunt {
  id: string
  name: string
  strain: string
  /** seed pack / breeder / lot */
  source: string
  candidates: PhenoCandidate[]
  /** 1–3 importance per criterion, default 1 */
  weights: Partial<Record<PhenoCriterion, number>>
  keeper: { plantId: string, role: 'mother' | 'clone' } | null
  done: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export interface GrowData {
  version: 2
  plants: Plant[]
  entries: JournalEntry[]
  tasks: Task[]
  settings: Settings
  guide: GuideProgress
  /** grow spaces / tents (optional: older saves have none) */
  spaces?: GrowSpace[]
  hunts?: PhenoHunt[]
}
