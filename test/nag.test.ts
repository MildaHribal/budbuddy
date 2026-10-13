import { describe, expect, it } from 'vitest'
import { lightWindow, planNags, type NagItem } from '../app/utils/nag'

const water = (due: string, lightsOn = '06:00', hours = 18): NagItem => ({
  kind: 'water', id: 'p1', label: 'Bára', due, window: lightWindow(lightsOn, hours), route: '/plants/p1'
})
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('planNags', () => {
  const now = new Date(2026, 9, 13, 12, 30)

  it('repeats every 2 h from lights-on on the due day', () => {
    const slots = planNags([water('2026-10-14')], { everyHours: 2, quietNight: true, days: 2 }, now)
    expect(slots.map(s => `${day(s.at)} ${hhmm(s.at)}`)).toEqual([
      '2026-10-14 08:00', '2026-10-14 10:00', '2026-10-14 12:00', '2026-10-14 14:00',
      '2026-10-14 16:00', '2026-10-14 18:00', '2026-10-14 20:00'
    ])
  })

  it('keeps the 06:00 lights-on slot when quiet night is off', () => {
    const slots = planNags([water('2026-10-14')], { everyHours: 2, quietNight: false, days: 2 }, now)
    expect(hhmm(slots[0]!.at)).toBe('06:00')
    expect(hhmm(slots.at(-1)!.at)).toBe('22:00')
  })

  it('starts overdue items from now on and continues the next days', () => {
    const slots = planNags([water('2026-10-10')], { everyHours: 2, quietNight: true, days: 2 }, now)
    expect(slots[0]!.at > now).toBe(true)
    expect(hhmm(slots[0]!.at)).toBe('14:00')
    expect(slots.some(s => day(s.at) === '2026-10-14')).toBe(true)
  })

  it('follows a night light schedule that crosses midnight', () => {
    const slots = planNags([water('2026-10-14', '20:00', 12)], { everyHours: 2, quietNight: false, days: 2 }, now)
    expect(slots.map(s => `${day(s.at)} ${hhmm(s.at)}`).slice(0, 4)).toEqual([
      '2026-10-14 00:00', '2026-10-14 02:00', '2026-10-14 04:00', '2026-10-14 06:00'
    ])
  })

  it('groups items due at the same time into one slot', () => {
    const task: NagItem = { kind: 'task', id: 't1', label: 'Defoliace', due: '2026-10-14', window: lightWindow('06:00', 18), route: '/' }
    const slots = planNags([water('2026-10-14'), task], { everyHours: 2, quietNight: true, days: 2 }, now)
    expect(slots[0]!.water).toEqual(['Bára'])
    expect(slots[0]!.tasks).toEqual(['Defoliace'])
    expect(slots[0]!.route).toBe('/')
  })

  it('falls back to daylight without a schedule and caps long days', () => {
    expect(lightWindow(null, null)).toEqual({ lightsOn: '08:00', hours: 12 })
    expect(lightWindow('06:00', 24).hours).toBe(18)
  })

  it('respects the slot limit', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ ...water('2026-10-13'), id: `p${i}`, label: `P${i}` }))
    expect(planNags(items, { everyHours: 1, quietNight: false, days: 3, max: 20 }, now)).toHaveLength(20)
  })
})
