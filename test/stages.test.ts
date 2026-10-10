import { describe, expect, it } from 'vitest'
import { healthInfo, nextStage, stageInfo, stageProgress, stageStartDate } from '../app/utils/stages'

const plant = {
  startDate: '2026-08-01',
  stage: 'flowering' as const,
  stageHistory: [
    { stage: 'seedling' as const, date: '2026-08-01' },
    { stage: 'vegetative' as const, date: '2026-08-20' },
    { stage: 'flowering' as const, date: '2026-09-30' }
  ]
}

describe('stages', () => {
  it('orders the lifecycle', () => {
    expect(nextStage('germination')).toBe('seedling')
    expect(nextStage('flowering')).toBe('drying')
    expect(nextStage('curing')).toBeNull()
  })

  it('falls back for unknown stages (old capitalised data)', () => {
    expect(stageInfo('Flowering').id).toBe('seedling')
    expect(stageInfo('flowering').label).toBe('Flowering')
  })

  it('measures progress from the start of the current stage', () => {
    expect(stageStartDate(plant)).toBe('2026-09-30')
    const p = stageProgress(plant, '2026-10-11')
    expect(p.age).toBe(71)
    expect(p.dayInStage).toBe(11)
    expect(p.percent).toBe(Math.round((11 / 63) * 100))
    expect(p.overdue).toBe(false)
  })

  it('uses the start date when there is no history', () => {
    expect(stageStartDate({ ...plant, stageHistory: [] })).toBe('2026-08-01')
  })

  it('maps health levels', () => {
    expect(healthInfo(5).label).toBe('Thriving')
    expect(healthInfo(3.6).label).toBe('Good')
    expect(healthInfo(99).label).toBe('Good')
  })
})
