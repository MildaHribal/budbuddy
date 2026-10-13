// Validation of the optional feeding / costs / inventory / legal collections.
import type {
  CostRun,
  CostsData,
  Currency,
  Expense,
  ExpenseCategory,
  FeedingData,
  FeedLine,
  FeedPhase,
  FeedPlan,
  FeedSchedule,
  FeedWeek,
  InventoryData,
  LegalData,
  NutrientStock,
  NutrientUsage,
  PowerDevice,
  SeedStock,
  SupplyStock
} from '../types/kit'
import { isValidISODate, todayISO } from './date'
import { createId } from './id'

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const nonNeg = (v: unknown, fallback = 0) => Math.max(0, num(v) ?? fallback)
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback
const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []
const date = (v: unknown, fallback: string) => (isValidISODate(v) ? v : fallback)
const nowISO = () => new Date().toISOString()

export const FEED_PHASES: FeedPhase[] = ['seedling', 'veg', 'bloom', 'flush']
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['seeds', 'nutrients', 'substrate', 'gear', 'electricity', 'other']
const CURRENCIES: Currency[] = ['CZK', 'EUR']
const MEDIA = ['soil', 'coco', 'hydro'] as const

// ── Feeding ─────────────────────────────────────────────────────────

export function emptyFeeding(): FeedingData {
  return { custom: [], plans: [] }
}

export function normalizeFeedLines(v: unknown): FeedLine[] | undefined {
  const lines = objects(v)
    .map(l => ({ name: str(l.name).trim().slice(0, 60), dose: nonNeg(l.dose), ...(l.unit === 'g' ? { unit: 'g' as const } : {}), stockId: str(l.stockId) || null }))
    .filter(l => l.name)
  return lines.length ? lines : undefined
}

function normalizeWeek(raw: Record<string, unknown>, productIds: Set<string>): FeedWeek {
  const doses: Record<string, number> = {}
  if (raw.doses && typeof raw.doses === 'object') {
    for (const [k, v] of Object.entries(raw.doses as Record<string, unknown>)) {
      const n = num(v)
      if (productIds.has(k) && n !== null && n >= 0) doses[k] = n
    }
  }
  const ec = num(raw.ec)
  return {
    phase: oneOf(raw.phase, FEED_PHASES, 'veg'),
    n: Math.max(1, Math.round(num(raw.n) ?? 1)),
    doses,
    ec: ec !== null && ec >= 0 ? ec : null,
    ...(str(raw.note) ? { note: str(raw.note).slice(0, 200) } : {})
  }
}

export function normalizeSchedule(raw: Record<string, unknown>): FeedSchedule {
  const products = objects(raw.products)
    .map(p => ({ id: str(p.id) || createId(), name: str(p.name).trim().slice(0, 60), ...(p.unit === 'g' ? { unit: 'g' as const } : {}) }))
    .filter(p => p.name)
  const ids = new Set(products.map(p => p.id))
  const media = Array.isArray(raw.media) ? raw.media.filter((m): m is typeof MEDIA[number] => (MEDIA as readonly unknown[]).includes(m)) : []
  return {
    id: str(raw.id) || createId(),
    brand: str(raw.brand).trim().slice(0, 60) || 'Custom',
    line: str(raw.line).trim().slice(0, 60),
    media,
    products,
    weeks: objects(raw.weeks).map(w => normalizeWeek(w, ids)),
    custom: true,
    createdAt: str(raw.createdAt, nowISO()),
    ...(typeof raw.notes === 'string' && raw.notes.trim() ? { notes: raw.notes.trim().slice(0, 500) } : {})
  }
}

export function normalizePlan(raw: Record<string, unknown>): FeedPlan {
  const strength = num(raw.strength)
  const waterL = num(raw.waterL)
  return {
    id: str(raw.id) || createId(),
    plantId: String(raw.plantId ?? ''),
    scheduleId: str(raw.scheduleId),
    strength: strength !== null && strength > 0 && strength <= 200 ? Math.round(strength) : 100,
    waterL: waterL !== null && waterL > 0 ? waterL : 5,
    createdAt: str(raw.createdAt, nowISO())
  }
}

export function normalizeFeeding(raw: unknown, plantIds: Set<string>): FeedingData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const plans = objects(r.plans).map(normalizePlan).filter(p => p.scheduleId && plantIds.has(p.plantId))
  // one plan per plant, the last one wins
  const byPlant = new Map(plans.map(p => [p.plantId, p]))
  return { custom: objects(r.custom).map(normalizeSchedule), plans: [...byPlant.values()] }
}

// ── Costs ───────────────────────────────────────────────────────────

export function emptyCosts(currency: Currency = 'CZK'): CostsData {
  // typical 2026 household tariffs, the user should enter their own
  return { currency, kwhPrice: currency === 'EUR' ? 0.35 : 6, devices: [], expenses: [], runs: [] }
}

export function normalizeExpense(raw: Record<string, unknown>): Expense {
  return {
    id: str(raw.id) || createId(),
    date: date(raw.date, todayISO()),
    category: oneOf(raw.category, EXPENSE_CATEGORIES, 'other'),
    title: str(raw.title).trim().slice(0, 80),
    amount: nonNeg(raw.amount),
    runId: str(raw.runId) || null,
    createdAt: str(raw.createdAt, nowISO())
  }
}

