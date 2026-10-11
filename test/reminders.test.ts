import { describe, expect, it } from 'vitest'
import { planReminders } from '../app/utils/reminders'

const now = new Date(2026, 9, 11, 10, 0)

describe('planReminders', () => {
  it('groups watering and tasks per day at the chosen time', () => {
    const days = planReminders({
      plants: [
        { id: 'a', name: 'GG4', nextWater: '2026-10-11', interval: 3 },
        { id: 'b', name: 'NL', nextWater: '2026-10-14', interval: 3 }
      ],
      tasks: [{ title: 'Burp jars', date: '2026-10-14', done: false }, { title: 'x', date: '2026-10-12', done: true }]
    }, '18:00', now, 7)
    expect(days.map(d => d.date)).toEqual(['2026-10-11', '2026-10-14', '2026-10-17'])
    expect(days[0]!.at.getHours()).toBe(18)
    expect(days[1]!.water.map(w => w.name)).toEqual(['GG4', 'NL'])
    expect(days[1]!.tasks).toEqual(['Burp jars'])
  })

  it('moves overdue items to the next slot', () => {
    const late = new Date(2026, 9, 11, 20, 0)
    const days = planReminders({
      plants: [{ id: 'a', name: 'GG4', nextWater: '2026-10-08', interval: 2 }],
      tasks: [{ title: 'Old task', date: '2026-10-01', done: false }]
    }, '18:00', late, 5)
    expect(days[0]!.date).toBe('2026-10-12')
    expect(days[0]!.tasks).toEqual(['Old task'])
    expect(days.map(d => d.date)).toEqual(['2026-10-12', '2026-10-14', '2026-10-16'])
  })
})
