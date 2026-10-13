// Drying & curing assistant: targets, advice and the tapering burp schedule (pure logic).
import type { CureData, CureJar, DryCheck, JarReading, StemTest } from '../types/grow'
import { addDays, daysBetween, isValidISODate, toISODate, todayISO } from './date'
import { createId } from './id'

export const DRY_TARGET = { tempMin: 18, tempMax: 21, rhMin: 55, rhMax: 62, daysMin: 7, daysMax: 14 } as const
export const CURE_TARGET = { rhMin: 58, rhMax: 62, minDays: 14, idealDays: 28, longDays: 56 } as const

const STEMS: StemTest[] = ['bends', 'cracks', 'snaps']

export function emptyCure(): CureData {
  return { checks: [], jars: [] }
}

// ── Normalisation ─────────────────────────────────────────────────

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const day = (v: unknown, fallback: string) => (isValidISODate(v) ? v : fallback)
const isoTime = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(new Date(v).getTime()) ? v : null)
const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []
const pct = (v: unknown): number | null => {
  const n = num(v)
  return n !== null && n >= 0 && n <= 100 ? n : null
}

export function normalizeCure(raw: unknown, plantIds: Set<string>): CureData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const checks: DryCheck[] = objects(r.checks)
    .map(c => ({
      id: str(c.id) || createId(),
      plantId: String(c.plantId ?? ''),
      date: day(c.date, todayISO()),
      tempC: num(c.tempC),
      humidity: pct(c.humidity),
      stem: STEMS.includes(c.stem as StemTest) ? (c.stem as StemTest) : null,
      note: str(c.note)
    }))
    .filter(c => plantIds.has(c.plantId))
  const jars: CureJar[] = objects(r.jars)
    .map(j => ({
      id: str(j.id) || createId(),
      plantId: String(j.plantId ?? ''),
      label: str(j.label).trim().slice(0, 40),
      weightG: num(j.weightG),
      startDate: day(j.startDate, todayISO()),
      readings: objects(j.readings)
        .map(x => ({ at: isoTime(x.at), humidity: pct(x.humidity) }))
        .filter((x): x is JarReading => x.at !== null && x.humidity !== null),
      burps: Array.isArray(j.burps) ? j.burps.map(isoTime).filter((b): b is string => b !== null) : [],
      doneDate: isValidISODate(j.doneDate) ? j.doneDate : null
    }))
    .filter(j => plantIds.has(j.plantId))
  return { checks, jars }
}

// ── Drying ────────────────────────────────────────────────────────

/** 1-based drying day: chop day is day 1. */
export function dryingDay(harvestDate: string, today = todayISO()): number {
  return Math.max(1, daysBetween(harvestDate, today) + 1)
}

export type Band = 'low' | 'ok' | 'high'
export type DryAdvice
  = | 'tooCold' | 'tooWarm' | 'tooDry' | 'tooHumid'
    | 'keepGoing' | 'almost' | 'ready' | 'tooFast' | 'slow' | 'onTrack'

export function tempBand(t: number | null): Band | null {
  if (t === null) return null
  return t < DRY_TARGET.tempMin - 2 ? 'low' : t > DRY_TARGET.tempMax ? 'high' : 'ok'
}

export function dryRhBand(rh: number | null): Band | null {
  if (rh === null) return null
  return rh < DRY_TARGET.rhMin - 5 ? 'low' : rh > DRY_TARGET.rhMax + 3 ? 'high' : 'ok'
}

/** Advice keys for the latest drying check, most important first. */
export function dryingAdvice(check: Pick<DryCheck, 'tempC' | 'humidity' | 'stem'> | null, dayN: number): DryAdvice[] {
  const out: DryAdvice[] = []
  if (check) {
    const tb = tempBand(check.tempC)
    const rb = dryRhBand(check.humidity)
    if (rb === 'high') out.push('tooHumid')
    if (rb === 'low') out.push('tooDry')
    if (tb === 'high') out.push('tooWarm')
    if (tb === 'low') out.push('tooCold')
    if (check.stem === 'snaps') out.push(dayN < 5 ? 'tooFast' : 'ready')
    else if (check.stem === 'cracks') out.push('almost')
    else if (check.stem === 'bends') out.push(dayN > DRY_TARGET.daysMax ? 'slow' : 'keepGoing')
  }
  if (!out.length) out.push(dayN > DRY_TARGET.daysMax ? 'slow' : 'onTrack')
  return out
}

// ── Curing ────────────────────────────────────────────────────────

/** 0-based day of the cure (the day the jar was filled is 0). */
export function cureDay(jar: Pick<CureJar, 'startDate'>, today = todayISO()): number {
  return Math.max(0, daysBetween(jar.startDate, today))
}

export type CurePhase = 'daily3' | 'daily' | 'twiceWeekly' | 'weekly' | 'done'

