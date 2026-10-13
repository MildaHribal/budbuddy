import { describe, expect, it } from 'vitest'
import type { Plant } from '../app/types/grow'
import { milestones, repeatDates } from '../app/utils/upcoming'

const base: Plant = {
  id: 'p',
  name: 'P',
  strain: '',
  type: 'photoperiod',
  stage: 'vegetative',
  stageHistory: [{ stage: 'seedling', date: '2026-09-01' }, { stage: 'vegetative', date: '2026-10-01' }],
  startDate: '2026-09-01',
  potSize: '',
  medium: 'soil',
  location: 'indoor',
  wateringInterval: 3,
  health: 4,
  photoId: null,
  notes: '',
  harvest: null,
  archived: false,
  createdAt: '',
  updatedAt: ''
}

describe('repeatDates', () => {
  it('repeats from the next due date within the window', () => {
    expect(repeatDates('2026-10-12', 3, '2026-10-10', 7)).toEqual(['2026-10-12', '2026-10-15'])
  })

  it('restarts an overdue rhythm from today', () => {
    expect(repeatDates('2026-10-08', 2, '2026-10-10', 5)).toEqual(['2026-10-12', '2026-10-14'])
  })

  it('ignores a missing interval', () => {
    expect(repeatDates('2026-10-12', 0, '2026-10-10', 7)).toEqual([])
  })
})

describe('milestones', () => {
  it('expects the next stage after the typical stage length', () => {
    const [m] = milestones([base], '2026-10-11')
    expect(m).toMatchObject({ kind: 'stage', stage: 'flowering', date: '2026-11-12', inDays: 32 })
  })

  it('uses the harvest window for flowering plants and skips archived ones', () => {
    const flowering: Plant = { ...base, id: 'f', stage: 'flowering', stageHistory: [...base.stageHistory, { stage: 'flowering', date: '2026-10-01' }] }
    const list = milestones([flowering, { ...base, id: 'a', archived: true }], '2026-10-11')
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ plantId: 'f', kind: 'harvest', date: '2026-11-26' })
  })

  it('drops milestones that are past or beyond the horizon', () => {
    expect(milestones([base], '2026-11-20')).toEqual([])
    expect(milestones([base], '2026-10-11', 30)).toEqual([])
  })
})
