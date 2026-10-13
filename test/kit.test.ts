import { describe, expect, it } from 'vitest'
import type { Plant } from '../app/types/grow'
import type { CostsData, FeedSchedule, InventoryData } from '../app/types/kit'
import { devicesKwh, kwh, runPeriod, runTotals } from '../app/utils/costs'
import { BUNDLED_SCHEDULES } from '../app/utils/feedSchedules'
import { feedLinesText, matchStock, scheduleWeekFor, stockUsage, weekDoses } from '../app/utils/feeding'
import { nutrientLeft, nutrientLow, setEntryUsage } from '../app/utils/inventory'
import { normalizeFeeding, normalizeLegal } from '../app/utils/kitSchema'
import { legalStatus, storedHarvests } from '../app/utils/legal'
import { normalizeData } from '../app/utils/schema'

function plant(p: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    name: 'A',
    strain: 'X',
    type: 'photoperiod',
    stage: 'vegetative',
    stageHistory: [{ stage: 'seedling', date: '2026-01-01' }, { stage: 'vegetative', date: '2026-01-15' }],
    startDate: '2026-01-01',
    potSize: '',
    medium: 'soil',
    location: 'indoor',
    wateringInterval: null,
    health: 4,
    photoId: null,
    notes: '',
    harvest: null,
    archived: false,
    createdAt: '',
    updatedAt: '',
    ...p
  }
}

const schedule: FeedSchedule = {
  id: 's',
  brand: 'B',
  line: '',
  media: ['soil'],
  products: [{ id: 'g', name: 'Grow' }, { id: 'b', name: 'Bloom' }, { id: 'm', name: 'Microbes', unit: 'g' }],
  weeks: [
    { phase: 'bloom', n: 2, doses: { b: 3 } },
    { phase: 'veg', n: 1, doses: { g: 2 } },
    { phase: 'veg', n: 2, doses: { g: 4, m: 0.4 } },
    { phase: 'bloom', n: 1, doses: { b: 2 } },
    { phase: 'flush', n: 1, doses: {} }
  ]
}

describe('feeding schedule weeks', () => {
  it('counts veg weeks from the start of veg and repeats the last one', () => {
    const p = plant()
    expect(scheduleWeekFor(p, schedule, '2026-01-15')?.week.n).toBe(1)
    expect(scheduleWeekFor(p, schedule, '2026-01-22')?.week.doses.g).toBe(4)
    const late = scheduleWeekFor(p, schedule, '2026-03-01')
    expect(late?.week.n).toBe(2)
    expect(late?.repeated).toBe(true)
  })

  it('counts bloom weeks from the flip and runs into the flush', () => {
    const p = plant({ stage: 'flowering', stageHistory: [...plant().stageHistory, { stage: 'flowering', date: '2026-02-01' }] })
    expect(scheduleWeekFor(p, schedule, '2026-02-03')?.week).toMatchObject({ phase: 'bloom', n: 1 })
    expect(scheduleWeekFor(p, schedule, '2026-02-08')?.week).toMatchObject({ phase: 'bloom', n: 2 })
    expect(scheduleWeekFor(p, schedule, '2026-02-15')?.week.phase).toBe('flush')
  })

  it('starts young plants on veg week 1 when the chart has no seedling phase', () => {
    const p = plant({ stage: 'seedling', stageHistory: [{ stage: 'seedling', date: '2026-01-01' }] })
    expect(scheduleWeekFor(p, schedule, '2026-01-03')?.week).toMatchObject({ phase: 'veg', n: 1 })
  })

  it('has no week after harvest', () => {
    expect(scheduleWeekFor(plant({ stage: 'drying' }), schedule, '2026-02-01')).toBeNull()
  })

  it('scales doses by strength and water volume, keeping powder units', () => {
    const doses = weekDoses(schedule, schedule.weeks[2]!, 50, 10)
    expect(doses).toEqual([
      { productId: 'g', name: 'Grow', unit: 'ml', perLitre: 2, total: 20 },
      { productId: 'm', name: 'Microbes', unit: 'g', perLitre: 0.2, total: 2 }
    ])
    expect(feedLinesText([{ name: 'Grow', dose: 2 }, { name: 'Microbes', dose: 0.2, unit: 'g' }])).toBe('Grow 2 ml/L, Microbes 0.2 g/L')
  })

  it('takes poured ml from linked bottles only', () => {
    const lines = [{ name: 'Grow', dose: 2, stockId: 'x' }, { name: 'Bloom', dose: 1, stockId: null }, { name: 'M', dose: 1, unit: 'g' as const, stockId: 'y' }]
    expect(stockUsage(lines, 1500)).toEqual([{ stockId: 'x', ml: 3 }])
    expect(stockUsage(lines, null)).toEqual([])
  })

  it('matches bottles by name', () => {
    const stock = [{ id: '1', name: 'BioBizz Bio-Grow 1 L' }, { id: '2', name: 'Top-Max' }]
    expect(matchStock('Bio-Grow', stock)?.id).toBe('1')
    expect(matchStock('top max', stock)?.id).toBe('2')
    expect(matchStock('Bloom', stock)).toBeUndefined()
  })
})

