import { describe, expect, it } from 'vitest'
import { estimateInterval, parsePotLitres, suggestWatering, wateringGaps } from '../app/utils/watering'

const base = { potSize: '11 l', medium: 'soil' as const, stage: 'vegetative' as const }

describe('parsePotLitres', () => {
  it.each([
    ['11 l', 11],
    ['11L', 11],
    ['3,5 l', 3.5],
    ['500 ml', 0.5],
    ['3 gal', 11.355],
    ['20', 20],
    ['', null],
    ['big', null]
  ])('%s → %s', (input, out) => {
    const v = parsePotLitres(input)
    if (out === null) expect(v).toBeNull()
    else expect(v).toBeCloseTo(out, 2)
  })
})

describe('estimateInterval', () => {
  it('grows with the pot', () => {
    expect(estimateInterval('1 l', 'soil', 'vegetative')).toBe(1)
    expect(estimateInterval('3 l', 'soil', 'vegetative')).toBe(2)
    expect(estimateInterval('11 l', 'soil', 'vegetative')).toBe(4)
    expect(estimateInterval('25 l', 'soil', 'vegetative')).toBe(5)
  })
  it('halves for coco/hydro, adds a day for seedlings, takes one off in flower', () => {
    expect(estimateInterval('11 l', 'coco', 'vegetative')).toBe(2)
    expect(estimateInterval('11 l', 'soil', 'seedling')).toBe(5)
    expect(estimateInterval('11 l', 'soil', 'flowering')).toBe(3)
  })
  it('defaults to 3 days without a pot size', () => {
    expect(estimateInterval('', 'soil', 'vegetative')).toBe(3)
  })
})

describe('wateringGaps', () => {
  it('dedupes and sorts dates', () => {
    expect(wateringGaps(['2026-10-05', '2026-10-01', '2026-10-05', '2026-10-03']).map(g => g.days)).toEqual([2, 2])
  })
})

describe('suggestWatering', () => {
  it('uses the estimate without history', () => {
    const s = suggestWatering({ ...base, dates: [] })
    expect(s).toMatchObject({ source: 'estimate', days: 4, samples: 0, learned: null })
  })

  it('blends while there are fewer than three gaps', () => {
    // one gap of 2 days, estimate 4 → (2 + 4 * 2) / 3 = 3.33
    const s = suggestWatering({ ...base, dates: ['2026-10-01', '2026-10-03'] })
    expect(s.source).toBe('blend')
    expect(s.days).toBe(3)
  })

  it('learns the rhythm from history', () => {
    const s = suggestWatering({ ...base, dates: ['2026-10-01', '2026-10-03', '2026-10-05', '2026-10-07', '2026-10-09'] })
    expect(s).toMatchObject({ source: 'history', days: 2, samples: 4, learned: 2, irregular: false })
  })

  it('weights recent gaps more', () => {
    // older gaps 4 days, newest 2 days
    const s = suggestWatering({ ...base, dates: ['2026-09-01', '2026-09-05', '2026-09-09', '2026-09-13', '2026-09-15', '2026-09-17'] })
    expect(s.learned!).toBeLessThan(3.2)
    expect(s.learned!).toBeGreaterThan(2)
  })

  it('ignores long breaks', () => {
    const s = suggestWatering({ ...base, dates: ['2026-08-01', '2026-09-10', '2026-09-13', '2026-09-16', '2026-09-19'] })
    expect(s.samples).toBe(3)
    expect(s.days).toBe(3)
  })

  it('counts gaps from an earlier stage half', () => {
    const dates = ['2026-09-01', '2026-09-05', '2026-09-09', '2026-09-11', '2026-09-13']
    const plain = suggestWatering({ ...base, dates })
    const staged = suggestWatering({ ...base, dates, stageSince: '2026-09-09' })
    expect(staged.learned!).toBeLessThan(plain.learned!)
  })

  it('flags irregular watering', () => {
    const s = suggestWatering({ ...base, dates: ['2026-09-01', '2026-09-02', '2026-09-10', '2026-09-11', '2026-09-20'] })
    expect(s.irregular).toBe(true)
  })

  it('stays within 1–14 days', () => {
    expect(suggestWatering({ ...base, dates: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'] }).days).toBe(1)
  })
})
