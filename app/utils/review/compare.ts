import type { JournalEntry, Plant, StageId } from '../../types/grow'
import { daysBetween } from '../date'
import { GROWING_STAGES } from '../stages'
import type { TimelapseFrame } from './timelapse'

export interface StageSegment {
  stage: StageId
  /** day from start, inclusive */
  from: number
  /** day from start, exclusive */
  to: number
}

export interface RunSummary {
  plantId: string
  /** last day of the run, as days from start */
  length: number
  endDate: string
  segments: StageSegment[]
  /** day from start the plant was chopped */
  harvestDay: number | null
  vegDays: number | null
  flowerDays: number | null
  waterings: number
  feeds: number
  trainings: number
  pests: number
  photos: number
  waterLitres: number
  avgEc: number | null
  avgPh: number | null
  maxHeight: number | null
  wet: number | null
  dry: number | null
}

export type SeriesKey = 'ec' | 'ph' | 'heightCm'

export interface SeriesPoint {
  day: number
  value: number
}

type RunPlant = Pick<Plant, 'id' | 'startDate' | 'stage' | 'stageHistory' | 'harvest' | 'archived'>

/** Last day that belongs to the run: today while growing, else the last logged event. */
export function runEndDate(plant: RunPlant, entries: readonly JournalEntry[], today: string): string {
  if (!plant.archived && GROWING_STAGES.includes(plant.stage)) return today
  let end = plant.startDate
  for (const e of entries) if (e.plantId === plant.id && e.date > end) end = e.date
  for (const h of plant.stageHistory) if (h.date > end) end = h.date
  if (plant.harvest && plant.harvest.date > end) end = plant.harvest.date
  return end > today ? today : end
}

export function stageSegments(plant: RunPlant, endDate: string): StageSegment[] {
  const total = Math.max(0, daysBetween(plant.startDate, endDate)) + 1
  const out: StageSegment[] = []
  plant.stageHistory.forEach((h, i) => {
    const next = plant.stageHistory[i + 1]
    const from = Math.max(0, daysBetween(plant.startDate, h.date))
    const to = next ? Math.max(from, daysBetween(plant.startDate, next.date)) : total
    if (to > from || !next) out.push({ stage: h.stage, from, to: Math.max(to, from + 1) })
  })
  return out
}

const avg = (list: number[]) => (list.length ? Math.round((list.reduce((s, v) => s + v, 0) / list.length) * 100) / 100 : null)

const daysIn = (segments: StageSegment[], stage: StageId) => {
  const list = segments.filter(s => s.stage === stage)
  return list.length ? list.reduce((s, x) => s + (x.to - x.from), 0) : null
}

export function runSummary(plant: RunPlant, allEntries: readonly JournalEntry[], today: string): RunSummary {
  const entries = allEntries.filter(e => e.plantId === plant.id)
  const endDate = runEndDate(plant, entries, today)
  const segments = stageSegments(plant, endDate)
  const count = (type: JournalEntry['type']) => entries.filter(e => e.type === type).length
  const pick = (k: SeriesKey) => entries.map(e => e[k]).filter((v): v is number => v != null)
  const heights = pick('heightCm')
  return {
    plantId: plant.id,
    length: Math.max(0, daysBetween(plant.startDate, endDate)),
    endDate,
    segments,
    harvestDay: plant.harvest ? Math.max(0, daysBetween(plant.startDate, plant.harvest.date)) : null,
    vegDays: daysIn(segments, 'vegetative'),
    flowerDays: daysIn(segments, 'flowering'),
    waterings: count('water'),
    feeds: count('feed'),
    trainings: count('train'),
    pests: count('pest'),
    photos: entries.reduce((n, e) => n + e.photoIds.length, 0),
    waterLitres: Math.round(entries.filter(e => e.type === 'water' || e.type === 'feed').reduce((s, e) => s + (e.amountMl ?? 0), 0) / 100) / 10,
    avgEc: avg(pick('ec')),
    avgPh: avg(pick('ph')),
    maxHeight: heights.length ? Math.max(...heights) : null,
    wet: plant.harvest?.wetWeight ?? null,
    dry: plant.harvest?.dryWeight ?? null
  }
}

/** Readings by day from start; several readings on one day are averaged. */
export function daySeries(plant: Pick<Plant, 'id' | 'startDate'>, entries: readonly JournalEntry[], key: SeriesKey): SeriesPoint[] {
  const byDay = new Map<number, number[]>()
  for (const e of entries) {
    const v = e[key]
    if (e.plantId !== plant.id || v == null) continue
    const day = Math.max(0, daysBetween(plant.startDate, e.date))
    const list = byDay.get(day) ?? []
    list.push(v)
    byDay.set(day, list)
  }
  return [...byDay].sort((a, b) => a[0] - b[0]).map(([day, list]) => ({ day, value: avg(list)! }))
}

/** Photo closest to `day` (ties go to the earlier one) within `maxGap` days. */
export function nearestFrame(frames: readonly TimelapseFrame[], day: number, maxGap = 7): TimelapseFrame | null {
  let best: TimelapseFrame | null = null
  for (const f of frames) {
    const d = Math.abs(f.day - day)
    if (d > maxGap) continue
    if (!best || d < Math.abs(best.day - day)) best = f
  }
  return best
}

/** Which side is better for a row: 'a', 'b' or null (equal / missing / no preference). */
export function better(a: number | null, b: number | null, higherIsBetter: boolean | null): 'a' | 'b' | null {
  if (a == null || b == null || a === b || higherIsBetter === null) return null
  return (a > b) === higherIsBetter ? 'a' : 'b'
}