export function curePhase(dayN: number): CurePhase {
  if (dayN < 7) return 'daily3'
  if (dayN < 14) return 'daily'
  if (dayN < 28) return 'twiceWeekly'
  if (dayN < CURE_TARGET.longDays) return 'weekly'
  return 'done'
}

export const BURP_TIMES = ['09:00', '14:00', '20:00'] as const

/** Times (HH:MM) a jar should be opened on `date`; tapers from 3× a day to weekly. */
export function burpSlots(jar: Pick<CureJar, 'startDate' | 'doneDate'>, date: string): string[] {
  if (jar.doneDate) return []
  const d = daysBetween(jar.startDate, date)
  if (d < 0) return []
  switch (curePhase(d)) {
    case 'daily3': return [...BURP_TIMES]
    case 'daily': return ['20:00']
    case 'twiceWeekly': return [0, 3].includes((d - 14) % 7) ? ['20:00'] : []
    case 'weekly': return (d - 28) % 7 === 0 ? ['20:00'] : []
    default: return []
  }
}

function at(date: string, hhmm: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  return new Date(y!, m! - 1, d!, h!, min!)
}

const lastBurp = (jar: Pick<CureJar, 'burps'>): Date | null => {
  let best: Date | null = null
  for (const b of jar.burps) {
    const d = new Date(b)
    if (!best || d > best) best = d
  }
  return best
}

// a burp up to an hour early still counts for the slot
const GRACE_MS = 60 * 60 * 1000

export interface BurpStatus {
  /** a slot passed without a burp */
  due: boolean
  /** the missed slot (when due) */
  since: Date | null
  /** next slot after now */
  next: Date | null
}

export function burpStatus(jar: Pick<CureJar, 'startDate' | 'doneDate' | 'burps'>, now = new Date()): BurpStatus {
  const today = toISODate(now)
  const last = lastBurp(jar)
  let since: Date | null = null
  for (let i = 0; i <= 7 && !since; i++) {
    const date = addDays(today, -i)
    const slots = burpSlots(jar, date).map(s => at(date, s)).filter(s => s <= now)
    if (slots.length) since = slots[slots.length - 1]!
  }
  const due = !!since && (!last || last.getTime() < since.getTime() - GRACE_MS)
  let next: Date | null = null
  for (let i = 0; i <= 14 && !next; i++) {
    const date = addDays(today, i)
    next = burpSlots(jar, date).map(s => at(date, s)).find(s => s > now) ?? null
  }
  return { due, since: due ? since : null, next }
}

export type JarRhState = 'wet' | 'damp' | 'high' | 'ideal' | 'low' | 'dry'

export function jarRhState(rh: number): JarRhState {
  if (rh > 70) return 'wet'
  if (rh > 65) return 'damp'
  if (rh > CURE_TARGET.rhMax) return 'high'
  if (rh >= CURE_TARGET.rhMin) return 'ideal'
  if (rh >= 55) return 'low'
  return 'dry'
}

export function latestReading(jar: Pick<CureJar, 'readings'>): JarReading | null {
  let best: JarReading | null = null
  for (const r of jar.readings) if (!best || r.at > best.at) best = r
  return best
}

export interface CureNotice {
  /** ISO datetime */
  at: Date
  /** jar ids to burp */
  jars: string[]
}

/** Upcoming burp notifications merged per slot (several jars → one notification). */
export function planBurpNotices(jars: Pick<CureJar, 'id' | 'startDate' | 'doneDate' | 'burps'>[], now = new Date(), days = 7): CureNotice[] {
  const today = toISODate(now)
  const bySlot = new Map<number, CureNotice>()
  for (const jar of jars) {
    if (jar.doneDate) continue
    const last = lastBurp(jar)
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i)
      for (const s of burpSlots(jar, date)) {
        const when = at(date, s)
        if (when <= now) continue
        // already burped close to this slot
        if (last && Math.abs(when.getTime() - last.getTime()) < GRACE_MS) continue
        const key = when.getTime()
        const n = bySlot.get(key) ?? { at: when, jars: [] }
        n.jars.push(jar.id)
        bySlot.set(key, n)
      }
    }
  }
  return [...bySlot.values()].sort((a, b) => a.at.getTime() - b.at.getTime())
}

/** Daily "check the drying room" reminders for plants that are drying, skipping days already checked. */
export function planDryNotices(plants: { id: string, checkedDates: string[] }[], time: string, now = new Date(), days = 7): { at: Date, plants: string[] }[] {
  const today = toISODate(now)
  const out: { at: Date, plants: string[] }[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i)
    const when = at(date, time)
    if (when <= now) continue
    const ids = plants.filter(p => !p.checkedDates.includes(date)).map(p => p.id)
    if (ids.length) out.push({ at: when, plants: ids })
  }
  return out
}

export function nextJarLabel(existing: { label: string }[]): string {
  const used = new Set(existing.map(j => j.label))
  let n = existing.length + 1
  while (used.has(`#${n}`)) n++
  return `#${n}`
}