export function normalizeDevice(raw: Record<string, unknown>): PowerDevice {
  const hours = (v: unknown, fallback: number) => Math.min(24, nonNeg(v, fallback))
  return {
    id: str(raw.id) || createId(),
    name: str(raw.name).trim().slice(0, 60) || 'Device',
    watts: nonNeg(raw.watts),
    kind: raw.kind === 'other' ? 'other' : 'light',
    hoursVeg: hours(raw.hoursVeg, 18),
    hoursFlower: hours(raw.hoursFlower, 12)
  }
}

export function normalizeCosts(raw: unknown, plantIds: Set<string>): CostsData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const currency = oneOf(r.currency, CURRENCIES, 'CZK')
  const runs: CostRun[] = objects(r.runs).map(x => ({
    id: str(x.id) || createId(),
    name: str(x.name).trim().slice(0, 60) || 'Run',
    plantIds: Array.isArray(x.plantIds) ? [...new Set(x.plantIds.map(String))].filter(id => plantIds.has(id)) : [],
    createdAt: str(x.createdAt, nowISO())
  }))
  const runIds = new Set(runs.map(x => x.id))
  return {
    currency,
    kwhPrice: num(r.kwhPrice) ?? emptyCosts(currency).kwhPrice,
    devices: objects(r.devices).map(normalizeDevice),
    expenses: objects(r.expenses).map(normalizeExpense).map(e => (e.runId && !runIds.has(e.runId) ? { ...e, runId: null } : e)),
    runs
  }
}

// ── Inventory ───────────────────────────────────────────────────────

export function emptyInventory(): InventoryData {
  return { seeds: [], nutrients: [], supplies: [], usage: [] }
}

export function normalizeSeed(raw: Record<string, unknown>): SeedStock {
  return {
    id: str(raw.id) || createId(),
    strain: str(raw.strain).trim().slice(0, 60) || 'Seeds',
    breeder: str(raw.breeder).trim().slice(0, 60),
    count: Math.round(nonNeg(raw.count)),
    type: raw.type === 'autoflower' ? 'autoflower' : 'photoperiod',
    sex: raw.sex === 'regular' ? 'regular' : 'feminized',
    purchaseDate: isValidISODate(raw.purchaseDate) ? raw.purchaseDate : null,
    note: str(raw.note).slice(0, 300),
    createdAt: str(raw.createdAt, nowISO())
  }
}

export function normalizeNutrientStock(raw: Record<string, unknown>): NutrientStock {
  const volumeMl = nonNeg(raw.volumeMl, 1000)
  return {
    id: str(raw.id) || createId(),
    name: str(raw.name).trim().slice(0, 60) || 'Nutrient',
    volumeMl,
    startMl: Math.min(volumeMl, nonNeg(raw.startMl, volumeMl)),
    countedAt: str(raw.countedAt, nowISO()),
    createdAt: str(raw.createdAt, nowISO())
  }
}

export function normalizeSupply(raw: Record<string, unknown>): SupplyStock {
  const lowAt = num(raw.lowAt)
  return {
    id: str(raw.id) || createId(),
    kind: oneOf(raw.kind, ['substrate', 'pot', 'other'] as const, 'other'),
    name: str(raw.name).trim().slice(0, 60) || 'Item',
    quantity: nonNeg(raw.quantity),
    unit: oneOf(raw.unit, ['L', 'pcs', 'kg'] as const, 'pcs'),
    lowAt: lowAt !== null && lowAt >= 0 ? lowAt : null,
    createdAt: str(raw.createdAt, nowISO())
  }
}

export function normalizeInventory(raw: unknown): InventoryData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const nutrients = objects(r.nutrients).map(normalizeNutrientStock)
  const stockIds = new Set(nutrients.map(n => n.id))
  const usage: NutrientUsage[] = objects(r.usage)
    .map(u => ({ entryId: str(u.entryId), plantId: str(u.plantId), stockId: str(u.stockId), ml: nonNeg(u.ml), at: str(u.at, nowISO()) }))
    .filter(u => u.entryId && stockIds.has(u.stockId) && u.ml > 0)
  return { seeds: objects(r.seeds).map(normalizeSeed), nutrients, supplies: objects(r.supplies).map(normalizeSupply), usage }
}

// ── Legal ───────────────────────────────────────────────────────────

export function emptyLegal(): LegalData {
  return { country: null, adults: 1, stored: {} }
}

export function normalizeLegal(raw: unknown): LegalData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const stored: Record<string, number> = {}
  if (r.stored && typeof r.stored === 'object') {
    for (const [k, v] of Object.entries(r.stored as Record<string, unknown>)) {
      const n = num(v)
      if (n !== null && n >= 0) stored[k] = n
    }
  }
  const adults = Math.round(num(r.adults) ?? 1)
  return {
    country: r.country === 'cz' || r.country === 'de' ? r.country : null,
    adults: Math.min(10, Math.max(1, adults)),
    stored
  }
}
