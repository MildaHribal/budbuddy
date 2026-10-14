// Latest journal photo for the Android home-screen widget (loaded on the device only).
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import type { GrowData } from '~/types/grow'
import { parseISODate } from './date'
import { blobToDataUrl, compressImage } from './image'
import { photoStore } from './photoStore'

interface LatestPhoto { photoId: string, plant: string, date: string }

// survives restarts, so the widget photo is not re-encoded on every cold start
const KEY_STORE = 'bb.widget.photoKey'

function latestPhoto(state: Pick<GrowData, 'plants' | 'entries'>): LatestPhoto | null {
  const names = new Map(state.plants.map(p => [p.id, p.name]))
  let best: LatestPhoto | null = null
  const consider = (photoId: string, plantId: string, date: string) => {
    const plant = names.get(plantId)
    if (plant !== undefined && (!best || date > best.date)) best = { photoId, plant, date }
  }
  for (const p of state.plants) if (p.photoId) consider(p.photoId, p.id, p.startDate)
  for (const e of state.entries) for (const id of e.photoIds) consider(id, e.plantId, e.date)
  return best
}

const dateLabel = (iso: string, lang: string) =>
  parseISODate(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })

function readKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORE)
  } catch {
    return null
  }
}

function writeKey(key: string) {
  try {
    localStorage.setItem(KEY_STORE, key)
  } catch {
    // only costs a re-encode next time
  }
}

export async function syncWidgetPhoto(state: Pick<GrowData, 'plants' | 'entries'>) {
  const latest = latestPhoto(state)
  const key = latest ? JSON.stringify(latest) : ''
  if (key === readKey()) return
  if (!latest) {
    await Filesystem.deleteFile({ path: 'widget/latest.jpg', directory: Directory.Data }).catch(() => {})
    await Filesystem.deleteFile({ path: 'widget/latest.json', directory: Directory.Data }).catch(() => {})
    writeKey(key)
    return
  }
  const stored = await photoStore.get(latest.photoId)
  if (!stored) return
  const small = await compressImage(stored.blob, 600, 0.8)
  const data = (await blobToDataUrl(small)).split(',')[1] ?? ''
  await Filesystem.writeFile({ path: 'widget/latest.jpg', data, directory: Directory.Data, recursive: true })
  await Filesystem.writeFile({
    path: 'widget/latest.json',
    data: JSON.stringify({ ...latest, dateEn: dateLabel(latest.date, 'en-US'), dateCs: dateLabel(latest.date, 'cs-CZ') }),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true
  })
  writeKey(key)
}
