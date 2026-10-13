import { describe, expect, it } from 'vitest'
import { burpSlots, burpStatus, cureDay, curePhase, dryingAdvice, dryingDay, jarRhState, latestReading, nextJarLabel, normalizeCure, planBurpNotices, planDryNotices } from '../app/utils/curing'
import { normalizeData } from '../app/utils/schema'

const jar = (startDate: string, burps: string[] = [], doneDate: string | null = null) => ({ id: 'j' + startDate, startDate, burps, doneDate })

describe('drying', () => {
  it('counts chop day as day 1', () => {
    expect(dryingDay('2026-10-01', '2026-10-01')).toBe(1)
    expect(dryingDay('2026-10-01', '2026-10-08')).toBe(8)
  })

  it('flags humid and warm rooms before the stem result', () => {
    expect(dryingAdvice({ tempC: 24, humidity: 70, stem: 'bends' }, 3)).toEqual(['tooHumid', 'tooWarm', 'keepGoing'])
    expect(dryingAdvice({ tempC: 12, humidity: 45, stem: null }, 3)).toEqual(['tooDry', 'tooCold'])
  })

  it('reads the stem test', () => {
    expect(dryingAdvice({ tempC: 19, humidity: 58, stem: 'snaps' }, 9)).toEqual(['ready'])
    expect(dryingAdvice({ tempC: 19, humidity: 58, stem: 'snaps' }, 3)).toEqual(['tooFast'])
    expect(dryingAdvice({ tempC: 19, humidity: 58, stem: 'cracks' }, 6)).toEqual(['almost'])
    expect(dryingAdvice({ tempC: 19, humidity: 58, stem: 'bends' }, 16)).toEqual(['slow'])
  })

  it('without a check it is on track until two weeks', () => {
    expect(dryingAdvice(null, 4)).toEqual(['onTrack'])
    expect(dryingAdvice(null, 15)).toEqual(['slow'])
  })
})

describe('burp schedule', () => {
  it('tapers from three times a day to weekly', () => {
    expect(curePhase(0)).toBe('daily3')
    expect(curePhase(7)).toBe('daily')
    expect(curePhase(14)).toBe('twiceWeekly')
    expect(curePhase(28)).toBe('weekly')
    expect(curePhase(56)).toBe('done')
    const j = jar('2026-10-01')
    expect(burpSlots(j, '2026-10-01')).toEqual(['09:00', '14:00', '20:00'])
    expect(burpSlots(j, '2026-10-09')).toEqual(['20:00'])
    // weeks 3–4: twice a week (day 14, 17, 21, 24)
    const days = Array.from({ length: 14 }, (_, i) => i + 14).filter(d => burpSlots(j, `2026-10-${String(1 + d).padStart(2, '0')}`).length)
    expect(days).toEqual([14, 17, 21, 24])
    expect(burpSlots(j, '2026-09-30')).toEqual([])
    expect(burpSlots({ ...j, doneDate: '2026-10-05' }, '2026-10-06')).toEqual([])
  })

  it('is due after a missed slot and clears once burped', () => {
    const now = new Date(2026, 9, 2, 15, 0)
    expect(burpStatus(jar('2026-10-01'), now)).toMatchObject({ due: true })
    expect(burpStatus(jar('2026-10-01'), now).since).toEqual(new Date(2026, 9, 2, 14, 0))
    const burped = jar('2026-10-01', [new Date(2026, 9, 2, 14, 10).toISOString()])
    const st = burpStatus(burped, now)
    expect(st.due).toBe(false)
    expect(st.next).toEqual(new Date(2026, 9, 2, 20, 0))
  })

  it('a burp up to an hour early still counts', () => {
    const now = new Date(2026, 9, 2, 15, 0)
    expect(burpStatus(jar('2026-10-01', [new Date(2026, 9, 2, 13, 20).toISOString()]), now).due).toBe(false)
  })

  it('merges jars into one notification per slot', () => {
    const now = new Date(2026, 9, 2, 10, 0)
    const notes = planBurpNotices([jar('2026-10-01'), { ...jar('2026-10-02'), id: 'b' }], now, 1)
    expect(notes.map(n => [n.at.getHours(), n.jars.length])).toEqual([[14, 2], [20, 2]])
  })

  it('skips a slot that was just burped', () => {
    const now = new Date(2026, 9, 2, 13, 40)
    const notes = planBurpNotices([jar('2026-10-01', [new Date(2026, 9, 2, 13, 35).toISOString()])], now, 1)
    expect(notes.map(n => n.at.getHours())).toEqual([20])
  })

  it('daily drying reminders skip checked days', () => {
    const now = new Date(2026, 9, 2, 10, 0)
    const out = planDryNotices([{ id: 'p', checkedDates: ['2026-10-02'] }], '18:00', now, 3)
    expect(out.map(o => o.at.getDate())).toEqual([3, 4])
  })
})

describe('jar humidity', () => {
  it('maps readings to advice states', () => {
    expect(jarRhState(75)).toBe('wet')
    expect(jarRhState(67)).toBe('damp')
    expect(jarRhState(64)).toBe('high')
    expect(jarRhState(60)).toBe('ideal')
    expect(jarRhState(56)).toBe('low')
    expect(jarRhState(50)).toBe('dry')
  })

  it('latest reading and cure day', () => {
    expect(latestReading({ readings: [{ at: '2026-10-02T10:00:00Z', humidity: 64 }, { at: '2026-10-03T10:00:00Z', humidity: 61 }] })?.humidity).toBe(61)
    expect(latestReading({ readings: [] })).toBeNull()
    expect(cureDay({ startDate: '2026-10-01' }, '2026-10-08')).toBe(7)
  })

  it('labels jars', () => {
    expect(nextJarLabel([])).toBe('#1')
    expect(nextJarLabel([{ label: '#2' }])).toBe('#3')
  })
})

describe('cure data normalisation', () => {
  it('drops invalid items and orphaned plants', () => {
    const cure = normalizeCure({
      checks: [{ plantId: 'p', date: '2026-10-01', humidity: '58', stem: 'snaps' }, { plantId: 'x', date: '2026-10-01' }, { plantId: 'p', humidity: 140, stem: 'wet' }],
      jars: [{ plantId: 'p', label: 'A', weightG: '12,5', startDate: '2026-10-02', readings: [{ at: '2026-10-02T10:00:00Z', humidity: 62 }, { at: 'nope', humidity: 1 }], burps: ['2026-10-02T10:00:00Z', 5] }]
    }, new Set(['p']))
    expect(cure.checks).toHaveLength(2)
    expect(cure.checks[0]).toMatchObject({ humidity: 58, stem: 'snaps' })
    expect(cure.checks[1]).toMatchObject({ humidity: null, stem: null })
    expect(cure.jars[0]).toMatchObject({ weightG: 12.5, readings: [{ humidity: 62 }], burps: ['2026-10-02T10:00:00Z'], doneDate: null })
  })

  it('old saves without cure data load with empty collections', () => {
    const data = normalizeData({ plants: [{ id: 'p', name: 'A' }] })
    expect(data.cure).toEqual({ checks: [], jars: [] })
    expect(data.treatments).toEqual([])
  })

  it('survives a JSON round trip through normalizeData', () => {
    const data = normalizeData({
      plants: [{ id: 'p', name: 'A' }],
      cure: { checks: [], jars: [{ id: 'j', plantId: 'p', label: '#1', weightG: 20, startDate: '2026-10-02', readings: [], burps: [], doneDate: null }] }
    })
    expect(normalizeData(JSON.parse(JSON.stringify(data))).cure!.jars[0]!.id).toBe('j')
  })
})
