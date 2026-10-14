import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isDemoGarden, replayMode, startsFirstRun, TOUR_STEPS, tourPlant } from '../app/utils/appTour'
import { buildDemoData } from '../app/utils/demo'
import { emptyData } from '../app/utils/schema'
import tour from '../app/locales/tour'

const prefs = new Map<string, string>()
const photos = new Map<string, { id: string, blob: Blob, createdAt: string }>()
const writes: string[] = []
let native = true

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

const fresh = { native: true, seen: false, troubled: false }

describe('app tour: when it starts', () => {
  it('starts once on a fresh native install over the demo garden', () => {
    expect(startsFirstRun({ ...fresh, ...buildDemoData('2026-10-15') })).toBe(true)
  })

  it('never starts by itself on the web, a second time or over troubled data', () => {
    const demo = buildDemoData('2026-10-15')
    expect(startsFirstRun({ ...fresh, native: false, ...demo })).toBe(false)
    expect(startsFirstRun({ ...fresh, seen: true, ...demo })).toBe(false)
    expect(startsFirstRun({ ...fresh, troubled: true, ...demo })).toBe(false)
  })

  it('never starts over an own, empty or restored garden', () => {
    expect(startsFirstRun({ ...fresh, ...userData() })).toBe(false)
    expect(startsFirstRun({ ...fresh, ...emptyData() })).toBe(false)
    // a demo the grower added an own plant to
    const mixed = buildDemoData('2026-10-15')
    mixed.plants.push({ ...userData().plants[0]! })
    expect(startsFirstRun({ ...fresh, ...mixed })).toBe(false)
    // a restored backup that still says demo but holds own plants
    const restored = userData()
    restored.settings.demo = true
    expect(startsFirstRun({ ...fresh, ...restored })).toBe(false)
  })

  it('replays over the demo in place and over an own garden as a preview', () => {
    expect(replayMode(buildDemoData('2026-10-15'))).toBe('demo')
    expect(replayMode(userData())).toBe('preview')
    expect(replayMode(emptyData())).toBe('preview')
  })

  it('opens the flowering hero plant', () => {
    const demo = buildDemoData('2026-10-15')
    expect(tourPlant(demo.plants)?.name).toBe('Northern Lights #1')
    expect(tourPlant([])).toBeUndefined()
  })

  it('keeps the tour short and ends on the choice step', () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(5)
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(8)
    expect(TOUR_STEPS.at(-1)?.targets).toEqual([])
  })

  it('has texts for every step in both languages', () => {
    for (const lang of ['en', 'cs'] as const) {
      for (const s of TOUR_STEPS) {
        const texts = (tour[lang].steps as Record<string, { title?: string, text?: string }>)[s.id]
        expect(texts?.title, `${lang}.${s.id}`).toBeTruthy()
        expect(texts?.text, `${lang}.${s.id}`).toBeTruthy()
      }
    }
  })
})

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
  native = true
  vi.stubGlobal('window', {})
})

describe('app tour: data', () => {
  it('a fresh native install holds the demo the tour needs, and starting own empties it', async () => {
    const { useGrow } = await boot()
    const grow = useGrow()
    expect(startsFirstRun({ ...fresh, ...grow.state })).toBe(true)
    await grow.startOwnGarden()
    expect(grow.state.plants).toEqual([])
    expect(grow.state.settings.demo).toBe(false)
    expect(grow.state.settings.onboarded).toBe(true)
    expect(isDemoGarden(grow.state)).toBe(false)
    // let its debounced save land before the next test fills the store
    await afterSave()
  })

  it('a replay over an own garden saves nothing and brings the garden back', async () => {
    prefs.set(KEY, JSON.stringify(userData()))
    photos.set('u1', { id: 'u1', blob: new Blob(['x']), createdAt: '2026-10-01T00:00:00.000Z' })
    const { useGrow } = await boot()
    const grow = useGrow()
    await grow.previewDemo()
    expect(grow.preview.value).toBe(true)
    expect(isDemoGarden(grow.state)).toBe(true)
    // the onboarding must not pop up over the preview
    expect(grow.state.settings.onboarded).toBe(true)
    const from = writes.length
    grow.addTask('Tour click')
    await afterSave()
    expect(writes.slice(from).some(v => v.includes('Tour click') || v.includes('Northern Lights'))).toBe(false)
    await grow.showSavedGarden()
    expect(grow.preview.value).toBe(false)
    expect(grow.state.plants.map(p => p.name)).toEqual(['Mine'])
    expect(photos.has('u1')).toBe(true)
  })

  it('a replay keeps unsaved changes made just before it', async () => {
    prefs.set(KEY, JSON.stringify(userData()))
    const { useGrow } = await boot()
    const grow = useGrow()
    grow.updatePlant('p1', { notes: 'just typed' })
    await grow.previewDemo()
    await grow.showSavedGarden()
    expect(grow.state.plants[0]?.notes).toBe('just typed')
  })
})
