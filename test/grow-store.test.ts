import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDemoData } from '../app/utils/demo'
import { emptyData } from '../app/utils/schema'

// In-memory Preferences and photo store shared with the mocked modules.
const prefs = new Map<string, string>()
const photos = new Map<string, { id: string, blob: Blob, createdAt: string }>()
let failSet = false
let failGet = false

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => {
      if (failGet && key === 'budbuddy:data') throw new Error('disk on fire')
      return { value: prefs.get(key) ?? null }
    },
    set: async ({ key, value }: { key: string, value: string }) => {
      if (failSet) throw new Error('quota exceeded')
      prefs.set(key, value)
    },
    remove: async ({ key }: { key: string }) => void prefs.delete(key),
    keys: async () => ({ keys: [...prefs.keys()] })
  }
}))
vi.mock('../app/utils/photoStore', () => ({
  photoStore: {
    put: async (p: { id: string, blob: Blob, createdAt: string }) => void photos.set(p.id, p),
    get: async (id: string) => photos.get(id),
    delete: async (id: string) => void photos.delete(id),
    all: async () => [...photos.values()],
    clear: async () => photos.clear(),
    replaceAll: async (list: { id: string, blob: Blob, createdAt: string }[]) => {
      photos.clear()
      for (const p of list) photos.set(p.id, p)
    }
  }
}))
vi.mock('../app/composables/useUi', () => ({ resetPhotoUrls: () => {}, THUMB_SUFFIX: ':t' }))

const KEY = 'budbuddy:data'
const READINGS_KEY = 'budbuddy:readings'
const photo = (id: string) => ({ id, blob: new Blob(['x']), createdAt: '2026-10-01T00:00:00.000Z' })
const flush = () => new Promise(r => setTimeout(r, 0))
const afterSave = () => new Promise(r => setTimeout(r, 300))

function userData() {
  const data = emptyData()
  data.settings.initialized = true
  data.settings.onboarded = true
  data.settings.growerName = 'Karel'
  data.plants = [{
    id: 'p1', name: 'Mine', strain: '', type: 'photoperiod', stage: 'vegetative', stageHistory: [{ stage: 'vegetative', date: '2026-09-01' }],
    startDate: '2026-09-01', potSize: '', medium: 'soil', location: 'indoor', wateringInterval: 3, health: 4, photoId: 'u1', notes: '', harvest: null,
    archived: false, createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z'
  }]
  return data
}

async function boot() {
  vi.resetModules()
  const mod = await import('../app/composables/useGrow')
  await mod.initGrow()
  await flush()
  await flush()
  return mod
}

beforeEach(() => {
  prefs.clear()
  photos.clear()
  failSet = false
  failGet = false
})
// demo photo seeding is scheduled on window timers; it may fire after a test ended
vi.stubGlobal('window', {})

describe('loading stored data', () => {
  it('keeps every photo when the stored data is corrupt', async () => {
    prefs.set(KEY, '{"plants": [broken')
    photos.set('u1', photo('u1'))
    photos.set('u1:t', photo('u1:t'))
    const { useGrow } = await boot()
    const grow = useGrow()
    expect(grow.recovered.value).toMatch(/^budbuddy:data\.corrupt-/)
    expect(prefs.get(grow.recovered.value!)).toBe('{"plants": [broken')
    expect(await grow.rawCopy()).toBe('{"plants": [broken')
    expect(photos.has('u1')).toBe(true)
    expect(photos.has('u1:t')).toBe(true)
  })

  it('later garbage collection spares photos the raw copy refers to', async () => {
    prefs.set(KEY, '{"plants":[{"id":"p1","photoId":"u1"}], oops')
    photos.set('u1', photo('u1'))
    photos.set('orphan', photo('orphan'))
    const first = await boot()
    // the notice stays (and photos are left alone) until dismissed
    const again = await boot()
    expect(again.useGrow().recovered.value).toBeTruthy()
    expect(photos.has('orphan')).toBe(true)
    await first.useGrow().dismissRecovery()
    // next start: the demo saved over the main key loads fine, GC runs
    await boot()
    await flush()
    expect(photos.has('u1')).toBe(true)
    expect(photos.has('orphan')).toBe(false)
  })

  it('collects unused photos after a normal load', async () => {
    prefs.set(KEY, JSON.stringify(userData()))
    photos.set('u1', photo('u1'))
    photos.set('orphan', photo('orphan'))
    const { useGrow } = await boot()
    expect(useGrow().recovered.value).toBeNull()
    expect(photos.has('u1')).toBe(true)
    expect(photos.has('orphan')).toBe(false)
  })
})

describe('when data could not be loaded', () => {
  it('refuses destructive actions and keeps onboarding away', async () => {
    failGet = true
    prefs.set(KEY, JSON.stringify(userData()))
    photos.set('u1', photo('u1'))
    const { useGrow } = await boot()
    const grow = useGrow()
    expect(grow.loadError.value).toBeTruthy()
    await grow.eraseAll()
    await grow.loadDemo()
    await grow.startOwnGarden()
    expect(photos.has('u1')).toBe(true)
    expect(JSON.parse(prefs.get(KEY)!).settings.growerName).toBe('Karel')
  })

  it('a restored backup clears the error and saves again', async () => {
    failGet = true
    prefs.set(KEY, JSON.stringify(userData()))
    const { useGrow } = await boot()
    const grow = useGrow()
    const backup = { ...userData(), photos: [] }
    backup.settings.growerName = 'Restored'
    await grow.importBackup(JSON.stringify(backup))
    expect(grow.loadError.value).toBeNull()
    expect(JSON.parse(prefs.get(KEY)!).settings.growerName).toBe('Restored')
    grow.updateSettings({ growerName: 'Later' })
    await afterSave()
    expect(JSON.parse(prefs.get(KEY)!).settings.growerName).toBe('Later')
  })
})

