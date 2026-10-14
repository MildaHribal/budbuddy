import { describe, expect, it } from 'vitest'
import type { JournalEntry, Plant } from '../app/types/grow'
import { EQUIPMENT } from '../shared/game/content/catalog'
import type { Forecast, Observation, PlantSim } from '../shared/game/types'
import { GAME_H_PER_REAL_H, journalBonusCandidates, NOTIFY_BASE_ID, pct, peekGame, planNotices, plantStatus, potOptions, ripenessKey, xpProgress } from '../app/utils/gameUi'

const plant = (extra: Partial<PlantSim> = {}): PlantSim => ({
  id: 'p1', strainId: 's', genome: {} as PlantSim['genome'], seed: 1, tentId: 't1', sownAtH: 0, stage: 'veg', stageStartH: 0,
  medium: 'soil', potL: 11, root: { water: 0.6, ph: 6.5, ec: 1, salts: 0, health: 1 }, reserves: {} as PlantSim['reserves'],
  biomass: 10, budMass: 0, heightCm: 30, nodes: 5, training: { topped: 0, lst: false }, health: 1, damage: 0, stress: 0,
  problems: [], ripeness: 0, hermed: false, dead: false, ...extra
})
const obs = (extra: Partial<Observation> = {}): Observation => ({ plantId: 'p1', stage: 'veg', ageDays: 10, signs: [], readings: {}, potFeel: 'moist', health: 1, ...extra })

describe('plantStatus', () => {
  it('orders the most urgent state first', () => {
    expect(plantStatus(plant({ dead: true }), obs(), [], 0).key).toBe('dead')
    expect(plantStatus(plant(), obs({ potFeel: 'dry' }), [], 0)).toEqual({ key: 'dry', tone: 'now' })
    expect(plantStatus(plant({ stage: 'ripening', ripeness: 0.95 }), obs({ potFeel: 'dry' }), [], 0).key).toBe('ripe')
    expect(plantStatus(plant(), obs({ signs: [{ key: 'a', phase: 'severe', lines: [] }] }), [], 0).key).toBe('severe')
    expect(plantStatus(plant(), obs({ signs: [{ key: 'a', phase: 'subtle', lines: [] }, { key: 'b', phase: 'clear', lines: [] }] }), [], 0)).toEqual({ key: 'signs', tone: 'soon', n: 2 })
    expect(plantStatus(plant(), obs(), [], 0)).toEqual({ key: 'fine', tone: 'ok' })
  })

  it('warns about thirst within two real hours only', () => {
    const soon: Forecast[] = [{ atH: 100 + GAME_H_PER_REAL_H * 1.5, kind: 'thirsty', plantId: 'p1' }]
    const later: Forecast[] = [{ atH: 100 + GAME_H_PER_REAL_H * 5, kind: 'thirsty', plantId: 'p1' }]
    const other: Forecast[] = [{ atH: 101, kind: 'thirsty', plantId: 'p2' }]
    expect(plantStatus(plant(), obs(), soon, 100).key).toBe('thirstySoon')
    expect(plantStatus(plant(), obs(), later, 100).key).toBe('fine')
    expect(plantStatus(plant(), obs(), other, 100).key).toBe('fine')
  })
})

describe('planNotices', () => {
  const base = new Date(2026, 9, 14, 9, 0, 0).getTime()
  const toMs = (h: number) => base + h * 60_000

  it('keeps at most three per real day, most important first, ids from 7400', () => {
    const f: Forecast[] = [
      { atH: 60, kind: 'thirsty', plantId: 'a' },
      { atH: 120, kind: 'burp', jarId: 'j' },
      { atH: 180, kind: 'problem', plantId: 'b' },
      { atH: 240, kind: 'ripe', plantId: 'c' },
      { atH: 300, kind: 'dry-done', batchId: 'd' }
    ]
    const out = planNotices(f, toMs, base)
    expect(out).toHaveLength(3)
    expect(out.map(n => n.kind).sort()).toEqual(['problem', 'ripe', 'thirsty'])
    expect(out.map(n => n.id)).toEqual([NOTIFY_BASE_ID, NOTIFY_BASE_ID + 1, NOTIFY_BASE_ID + 2])
    expect(out.every((n, i) => i === 0 || n.at >= out[i - 1]!.at)).toBe(true)
  })

  it('routes plant moments to the plant and jars to the drying room', () => {
    const out = planNotices([{ atH: 60, kind: 'thirsty', plantId: 'a' }, { atH: 200, kind: 'burp', jarId: 'j' }], toMs, base)
    expect(out.find(n => n.kind === 'thirsty')!.route).toBe('/game/plant/a')
    expect(out.find(n => n.kind === 'burp')!.route).toBe('/game/dry')
  })

  it('moves night moments to 07:00, drops past ones and duplicates', () => {
    const night = new Date(2026, 9, 14, 23, 30).getTime()
    const out = planNotices([
      { atH: 1, kind: 'thirsty', plantId: 'a' },
      { atH: 2, kind: 'thirsty', plantId: 'a' },
      { atH: -5, kind: 'ripe', plantId: 'b' }
    ], h => (h < 0 ? base - 3_600_000 : night + h * 1000), base)
    expect(out).toHaveLength(1)
    const at = new Date(out[0]!.at)
    expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([15, 7, 0])
  })
})

