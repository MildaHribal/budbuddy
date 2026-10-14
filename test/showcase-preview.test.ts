import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyData } from '../app/utils/schema'

// Own file: modules booted by other store tests keep saving into their shared map for seconds.
const prefs = new Map<string, string>()
const photos = new Map<string, { id: string, blob: Blob, createdAt: string }>()
const writes: string[] = []
let native = false

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }))
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string, value: string }) => {
      if (key === KEY) writes.push(value)
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
    replaceAll: async () => {}
  }
}))
vi.mock('../app/composables/useUi', () => ({ resetPhotoUrls: () => {}, THUMB_SUFFIX: ':t' }))

const KEY = 'budbuddy:data'
const photo = (id: string) => ({ id, blob: new Blob(['x']), createdAt: '2026-10-01T00:00:00.000Z' })
const flush = () => new Promise(r => setTimeout(r, 0))
const afterSave = () => new Promise(r => setTimeout(r, 300))

function userData() {
  const data = emptyData()
  data.settings.initialized = true
  data.settings.onboarded = true
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
  native = false
  vi.stubGlobal('window', {})
})

describe('desktop showcase', () => {
  const desktop = () => {
    native = false
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
  }

  it('shows the demo over an old saved garden and never saves over it', async () => {
    desktop()
    prefs.set(KEY, JSON.stringify(userData()))
    photos.set('u1', photo('u1'))
    const { useGrow } = await boot()
    const grow = useGrow()
    expect(grow.preview.value).toBe(true)
    expect(grow.state.settings.demo).toBe(true)
    const from = writes.length
    grow.deletePlant(grow.state.plants[0]!.id)
    grow.addPlant({ name: 'Tried it' })
    await afterSave()
    expect(writes.slice(from).some(v => v.includes('Tried it'))).toBe(false)
    expect(photos.has('u1')).toBe(true)
  })

  it('opens the saved garden on request and remembers it', async () => {
    desktop()
    prefs.set(KEY, JSON.stringify(userData()))
    const { useGrow } = await boot()
    await useGrow().startOwnGarden()
    expect(useGrow().preview.value).toBe(false)
    expect(useGrow().state.plants.map(p => p.name)).toEqual(['Mine'])
    const again = await boot()
    expect(again.useGrow().preview.value).toBe(false)
    expect(again.useGrow().state.plants.map(p => p.name)).toEqual(['Mine'])
  })

  it('keeps a garden saved since the showcase existed', async () => {
    native = true
    prefs.set(KEY, JSON.stringify(userData()))
    const { useGrow } = await boot()
    useGrow().updatePlant('p1', { notes: 'x' })
    await afterSave()
    desktop()
    const again = await boot()
    expect(again.useGrow().preview.value).toBe(false)
  })

  it('leaves the demo garden itself alone', async () => {
    desktop()
    const { useGrow } = await boot()
    expect(useGrow().preview.value).toBe(false)
    expect(useGrow().state.settings.demo).toBe(true)
  })
})
