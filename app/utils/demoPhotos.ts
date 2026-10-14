import type { GrowData } from '../types/grow'
import { photoStore } from './photoStore'

// loaded lazily: the photo URLs must stay out of the entry chunk (they become <link rel=prefetch>)

const assets = import.meta.glob<string>('../assets/demo/*.{jpg,webp}', { eager: true, query: '?url', import: 'default' })
const urls: Record<string, string> = Object.fromEntries(
  Object.entries(assets).map(([path, url]) => [`demo-${path.split('/').pop()!.replace(/\.(jpg|webp)$/, '')}`, url])
)

export const demoPhotoUrl = (id: string): string | undefined => urls[id]

/** Puts the bundled demo photos into the photo store; references to photos that fail to load are removed. */
/** `isCurrent` turns false when the data was replaced meanwhile (restore, erase); then nothing is changed. */
export async function seedDemoPhotos(data: GrowData, isCurrent: () => boolean = () => true): Promise<void> {
  const wanted = new Set<string>()
  for (const p of data.plants) if (p.photoId) wanted.add(p.photoId)
  for (const e of data.entries) e.photoIds.forEach(id => wanted.add(id))

  const loaded = new Set<string>()
  await Promise.all([...wanted].map(async (id) => {
    const url = urls[id]
    if (!url || !isCurrent()) return
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      // the data may have been replaced while fetching
      if (!isCurrent()) return
      await photoStore.put({ id, blob, createdAt: new Date().toISOString() })
      loaded.add(id)
    } catch (e) {
      console.warn('[BudBuddy] demo photo skipped', id, e)
    }
  }))

  if (!isCurrent()) return
  for (const p of data.plants) if (p.photoId && !loaded.has(p.photoId)) p.photoId = null
  for (const e of data.entries) e.photoIds = e.photoIds.filter(id => loaded.has(id))
  data.entries = data.entries.filter(e => e.type !== 'photo' || e.photoIds.length > 0)
}