describe('small helpers', () => {
  it('ripeness, percentages and xp progress', () => {
    expect([0.2, 0.7, 0.9, 0.99].map(ripenessKey)).toEqual(['clear', 'cloudy', 'amber', 'late'])
    expect(pct(0.42)).toBe(42)
    expect(pct(87)).toBe(87)
    expect(pct(140)).toBe(100)
    const xpFor = (l: number) => (l - 1) * 100
    expect(xpProgress(150, 2, xpFor)).toEqual({ level: 2, into: 50, span: 100, ratio: 0.5 })
  })

  it('peekGame reads a save without the sim and survives junk', () => {
    expect(peekGame(null)).toBeNull()
    expect(peekGame('{oops')).toBeNull()
    const json = JSON.stringify({ level: 3, coins: 40, plants: { a: { stage: 'veg' }, b: { stage: 'harvested' }, c: { stage: 'flower', dead: true } }, events: [{ read: true }, {}] })
    expect(peekGame(json)).toEqual({ level: 3, coins: 40, growing: 1, unread: 1 })
  })

  it('potOptions reads pot stock per medium and size', () => {
    const soil11 = EQUIPMENT.find(e => e.slot === 'pot' && e.stats.medium === 0 && e.stats.liters === 11)!
    const state = { inventory: { [soil11.id]: 2 } }
    const opts = potOptions(state, EQUIPMENT, 'soil')
    expect(opts.find(o => o.liters === 11)!.free).toBe(2)
    expect(opts.filter(o => o.liters !== 11).every(o => o.free === 0)).toBe(true)
    expect(potOptions(state, EQUIPMENT, 'coco').some(o => o.id === soil11.id)).toBe(false)
    expect(potOptions(state, [], 'soil').every(o => o.free === Infinity)).toBe(true)
  })
})

describe('journalBonusCandidates', () => {
  const p = (id: string, extra: Partial<Plant> = {}): Plant => ({ id, name: id, harvest: { date: '2026-09-01', wetWeight: null, dryWeight: null, notes: '' }, spaceId: 'tent', ...extra } as Plant)
  const entries = (plantId: string, from: string, to: string, photos: number): JournalEntry[] => [
    { id: `${plantId}-a`, plantId, date: from, photoIds: Array.from({ length: photos }, (_, i) => `${plantId}-ph${i}`) } as JournalEntry,
    { id: `${plantId}-b`, plantId, date: to, photoIds: [] } as JournalEntry
  ]

  it('needs 28 days of entries and 5 own photos', () => {
    const plants = [p('ok'), p('short', { spaceId: 'b' }), p('few', { spaceId: 'c' })]
    const list = [...entries('ok', '2026-08-01', '2026-08-30', 5), ...entries('short', '2026-08-10', '2026-08-30', 9), ...entries('few', '2026-07-01', '2026-08-30', 4)]
    expect(journalBonusCandidates(plants, list, [])).toEqual(['ok'])
  })

  it('skips demo photos, demo plants, unharvested plants and rewarded ones', () => {
    const demoPhotos = [{ id: 'x', plantId: 'd', date: '2026-07-01', photoIds: ['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5'] } as JournalEntry, { id: 'y', plantId: 'd', date: '2026-08-30', photoIds: [] } as JournalEntry]
    expect(journalBonusCandidates([p('d')], demoPhotos, [])).toEqual([])
    expect(journalBonusCandidates([p('demo', { demo: true })], entries('demo', '2026-07-01', '2026-08-30', 6), [])).toEqual([])
    expect(journalBonusCandidates([p('g', { harvest: null })], entries('g', '2026-07-01', '2026-08-30', 6), [])).toEqual([])
    expect(journalBonusCandidates([p('r')], entries('r', '2026-07-01', '2026-08-30', 6), ['r'])).toEqual([])
  })

  it('pays at most one per 30 days per space', () => {
    const plants = [p('a', { harvest: { date: '2026-09-01', wetWeight: null, dryWeight: null, notes: '' } }), p('b', { harvest: { date: '2026-09-20', wetWeight: null, dryWeight: null, notes: '' } }), p('c', { spaceId: 'other', harvest: { date: '2026-09-20', wetWeight: null, dryWeight: null, notes: '' } })]
    const list = [...entries('a', '2026-07-01', '2026-08-30', 5), ...entries('b', '2026-07-01', '2026-08-30', 5), ...entries('c', '2026-07-01', '2026-08-30', 5)]
    expect(journalBonusCandidates(plants, list, [])).toEqual(['a', 'c'])
    expect(journalBonusCandidates(plants, list, ['a'])).toEqual(['c'])
  })
})
