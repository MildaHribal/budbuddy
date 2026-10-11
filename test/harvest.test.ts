import { describe, expect, it } from 'vitest'
import { harvestEstimate } from '../app/utils/harvest'

const photo = {
  type: 'photoperiod' as const,
  stage: 'flowering' as const,
  archived: false,
  startDate: '2026-08-01',
  stageHistory: [
    { stage: 'seedling' as const, date: '2026-08-01' },
    { stage: 'flowering' as const, date: '2026-10-01' }
  ]
}

describe('harvestEstimate', () => {
  it('skips plants that are not flowering', () => {
    expect(harvestEstimate({ ...photo, stage: 'vegetative' }, '2026-10-10')).toBeNull()
    expect(harvestEstimate({ ...photo, archived: true }, '2026-10-10')).toBeNull()
  })

  it('photoperiod: 8–10 weeks from the flip', () => {
    const e = harvestEstimate(photo, '2026-10-11')!
    expect(e.from).toBe('2026-11-26')
    expect(e.to).toBe('2026-12-10')
    expect(e.inMin).toBe(46)
    expect(e.inMax).toBe(60)
    expect(e.status).toBe('ahead')
    expect(e.windowStart).toBeCloseTo(56 / 70)
    expect(e.position).toBeCloseTo(10 / 70)
  })

  it('autoflower: 9–11 weeks of total age', () => {
    const auto = { ...photo, type: 'autoflower' as const, stageHistory: [{ stage: 'seedling' as const, date: '2026-08-01' }, { stage: 'flowering' as const, date: '2026-08-25' }] }
    const e = harvestEstimate(auto, '2026-09-20')!
    expect(e.from).toBe('2026-10-03')
    expect(e.to).toBe('2026-10-17')
    expect(e.inMin).toBe(13)
  })

  it('autoflower flipped late still gets 4 weeks of bloom', () => {
    const auto = { ...photo, type: 'autoflower' as const }
    const e = harvestEstimate(auto, '2026-10-02')!
    expect(e.from).toBe('2026-10-29')
    expect(e.to).toBe('2026-11-12')
  })

  it('reports window and past', () => {
    expect(harvestEstimate(photo, '2026-12-01')!.status).toBe('window')
    const late = harvestEstimate(photo, '2026-12-20')!
    expect(late.status).toBe('past')
    expect(late.inMax).toBe(0)
    expect(late.position).toBe(1)
  })
})
