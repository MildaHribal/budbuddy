// Feeding schedules, costs, inventory and legal limits. All collections are optional in GrowData.
import type { Medium, PlantType } from './grow'

// ── Feeding ─────────────────────────────────────────────────────────

export type FeedPhase = 'seedling' | 'veg' | 'bloom' | 'flush'

export interface FeedProduct {
  id: string
  name: string
  /** dose unit per litre, ml unless the product is a powder */
  unit?: 'ml' | 'g'
}

export interface FeedWeek {
  phase: FeedPhase
  /** week number within the phase, from 1 */
  n: number
  /** product id → ml per litre */
  doses: Record<string, number>
  /** target EC in mS/cm when the chart gives one */
  ec?: number | null
  note?: string | { en: string, cs: string }
}

export interface FeedSource {
  url: string
  /** YYYY-MM-DD the chart was checked */
  checked: string
  note?: string
}

export interface FeedSchedule {
  id: string
  brand: string
  line: string
  media: Exclude<Medium, 'other'>[]
  products: FeedProduct[]
  weeks: FeedWeek[]
  source?: FeedSource
  notes?: { en: string, cs: string } | string
  /** user-made schedule */
  custom?: boolean
  createdAt?: string
}

/** A schedule assigned to one plant. */
export interface FeedPlan {
  id: string
  plantId: string
  scheduleId: string
  /** % of the chart dose */
  strength: number
  /** litres of water mixed per feed */
  waterL: number
  createdAt: string
}

/** One product of a feed entry, as poured. */
export interface FeedLine {
  name: string
  /** ml (or g for powders) per litre */
  dose: number
  unit?: 'ml' | 'g'
  /** inventory bottle it was taken from */
  stockId?: string | null
}

export interface FeedingData {
  custom: FeedSchedule[]
  plans: FeedPlan[]
}

// ── Costs ───────────────────────────────────────────────────────────

export type Currency = 'CZK' | 'EUR'
export type ExpenseCategory = 'seeds' | 'nutrients' | 'substrate' | 'gear' | 'electricity' | 'other'

export interface Expense {
  id: string
  /** YYYY-MM-DD */
  date: string
  category: ExpenseCategory
  title: string
  amount: number
  /** run it belongs to; null = general (gear used across runs) */
  runId: string | null
  createdAt: string
}

export interface PowerDevice {
  id: string
  name: string
  watts: number
  /** lights follow the stage (veg / flower hours); other devices run a fixed number of hours */
  kind: 'light' | 'other'
  hoursVeg: number
  hoursFlower: number
}

/** A grow run: plants grown together, used for per-run totals. */
export interface CostRun {
  id: string
  name: string
  plantIds: string[]
  createdAt: string
}

export interface CostsData {
  currency: Currency
  /** price per kWh in the chosen currency */
  kwhPrice: number
  devices: PowerDevice[]
  expenses: Expense[]
  runs: CostRun[]
}

// ── Inventory ───────────────────────────────────────────────────────

export interface SeedStock {
  id: string
  strain: string
  breeder: string
  count: number
  type: PlantType
  sex: 'feminized' | 'regular'
  /** YYYY-MM-DD */
  purchaseDate: string | null
  note: string
  createdAt: string
}

export interface NutrientStock {
  id: string
  name: string
  /** bottle size in ml */
  volumeMl: number
  /** ml left when it was last counted */
  startMl: number
  /** ISO datetime of the last count; usage after it is subtracted */
  countedAt: string
  createdAt: string
}

export interface SupplyStock {
  id: string
  kind: 'substrate' | 'pot' | 'other'
  name: string
  quantity: number
  unit: 'L' | 'pcs' | 'kg'
  /** warn at or below this quantity */
  lowAt: number | null
  createdAt: string
}

/** Nutrient poured in a feed entry, kept so deleting a plant does not refill the bottle. */
export interface NutrientUsage {
  entryId: string
  plantId: string
  stockId: string
  ml: number
  at: string
}

export interface InventoryData {
  seeds: SeedStock[]
  nutrients: NutrientStock[]
  supplies: SupplyStock[]
  usage: NutrientUsage[]
}

// ── Legal ───────────────────────────────────────────────────────────

export type LegalCountry = 'cz' | 'de'

export interface LegalData {
  country: LegalCountry | null
  /** adults (of legal age) in the household who grow; limits are per person */
  adults: number
  /** plantId → grams still stored; missing = full dry weight */
  stored: Record<string, number>
}
