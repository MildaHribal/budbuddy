import type { PublicTimelineItem } from '~/types/community'
import type { JournalEntry, Plant } from '~/types/grow'
import { entrySummary } from '~/utils/entries'
import { compressImage } from '~/utils/image'
import { photoStore } from '~/utils/photoStore'

type TimelineItem = PublicTimelineItem
type Row = { owner_id: string, cover_url: string | null, timeline: TimelineItem[] | null }

const PHOTO_LIMIT = 12
const TIMELINE_LIMIT = 200
const SYNC_DELAY = 4000
const BUCKET = 'media'
const PUBLIC_MARK = `/object/public/${BUCKET}/`
const META_KEY = 'bb.sharing.v1'

/** Local bookkeeping kept beside plant.sharing (schema.ts strips unknown fields from plants). */
interface Meta {
  /** plantId → account that owns the public copy + hash of what was last pushed */
  owners: Record<string, { owner: string, sig?: string }>
  /** public rows whose local plant is gone but the remote delete has not succeeded yet */
  tombstones: { publicId: string, owner: string, localId: string }[]
}

function readMeta(): Meta {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) ?? 'null') as Partial<Meta> | null
    return { owners: raw?.owners ?? {}, tombstones: raw?.tombstones ?? [] }
  } catch {
    return { owners: {}, tombstones: [] }
  }
}

const meta = ref<Meta>(import.meta.client ? readMeta() : { owners: {}, tombstones: [] })

function dropOwner(plantId: string) {
  meta.value.owners = Object.fromEntries(Object.entries(meta.value.owners).filter(([k]) => k !== plantId))
}

function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta.value))
  } catch { /* storage blocked */ }
}

/** plant ids with a sync / unshare queued or running */
const busy = ref(new Set<string>())
const queues = new Map<string, Promise<unknown>>()
/** bumped on unshare / delete so an in-flight push knows it is stale */
const generation = new Map<string, number>()
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

