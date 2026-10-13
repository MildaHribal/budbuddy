// Sensor reading storage: samples are averaged into time buckets so months of data stay small.

import type { EnvReading } from '~/types/environment'
import type { StageId } from '~/types/grow'
import { vpd } from '~/utils/calc'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** recent data keeps 10-minute detail, older data hourly, everything past the horizon is dropped */
export const FINE_BUCKET = 10 * MIN
export const COARSE_BUCKET = HOUR
export const FINE_WINDOW = 2 * DAY
export const HORIZON = 180 * DAY
/** hard cap per sensor (~180 days hourly + 2 days fine) */
export const MAX_PER_SENSOR = 4700

export function bucketStart(t: number, size: number): number {
  return Math.floor(t / size) * size
}

const avg = (a: number | null, na: number, b: number | null, nb: number): number | null => {
  if (a === null) return b
  if (b === null) return a
  return Math.round(((a * na + b * nb) / (na + nb)) * 100) / 100
}

/**
 * Adds a sample (mutates and returns `list`). Samples in the same fine bucket are averaged.
 * Sensors deliver in order, so the matching bucket is searched from the end.
 */
export function addSample(list: EnvReading[], sensor: string, t: number, c: number | null, h: number | null): EnvReading[] {
  if (c === null && h === null) return list
  const b = bucketStart(t, FINE_BUCKET)
  for (let i = list.length - 1; i >= 0 && i >= list.length - 400; i--) {
    const r = list[i]!
    if (r.s !== sensor || r.t !== b) continue
    r.c = avg(r.c, r.n, c, 1)
    r.h = avg(r.h, r.n, h, 1)
    r.n += 1
    return list
  }
  list.push({ s: sensor, t: b, c: c === null ? null : Math.round(c * 100) / 100, h: h === null ? null : Math.round(h * 100) / 100, n: 1 })
  return list
}

/**
 * Merges readings older than the fine window into hourly buckets, drops anything past the horizon
 * and caps each sensor. Returns a new sorted array.
 */
export function compact(list: EnvReading[], now = Date.now()): EnvReading[] {
  const fineFrom = now - FINE_WINDOW
  const from = now - HORIZON
  const map = new Map<string, EnvReading>()
  for (const r of list) {
    if (r.t < from) continue
    const size = r.t < fineFrom ? COARSE_BUCKET : FINE_BUCKET
    const t = bucketStart(r.t, size)
    const key = `${r.s}|${t}`
    const cur = map.get(key)
    if (!cur) {
      map.set(key, { ...r, t })
      continue
    }
    cur.c = avg(cur.c, cur.n, r.c, r.n)
    cur.h = avg(cur.h, cur.n, r.h, r.n)
    cur.n += r.n
  }
  const sorted = [...map.values()].sort((a, b) => a.t - b.t || a.s.localeCompare(b.s))
  const perSensor = new Map<string, number>()
  for (const r of sorted) perSensor.set(r.s, (perSensor.get(r.s) ?? 0) + 1)
  // drop the oldest when over the cap
  const skip = new Map<string, number>()
  for (const [s, n] of perSensor) if (n > MAX_PER_SENSOR) skip.set(s, n - MAX_PER_SENSOR)
  return sorted.filter((r) => {
    const left = skip.get(r.s)
    if (!left) return true
    skip.set(r.s, left - 1)
    return false
  })
}

export interface SeriesPoint {
  t: number
  v: number
}

export type Metric = 'temp' | 'rh' | 'vpd'

export function seriesOf(list: readonly EnvReading[], sensor: string, metric: Metric, from: number, leafOffset = -2): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (const r of list) {
    if (r.s !== sensor || r.t < from) continue
    if (metric === 'temp' && r.c !== null) out.push({ t: r.t, v: r.c })
    else if (metric === 'rh' && r.h !== null) out.push({ t: r.t, v: r.h })
    else if (metric === 'vpd' && r.c !== null && r.h !== null) out.push({ t: r.t, v: Math.round(vpd(r.c, r.h, leafOffset) * 100) / 100 })
  }
  return out.sort((a, b) => a.t - b.t)
}

/** Averages points into at most `max` buckets so an SVG path stays light. */
export function thin(points: SeriesPoint[], max = 160): SeriesPoint[] {
  if (points.length <= max) return points
  const first = points[0]!.t
  const span = points[points.length - 1]!.t - first || 1
  const buckets: { t: number, v: number, n: number }[] = []
  for (const p of points) {
    const i = Math.min(max - 1, Math.floor(((p.t - first) / span) * max))
    const b = (buckets[i] ??= { t: 0, v: 0, n: 0 })
    b.t += p.t
    b.v += p.v
    b.n++
  }
  return buckets.filter(Boolean).map(b => ({ t: Math.round(b.t / b.n), v: Math.round((b.v / b.n) * 100) / 100 }))
}

export interface VpdTarget {
  min: number
  max: number
}

/** Target leaf VPD (kPa) per stage, matching the zones of the VPD tool. */
export function vpdTarget(stage: StageId | null): VpdTarget | null {
  switch (stage) {
    case 'germination':
    case 'seedling':
      return { min: 0.4, max: 0.8 }
    case 'vegetative':
      return { min: 0.8, max: 1.2 }
    case 'flowering':
      return { min: 1.2, max: 1.6 }
    default:
      return null
  }
}

export interface RangeStats {
  min: number
  max: number
  avg: number
  /** share of points inside the target, 0–1 */
  inTarget: number | null
}

export function statsOf(points: SeriesPoint[], target?: VpdTarget | null): RangeStats | null {
  if (!points.length) return null
  let min = Infinity
  let max = -Infinity
  let sum = 0
  let inside = 0
  for (const p of points) {
    min = Math.min(min, p.v)
    max = Math.max(max, p.v)
    sum += p.v
    if (target && p.v >= target.min && p.v <= target.max) inside++
  }
  return { min, max, avg: Math.round((sum / points.length) * 100) / 100, inTarget: target ? inside / points.length : null }
}
