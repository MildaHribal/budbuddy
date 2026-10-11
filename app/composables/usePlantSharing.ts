import type { PublicTimelineItem } from '~/types/community'
import type { JournalEntry, Plant } from '~/types/grow'
import { entrySummary } from '~/utils/entries'
import { compressImage } from '~/utils/image'
import { photoStore } from '~/utils/photoStore'

type TimelineItem = PublicTimelineItem

const PHOTO_LIMIT = 12
const TIMELINE_LIMIT = 200
const SYNC_DELAY = 4000
const BUCKET = 'media'
const PUBLIC_MARK = `/object/public/${BUCKET}/`

/** plant ids with a sync / unshare in flight */
const busy = ref(new Set<string>())
let autoStarted = false

const mediaPath = (uid: string, localId: string, photoId: string) => `${uid}/plants/${localId}/${photoId}.jpg`

function publicUrl(path: string): string {
  return useSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const i = url.indexOf(PUBLIC_MARK)
  return i < 0 ? null : decodeURIComponent(url.slice(i + PUBLIC_MARK.length).split('?')[0]!)
}

function rowPaths(row: { cover_url: string | null, timeline: TimelineItem[] | null } | null): Set<string> {
  const out = new Set<string>()
  if (!row) return out
  const cover = pathFromUrl(row.cover_url)
  if (cover) out.add(cover)
  for (const item of row.timeline ?? []) {
    const p = pathFromUrl(item.photoUrl)
    if (p) out.add(p)
  }
  return out
}

async function fetchRow(publicId: string) {
  const { data } = await useSupabase().from('public_plants').select('cover_url, timeline').eq('id', publicId).maybeSingle()
  return data as { cover_url: string | null, timeline: TimelineItem[] | null } | null
}

async function removePaths(paths: Iterable<string>) {
  const list = [...paths]
  if (!list.length) return
  const { error } = await useSupabase().storage.from(BUCKET).remove(list)
  if (error) console.warn('[BudBuddy] media cleanup failed', error)
}

async function uploadPhoto(uid: string, localId: string, photoId: string, existing: Set<string>): Promise<string | null> {
  const path = mediaPath(uid, localId, photoId)
  if (!existing.has(path)) {
    const stored = await photoStore.get(photoId)
    if (!stored) return null
    const blob = await compressImage(stored.blob, 1600, 0.82)
    const { error } = await useSupabase().storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '31536000',
      upsert: false
    })
    if (error && !/exist|duplicate/i.test(error.message)) throw error
  }
  return publicUrl(path)
}

function toItem(e: JournalEntry, photoUrl?: string): TimelineItem {
  const item: TimelineItem = { date: e.date, type: e.type, summary: entrySummary(e).slice(0, 160) }
  const note = e.note.trim().replace(/\s+/g, ' ').slice(0, 240)
  if (note) item.note = note
  if (e.type === 'stage' && e.stage) item.stage = e.stage
  if (photoUrl) item.photoUrl = photoUrl
  return item
}

/** Everything that ends up in the public row; changes trigger a re-sync. */
function signature(p: Plant, entries: JournalEntry[]): string {
  const { sharing: _s, updatedAt: _u, ...rest } = p
  return JSON.stringify([rest, entries])
}

async function pushPlant(plantId: string): Promise<boolean> {
  const { user, accepted } = useAuth()
  const grow = useGrow()
  const plant = grow.getPlant(plantId)
  const uid = user.value?.id
  if (!plant || !uid || !accepted.value) return false

  const sb = useSupabase()
  const entries = grow.entriesFor(plantId)
  const previous = plant.sharing ? await fetchRow(plant.sharing.publicId) : null
  const existing = rowPaths(previous)
  const used = new Set<string>()

  const photoUrls = new Map<string, string>()
  for (const e of entries) {
    if (photoUrls.size >= PHOTO_LIMIT) break
    const photoId = e.photoIds[0]
    if (!photoId) continue
    const url = await uploadPhoto(uid, plantId, photoId, existing)
    if (url) {
      photoUrls.set(e.id, url)
      used.add(mediaPath(uid, plantId, photoId))
    }
  }

  const coverId = plant.photoId ?? entries.find(e => e.photoIds.length)?.photoIds[0] ?? null
  const coverUrl = coverId ? await uploadPhoto(uid, plantId, coverId, existing) : null
  if (coverUrl && coverId) used.add(mediaPath(uid, plantId, coverId))

  const timeline: TimelineItem[] = entries.slice(0, TIMELINE_LIMIT).map(e => toItem(e, photoUrls.get(e.id)))

  const { data, error } = await sb.from('public_plants').upsert({
    owner_id: uid,
    local_id: plantId,
    name: plant.name.slice(0, 60),
    strain: plant.strain.slice(0, 60) || null,
    plant_type: plant.type,
    stage: plant.stage,
    environment: plant.location,
    medium: plant.medium,
    start_date: plant.startDate,
    harvest_wet_g: plant.harvest?.wetWeight ?? null,
    harvest_dry_g: plant.harvest?.dryWeight ?? null,
    archived: plant.archived,
    cover_url: coverUrl,
    timeline,
    updated_at: new Date().toISOString()
  }, { onConflict: 'owner_id,local_id' }).select('id').single()
  if (error) throw error

  // plant may have been deleted or unshared meanwhile
  const live = grow.getPlant(plantId)
  if (live) live.sharing = { publicId: (data as { id: string }).id, syncedAt: new Date().toISOString() }
  await removePaths([...existing].filter(p => !used.has(p)))
  return true
}

