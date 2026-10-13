import type { Plant } from '../types/grow'
import type { FeedLine, FeedPhase, FeedPlan, FeedSchedule, FeedWeek } from '../types/kit'
import { daysBetween, todayISO } from './date'
import { formatNumber } from './locale'

export interface ScheduleWeek {
  week: FeedWeek
  index: number
  /** the plant is past the chart for this phase, so its last week repeats */
  repeated: boolean
  /** week of the plant's current stage, from 1 */
  stageWeek: number
}

const PHASE_ORDER: FeedPhase[] = ['seedling', 'veg', 'bloom', 'flush']

/** Weeks of a schedule in display order. */
export function sortedWeeks(s: Pick<FeedSchedule, 'weeks'>): FeedWeek[] {
  return [...s.weeks].sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase) || a.n - b.n)
}

function lastStageDate(plant: Pick<Plant, 'stageHistory' | 'startDate'>, stages: string[]): string | null {
  for (let i = plant.stageHistory.length - 1; i >= 0; i--) {
    const h = plant.stageHistory[i]!
    if (stages.includes(h.stage)) {
      // walk back to the first item of this run of stages
      let j = i
      while (j > 0 && stages.includes(plant.stageHistory[j - 1]!.stage)) j--
      return plant.stageHistory[j]!.date
    }
  }
  return null
}

/**
 * Picks the chart week for a plant from its stage history: seedling weeks count from the start,
 * veg weeks from the start of veg, bloom (then flush) weeks from the flip to flowering.
 * A stage that lasts longer than the chart repeats the chart's last week of that phase.
 */
export function scheduleWeekFor(
  plant: Pick<Plant, 'stage' | 'stageHistory' | 'startDate' | 'archived'>,
  schedule: Pick<FeedSchedule, 'weeks'>,
  today = todayISO()
): ScheduleWeek | null {
  if (plant.archived || plant.stage === 'drying' || plant.stage === 'curing') return null
  const weeks = sortedWeeks(schedule)
  if (!weeks.length) return null
  const of = (phases: FeedPhase[]) => weeks.filter(w => phases.includes(w.phase))

  let pool: FeedWeek[]
  let from: string
  if (plant.stage === 'flowering') {
    pool = of(['bloom', 'flush'])
    from = lastStageDate(plant, ['flowering']) ?? plant.startDate
  } else if (plant.stage === 'vegetative') {
    pool = of(['veg'])
    from = lastStageDate(plant, ['vegetative']) ?? plant.startDate
  } else {
    pool = of(['seedling'])
    from = lastStageDate(plant, ['germination', 'seedling']) ?? plant.startDate
    // charts without a seedling phase start young plants on the first veg week
    if (!pool.length) pool = of(['veg']).slice(0, 1)
  }
  if (!pool.length) return null
  const stageWeek = Math.max(1, Math.floor(Math.max(0, daysBetween(from, today)) / 7) + 1)
  const i = Math.min(stageWeek, pool.length) - 1
  const week = pool[i]!
  return { week, index: weeks.indexOf(week), repeated: stageWeek > pool.length, stageWeek }
}

export interface Dose {
  productId: string
  name: string
  unit: 'ml' | 'g'
  /** per litre after the strength adjustment */
  perLitre: number
  /** ml for the plan's water volume */
  total: number
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d

/** Doses for one chart week, scaled by strength (%) and multiplied by the water volume. */
export function weekDoses(schedule: Pick<FeedSchedule, 'products'>, week: FeedWeek, strength: number, waterL: number): Dose[] {
  const k = Math.max(0, strength) / 100
  return schedule.products
    .map((p) => {
      const perLitre = round((week.doses[p.id] ?? 0) * k)
      return { productId: p.id, name: p.name, unit: p.unit ?? 'ml', perLitre, total: round(perLitre * Math.max(0, waterL), 1) }
    })
    .filter(d => d.perLitre > 0)
}

/** Strength suggested for a new plan: autoflowers are fed lighter than the chart. */
export function suggestedStrength(type: Plant['type']): number {
  return type === 'autoflower' ? 75 : 100
}

export function linesFromDoses(doses: Dose[]): FeedLine[] {
  return doses.map(d => ({ name: d.name, dose: d.perLitre, ...(d.unit === 'g' ? { unit: 'g' as const } : {}), stockId: null }))
}

/** The text stored in JournalEntry.nutrients, e.g. "Bio-Grow 2 ml/L, Top-Max 1 ml/L". */
export function feedLinesText(lines: Pick<FeedLine, 'name' | 'dose' | 'unit'>[]): string {
  return lines.map(l => `${l.name} ${formatNumber(l.dose, 2)} ${l.unit === 'g' ? 'g' : 'ml'}/L`).join(', ')
}

export function scheduleTitle(s: Pick<FeedSchedule, 'brand' | 'line'>): string {
  return s.line ? `${s.brand} ${s.line}` : s.brand
}

export function planFor(plans: FeedPlan[], plantId: string): FeedPlan | undefined {
  return plans.find(p => p.plantId === plantId)
}

/** ml of each linked bottle used by a feed entry of `amountMl`. */
export function stockUsage(lines: FeedLine[] | undefined, amountMl: number | null): { stockId: string, ml: number }[] {
  if (!lines?.length || !amountMl || amountMl <= 0) return []
  const by = new Map<string, number>()
  for (const l of lines) {
    if (!l.stockId || l.dose <= 0 || l.unit === 'g') continue
    by.set(l.stockId, (by.get(l.stockId) ?? 0) + l.dose * (amountMl / 1000))
  }
  return [...by].map(([stockId, ml]) => ({ stockId, ml: round(ml, 1) }))
}

/** Matches a product name to a bottle in stock ("Bio-Grow" ↔ "BioBizz Bio-Grow 1 L"). */
export function matchStock<T extends { id: string, name: string }>(name: string, stock: T[]): T | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  const n = norm(name)
  if (!n) return undefined
  return stock.find(s => norm(s.name) === n)
    ?? stock.find((s) => {
      const m = norm(s.name)
      return m.length >= 3 && n.length >= 3 && (m.includes(n) || n.includes(m))
    })
}
