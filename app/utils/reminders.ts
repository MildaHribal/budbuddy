import { addDays, daysBetween, toISODate } from './date'

/** Day the watering countdown runs from: the last water/feed, else when the plant was added (a back-dated start is not "overdue"). */
export function wateringBase(startDate: string, createdAt: string, lastDate: string | null | undefined): string {
  if (lastDate) return lastDate
  const added = new Date(createdAt)
  const addedDay = Number.isNaN(added.getTime()) ? startDate : toISODate(added)
  return addedDay > startDate ? addedDay : startDate
}

export interface ReminderInput {
  plants: { id: string, name: string, nextWater: string | null, interval: number | null }[]
  tasks: { title: string, date: string, done: boolean }[]
}

export interface ReminderDay {
  date: string
  at: Date
  water: { id: string, name: string }[]
  tasks: string[]
}

function atTime(iso: string, hhmm: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  const [h = 18, min = 0] = hhmm.split(':').map(Number)
  return new Date(y!, m! - 1, d!, h, min)
}

/** One reminder per day for the coming `days`, overdue items fold into the first slot. */
export function planReminders(input: ReminderInput, time: string, now = new Date(), days = 14): ReminderDay[] {
  const today = toISODate(now)
  const first = atTime(today, time) > now ? today : addDays(today, 1)
  const last = addDays(today, days)
  const byDate = new Map<string, ReminderDay>()
  const slot = (date: string) => {
    const d = date < first ? first : date
    if (d > last) return null
    let day = byDate.get(d)
    if (!day) byDate.set(d, (day = { date: d, at: atTime(d, time), water: [], tasks: [] }))
    return day
  }

  for (const p of input.plants) {
    if (!p.nextWater) continue
    let date = p.nextWater
    for (let i = 0; i < 30 && date <= last; i++) {
      const day = slot(date)
      if (day && !day.water.some(w => w.id === p.id)) day.water.push({ id: p.id, name: p.name })
      if (!p.interval || p.interval <= 0) break
      // after an overdue date, continue from the first slot
      date = addDays(date < first ? first : date, p.interval)
    }
  }
  for (const t of input.tasks) {
    if (t.done) continue
    slot(t.date)?.tasks.push(t.title)
  }
  return [...byDate.values()].sort((a, b) => daysBetween(b.date, a.date))
}