async function deleteRemote(publicId: string) {
  const row = await fetchRow(publicId)
  const { error } = await useSupabase().from('public_plants').delete().eq('id', publicId)
  if (error) throw error
  await removePaths(rowPaths(row))
}

async function withBusy<T>(plantId: string, fn: () => Promise<T>): Promise<T> {
  busy.value = new Set(busy.value).add(plantId)
  try {
    return await fn()
  } finally {
    const next = new Set(busy.value)
    next.delete(plantId)
    busy.value = next
  }
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function schedule(plantId: string, delay = SYNC_DELAY) {
  clearTimeout(timers.get(plantId))
  timers.set(plantId, setTimeout(() => {
    timers.delete(plantId)
    if (busy.value.has(plantId)) return schedule(plantId)
    withBusy(plantId, () => pushPlant(plantId)).catch(e => console.warn('[BudBuddy] plant sync failed', e))
  }, delay))
}

/** Watches shared plants and keeps their public copy in step. Call once from a client plugin. */
function startAutoSync() {
  if (autoStarted) return
  autoStarted = true
  const grow = useGrow()
  const { accepted } = useAuth()
  const known = new Map<string, { sig: string, publicId: string }>()

  watch(() => grow.state.plants.filter(p => p.sharing).map(p => ({
    id: p.id,
    publicId: p.sharing!.publicId,
    sig: signature(p, grow.entriesFor(p.id))
  })), (list) => {
    const seen = new Set<string>()
    for (const { id, publicId, sig } of list) {
      seen.add(id)
      const prev = known.get(id)
      known.set(id, { sig, publicId })
      if (prev && prev.sig !== sig && accepted.value) schedule(id)
    }
    // deleted locally while shared: drop the public copy too
    for (const [id, { publicId }] of known) {
      if (seen.has(id)) continue
      known.delete(id)
      if (grow.getPlant(id)) continue
      clearTimeout(timers.get(id))
      if (accepted.value) deleteRemote(publicId).catch(e => console.warn('[BudBuddy] unshare failed', e))
    }
  }, { immediate: true })

  // catch up on edits made while signed out or offline
  watch(accepted, (on) => {
    if (!on) return
    grow.state.plants.filter(p => p.sharing).forEach((p, i) => schedule(p.id, 1500 + i * 1500))
  }, { immediate: true })
}

export function usePlantSharing() {
  const grow = useGrow()

  const isPublic = (plantId: string) => !!grow.getPlant(plantId)?.sharing
  const isBusy = (plantId: string) => busy.value.has(plantId)

  async function share(plantId: string): Promise<boolean> {
    return withBusy(plantId, () => pushPlant(plantId))
  }

  async function unshare(plantId: string): Promise<void> {
    const plant = grow.getPlant(plantId)
    const publicId = plant?.sharing?.publicId
    if (!plant || !publicId) return
    clearTimeout(timers.get(plantId))
    await withBusy(plantId, () => deleteRemote(publicId))
    plant.sharing = null
  }

  /** after account deletion the rows are gone server-side */
  function forgetAll() {
    for (const p of grow.state.plants) {
      const live = grow.getPlant(p.id)
      if (live?.sharing) live.sharing = null
    }
  }

  return { busy, isPublic, isBusy, share, unshare, forgetAll, startAutoSync }
}
