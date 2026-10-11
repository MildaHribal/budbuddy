import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDemoData } from '../app/utils/demo'
import { DEMO_PHOTO_CREDITS, demoPhotoId, seedDemoPhotos } from '../app/utils/demoPhotos'

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
    expect(demo.plants.every(p => p.photoId)).toBe(true)
    const files = new Set(DEMO_PHOTO_CREDITS.map(c => `demo-${c.file.replace(/\.jpg$/, '')}`))
    for (const id of photoRefs(demo)) expect(files.has(id!)).toBe(true)
    expect(DEMO_PHOTO_CREDITS.every(c => c.author && c.license && c.sourceUrl.startsWith('https://commons.wikimedia.org/'))).toBe(true)
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
    const bad = demoPhotoId('jar')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => String(url).includes('jar') ? new Response(null, { status: 404 }) : new Response('x')))
    const demo = buildDemoData('2026-10-11')
    await seedDemoPhotos(demo)
    expect(photoRefs(demo)).not.toContain(bad)
    expect(demo.plants.find(p => p.archived)!.photoId).toBeNull()
    expect(demo.entries.every(e => e.type !== 'photo' || e.photoIds.length)).toBe(true)
  })
})
