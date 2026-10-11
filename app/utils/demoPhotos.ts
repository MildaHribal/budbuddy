import type { GrowData } from '../types/grow'
import { photoStore } from './photoStore'

// loaded lazily: the photo URLs must stay out of the entry chunk (they become <link rel=prefetch>)
export { DEMO_PHOTO_CREDITS, demoPhotoId, type DemoPhoto, type PhotoCredit } from './demoCredits'

const assets = import.meta.glob<string>('../assets/demo/*.jpg', { eager: true, query: '?url', import: 'default' })
const urls: Record<string, string> = Object.fromEntries(
  Object.entries(assets).map(([path, url]) => [`demo-${path.split('/').pop()!.replace(/\.jpg$/, '')}`, url])
)

export const demoPhotoUrl = (id: string): string | undefined => urls[id]

/** Puts the bundled demo photos into the photo store; references to photos that fail to load are removed. */
export async function seedDemoPhotos(data: GrowData): Promise<void> {
  const wanted = new Set<string>()
  for (const p of data.plants) if (p.photoId) wanted.add(p.photoId)
  for (const e of data.entries) e.photoIds.forEach(id => wanted.add(id))

  const loaded = new Set<string>()
  await Promise.all([...wanted].map(async (id) => {
    const url = urls[id]
    if (!url) return
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await photoStore.put({ id, blob: await res.blob(), createdAt: new Date().toISOString() })
      loaded.add(id)
    } catch (e) {
      console.warn('[BudBuddy] demo photo skipped', id, e)
    }
  }))

  for (const p of data.plants) if (p.photoId && !loaded.has(p.photoId)) p.photoId = null
  for (const e of data.entries) e.photoIds = e.photoIds.filter(id => loaded.has(id))
  data.entries = data.entries.filter(e => e.type !== 'photo' || e.photoIds.length > 0)
}
