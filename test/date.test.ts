import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, daysSince, formatRelativeDay, isValidISODate, toISODate, weekOf } from '../app/utils/date'

describe('date utils', () => {
  it('formats local dates without shifting to UTC', () => {
    // 23:30 local time must stay on the same calendar day
    expect(toISODate(new Date(2026, 9, 11, 23, 30))).toBe('2026-10-11')
    expect(toISODate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 3)).toBe('2026-10-27')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts whole days', () => {
    expect(daysBetween('2026-10-01', '2026-10-11')).toBe(10)
    expect(daysBetween('2026-10-11', '2026-10-01')).toBe(-10)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysSince('2026-10-20', '2026-10-11')).toBe(0)
  })

  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true)
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-2-3')).toBe(false)
    expect(isValidISODate(42)).toBe(false)
  })

  it('builds a Monday-based week', () => {
    const week = weekOf('2026-10-11') // a Sunday
    expect(week).toHaveLength(7)
    expect(week[0]).toBe('2026-10-05')
    expect(week[6]).toBe('2026-10-11')
  })

  it('describes relative days', () => {
    expect(formatRelativeDay('2026-10-11', '2026-10-11')).toBe('Today')
    expect(formatRelativeDay('2026-10-10', '2026-10-11')).toBe('Yesterday')
    expect(formatRelativeDay('2026-10-08', '2026-10-11')).toBe('3 days ago')
  })
})