describe('bundled schedules', () => {
  it.each(BUNDLED_SCHEDULES.map(s => [s.id, s] as const))('%s is consistent', (_id, s) => {
    const ids = new Set(s.products.map(p => p.id))
    expect(ids.size).toBe(s.products.length)
    expect(s.source?.url).toMatch(/^https:\/\//)
    expect(s.source?.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(s.weeks.some(w => w.phase === 'bloom')).toBe(true)
    for (const w of s.weeks) {
      for (const [k, v] of Object.entries(w.doses)) {
        expect(ids.has(k)).toBe(true)
        expect(v).toBeGreaterThan(0)
        expect(v).toBeLessThan(20)
      }
    }
  })

  it('has unique ids', () => {
    expect(new Set(BUNDLED_SCHEDULES.map(s => s.id)).size).toBe(BUNDLED_SCHEDULES.length)
  })
})

describe('costs', () => {
  it('computes kWh', () => {
    expect(kwh(240, 18, 30)).toBeCloseTo(129.6)
    expect(devicesKwh([{ id: 'l', name: 'LED', watts: 100, kind: 'light', hoursVeg: 18, hoursFlower: 12 }], 10, 10)).toBeCloseTo(30)
  })

  it('splits a run into veg and flower days', () => {
    const p = plant({
      stage: 'drying',
      stageHistory: [{ stage: 'seedling', date: '2026-01-01' }, { stage: 'flowering', date: '2026-01-11' }, { stage: 'drying', date: '2026-01-21' }],
      harvest: { date: '2026-01-21', wetWeight: 400, dryWeight: 100, notes: '' }
    })
    expect(runPeriod([p], '2026-03-01')).toMatchObject({ start: '2026-01-01', end: '2026-01-21', vegDays: 10, flowerDays: 10 })
    const costs: CostsData = {
      currency: 'CZK',
      kwhPrice: 5,
      devices: [{ id: 'l', name: 'LED', watts: 100, kind: 'light', hoursVeg: 18, hoursFlower: 12 }],
      expenses: [{ id: 'e', date: '2026-01-01', category: 'seeds', title: 'Seeds', amount: 350, runId: 'r', createdAt: '' }],
      runs: [{ id: 'r', name: 'Run', plantIds: ['p1'], createdAt: '' }]
    }
    const total = runTotals(costs.runs[0]!, [p], costs, '2026-03-01')
    expect(total.kwh).toBeCloseTo(30)
    expect(total.total).toBeCloseTo(500)
    expect(total.costPerGram).toBeCloseTo(5)
    expect(total.gramsPerWatt).toBeCloseTo(1)
    expect(total.complete).toBe(true)
  })
})

describe('inventory', () => {
  it('subtracts usage of existing entries and of deleted plants', () => {
    const stock = { id: 's', name: 'Grow', volumeMl: 1000, startMl: 1000, countedAt: '2026-01-01T00:00:00Z', createdAt: '' }
    const inv: InventoryData = { seeds: [], nutrients: [stock], supplies: [], usage: [] }
    setEntryUsage(inv, 'e1', 'p1', [{ stockId: 's', ml: 100 }], '2026-01-02T00:00:00Z')
    setEntryUsage(inv, 'e2', 'gone', [{ stockId: 's', ml: 50 }], '2026-01-02T00:00:00Z')
    setEntryUsage(inv, 'e3', 'p1', [{ stockId: 's', ml: 70 }], '2026-01-02T00:00:00Z')
    // e3 was deleted while its plant still exists
    expect(nutrientLeft(stock, inv, [{ id: 'e1' }], new Set(['p1']))).toBe(850)
    setEntryUsage(inv, 'e1', 'p1', [{ stockId: 's', ml: 300 }])
    expect(inv.usage.find(u => u.entryId === 'e1')?.at).toBe('2026-01-02T00:00:00Z')
    expect(nutrientLeft(stock, inv, [{ id: 'e1' }], new Set(['p1']))).toBe(650)
    expect(nutrientLow(150, stock)).toBe(true)
    expect(nutrientLow(500, stock)).toBe(false)
  })
})

describe('legal limits', () => {
  const harvested = plant({ id: 'h', stage: 'curing', harvest: { date: '2026-01-01', wetWeight: 500, dryWeight: 90, notes: '' } })
  const wet = plant({ id: 'w', stage: 'drying', harvest: { date: '2026-01-01', wetWeight: 100, dryWeight: null, notes: '' } })
  const growing = [plant({ id: 'a' }), plant({ id: 'b' }), plant({ id: 'c' })]

  it('counts growing plants and stored grams against the CZ limits', () => {
    const s = legalStatus([...growing, harvested, wet], { country: 'cz', adults: 2, stored: {} })!
    expect(s.plantLimit).toBe(3)
    expect(s.plants).toBe(3)
    expect(s.plantLevel).toBe('near')
    expect(s.grams).toBe(112)
    expect(s.gramLevel).toBe('over')
    expect(s.level).toBe('over')
  })

  it('multiplies the German limits per adult and respects grams left', () => {
    const s = legalStatus([...growing, harvested], { country: 'de', adults: 2, stored: { h: 20 } })!
    expect(s.plantLimit).toBe(6)
    expect(s.gramLimit).toBe(100)
    expect(s.grams).toBe(20)
    expect(s.level).toBe('ok')
  })

  it('skips archived harvests unless an amount was set', () => {
    const archived = { ...harvested, archived: true }
    expect(storedHarvests([archived], { stored: {} })).toHaveLength(0)
    expect(storedHarvests([archived], { stored: { h: 5 } })[0]?.grams).toBe(5)
  })

  it('is off without a country', () => {
    expect(legalStatus(growing, normalizeLegal({}))).toBeNull()
  })
})

describe('kit data in saves', () => {
  it('leaves old saves without the new collections', () => {
    const d = normalizeData({ plants: [{ id: 'p1', name: 'A' }] })
    expect('feeding' in d).toBe(false)
    expect('costs' in d).toBe(false)
  })

  it('keeps valid collections and drops dangling references', () => {
    const d = normalizeData({
      plants: [{ id: 'p1', name: 'A' }],
      entries: [{ id: 'e', plantId: 'p1', type: 'feed', feedLines: [{ name: 'Grow', dose: '2', stockId: 's' }, { name: '' }] }],
      feeding: { plans: [{ plantId: 'p1', scheduleId: 'canna-terra', strength: 75 }, { plantId: 'gone', scheduleId: 'x' }] },
      costs: { currency: 'EUR', kwhPrice: 0.3, runs: [{ id: 'r', name: 'R', plantIds: ['p1', 'gone'] }], expenses: [{ title: 'Tent', amount: 99, runId: 'nope' }] },
      inventory: { seeds: [{ strain: 'NL', count: 3, type: 'autoflower' }], nutrients: [{ id: 's', name: 'Grow', volumeMl: 500 }], usage: [{ entryId: 'e', plantId: 'p1', stockId: 's', ml: 4 }, { entryId: 'e', stockId: 'zz', ml: 1 }] },
      legal: { country: 'de', adults: 40, stored: { p1: '12' } }
    })
    expect(d.entries[0]?.feedLines).toEqual([{ name: 'Grow', dose: 2, stockId: 's' }])
    expect(d.feeding?.plans).toHaveLength(1)
    expect(d.feeding?.plans[0]).toMatchObject({ strength: 75, waterL: 5 })
    expect(d.costs?.runs[0]?.plantIds).toEqual(['p1'])
    expect(d.costs?.expenses[0]?.runId).toBeNull()
    expect(d.inventory?.seeds[0]).toMatchObject({ strain: 'NL', count: 3, type: 'autoflower', sex: 'feminized' })
    expect(d.inventory?.usage).toHaveLength(1)
    expect(d.legal).toEqual({ country: 'de', adults: 10, stored: { p1: 12 } })
  })

  it('validates custom schedules', () => {
    const f = normalizeFeeding({ custom: [{ brand: 'Mine', products: [{ id: 'a', name: 'A' }], weeks: [{ phase: 'bloom', n: 0, doses: { a: 2, ghost: 1 } }] }] }, new Set())
    expect(f.custom[0]).toMatchObject({ brand: 'Mine', custom: true, weeks: [{ phase: 'bloom', n: 1, doses: { a: 2 } }] })
  })
})