describe('saving', () => {
  it('reports a failed save until the next one succeeds', async () => {
    prefs.set(KEY, JSON.stringify(userData()))
    const { useGrow } = await boot()
    const grow = useGrow()
    failSet = true
    grow.updateSettings({ growerName: 'A' })
    await afterSave()
    expect(grow.saveError.value).toBeTruthy()
    failSet = false
    grow.updateSettings({ growerName: 'B' })
    await afterSave()
    expect(grow.saveError.value).toBeNull()
  })

  it('bumps the revision on data changes', async () => {
    prefs.set(KEY, JSON.stringify(userData()))
    const { useGrow } = await boot()
    const grow = useGrow()
    const before = grow.revision.value
    grow.addTask('Check')
    await flush()
    expect(grow.revision.value).toBeGreaterThan(before)
  })

  it('moves sensor readings out of the main blob', async () => {
    const data = userData()
    const now = Date.now()
    data.environment = {
      places: [],
      plantPlaces: {},
      sensors: [{ id: 's1', name: 'Tent', kind: 'manual', model: null, address: '', haTemp: '', haHumidity: '', target: { type: 'tent' }, createdAt: '2026-09-01T10:00:00.000Z', lastSeen: null, battery: null }],
      readings: [{ s: 's1', t: Math.floor((now - 60_000) / 600_000) * 600_000, c: 24, h: 55, n: 1 }],
      light: [],
      rainHandled: [],
      dismissed: []
    }
    prefs.set(KEY, JSON.stringify(data))
    const { useGrow } = await boot()
    const grow = useGrow()
    expect(grow.state.environment!.readings).toHaveLength(1)
    await flush()
    expect(JSON.parse(prefs.get(KEY)!).environment.readings).toBeUndefined()
    expect(JSON.parse(prefs.get(READINGS_KEY)!)).toHaveLength(1)

    // and they come back from their own key
    const again = await boot()
    expect(again.useGrow().state.environment!.readings).toHaveLength(1)
  })
})

describe('demo garden', () => {
  it('tags demo plants and drops the demo flag once a real plant is added', async () => {
    const { useGrow } = await boot()
    const grow = useGrow()
    expect(grow.state.settings.demo).toBe(true)
    expect(grow.state.plants.every(p => p.demo)).toBe(true)
    grow.addPlant({ name: 'Real' })
    expect(grow.state.settings.demo).toBe(false)
    expect(grow.state.plants.find(p => p.name === 'Real')!.demo).toBeFalsy()
  })

  it('leaving the demo removes only demo plants', async () => {
    const { useGrow } = await boot()
    const grow = useGrow()
    grow.updateSettings({ growerName: 'Karel' })
    const real = grow.addPlant({ name: 'Real', photoId: 'u1' })
    photos.set('u1', photo('u1'))
    photos.set('demo-nl-tent', photo('demo-nl-tent'))
    grow.addEntry({ plantId: real.id, type: 'water' })
    await grow.startOwnGarden()
    expect(grow.state.plants.map(p => p.name)).toEqual(['Real'])
    expect(grow.state.entries.every(e => e.plantId === real.id)).toBe(true)
    expect(grow.state.entries).toHaveLength(1)
    expect(grow.state.settings.growerName).toBe('Karel')
    await flush()
    expect(photos.has('u1')).toBe(true)
    expect(photos.has('demo-nl-tent')).toBe(false)
  })

  it('leaving a pure demo empties the garden but keeps settings', async () => {
    const { useGrow } = await boot()
    const grow = useGrow()
    grow.updateSettings({ growerName: 'Karel', reminderTime: '20:00' })
    await grow.startOwnGarden()
    expect(grow.state.plants).toHaveLength(0)
    expect(grow.state.tasks).toHaveLength(0)
    expect(grow.state.settings).toMatchObject({ growerName: 'Karel', reminderTime: '20:00', demo: false, onboarded: true })
  })

  it('loading the demo keeps settings', async () => {
    prefs.set(KEY, JSON.stringify(userData()))
    const { useGrow } = await boot()
    const grow = useGrow()
    grow.updateSettings({ reminderTime: '21:15', nagEvery: 4 })
    await grow.loadDemo()
    expect(grow.state.settings).toMatchObject({ growerName: 'Karel', reminderTime: '21:15', nagEvery: 4, demo: true, initialized: true, onboarded: true })
    expect(grow.state.plants.every(p => p.demo)).toBe(true)
  })

  it('normalize keeps the demo tag and tags old demo saves', async () => {
    const { normalizeData } = await import('../app/utils/schema')
    const demo = JSON.parse(JSON.stringify(buildDemoData('2026-10-11')))
    expect(normalizeData(demo).plants.every(p => p.demo)).toBe(true)
    // saves from before plants were tagged
    for (const p of demo.plants) delete p.demo
    expect(normalizeData(demo).plants.every(p => p.demo)).toBe(true)
    demo.plants.push({ ...userData().plants[0] })
    const mixed = normalizeData(demo)
    expect(mixed.plants.filter(p => p.demo)).toHaveLength(4)
    expect(mixed.settings.demo).toBe(false)
  })
})