function rowPaths(row: Pick<Row, 'cover_url' | 'timeline'> | null): Set<string> {
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

async function fetchRow(publicId: string): Promise<Row | null> {
  const { data, error } = await useSupabase().from('public_plants').select('owner_id, cover_url, timeline').eq('id', publicId).maybeSingle()
  if (error) throw error
  return data as Row | null
}

/** Paths still used elsewhere (challenge entries reuse plant covers); never delete those. */
async function referencedPaths(uid: string): Promise<Set<string>> {
  const { data, error } = await useSupabase().from('challenge_entries').select('image_url').eq('user_id', uid)
  if (error) throw error
  const out = new Set<string>()
  for (const r of (data ?? []) as { image_url: string }[]) {
    const p = pathFromUrl(r.image_url)
    if (p) out.add(p)
  }
  return out
}

async function removePaths(uid: string, paths: Iterable<string>) {
  const own = [...paths].filter(p => p.startsWith(`${uid}/`))
  if (!own.length) return
  let keep: Set<string>
  try {
    keep = await referencedPaths(uid)
  } catch (e) {
    console.warn('[BudBuddy] media cleanup skipped', e)
    return
  }
  const list = own.filter(p => !keep.has(p))
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
    existing.add(path)
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

function hash(s: string): string {
  let h = 0x811C9DC5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36) + s.length.toString(36)
}

/** Everything that ends up in the public row; changes trigger a re-sync. */
function signature(p: Plant, entries: JournalEntry[]): string {
  const { sharing: _s, updatedAt: _u, ...rest } = p
  return hash(JSON.stringify([rest, entries]))
}

const genOf = (plantId: string) => generation.get(plantId) ?? 0
function bump(plantId: string) {
  generation.set(plantId, genOf(plantId) + 1)
}

/** Runs jobs for one plant strictly one after another. */
function enqueue<T>(plantId: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(plantId) ?? Promise.resolve()
  busy.value = new Set(busy.value).add(plantId)
  const run = prev.catch(() => {}).then(fn)
  const tail = run.catch(() => {}).finally(() => {
    if (queues.get(plantId) !== tail) return
    queues.delete(plantId)
    const next = new Set(busy.value)
    next.delete(plantId)
    busy.value = next
  })
  queues.set(plantId, tail)
  return run
}

async function deleteRow(uid: string, publicId: string, localId: string) {
  const sb = useSupabase()
  const row = await fetchRow(publicId)
  if (row && row.owner_id !== uid) return
  const { data: ups, error: upErr } = await sb.from('plant_updates').select('images').eq('plant_id', publicId)
  const updatePaths = upErr ? [] : ((ups ?? []) as { images: string[] | null }[]).flatMap(u => (u.images ?? []).map(pathFromUrl).filter((p): p is string => !!p))
  if (row) {
    const { error } = await sb.from('public_plants').delete().eq('id', publicId).eq('owner_id', uid)
    if (error) throw error
  }
  await removePaths(uid, [...rowPaths(row), ...updatePaths])
  if (upErr) await removeFolder(uid, `${uid}/plants/${localId}/updates`)
}

async function removeFolder(uid: string, folder: string) {
  const { data, error } = await useSupabase().storage.from(BUCKET).list(folder, { limit: 100 })
  if (error || !data?.length) return
  await removePaths(uid, data.map(f => `${folder}/${f.name}`))
}

async function pushPlant(plantId: string): Promise<boolean> {
  const { user, accepted } = useAuth()
  const grow = useGrow()
  const plant = grow.getPlant(plantId)
  const uid = user.value?.id
  if (!plant || !uid || !accepted.value) return false
  const gen = genOf(plantId)
  const owned = meta.value.owners[plantId]
  // a public copy owned by another account is never touched or re-published silently
  if (plant.sharing && owned && owned.owner !== uid) return false

  const sb = useSupabase()
  const entries = grow.entriesFor(plantId)
  const sig = signature(plant, entries)
  let previous = plant.sharing ? await fetchRow(plant.sharing.publicId) : null
  if (previous && previous.owner_id !== uid) {
    if (!owned) {
      meta.value.owners[plantId] = { owner: previous.owner_id }
      saveMeta()
      return false
    }
    previous = null
  }
  const before = rowPaths(previous)
  const existing = new Set(before)
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

  // unshared, deleted or signed out while uploading: don't (re)create the row
  const stale = () => genOf(plantId) !== gen || !grow.getPlant(plantId) || user.value?.id !== uid
  if (stale()) {
    await removePaths(uid, [...used].filter(p => !before.has(p)))
    return false
  }

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
  const publicId = (data as { id: string }).id

  // unshared or deleted during the upsert: take the row down again
  if (genOf(plantId) !== gen || !grow.getPlant(plantId)) {
    await deleteRow(uid, publicId, plantId).catch(e => console.warn('[BudBuddy] rollback failed', e))
    return false
  }
  const live = grow.getPlant(plantId)!
  live.sharing = { publicId, syncedAt: new Date().toISOString() }
  meta.value.owners[plantId] = { owner: uid, sig }
  saveMeta()
  // old covers stay until nothing references them (see referencedPaths)
  await removePaths(uid, [...before].filter(p => !used.has(p)))
  return true
}

/** Deletes a public copy; on failure keeps a tombstone that is retried later. */
async function deleteRemote(plantId: string, publicId: string, owner: string) {
  const { user } = useAuth()
  const uid = user.value?.id
  const stone = { publicId, owner, localId: plantId }
  try {
    if (!uid || uid !== owner) throw new Error('not signed in as owner')
    await deleteRow(uid, publicId, plantId)
    meta.value.tombstones = meta.value.tombstones.filter(t => t.publicId !== publicId)
  } catch (e) {
    if (!meta.value.tombstones.some(t => t.publicId === publicId)) meta.value.tombstones.push(stone)
    throw e
  } finally {
    saveMeta()
  }
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const pending = new Set<string>()

function schedule(plantId: string, delay = SYNC_DELAY) {
  clearTimeout(timers.get(plantId))
  timers.set(plantId, setTimeout(() => {
    timers.delete(plantId)
    if (pending.has(plantId)) return
    pending.add(plantId)
    enqueue(plantId, () => {
      pending.delete(plantId)
      return pushPlant(plantId)
    }).catch(e => console.warn('[BudBuddy] plant sync failed', e))
  }, delay))
}

function cancel(plantId: string) {
  clearTimeout(timers.get(plantId))
  timers.delete(plantId)
  bump(plantId)
}

/** Watches shared plants and keeps their public copy in step. */
function startAutoSync() {
  if (autoStarted || !import.meta.client) return
  autoStarted = true
  const grow = useGrow()
  const { accepted, user } = useAuth()
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
      if (prev && prev.sig !== sig && accepted.value && isOwned(id)) schedule(id)
    }
    // deleted locally while shared: drop the public copy too
    for (const [id, { publicId }] of known) {
      if (seen.has(id)) continue
      known.delete(id)
      if (grow.getPlant(id)) continue
      cancel(id)
      const owner = meta.value.owners[id]?.owner ?? user.value?.id
      dropOwner(id)
      saveMeta()
      if (!owner) continue
      enqueue(id, () => deleteRemote(id, publicId, owner)).catch(e => console.warn('[BudBuddy] unshare failed', e))
    }
  }, { immediate: true })

  // catch up on edits made while signed out / offline, and retry failed deletes
  watch(() => (accepted.value ? user.value?.id : null), async (uid) => {
    if (!uid) return
    await adoptLegacy(uid)
    let i = 0
    for (const p of grow.state.plants) {
      const m = meta.value.owners[p.id]
      if (!p.sharing || m?.owner !== uid) continue
      if (m.sig === signature(p, grow.entriesFor(p.id))) continue
      schedule(p.id, 1500 + i++ * 1500)
    }
    for (const t of meta.value.tombstones.filter(t => t.owner === uid)) {
      enqueue(t.localId, () => deleteRemote(t.localId, t.publicId, t.owner)).catch(() => {})
    }
    askAboutUnlinked(uid)
  }, { immediate: true })
}

