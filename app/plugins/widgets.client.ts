import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { photoStore } from '~/utils/photoStore'
import { blobToDataUrl, compressImage } from '~/utils/image'
import { parseISODate } from '~/utils/date'
import { WidgetBridge } from '~/utils/widgetBridge'

const DEEP_LINK = /^budbuddy:\/\/app(\/[^#]*)?/

interface LatestPhoto { photoId: string, plant: string, date: string }

function latestPhoto(): LatestPhoto | null {
  const { state } = useGrow()
  const names = new Map(state.plants.map(p => [p.id, p.name]))
  const all: { photoId: string, plantId: string, date: string }[] = []
  for (const p of state.plants) if (p.photoId) all.push({ photoId: p.photoId, plantId: p.id, date: p.startDate })
  for (const e of state.entries) for (const id of e.photoIds) all.push({ photoId: id, plantId: e.plantId, date: e.date })
  let best: LatestPhoto | null = null
  for (const c of all) {
    const plant = names.get(c.plantId)
    if (plant !== undefined && (!best || c.date > best.date)) best = { photoId: c.photoId, plant, date: c.date }
  }
  return best
}

const dateLabel = (iso: string, lang: string) =>
  parseISODate(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })

let writtenKey: string | null = null

async function syncPhoto() {
  const latest = latestPhoto()
  const key = latest ? JSON.stringify(latest) : ''
  if (key === writtenKey) return
  if (!latest) {
    await Filesystem.deleteFile({ path: 'widget/latest.jpg', directory: Directory.Data }).catch(() => {})
    await Filesystem.deleteFile({ path: 'widget/latest.json', directory: Directory.Data }).catch(() => {})
    writtenKey = key
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
  writtenKey = key
}

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return

  const router = useRouter()
  const open = (url: string | undefined) => {
    const m = url ? DEEP_LINK.exec(url) : null
    if (m) router.push(m[1] || '/')
  }
  App.addListener('appUrlOpen', e => open(e.url))
  router.isReady().then(() => App.getLaunchUrl()).then(r => open(r?.url)).catch(() => {})

  const { state } = useGrow()
  const refresh = () => WidgetBridge.refresh().catch(() => {})
  const sync = useDebounceFn(async () => {
    await syncPhoto().catch(e => console.error('[BudBuddy] widget photo failed', e))
    await refresh()
  }, 2000)
  watch(() => [state.plants, state.entries, state.tasks, state.settings], sync, { deep: true, immediate: true })
  // let the 250 ms debounced save hit Preferences first
  App.addListener('pause', () => setTimeout(refresh, 600))
})
