import { describe, expect, it } from 'vitest'
import { buildDemoData } from '../app/utils/demo'
import { migrateLegacy, normalizeData } from '../app/utils/schema'

describe('legacy migration', () => {
  const result = migrateLegacy({
    plants: [
      { id: 1, name: 'Northern Lights #1', strain: 'NL', stage: 'Flowering', plantingDate: '2026-08-27', photoPreview: 'data:image/png;base64,AAAA', createdAt: '2026-08-27T10:00:00.000Z' },
      { id: 2, name: '', stage: 'Vegetative', location: 'outdoor', medium: 'coco', health: 60 }
    ],
    journals: {
      1: [
        { id: 'a', date: '2026-09-01', type: 'water', amount: '1L', createdAt: '2026-09-01T08:00:00Z' },
        { id: 'b', date: '2026-09-02', type: 'nutrients', amount: '2ml/L Grow' },
        { id: 'c', date: '2026-09-03', type: 'trim' },
        { id: 'd', date: '2026-09-04', type: 'repellent', note: 'neem' },
        { id: 'e', date: '2026-09-05', type: 'photo', photo: 'data:image/jpeg;base64,BBBB' },
        { id: 'f', date: '2026-09-06', type: 'water', amount: 'a lot' }
      ]
    },
    dayActions: { '2026-10-11': [{ id: 't', label: 'Check pH', done: true }] }
  })

  it('maps plants', () => {
    const [nl, sd] = result.data.plants
    expect(nl!.id).toBe('1')
    expect(nl!.stage).toBe('flowering')
    expect(nl!.startDate).toBe('2026-08-27')
    expect(nl!.photoId).toBeTruthy()
    expect(sd!.name).toBe('Unnamed plant')
    expect(sd!.location).toBe('outdoor')
    expect(sd!.health).toBe(3)
  })

  it('maps journal entry types and amounts', () => {
    const byId = Object.fromEntries(result.data.entries.map(e => [e.id, e]))
    expect(byId.a!.amountMl).toBe(1000)
    expect(byId.b!.type).toBe('feed')
    expect(byId.b!.nutrients).toBe('2ml/L Grow')
    expect(byId.c!.type).toBe('train')
    expect(byId.d!.type).toBe('pest')
    expect(byId.e!.photoIds).toHaveLength(1)
    expect(byId.f!.amountMl).toBeNull()
    expect(byId.f!.note).toBe('a lot')
  })

  it('collects photos to move into the photo store', () => {
    expect(result.photos).toHaveLength(2)
  })

  it('keeps day tasks', () => {
    expect(result.data.tasks[0]).toMatchObject({ title: 'Check pH', date: '2026-10-11', done: true })
  })
})

describe('normalizeData', () => {
  it('survives garbage', () => {
    expect(normalizeData(null).plants).toEqual([])
    expect(normalizeData({ plants: 'nope', entries: [1, null] }).entries).toEqual([])
  })

  it('drops entries of deleted plants and round-trips demo data', () => {
    const demo = buildDemoData('2026-10-11')
    const copy = normalizeData(JSON.parse(JSON.stringify({ ...demo, entries: [...demo.entries, { plantId: 'ghost', type: 'note' }] })))
    expect(copy.entries).toHaveLength(demo.entries.length)
    expect(copy.plants).toEqual(demo.plants)
  })

  it('demo data is internally consistent', () => {
    const demo = buildDemoData('2026-10-11')
    const ids = new Set(demo.plants.map(p => p.id))
    expect(demo.entries.every(e => ids.has(e.plantId))).toBe(true)
    expect(demo.entries.every(e => e.date <= '2026-10-11')).toBe(true)
    for (const p of demo.plants) expect(p.stageHistory.at(-1)!.stage).toBe(p.stage)
  })
})
