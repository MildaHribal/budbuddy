import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDemoData, DEMO_VERSION, upgradeDemo } from '../app/utils/demo'
import { daysBetween } from '../app/utils/date'
import { DEMO_PHOTO_CREDITS, demoPhotoId } from '../app/utils/demoCredits'
import { seedDemoPhotos } from '../app/utils/demoPhotos'

const put = vi.fn()
vi.mock('../app/utils/photoStore', () => ({ photoStore: { put: (p: unknown) => put(p) } }))

const photoRefs = (d: ReturnType<typeof buildDemoData>) => [
  ...d.plants.map(p => p.photoId).filter(Boolean),
  ...d.entries.flatMap(e => e.photoIds)
]

describe('demo photos', () => {
  beforeEach(() => {
    put.mockReset()
    vi.unstubAllGlobals()
  })

  it('every referenced photo has a bundled asset and a credit', () => {
    const demo = buildDemoData('2026-10-11')
    expect(demo.settings.demo).toBe(true)
    // flowering photoperiod hero plant → flowering light schedule
    expect(demo.plants.some(p => p.stage === 'flowering' && p.type === 'photoperiod')).toBe(true)
    expect(demo.settings.lightHours).toBe(12)
    expect(demo.plants.every(p => p.photoId)).toBe(true)
    const files = new Set(DEMO_PHOTO_CREDITS.map(c => `demo-${c.file.replace(/\.(jpg|webp)$/, '')}`))
    for (const id of photoRefs(demo)) expect(files.has(id!)).toBe(true)
    expect(DEMO_PHOTO_CREDITS.every(c => c.author && c.license && c.sourceUrl.startsWith('https://'))).toBe(true)
  })

  it('puts every growing plant into a tent with a fitting light schedule', () => {
    const demo = buildDemoData('2026-10-11')
    const spaces = new Map((demo.spaces ?? []).map(s => [s.id, s]))
    for (const p of demo.plants.filter(x => !x.archived)) {
      const s = spaces.get(p.spaceId ?? '')
      expect(s, p.name).toBeTruthy()
      expect(s!.lightHours).toBe(p.stage === 'flowering' ? 12 : 18)
    }
  })

  it('stores all photos when fetching works', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['x'], { type: 'image/jpeg' }))))
    const demo = buildDemoData('2026-10-11')
    const refs = new Set(photoRefs(demo))
    await seedDemoPhotos(demo)
    expect(put).toHaveBeenCalledTimes(refs.size)
    expect(new Set(photoRefs(demo))).toEqual(refs)
  })

  it('drops references to photos that fail to load', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = demoPhotoId('ww-cured')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => String(url).includes('ww-cured') ? new Response(null, { status: 404 }) : new Response('x')))
    const demo = buildDemoData('2026-10-11')
    await seedDemoPhotos(demo)
    expect(photoRefs(demo)).not.toContain(bad)
    expect(demo.plants.find(p => p.archived)!.photoId).toBeNull()
    expect(demo.entries.every(e => e.type !== 'photo' || e.photoIds.length)).toBe(true)
  })

  it('leaves replaced data alone', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const demo = buildDemoData('2026-10-11')
    const before = JSON.stringify(demo)
    await seedDemoPhotos(demo, () => false)
    expect(JSON.stringify(demo)).toBe(before)
    expect(put).not.toHaveBeenCalled()
  })

  it('stores nothing when the data is replaced while fetching', async () => {
    let current = true
    vi.stubGlobal('fetch', vi.fn(async () => {
      current = false
      return new Response(new Blob(['x'], { type: 'image/jpeg' }))
    }))
    await seedDemoPhotos(buildDemoData('2026-10-11'), () => current)
    expect(put).not.toHaveBeenCalled()
  })

  it('every credited photo is bundled exactly once', () => {
    const files = DEMO_PHOTO_CREDITS.map(c => c.file)
    expect(new Set(files).size).toBe(files.length)
    const bundled = Object.keys(import.meta.glob('../app/assets/demo/*.{jpg,webp}')).map(p => p.split('/').pop())
    expect(new Set(bundled)).toEqual(new Set(files))
  })
})

