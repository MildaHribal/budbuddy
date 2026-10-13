import { addDays, toISODate } from './date'

export interface LightWindow {
  /** HH:MM */
  lightsOn: string
  hours: number
}

export interface NagItem {
  kind: 'water' | 'task'
  /** plant id for water, task id for tasks */
  id: string
  label: string
  /** YYYY-MM-DD the item is due; earlier = overdue */
  due: string
  window: LightWindow
  route: string
}

export interface NagSlot {
  at: Date
  water: string[]
  tasks: string[]
  route: string
}

export interface NagOptions {
  everyHours: number
  /** skip slots between 22:00 and 07:00 */
  quietNight: boolean
  days?: number
  max?: number
}

/** Daylight fallback for natural light or a missing schedule. */
export const DAYLIGHT: LightWindow = { lightsOn: '08:00', hours: 12 }
const MAX_WINDOW_H = 18

export function lightWindow(lightsOn: string | null | undefined, hours: number | null | undefined): LightWindow {
  if (!lightsOn || !/^\d{2}:\d{2}$/.test(lightsOn) || !hours || hours <= 0) return DAYLIGHT
  return { lightsOn, hours: Math.min(hours, MAX_WINDOW_H) }
}

function at(iso: string, hhmm: string, plusMin = 0): Date {
  const [y, m, d] = iso.split('-').map(Number)
  const [h = 0, min = 0] = hhmm.split(':').map(Number)
  return new Date(y!, m! - 1, d!, h, min + plusMin)
}

const isQuiet = (d: Date) => d.getHours() >= 22 || d.getHours() < 7

/** Repeating reminders from lights-on every few hours until lights-off, from the due day on, grouped by time. */
export function planNags(items: readonly NagItem[], opts: NagOptions, now = new Date()): NagSlot[] {
  const every = Math.max(1, Math.round(opts.everyHours)) * 60
  const days = opts.days ?? 3
  const today = toISODate(now)
  const last = addDays(today, days - 1)
  const slots = new Map<number, NagSlot>()

  for (const item of items) {
    // a window that started yesterday may still be running (e.g. lights on 20:00 for 18 h)
    let day = item.due < today ? addDays(today, -1) : addDays(item.due, -1)
    for (; day <= last; day = addDays(day, 1)) {
      const start = at(day, item.window.lightsOn)
      const end = at(day, item.window.lightsOn, item.window.hours * 60)
      for (let t = start; t < end; t = new Date(t.getTime() + every * 60_000)) {
        if (t <= now || toISODate(t) < item.due || toISODate(t) > last) continue
        if (opts.quietNight && isQuiet(t)) continue
        const key = t.getTime()
        let slot = slots.get(key)
        if (!slot) slots.set(key, (slot = { at: t, water: [], tasks: [], route: item.route }))
        const list = item.kind === 'water' ? slot.water : slot.tasks
        if (!list.includes(item.label)) list.push(item.label)
        if (slot.route !== item.route) slot.route = '/'
      }
    }
  }
  return [...slots.values()].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, opts.max ?? 200)
}
