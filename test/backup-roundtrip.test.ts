import { describe, expect, it } from 'vitest'
import type { GrowData } from '../app/types/grow'
import { compact } from '../app/utils/env/readings'
import { ISSUES } from '../app/utils/treatment'
import { emptyData, normalizeData } from '../app/utils/schema'

// Every collection filled, so a field the schema forgets shows up as a diff.
function fullData(): GrowData {
  const at = '2026-10-01T10:00:00.000Z'
  const data = emptyData()
  data.settings = { ...data.settings, growerName: 'Tester', initialized: true, lightsOn: '07:00', lightHours: 12, language: 'en', reminders: true, reminderTime: '19:30', onboarded: true, demo: false }
  data.guide = { done: ['basics-1'], quiz: { 'basics-1': 3 }, checks: { setup: [0, 2] }, environment: 'indoor', medium: 'coco' }
  data.spaces = [
    { id: 'tent', name: 'Flower tent', location: 'indoor', size: '80 × 80 cm', light: 'LED 240 W', lightsOn: '07:00', lightHours: 12, notes: 'n', createdAt: at, updatedAt: at },
    { id: 'garden', name: 'Balcony', location: 'outdoor', size: '', light: '', lightsOn: '06:00', lightHours: null, notes: '', createdAt: at, updatedAt: at }
  ]
  const plant = (id: string, extra: Partial<GrowData['plants'][number]> = {}) => ({
    id,
    name: id,
    strain: 'NL',
    type: 'photoperiod' as const,
    stage: 'flowering' as const,
    stageHistory: [{ stage: 'seedling' as const, date: '2026-08-01' }, { stage: 'flowering' as const, date: '2026-09-15' }],
    startDate: '2026-08-01',
    potSize: '11 L',
    medium: 'coco' as const,
    location: 'indoor' as const,
    wateringInterval: 3,
    health: 4 as const,
    photoId: 'ph1',
    notes: '',
    harvest: null,
    archived: false,
    createdAt: at,
    updatedAt: at,
    ...extra
  })
  data.plants = [
    plant('p1', { spaceId: 'tent', wateringAuto: true, sharing: { publicId: 'pub1', syncedAt: at } }),
    plant('p2', { spaceId: 'tent' }),
    plant('p3', { stage: 'curing', archived: true, harvest: { date: '2026-09-01', wetWeight: 400, dryWeight: 90, notes: 'x' } })
  ]
  const entry = (id: string, plantId: string, extra: Partial<GrowData['entries'][number]> = {}) => ({
    id,
    plantId,
    type: 'feed' as const,
    date: '2026-10-01',
    note: '',
    amountMl: 1000,
    ph: 6.2,
    ec: 1.6,
    nutrients: 'Grow 2 ml/L',
    method: null,
    product: '',
    heightCm: null,
    tempC: null,
    humidity: null,
    photoIds: [],
    stage: null,
    createdAt: at,
    ...extra
  })
  data.entries = [
    entry('e1', 'p1', { feedLines: [{ name: 'Grow', dose: 2, stockId: 'n1' }, { name: 'PK', dose: 0.5, unit: 'g', stockId: null }] }),
    entry('e2', 'p1', { type: 'photo', amountMl: null, ph: null, ec: null, nutrients: '', photoIds: ['ph1', 'ph2'], align: { ph2: { x: 0.02, y: -0.01, scale: 1.05, rotate: 1.5 } } }),
    entry('e3', 'p3', { type: 'harvest', amountMl: null, ph: null, ec: null, nutrients: '' })
  ]
  data.tasks = [{ id: 't1', title: 'Check', date: '2026-10-02', plantId: 'p1', done: false, createdAt: at }]
  data.feeding = {
    custom: [{
      id: 'my',
      brand: 'Mine',
      line: 'Coco',
      media: ['coco'],
      products: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', unit: 'g' }],
      weeks: [{ phase: 'veg', n: 1, doses: { a: 2, b: 0.5 }, ec: 1.2, note: 'start' }, { phase: 'bloom', n: 1, doses: { a: 3 }, ec: null }],
      custom: true,
      createdAt: at,
      notes: 'own mix'
    }],
    plans: [
      { id: 'fp1', plantId: 'p1', scheduleId: 'my', strength: 75, waterL: 5, createdAt: at },
      { id: 'fp2', plantId: 'p2', scheduleId: 'canna-coco', strength: 100, waterL: 10, createdAt: at }
    ]
  }
  data.costs = {
    currency: 'EUR',
    kwhPrice: 0.3,
    devices: [{ id: 'd1', name: 'LED', watts: 240, kind: 'light', hoursVeg: 18, hoursFlower: 12 }, { id: 'd2', name: 'Fan', watts: 30, kind: 'other', hoursVeg: 24, hoursFlower: 24 }],
    expenses: [{ id: 'x1', date: '2026-08-01', category: 'seeds', title: 'NL', amount: 20, runId: 'r1', createdAt: at }, { id: 'x2', date: '2026-08-02', category: 'gear', title: 'Tent', amount: 120, runId: null, createdAt: at }],
    runs: [{ id: 'r1', name: 'Run 1', plantIds: ['p1', 'p2'], createdAt: at }]
  }
  data.inventory = {
    seeds: [{ id: 's1', strain: 'NL', breeder: 'Sensi', count: 2, type: 'photoperiod', sex: 'feminized', purchaseDate: '2026-07-01', note: 'n', createdAt: at }],
    nutrients: [{ id: 'n1', name: 'Grow', volumeMl: 1000, startMl: 800, countedAt: at, createdAt: at }],
    supplies: [{ id: 'su1', kind: 'substrate', name: 'Coco', quantity: 20, unit: 'L', lowAt: 10, createdAt: at }],
    usage: [{ entryId: 'e1', plantId: 'p1', stockId: 'n1', ml: 2, at }]
  }
  data.legal = { country: 'de', adults: 2, stored: { p3: 40 } }
  const now = Date.now()
  data.environment = {
    places: [{ id: 'pl1', name: 'Home', detail: 'CZ', lat: 50.1, lon: 14.4 }],
    plantPlaces: { p1: 'pl1' },
    sensors: [
      { id: 'se1', name: 'Tent', kind: 'ble', model: 'pvvx', address: 'AA:BB', haTemp: '', haHumidity: '', target: { type: 'tent' }, createdAt: at, lastSeen: at, battery: 80 },
      { id: 'se2', name: 'HA', kind: 'ha', model: null, address: '', haTemp: 'sensor.t', haHumidity: 'sensor.h', target: { type: 'plant', plantId: 'p2' }, createdAt: at, lastSeen: null, battery: null }
    ],
    readings: compact([{ s: 'se1', t: now - 60_000, c: 24.5, h: 55, n: 3 }, { s: 'se2', t: now - 120_000, c: null, h: 60, n: 1 }], now),
    light: [{ id: 'l1', at, lux: 30000, source: 'manual', lightType: 'led-white', ppfd: 600, hours: 12, dli: 25.9, heightCm: 40, plantId: 'p1', note: '' }],
    rainHandled: ['pl1:2026-09-30'],
    dismissed: ['heat:2026-09-29']
  }
  data.hunts = [{
    id: 'h1',
    name: 'NL hunt',
    strain: 'NL',
    source: 'pack A',
    candidates: [{ plantId: 'p1', tag: '#1', scores: { vigour: 4, smell: 5 }, notes: 'nice' }, { plantId: 'p2', tag: '#2', scores: {}, notes: '' }],
    weights: { smell: 3 },
    keeper: { plantId: 'p1', role: 'mother' },
    done: false,
    notes: '',
    createdAt: at,
    updatedAt: at
  }]
  data.cure = {
    checks: [{ id: 'c1', plantId: 'p3', date: '2026-09-05', tempC: 18, humidity: 58, stem: 'cracks', note: '' }],
    jars: [{ id: 'j1', plantId: 'p3', label: 'Jar 1', weightG: 45, startDate: '2026-09-10', readings: [{ at, humidity: 62 }], burps: [at], doneDate: null }]
  }
  const issue = ISSUES[0]!
  data.treatments = [{
    id: 'tr1',
    plantId: 'p2',
    issue: issue.id,
    startDate: '2026-09-20',
    steps: issue.steps.map((s, i) => ({ key: s.key, done: i === 0 })),
    beforeEntryId: 'e2',
    checkEntryIds: [],
    taskIds: ['t1'],
    sourceEntryId: null,
    status: 'resolved',
    closedDate: '2026-09-30',
    note: 'gone'
  }]
  return data
}

describe('backup round trip', () => {
  it('keeps every collection through serialise + normalise', () => {
    const data = fullData()
    const back = normalizeData(JSON.parse(JSON.stringify({ app: 'budbuddy', exportedAt: new Date().toISOString(), ...data, photos: [] })))
    expect(back).toEqual(data)
  })

  it('fixture really fills every optional collection', () => {
    const data = fullData()
    for (const k of ['feeding', 'costs', 'inventory', 'legal', 'environment', 'spaces', 'hunts', 'cure', 'treatments'] as const) {
      expect(data[k], k).toBeTruthy()
    }
    expect(data.environment!.readings.length).toBe(2)
    expect(Object.keys(emptyData()).every(k => k in data)).toBe(true)
  })
})
