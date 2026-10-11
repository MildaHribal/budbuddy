import { describe, expect, it } from 'vitest'
import { completedWeek, dueWeek, updateStreak, weekRange } from '../app/utils/weeklyUpdate'

const plant = { startDate: '2026-09-01' }

describe('weekly updates', () => {
  it('counts completed grow weeks', () => {
    expect(completedWeek(plant, '2026-09-05')).toBe(0)
    expect(completedWeek(plant, '2026-09-07')).toBe(1)
    expect(completedWeek(plant, '2026-09-14')).toBe(2)
  })

  it('prompts once per week and waits 7 days after the last update', () => {
    expect(dueWeek(plant, [], '2026-09-04')).toBeNull()
    expect(dueWeek(plant, [], '2026-09-07')).toBe(1)
    expect(dueWeek(plant, [{ week_no: 1, created_at: '2026-09-07T10:00:00Z' }], '2026-09-10')).toBeNull()
    expect(dueWeek(plant, [{ week_no: 1, created_at: '2026-09-07T10:00:00Z' }], '2026-09-14')).toBe(2)
    expect(dueWeek(plant, [{ week_no: 2, created_at: '2026-09-08T10:00:00Z' }], '2026-09-15')).toBeNull()
  })

  it('clips the week range to today', () => {
    expect(weekRange(plant, 2, '2026-09-12')).toEqual({ from: '2026-09-08', to: '2026-09-12' })
  })

  it('allows one free skip in the soft streak', () => {
    const u = (w: number) => ({ week_no: w, created_at: '2026-09-01' })
    expect(updateStreak([u(1), u(2), u(4)], 5)).toEqual({ updated: 3, weeks: 4, consistent: true })
    expect(updateStreak([u(1), u(4)], 5)?.consistent).toBe(false)
    expect(updateStreak([], 3)).toBeNull()
  })
})
