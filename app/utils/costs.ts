import type { Plant } from '../types/grow'
import type { CostRun, CostsData, Currency, Expense, ExpenseCategory, PowerDevice } from '../types/kit'
import { addDays, daysBetween, todayISO } from './date'
import { formatNumber, intlLocale } from './locale'

/** kWh used by `watts` running `hours` a day for `days` days. */
export function kwh(watts: number, hoursPerDay: number, days: number): number {
  return (Math.max(0, watts) * Math.min(24, Math.max(0, hoursPerDay)) * Math.max(0, days)) / 1000
}

export function formatMoney(amount: number, currency: Currency, digits?: number): string {
  if (!Number.isFinite(amount)) return '–'
  const d = digits ?? (currency === 'CZK' && Math.abs(amount) >= 100 ? 0 : 2)
  return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency, maximumFractionDigits: d, minimumFractionDigits: d === 0 ? 0 : Math.min(d, 2) }).format(amount)
}

export function formatKwh(v: number): string {
  return `${formatNumber(v, v < 10 ? 1 : 0)} kWh`
}

type DayPhase = 'veg' | 'flower' | null

function stageOn(plant: Pick<Plant, 'stageHistory'>, day: string): string | null {
  let s: string | null = null
  for (const h of plant.stageHistory) {
    if (h.date <= day) s = h.stage
    else break
  }
  return s
}

function phaseOfPlant(plant: Pick<Plant, 'stageHistory' | 'startDate' | 'harvest'>, day: string): DayPhase {
  if (day < plant.startDate) return null
  if (plant.harvest && day >= plant.harvest.date) return null
  const s = stageOn(plant, day) ?? 'seedling'
  if (s === 'flowering') return 'flower'
  if (s === 'drying' || s === 'curing') return null
  return 'veg'
}

export interface RunPeriod {
  start: string
  /** exclusive: harvest date of the last plant, or tomorrow while still growing */
  end: string
  vegDays: number
  flowerDays: number
}

/** Days the run's lights were in veg and in flower mode (any flowering plant means a 12/12 tent). */
export function runPeriod(plants: Pick<Plant, 'stageHistory' | 'startDate' | 'harvest'>[], today = todayISO()): RunPeriod | null {
  if (!plants.length) return null
  const start = plants.reduce((m, p) => (p.startDate < m ? p.startDate : m), plants[0]!.startDate)
  const tomorrow = addDays(today, 1)
  const end = plants.some(p => !p.harvest)
    ? tomorrow
    : plants.reduce((m, p) => (p.harvest!.date > m ? p.harvest!.date : m), start)
  let vegDays = 0
  let flowerDays = 0
  // capped at three years so a wrong start date cannot hang the page
  const total = Math.min(1100, Math.max(0, daysBetween(start, end > tomorrow ? tomorrow : end)))
  for (let i = 0; i < total; i++) {
    const day = addDays(start, i)
    const phases = plants.map(p => phaseOfPlant(p, day))
    if (phases.includes('flower')) flowerDays++
    else if (phases.includes('veg')) vegDays++
  }
  return { start, end, vegDays, flowerDays }
}

export function devicesKwh(devices: PowerDevice[], vegDays: number, flowerDays: number): number {
  return devices.reduce((s, d) => s + kwh(d.watts, d.hoursVeg, vegDays) + kwh(d.watts, d.hoursFlower, flowerDays), 0)
}

/** Monthly (30 day) kWh of the current setup in veg and in flower mode. */
export function monthlyKwh(devices: PowerDevice[]): { veg: number, flower: number } {
  return { veg: devicesKwh(devices, 30, 0), flower: devicesKwh(devices, 0, 30) }
}

export const lightWatts = (devices: PowerDevice[]) => devices.filter(d => d.kind === 'light').reduce((s, d) => s + d.watts, 0)

export interface RunTotals {
  run: CostRun
  plants: Plant[]
  period: RunPeriod | null
  byCategory: Partial<Record<ExpenseCategory, number>>
  expenses: number
  kwh: number
  electricity: number
  total: number
  /** dry grams of harvested plants in the run */
  dryGrams: number
  /** every plant of the run has a dry weight */
  complete: boolean
  costPerGram: number | null
  gramsPerWatt: number | null
}

export function runTotals(run: CostRun, allPlants: Plant[], costs: CostsData, today = todayISO()): RunTotals {
  const plants = allPlants.filter(p => run.plantIds.includes(p.id))
  const expenses = costs.expenses.filter(e => e.runId === run.id)
  const byCategory: Partial<Record<ExpenseCategory, number>> = {}
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
  const period = runPeriod(plants, today)
  const usedKwh = period ? devicesKwh(costs.devices, period.vegDays, period.flowerDays) : 0
  const electricity = usedKwh * Math.max(0, costs.kwhPrice)
  const spent = expenses.reduce((s, e) => s + e.amount, 0)
  const total = spent + electricity
  const dryGrams = plants.reduce((s, p) => s + (p.harvest?.dryWeight ?? 0), 0)
  const watts = lightWatts(costs.devices)
  return {
    run,
    plants,
    period,
    byCategory,
    expenses: spent,
    kwh: usedKwh,
    electricity,
    total,
    dryGrams,
    complete: plants.length > 0 && plants.every(p => (p.harvest?.dryWeight ?? 0) > 0),
    costPerGram: dryGrams > 0 ? total / dryGrams : null,
    gramsPerWatt: dryGrams > 0 && watts > 0 ? dryGrams / watts : null
  }
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0)
}