describe('demo photo diary', () => {
  const today = '2026-10-11'
  const demo = buildDemoData(today)
  const byStrain = (strain: string) => demo.plants.find(p => p.strain === strain)!
  const photoEntries = (id: string) => demo.entries.filter(e => e.plantId === id && e.photoIds.length)

  it.each([['Northern Lights', 8], ['Sour Diesel', 4], ['Gorilla Glue Auto', 2]])('%s has a photo history (≥ %i)', (strain, min) => {
    const plant = byStrain(strain)
    const entries = photoEntries(plant.id)
    expect(entries.length).toBeGreaterThanOrEqual(min)
    for (const e of entries) {
      expect(daysBetween(plant.startDate, e.date)).toBeGreaterThanOrEqual(0)
      expect(daysBetween(e.date, today)).toBeGreaterThanOrEqual(0)
    }
    // spread over the grow, not bunched on one day
    expect(new Set(entries.map(e => e.date)).size).toBe(entries.length)
  })

  it('the hero plant opens on a day with a photo', () => {
    expect(photoEntries(byStrain('Northern Lights').id).some(e => e.date === today)).toBe(true)
  })

  it('photos are not reused across plants', () => {
    const owner = new Map<string, string>()
    for (const e of demo.entries) {
      for (const id of e.photoIds) {
        expect(owner.get(id) ?? e.plantId).toBe(e.plantId)
        owner.set(id, e.plantId)
      }
    }
  })
})

describe('demo upgrade', () => {
  const stale = () => {
    const d = buildDemoData('2026-09-01')
    delete d.settings.demoVersion
    // the old demo had other photos
    for (const e of d.entries) if (e.photoIds.length) e.photoIds = ['demo-old-shot']
    return d
  }

  it('leaves current and demo-free data alone', () => {
    expect(upgradeDemo(buildDemoData('2026-10-11'))).toBeNull()
    const own = stale()
    own.plants = own.plants.map(p => ({ ...p, demo: false }))
    own.settings.demo = false
    expect(upgradeDemo(own)).toBeNull()
  })

  it('rebuilds a pure demo garden and keeps settings', () => {
    const old = stale()
    old.settings.growerName = 'Kim'
    const next = upgradeDemo(old, '2026-10-11')!
    expect(next.settings.demoVersion).toBe(DEMO_VERSION)
    expect(next.settings.growerName).toBe('Kim')
    expect(next.entries.flatMap(e => e.photoIds)).not.toContain('demo-old-shot')
    expect(upgradeDemo(next, '2026-10-11')).toBeNull()
  })

  it('swaps only demo photos next to the grower\'s own plants', () => {
    const old = stale()
    old.settings.demo = false
    const mine = { ...old.plants[0]!, id: 'mine', demo: false, name: 'Mine' }
    old.plants.push(mine)
    old.entries.push({ ...old.entries[0]!, id: 'my-photo', plantId: 'mine', photoIds: ['p1'] })
    const nl = old.plants.find(p => p.strain === 'Northern Lights')!
    const ownNote = { ...old.entries[0]!, id: 'my-note', plantId: nl.id, type: 'note' as const, photoIds: ['p2'], note: 'mine' }
    old.entries.push(ownNote)
    const plants = old.plants.length

    const next = upgradeDemo(old, '2026-10-11')!
    expect(next.plants).toHaveLength(plants)
    expect(next.entries.find(e => e.id === 'my-photo')).toBeTruthy()
    expect(next.entries.find(e => e.id === 'my-note')).toBeTruthy()
    expect(next.entries.flatMap(e => e.photoIds)).not.toContain('demo-old-shot')
    const nlPhotos = next.entries.filter(e => e.plantId === nl.id && e.photoIds.some(id => id.startsWith('demo-')))
    expect(nlPhotos.length).toBeGreaterThanOrEqual(8)
    // dates follow the saved plant, not today
    for (const e of nlPhotos) expect(daysBetween(nl.startDate, e.date)).toBeGreaterThanOrEqual(0)
    expect(next.settings.demoVersion).toBe(DEMO_VERSION)
    // running again adds nothing
    const count = next.entries.length
    expect(upgradeDemo(next, '2026-10-11')).toBeNull()
    expect(next.entries).toHaveLength(count)
  })
})
