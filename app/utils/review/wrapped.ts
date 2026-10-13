import type { EntryType, GrowData, JournalEntry, Plant } from '../../types/grow'
import { addDays, daysBetween, parseISODate } from '../date'

export interface Period {
  /** 'all' or a year such as '2026' */
  id: string
  from: string
  to: string
}

export interface WrappedPhoto {
  photoId: string
  plantId: string
  date: string
}

export interface WrappedStats {
  period: Period
  /** first to last logged day, inclusive */
  seasonDays: number
  firstDate: string
  lastDate: string
  activeDays: number
  plants: number
  harvestedPlants: number
  entries: number
  /** grams, null when nothing was weighed */
  dryGrams: number | null
  wetGrams: number | null
  bestPlant: { id: string, name: string, strain: string, dry: number } | null
  topAction: { type: EntryType, count: number } | null
  /** counts of loggable actions, most first */
  actions: { type: EntryType, count: number }[]
  waterLitres: number
  photos: number
  bestPhoto: WrappedPhoto | null
  longestStreak: number
  streakEnd: string | null
  /** 0 = Monday */
  busiestWeekday: number | null
  /** plant with most entries */
  mostLogged: { id: string, name: string, entries: number } | null
}

const ACTIONS: EntryType[] = ['water', 'feed', 'train', 'pest', 'measure', 'note', 'photo']

/** Years that have any journal activity, newest first, plus the all-time period. */
export function wrappedPeriods(data: Pick<GrowData, 'entries' | 'plants'>): Period[] {
  const years = new Set<string>()
  for (const e of data.entries) years.add(e.date.slice(0, 4))
  for (const p of data.plants) if (p.harvest) years.add(p.harvest.date.slice(0, 4))
  const list = [...years].filter(y => /^\d{4}$/.test(y)).sort().reverse().map(y => ({ id: y, from: `${y}-01-01`, to: `${y}-12-31` }))
  if (list.length > 1 || !list.length) list.push({ id: 'all', from: '0000-01-01', to: '9999-12-31' })
  return list
}

const inPeriod = (date: string, p: Period) => date >= p.from && date <= p.to

/** Longest run of consecutive calendar days in a set of ISO dates. */
export function longestStreak(dates: Iterable<string>): { length: number, end: string | null } {
  const sorted = [...new Set(dates)].sort()
  let best = 0
  let bestEnd: string | null = null
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    if (run > best) {
      best = run
      bestEnd = d
    }
    prev = d
  }
  return { length: best, end: bestEnd }
}

const photosOf = (entries: JournalEntry[]): WrappedPhoto[] =>
  entries.flatMap(e => e.photoIds.map(photoId => ({ photoId, plantId: e.plantId, date: e.date })))

/** Latest photo of the best plant, else of the most-logged plant, else the latest photo. */
function pickBestPhoto(photos: WrappedPhoto[], ...plantIds: (string | undefined)[]): WrappedPhoto | null {
  const latest = (list: WrappedPhoto[]) => list.reduce<WrappedPhoto | null>((a, b) => (!a || b.date >= a.date ? b : a), null)
  for (const id of plantIds) {
    if (!id) continue
    const hit = latest(photos.filter(p => p.plantId === id))
    if (hit) return hit
  }
  return latest(photos)
}

export function computeWrapped(data: Pick<GrowData, 'entries' | 'plants'>, period: Period): WrappedStats | null {
  const entries = data.entries.filter(e => inPeriod(e.date, period))
  const plantsById = new Map(data.plants.map(p => [p.id, p]))
  const harvests = data.plants.filter((p): p is Plant & { harvest: NonNullable<Plant['harvest']> } => !!p.harvest && inPeriod(p.harvest.date, period))
  const plantIds = new Set<string>([...entries.map(e => e.plantId), ...harvests.map(p => p.id)])
  if (!entries.length && !harvests.length) return null

  const dates = entries.map(e => e.date).concat(harvests.map(p => p.harvest.date)).sort()
  const firstDate = dates[0]!
  const lastDate = dates[dates.length - 1]!

  const counts = new Map<EntryType, number>()
  for (const e of entries) if (ACTIONS.includes(e.type)) counts.set(e.type, (counts.get(e.type) ?? 0) + 1)
  const actions = [...counts].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count || ACTIONS.indexOf(a.type) - ACTIONS.indexOf(b.type))

  const dryList = harvests.filter(p => p.harvest.dryWeight != null)
  const wetList = harvests.filter(p => p.harvest.wetWeight != null)
  const sum = (list: typeof harvests, k: 'dryWeight' | 'wetWeight') => Math.round(list.reduce((s, p) => s + (p.harvest[k] ?? 0), 0) * 10) / 10
  const best = dryList.reduce<typeof dryList[number] | null>((a, b) => (!a || (b.harvest.dryWeight ?? 0) > (a.harvest.dryWeight ?? 0) ? b : a), null)

  const perPlant = new Map<string, number>()
  for (const e of entries) perPlant.set(e.plantId, (perPlant.get(e.plantId) ?? 0) + 1)
  const topPlantId = [...perPlant].sort((a, b) => b[1] - a[1])[0]?.[0]
  const topPlant = topPlantId ? plantsById.get(topPlantId) : undefined

  const weekdays = Array.from({ length: 7 }, () => 0)
  for (const e of entries) weekdays[(parseISODate(e.date).getDay() + 6) % 7]!++
  const maxDay = Math.max(...weekdays)

  const streak = longestStreak(entries.map(e => e.date))
  const photos = photosOf(entries)

  return {
    period,
    seasonDays: daysBetween(firstDate, lastDate) + 1,
    firstDate,
    lastDate,
    activeDays: new Set(entries.map(e => e.date)).size,
    plants: plantIds.size,
    harvestedPlants: harvests.length,
    entries: entries.length,
    dryGrams: dryList.length ? sum(dryList, 'dryWeight') : null,
    wetGrams: wetList.length ? sum(wetList, 'wetWeight') : null,
    bestPlant: best ? { id: best.id, name: best.name, strain: best.strain, dry: best.harvest.dryWeight ?? 0 } : null,
    topAction: actions[0] ?? null,
    actions,
    waterLitres: Math.round(entries.filter(e => e.type === 'water' || e.type === 'feed').reduce((s, e) => s + (e.amountMl ?? 0), 0) / 100) / 10,
    photos: photos.length,
    bestPhoto: pickBestPhoto(photos, best?.id, topPlantId),
    longestStreak: streak.length,
    streakEnd: streak.end,
    busiestWeekday: maxDay > 0 ? weekdays.indexOf(maxDay) : null,
    mostLogged: topPlant ? { id: topPlant.id, name: topPlant.name, entries: perPlant.get(topPlant.id) ?? 0 } : null
  }
}

/** Photos in the period, newest first (for the photo picker). */
export function periodPhotos(data: Pick<GrowData, 'entries'>, period: Period): WrappedPhoto[] {
  return photosOf(data.entries.filter(e => inPeriod(e.date, period))).sort((a, b) => b.date.localeCompare(a.date))
}