const asked = new Set<string>()

/** Another account shared some plants on this phone: never publish them silently, ask once per session. */
async function askAboutUnlinked(uid: string) {
  if (asked.has(uid)) return
  const grow = useGrow()
  const others = grow.state.plants.filter(p => p.sharing && meta.value.owners[p.id] && meta.value.owners[p.id]!.owner !== uid)
  if (!others.length) return
  asked.add(uid)
  const ok = await useConfirm().confirm({
    title: translate('auth.share.unlinkedTitle', { n: others.length }),
    message: translate('auth.share.unlinkedMessage'),
    confirmLabel: translate('auth.share.unlinkedPublish')
  })
  if (!ok || useAuth().user.value?.id !== uid) return
  const { share } = usePlantSharing()
  for (const p of others) await share(p.id).catch(e => console.warn('[BudBuddy] share failed', e))
}

/** Plants shared before owners were tracked: claim them when the row is ours (or gone). */
async function adoptLegacy(uid: string) {
  const grow = useGrow()
  let changed = false
  for (const p of grow.state.plants) {
    if (!p.sharing || meta.value.owners[p.id]) continue
    try {
      const row = await fetchRow(p.sharing.publicId)
      meta.value.owners[p.id] = { owner: row?.owner_id ?? uid }
      changed = true
    } catch { /* offline: try again next time */ }
  }
  if (changed) saveMeta()
}

function isOwned(plantId: string): boolean {
  const uid = useAuth().user.value?.id
  return !!uid && meta.value.owners[plantId]?.owner === uid
}

export function usePlantSharing() {
  const grow = useGrow()
  const { user } = useAuth()

  const isPublic = (plantId: string) => !!grow.getPlant(plantId)?.sharing
  const isBusy = (plantId: string) => busy.value.has(plantId)

  /** Shared from a different account than the signed-in one (or not yet verified). */
  const isUnlinked = (plantId: string) => {
    const uid = user.value?.id
    if (!uid || !grow.getPlant(plantId)?.sharing) return false
    const owner = meta.value.owners[plantId]?.owner
    return !!owner && owner !== uid
  }

  async function share(plantId: string): Promise<boolean> {
    startAutoSync()
    const uid = user.value?.id
    // publishing under this account: forget the other account's copy (it stays theirs)
    if (uid && meta.value.owners[plantId]?.owner && meta.value.owners[plantId]!.owner !== uid) {
      dropOwner(plantId)
      const live = grow.getPlant(plantId)
      if (live) live.sharing = null
      saveMeta()
    }
    clearTimeout(timers.get(plantId))
    const ok = await enqueue(plantId, () => pushPlant(plantId))
    if (!ok) throw new Error('share failed')
    return ok
  }

  async function unshare(plantId: string): Promise<void> {
    const plant = grow.getPlant(plantId)
    const publicId = plant?.sharing?.publicId
    if (!plant || !publicId) return
    const owner = meta.value.owners[plantId]?.owner ?? user.value?.id
    cancel(plantId)
    if (owner && owner === user.value?.id) {
      await enqueue(plantId, () => deleteRemote(plantId, publicId, owner))
    }
    const live = grow.getPlant(plantId)
    if (live) live.sharing = null
    dropOwner(plantId)
    saveMeta()
  }

  /** Local-only: stop treating a plant shared by another account as public here. */
  function detach(plantId: string) {
    const live = grow.getPlant(plantId)
    if (live) live.sharing = null
    dropOwner(plantId)
    saveMeta()
  }

  /** after account deletion the rows are gone server-side */
  function forgetAll() {
    for (const p of grow.state.plants) {
      cancel(p.id)
      const live = grow.getPlant(p.id)
      if (live?.sharing) live.sharing = null
    }
    meta.value = { owners: {}, tombstones: [] }
    saveMeta()
  }

  /** Paths of the public copy's media folder for this plant (weekly update uploads go here). */
  const updatesFolder = (plantId: string) => (user.value ? `${user.value.id}/plants/${plantId}/updates` : null)

  return { busy, isPublic, isBusy, isUnlinked, share, unshare, detach, forgetAll, startAutoSync, updatesFolder }
}

/** True when something needs the sync engine at start (shared plants or pending deletes). */
export function sharingNeeded(): boolean {
  return useGrow().state.plants.some(p => p.sharing) || meta.value.tombstones.length > 0
}
