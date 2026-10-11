import type { JournalEntry, Plant } from '~/types/grow'
import { addDays, daysBetween } from '~/utils/date'

export const UPDATE_PHOTO_LIMIT = 4
export const UPDATE_BODY_MAX = 1000
export const MAX_WEEK = 60

/** Last grow week that is (nearly) complete: days 6–12 → week 1, 13–19 → week 2. */
export function completedWeek(plant: Pick<Plant, 'startDate'>, today: string): number {
  const age = Math.max(0, daysBetween(plant.startDate, today))
  return Math.min(MAX_WEEK, Math.floor((age + 1) / 7))
}

export function weekRange(plant: Pick<Plant, 'startDate'>, week: number, today: string): { from: string, to: string } {
  const from = addDays(plant.startDate, (week - 1) * 7)
  const end = addDays(from, 6)
  return { from, to: end < today ? end : today }
}

export interface UpdateRow { week_no: number, created_at: string }

/**
 * The week to prompt for, or null. Prompts once a week: at least 7 days after the
 * last update (or a week into the grow) and never twice for the same week.
 */
export function dueWeek(plant: Pick<Plant, 'startDate'>, updates: UpdateRow[], today: string): number | null {
  const week = completedWeek(plant, today)
  if (week < 1) return null
  if (updates.some(u => u.week_no >= week)) return null
  const last = updates.reduce<string | null>((m, u) => (!m || u.created_at > m ? u.created_at : m), null)
  if (last && daysBetween(last.slice(0, 10), today) < 7) return null
  return week
}

export interface Streak { updated: number, weeks: number, consistent: boolean }

/** Soft streak: weeks with an update out of weeks since the first one; one free skip. */
export function updateStreak(updates: UpdateRow[], completed: number): Streak | null {
  if (!updates.length) return null
  const first = Math.min(...updates.map(u => u.week_no))
  const lastDone = Math.max(...updates.map(u => u.week_no))
  const weeks = Math.max(lastDone, completed - 1) - first + 1
  const updated = new Set(updates.map(u => u.week_no)).size
  return { updated, weeks, consistent: updated >= 2 && weeks - updated <= 1 }
}

export interface JournalSummary {
  week: number
  from: string
  to: string
  day: number
  stage: string
  waterings: number
  feeds: number
  trainings: string[]
  pests: number
  notes: number
  photos: number
  ph: number | null
  ec: number | null
  heightCm: number | null
}

export function weekEntries(entries: JournalEntry[], range: { from: string, to: string }): JournalEntry[] {
  return entries.filter(e => e.date >= range.from && e.date <= range.to)
}

export function summarizeWeek(plant: Plant, entries: JournalEntry[], week: number, range: { from: string, to: string }): JournalSummary {
  const list = weekEntries(entries, range)
  const latest = <K extends keyof JournalEntry>(k: K) => (list.find(e => e[k] != null)?.[k] ?? null) as JournalEntry[K] | null
  return {
    week,
    from: range.from,
    to: range.to,
    day: daysBetween(plant.startDate, range.to),
    stage: plant.stage,
    waterings: list.filter(e => e.type === 'water').length,
    feeds: list.filter(e => e.type === 'feed').length,
    trainings: [...new Set(list.filter(e => e.type === 'train').map(e => e.method ?? 'other'))].slice(0, 8),
    pests: list.filter(e => e.type === 'pest').length,
    notes: list.filter(e => e.note.trim()).length,
    photos: list.reduce((n, e) => n + e.photoIds.length, 0),
    ph: latest('ph') as number | null,
    ec: latest('ec') as number | null,
    heightCm: latest('heightCm') as number | null
  }
}

const TRAIN_EN: Record<string, string> = { topping: 'topping', fim: 'FIM', lst: 'LST', scrog: 'ScrOG', defoliation: 'defoliation', lollipop: 'lollipopping', transplant: 'transplant', other: 'training' }

const times = (n: number, word: string) => `${word} ${n}×`

/** Suggested English body (feed content is English only). */
export function suggestBody(s: JournalSummary, notes: string[]): string {
  const parts: string[] = [`Week ${s.week}, day ${s.day} (${s.stage}).`]
  const care: string[] = []
  if (s.waterings) care.push(times(s.waterings, 'watered'))
  if (s.feeds) care.push(times(s.feeds, 'fed'))
  if (care.length) parts.push(`${care.join(', ').replace(/^./, c => c.toUpperCase())}.`)
  const m: string[] = []
  if (s.ph != null) m.push(`pH ${s.ph}`)
  if (s.ec != null) m.push(`EC ${s.ec}`)
  if (s.heightCm != null) m.push(`${s.heightCm} cm tall`)
  if (m.length) parts.push(`${m.join(', ')}.`)
  if (s.trainings.length) parts.push(`Training: ${s.trainings.map(t => TRAIN_EN[t] ?? t).join(', ')}.`)
  const body = [parts.join(' '), ...notes.slice(0, 3)].join('\n\n')
  return body.slice(0, UPDATE_BODY_MAX)
}
