import type { GrowData } from '../types/grow'
import credits from '../assets/demo/credits.json'
import { photoStore } from './photoStore'

export interface PhotoCredit {
  file: string
  title: string
  author: string
  license: string
  licenseUrl: string | null
  sourceUrl: string
}

/** Wikimedia Commons attributions for the bundled demo photos. */
export const DEMO_PHOTO_CREDITS: PhotoCredit[] = credits

export type DemoPhoto = 'seedling-led' | 'seedling-sprout' | 'veg-coco' | 'veg-tent' | 'canopy-scrog'
  | 'flower-plant' | 'flower-cola' | 'trichomes' | 'drying' | 'jar'

export const demoPhotoId = (slug: DemoPhoto) => `demo-${slug}`

const assets = import.meta.glob<string>('../assets/demo/*.jpg', { eager: true, query: '?url', import: 'default' })
const urls: Record<string, string> = Object.fromEntries(
  Object.entries(assets).map(([path, url]) => [`demo-${path.split('/').pop()!.replace(/\.jpg$/, '')}`, url])
)

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
