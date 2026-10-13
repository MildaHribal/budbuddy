<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { EntryType, JournalEntry, StageId } from '~/types/grow'
import type { LightboxItem } from '~/components/PhotoLightbox.vue'
import { authUiWanted } from '~/utils/authUi'
import { isMissingSchema } from '~/utils/dbErrors'
import { completedWeek, dueWeek, updateStreak, type UpdateRow } from '~/utils/weeklyUpdate'

definePageMeta({ alias: ['/my_trees/:id'] })

const route = useRoute()
const grow = useGrow()
const { notify } = useNotify()
const { confirm } = useConfirm()
const { $goBack } = useNuxtApp()
const { t } = useI18n()

const today = useToday()
const plantId = computed(() => String(route.params.id))
const plant = computed(() => grow.getPlant(plantId.value))
useHead({ title: () => plant.value?.name ?? t('plant.title') })

const entries = computed(() => grow.entriesFor(plantId.value))
const progress = computed(() => (plant.value ? stageProgress(plant.value) : null))
const stage = computed(() => stageInfo(plant.value?.stage))
const watering = computed(() => (plant.value ? grow.wateringStatus(plant.value) : null))

const harvestEta = computed(() => (plant.value ? harvestEstimate(plant.value, today.value) : null))
const harvestEtaText = computed(() => {
  const e = harvestEta.value
  if (!e) return ''
  const dm = { day: 'numeric', month: 'numeric' } as const
  const range = `${formatDate(e.from, dm)}–${formatDate(e.to, dm)}`
  if (e.status === 'past') return t('plant.eta.past', { range })
  if (e.status === 'window') return t('plant.eta.window', { n: e.inMax, range })
  return t('plant.eta.ahead', { min: e.inMin, n: e.inMax, range })
})

type Tab = 'journal' | 'history' | 'info' | 'photos'
const tabs = computed<{ id: Tab, label: string }[]>(() => (['journal', 'history', 'info', 'photos'] as const).map(id => ({ id, label: t(`plant.tabs.${id}`) })))
const tab = ref<Tab>((route.query.tab as Tab) || 'journal')

// ── Stage journey ─────────────────────────────────────────────────
const stageIndex = computed(() => Math.max(0, STAGES.findIndex(s => s.id === plant.value?.stage)))
const journey = computed(() => stages().map((s, i) => ({
  ...s,
  state: i < stageIndex.value ? 'done' as const : i === stageIndex.value ? 'current' as const : 'future' as const
})))
const weekInStage = computed(() => ({
  week: Math.max(1, Math.ceil((progress.value?.dayInStage ?? 0) / 7)),
  weeks: Math.max(1, Math.ceil((progress.value?.stageDays ?? 7) / 7))
}))
// newest entry with a pH or EC reading
const lastReading = computed(() => entries.value.find(e => e.ph != null || e.ec != null) ?? null)
const latestHeight = computed(() => entries.value.find(e => e.heightCm != null)?.heightCm ?? null)
watch(tab, t => navigateTo({ query: { ...route.query, tab: t === 'journal' ? undefined : t } }, { replace: true }))

// ── Journal ───────────────────────────────────────────────────────
const selectedDate = ref(today.value)
// Follow the calendar when the app is resumed on a new day.
watch(today, (t, prev) => {
  if (selectedDate.value === prev) selectedDate.value = t
})
const markedDays = computed(() => new Set(entries.value.map(e => e.date)))
const dayEntries = computed(() => entries.value.filter(e => e.date === selectedDate.value))
const loggable = computed(() => entryTypes().filter(x => x.loggable))

const sheetOpen = ref(false)
const sheetType = ref<EntryType>('water')
const editing = ref<JournalEntry | null>(null)

function log(type: EntryType) {
  // Outside the journal the picked day is not visible, so log for today.
  if (tab.value !== 'journal') selectedDate.value = today.value
  editing.value = null
  sheetType.value = type
  sheetOpen.value = true
}

function edit(entry: JournalEntry) {
  editing.value = entry
  sheetType.value = entry.type
  sheetOpen.value = true
}

function onSaved(entry: JournalEntry) {
  selectedDate.value = entry.date
}

function removeEntry(entry: JournalEntry) {
  const removed = grow.deleteEntry(entry.id)
  if (removed) {
    notify(t('plant.toast.entryDeleted', { verb: entryInfo(removed.type).verb }), {
      tone: 'info',
      action: { label: t('common.undo'), run: () => grow.restoreEntry(removed) }
    })
  }
}

// ── History ───────────────────────────────────────────────────────
const historyFilter = ref<EntryType | null>(null)
const historyTypes = computed(() => entryTypes().filter(x => entries.value.some(e => e.type === x.type)))
const historyGroups = computed(() => {
  const groups: { date: string, items: JournalEntry[] }[] = []
  for (const e of entries.value) {
    if (historyFilter.value && e.type !== historyFilter.value) continue
    const last = groups[groups.length - 1]
    if (last?.date === e.date) last.items.push(e)
    else groups.push({ date: e.date, items: [e] })
  }
  return groups
})

// ── Info ──────────────────────────────────────────────────────────
const counts = computed(() => {
  const c: Partial<Record<EntryType, number>> = {}
  for (const e of entries.value) c[e.type] = (c[e.type] ?? 0) + 1
  return c
})

const heightPoints = computed(() => entries.value
  .filter(e => e.heightCm != null)
  .sort((a, b) => a.date.localeCompare(b.date))
  .map(e => ({ label: formatDate(e.date, { day: 'numeric', month: 'short' }), value: e.heightCm! })))

const timeline = computed(() => {
  const p = plant.value
  if (!p) return []
  return p.stageHistory.map((h, i) => {
    const next = p.stageHistory[i + 1]
    const end = next?.date ?? todayISO()
    return { ...h, info: stageInfo(h.stage), days: daysBetween(h.date, end), current: !next }
  })
})

const lastFeed = computed(() => entries.value.find(e => e.type === 'feed'))

const details = computed(() => {
  const p = plant.value
  if (!p) return []
  return [
    { icon: 'i-tabler-dna', label: t('plant.info.strain'), value: p.strain || '–' },
    { icon: p.type === 'autoflower' ? 'i-tabler-bolt' : 'i-tabler-sun', label: t('plant.info.type'), value: t(p.type === 'autoflower' ? 'plant.info.autoflower' : 'plant.info.photoperiod') },
    { icon: 'i-tabler-calendar', label: t('plant.info.started'), value: formatDate(p.startDate) },
    { icon: 'i-tabler-bucket', label: t('plant.info.pot'), value: p.potSize || '–' },
    { icon: 'i-tabler-shovel', label: t('plant.info.medium'), value: t(`plant.info.mediums.${p.medium}`) },
    { icon: 'i-tabler-home', label: t('plant.info.location'), value: t(`plant.info.locations.${p.location}`) },
    { icon: 'i-tabler-bulb', label: t('plant.info.light'), value: stage.value.light },
    ...plantGroupDetails(p)
  ]
})

// ── Photos ────────────────────────────────────────────────────────
interface PhotoRef extends LightboxItem {
  entryId: string | null
  date: string
}

const photos = computed<PhotoRef[]>(() => {
  const p = plant.value
  if (!p) return []
  const list: PhotoRef[] = []
  for (const e of entries.value) {
    for (const id of e.photoIds) {
      list.push({ photoId: id, entryId: e.id, date: e.date, title: e.note || entryInfo(e.type).verb, subtitle: `${formatDate(e.date)} · ${t('plant.day', { n: daysBetween(p.startDate, e.date) })}` })
    }
  }
  if (p.photoId) list.push({ photoId: p.photoId, entryId: null, date: p.startDate, title: t('plant.photos.profilePhoto'), subtitle: p.name })
  return list
})

const lightboxItems = ref<LightboxItem[]>([])
const lightboxIndex = ref<number | null>(null)

function openPhotos(items: LightboxItem[], photoId: string) {
  lightboxItems.value = items
  lightboxIndex.value = Math.max(0, items.findIndex(i => i.photoId === photoId))
}

function openEntryPhoto(entry: JournalEntry, photoId: string) {
  openPhotos(entry.photoIds.map(id => ({ photoId: id, title: entry.note || entryInfo(entry.type).verb, subtitle: formatDate(entry.date) })), photoId)
}

async function deletePhoto(item: LightboxItem) {
  const ok = await confirm({ title: t('plant.confirm.photoTitle'), message: t('plant.confirm.photoMessage'), confirmLabel: t('common.delete'), danger: true })
  if (!ok || !plant.value) return
  if (plant.value.photoId === item.photoId) grow.updatePlant(plant.value.id, { photoId: null })
  for (const e of entries.value.filter(x => x.photoIds.includes(item.photoId))) {
    const rest = e.photoIds.filter(id => id !== item.photoId)
    if (e.type === 'photo' && !rest.length && !e.note) grow.deleteEntry(e.id)
    else grow.updateEntry(e.id, { photoIds: rest })
  }
  lightboxItems.value = lightboxItems.value.filter(i => i.photoId !== item.photoId)
  grow.cleanupPhotos()
  notify(t('plant.toast.photoDeleted'), { tone: 'info' })
}

async function setProfilePhoto() {
  const file = await pickImage()
  if (!file || !plant.value) return
  try {
    grow.updatePlant(plant.value.id, { photoId: await grow.savePhoto(file) })
    notify(t('plant.toast.profileUpdated'))
  } catch {
    notify(t('plant.toast.badImage'), { tone: 'error' })
  }
}

// ── Stage / harvest ───────────────────────────────────────────────
const stageSheet = ref(false)
const stageChoice = ref<StageId>('seedling')
const stageDate = ref(todayISO())

const upcoming = computed(() => {
  const p = plant.value
  if (!p) return null
  const next = nextStage(p.stage)
  if (!next) return { label: t('plant.next.archive'), icon: 'i-tabler-archive', action: 'archive' as const }
  if (p.stage === 'flowering') return { label: t('plant.next.harvest'), icon: 'harvest', action: 'harvest' as const }
  if (p.stage === 'drying') return { label: t('plant.next.dry'), icon: 'curing', action: 'dry' as const }
  return { label: t('plant.next.stage', { stage: stageInfo(next).label.toLowerCase() }), icon: stageInfo(next).glyph, action: 'stage' as const }
})

function openStageSheet() {
  const p = plant.value
  if (!p) return
  const next = nextStage(p.stage)
  stageChoice.value = next && GROWING_STAGES.includes(next) ? next : p.stage
  stageDate.value = todayISO()
  stageSheet.value = true
}

function applyStage() {
  const p = plant.value
  if (!p) return
  if (stageChoice.value === p.stage || !GROWING_STAGES.includes(stageChoice.value)) {
    stageSheet.value = false
    return
  }
  if (!isValidISODate(stageDate.value) || stageDate.value > todayISO()) {
    notify(t('plant.toast.badDate'), { tone: 'error' })
    return
  }
  if (stageDate.value < stageStartDate(p)) {
    notify(t('plant.toast.dateBeforeStage'), { tone: 'error' })
    return
  }
  grow.setStage(p.id, stageChoice.value, stageDate.value)
  stageSheet.value = false
  const msg = t('plant.toast.stageChanged', { name: p.name, stage: stageInfo(stageChoice.value).label.toLowerCase() })
  if (stageChoice.value === 'flowering' && p.type === 'photoperiod' && (litSpace.value ? litSpace.value.lightHours : grow.state.settings.lightHours) !== 12) {
    notify(`${msg}. ${t('plant.flip.ask')}`, {
      icon: 'lamp',
      duration: 9000,
      action: { label: t('plant.flip.action'), run: switchTo1212 }
    })
  } else {
    notify(msg, { icon: stageInfo(stageChoice.value).glyph })
  }
}

// the plant's tent has its own schedule; otherwise the global one
const litSpace = computed(() => {
  const s = useSpaces().getSpace(plant.value?.spaceId)
  return s && s.lightHours !== null ? s : null
})

function switchTo1212() {
  const space = litSpace.value
  if (space) useSpaces().updateSpace(space.id, { lightHours: 12 })
  else grow.updateSettings({ lightHours: 12 })
  haptic('success')
  notify(t('plant.flip.done', { on: space?.lightsOn ?? grow.state.settings.lightsOn }), { icon: 'lamp' })
}

const harvestSheet = ref(false)
const harvestForm = reactive({ date: todayISO(), wet: '' as number | '', dry: '' as number | '', notes: '' })
const harvestMode = ref<'harvest' | 'dry' | 'edit'>('harvest')

function openHarvest(mode: 'harvest' | 'dry' | 'edit') {
  const h = plant.value?.harvest
  harvestMode.value = mode
  harvestForm.date = h?.date ?? todayISO()
  harvestForm.wet = h?.wetWeight ?? ''
  harvestForm.dry = h?.dryWeight ?? ''
  harvestForm.notes = h?.notes ?? ''
  harvestSheet.value = true
}

const num = (v: number | '') => (v === '' || Number.isNaN(v) ? null : Number(v))

function saveHarvest() {
  const p = plant.value
  if (!p) return
  const wet = num(harvestForm.wet)
  const dry = num(harvestForm.dry)
  if ((wet !== null && wet < 0) || (dry !== null && dry < 0)) {
    notify(t('plant.toast.negativeWeight'), { tone: 'error' })
    return
  }
  if (wet !== null && dry !== null && dry > wet) {
    notify(t('plant.toast.dryOverWet'), { tone: 'error' })
    return
  }
  // A new harvest ends the current (flowering) stage, so it cannot be dated before that stage began.
  const minDate = harvestMode.value === 'harvest' ? stageStartDate(p) : p.startDate
  if (!isValidISODate(harvestForm.date) || harvestForm.date > todayISO() || harvestForm.date < minDate) {
    notify(t('plant.toast.harvestRange', { from: formatDate(minDate) }), { tone: 'error' })
    return
  }
  const dryBefore = p.harvest?.dryWeight ?? null
  if (harvestMode.value === 'harvest') {
    grow.harvestPlant(p.id, { date: harvestForm.date, wetWeight: wet, dryWeight: dry, notes: harvestForm.notes.trim() })
    notify(t('plant.toast.harvestLogged'), { icon: 'i-tabler-basket' })
  } else {
    grow.updateHarvest(p.id, { date: harvestForm.date, wetWeight: wet, dryWeight: dry, notes: harvestForm.notes.trim() })
    if (harvestMode.value === 'dry' && p.stage === 'drying') {
      grow.setStage(p.id, 'curing')
      notify(t('plant.toast.dryCuring'), { icon: 'i-tabler-bottle' })
    } else {
      notify(t('plant.toast.harvestUpdated'))
    }
  }
  harvestSheet.value = false
  if (dry !== null && dry !== dryBefore) setTimeout(offerRecap, 900)
}

async function nextStep() {
  const p = plant.value
  const u = upcoming.value
  if (!p || !u) return
  if (u.action === 'harvest') openHarvest('harvest')
  else if (u.action === 'dry') openHarvest('dry')
  else if (u.action === 'archive') {
    const ok = await confirm({ title: t('plant.confirm.archiveTitle', { name: p.name }), message: t('plant.confirm.archiveMessage'), confirmLabel: t('plant.confirm.archiveLabel') })
    if (ok) {
      grow.setArchived(p.id, true)
      notify(t('plant.toast.archived'), { icon: 'i-tabler-archive' })
    }
  } else openStageSheet()
}

// ── More menu ─────────────────────────────────────────────────────
const moreSheet = ref(false)
const spaceSheet = ref(false)

async function toggleArchive() {
  const p = plant.value
  if (!p) return
  grow.setArchived(p.id, !p.archived)
  moreSheet.value = false
  notify(t(p.archived ? 'plant.toast.archived' : 'plant.toast.restored'), { icon: 'i-tabler-archive' })
}

async function removePlant() {
  const p = plant.value
  if (!p) return
  moreSheet.value = false
  const ok = await confirm({
    title: t('plant.confirm.deleteTitle', { name: p.name }),
    message: t('plant.confirm.deleteMessage', { entries: t('plant.journalEntries', { n: entries.value.length }) }),
    confirmLabel: t('common.delete'),
    danger: true
  })
  if (!ok) return
  grow.deletePlant(p.id)
  notify(t('plant.toast.deleted'), { tone: 'info' })
  navigateTo('/plants', { replace: true })
}

// ── Public sharing ────────────────────────────────────────────────
// Loaded on demand: they pull in supabase-js, which the daily path (open plant, log water) never needs.
type SharingApi = ReturnType<typeof import('~/composables/usePlantSharing')['usePlantSharing']>
type AuthApi = ReturnType<typeof import('~/composables/useAuth')['useAuth']>
const sharingApi = shallowRef<SharingApi | null>(null)
const authApi = shallowRef<AuthApi | null>(null)
let communityLoad: Promise<void> | null = null
function loadCommunity(): Promise<void> {
  communityLoad ??= Promise.all([import('~/composables/usePlantSharing'), import('~/composables/useAuth')])
    .then(([s, a]) => {
      sharingApi.value = s.usePlantSharing()
      authApi.value = a.useAuth()
    })
    .catch((e) => {
      communityLoad = null
      throw e
    })
  return communityLoad
}
const hasSession = () => {
  try {
    return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch {
    return false
  }
}
// a shared plant or a signed-in grower needs the real state right away
if (plant.value?.sharing || hasSession()) loadCommunity().catch(() => {})

const accepted = computed(() => authApi.value?.accepted.value ?? false)
const unlinked = computed(() => sharingApi.value?.isUnlinked(plantId.value) ?? false)
const isShared = computed(() => !!plant.value?.sharing && !unlinked.value)
const publicBusy = computed(() => sharingApi.value?.isBusy(plantId.value) ?? false)

async function togglePublic() {
  const p = plant.value
  moreSheet.value = false
  if (!p || publicBusy.value) return
  try {
    await loadCommunity()
  } catch {
    notify(t('auth.share.failed'), { tone: 'error' })
    return
  }
  const sharing = sharingApi.value!
  authUiWanted.value = true
  if (!authApi.value!.requireAuth()) return
  if (unlinked.value) return relinkPublic()
  const going = !p.sharing
  const ok = await confirm(going
    ? { title: t('auth.share.publicTitle'), message: t('auth.share.publicMessage'), confirmLabel: t('auth.share.makePublic') }
    : { title: t('auth.share.privateTitle'), message: t('auth.share.privateMessage'), confirmLabel: t('auth.share.makePrivate') })
  if (!ok) return
  try {
    if (going) await sharing.share(p.id)
    else await sharing.unshare(p.id)
    notify(t(going ? 'auth.share.nowPublic' : 'auth.share.nowPrivate'), { icon: going ? 'i-tabler-world' : 'i-tabler-lock' })
  } catch (e) {
    console.error(e)
    notify(t('auth.share.failed'), { tone: 'error' })
  }
}

// shared from another account on this phone: publish under this one, or just stop showing it as public here
async function relinkPublic() {
  const p = plant.value
  const sharing = sharingApi.value
  if (!p || !sharing) return
  const ok = await confirm({ title: t('auth.share.otherTitle'), message: t('auth.share.otherMessage'), confirmLabel: t('auth.share.unlinkedPublish') })
  if (!ok) return
  try {
    await sharing.share(p.id)
    notify(t('auth.share.nowPublic'), { icon: 'i-tabler-world' })
  } catch (e) {
    console.error(e)
    notify(t('auth.share.failed'), { tone: 'error' })
  }
}

// ── Community help ────────────────────────────────────────────────
const recentPest = computed(() => entries.value.some(e => e.type === 'pest' && daysBetween(e.date, today.value) <= 14))
const needsHelp = computed(() => !!plant.value && !plant.value.archived && (plant.value.health <= 3 || recentPest.value))

function askCommunity() {
  moreSheet.value = false
  navigateTo({ path: '/community', query: { compose: 'problem', plant: plantId.value } })
}

// ── Weekly diary update ───────────────────────────────────────────
const updates = ref<UpdateRow[]>([])
const updatesReady = ref(false)
const weeklySheet = ref(false)
const weeklyUsed = ref(false)
watch(weeklySheet, v => v && (weeklyUsed.value = true))
const publicId = computed(() => (isShared.value ? plant.value?.sharing?.publicId ?? null : null))

async function loadUpdates() {
  const id = publicId.value
  updatesReady.value = false
  if (!id || !accepted.value) return (updates.value = [])
  const { useSupabase } = await import('~/composables/useSupabase')
  if (id !== publicId.value) return
  const { data, error } = await useSupabase().from('plant_updates').select('week_no, created_at').eq('plant_id', id)
  if (id !== publicId.value) return
  if (error) {
    if (!isMissingSchema(error)) console.warn('[BudBuddy] updates load failed', error)
    return
  }
  updates.value = (data ?? []) as UpdateRow[]
  updatesReady.value = true
}
watch([publicId, accepted], loadUpdates, { immediate: true })

const weekDue = computed(() => {
  const p = plant.value
  if (!p || p.archived || !updatesReady.value) return null
  return dueWeek(p, updates.value, today.value)
})
const growStreak = computed(() => (plant.value && updatesReady.value ? updateStreak(updates.value, completedWeek(plant.value, today.value)) : null))

function onUpdatePosted(row: UpdateRow) {
  updates.value = [...updates.value.filter(u => u.week_no !== row.week_no), row]
}

// ── Harvest recap ─────────────────────────────────────────────────
const recapSheet = ref(false)
// community sheets mount on first use and stay for their close animation
const recapUsed = ref(false)
watch(recapSheet, v => v && (recapUsed.value = true))

function offerRecap() {
  notify(t('plant.recap.offer'), {
    icon: 'harvest',
    duration: 8000,
    action: { label: t('plant.recap.offerAction'), run: () => (recapSheet.value = true) }
  })
}

// ── Share card ────────────────────────────────────────────────────
const shareSheet = ref(false)
const isNative = Capacitor.isNativePlatform()
const shareBusy = ref(false)
const shareBlob = shallowRef<Blob | null>(null)
const sharePreview = ref<string | null>(null)

function clearShare() {
  if (sharePreview.value) URL.revokeObjectURL(sharePreview.value)
  sharePreview.value = null
  shareBlob.value = null
}
watch(shareSheet, (v) => {
  if (!v) clearShare()
})
onBeforeUnmount(clearShare)

async function openShareCard() {
  const p = plant.value
  const prog = progress.value
  if (!p || !prog) return
  moreSheet.value = false
  clearShare()
  shareSheet.value = true
  shareBusy.value = true
  haptic('tap')
  try {
    const facts = [t('plant.share.age', { n: prog.age })]
    if (latestHeight.value != null) facts.push(t('plant.share.height', { v: latestHeight.value }))
    if (p.type === 'autoflower') facts.push(t('plant.info.autoflower'))
    const blob = await renderShareCard({
      name: p.name,
      strain: p.strain,
      stageLabel: stage.value.label,
      stageGlyph: stage.value.glyph,
      stageColor: stage.value.color,
      stageLine: GROWING_STAGES.includes(p.stage)
        ? t('plant.share.stageDay', { n: prog.dayInStage, stage: stage.value.label.toLowerCase() })
        : stage.value.label,
      facts,
      harvestLine: p.harvest?.dryWeight != null ? t('plant.share.dry', { v: p.harvest.dryWeight }) : null,
      photoUrl: p.photoId ? await photoUrl(p.photoId) : null
    })
    if (!shareSheet.value) return
    shareBlob.value = blob
    sharePreview.value = URL.createObjectURL(blob)
  } catch (e) {
    console.error(e)
    shareSheet.value = false
    notify(t('plant.share.failed'), { tone: 'error' })
  } finally {
    shareBusy.value = false
  }
}

async function shareCard() {
  const p = plant.value
  const blob = shareBlob.value
  if (!p || !blob) return
  const filename = `budbuddy-${p.name.normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plant'}.png`
  shareBusy.value = true
  try {
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.writeFile({ path: filename, data: await blobToBase64(blob), directory: Directory.Cache })
      try {
        await Share.share({ title: p.name, files: [uri] })
      } catch (e) {
        if (!/cancel/i.test(String(e))) throw e
        return
      }
    } else {
      const a = document.createElement('a')
      a.href = sharePreview.value!
      a.download = filename
      a.click()
      notify(t('plant.share.downloaded'))
    }
    haptic('success')
    shareSheet.value = false
  } catch (e) {
    console.error(e)
    notify(t('plant.share.failed'), { tone: 'error' })
  } finally {
    shareBusy.value = false
  }
}

function duplicate() {
  const p = plant.value
  if (!p) return
  const copy = grow.addPlant({
    name: `${p.name} ${t('plant.copySuffix')}`,
    strain: p.strain,
    type: p.type,
    stage: GROWING_STAGES.includes(p.stage) ? p.stage : 'seedling',
    potSize: p.potSize,
    medium: p.medium,
    location: p.location,
    wateringInterval: p.wateringInterval,
    notes: p.notes
  })
  moreSheet.value = false
  notify(t('plant.toast.duplicated'))
  navigateTo(`/plants/${copy.id}`)
}
</script>

<template>
  <div
    v-if="plant && progress"
    class="detail"
  >
    <header class="detail-head">
      <div class="head-bar">
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('common.back')"
          @click="$goBack()"
        >
          <UIcon
            name="i-tabler-chevron-left"
            class="size-5"
          />
        </button>
        <div class="head-actions">
          <VoiceLogButton
            v-if="!plant.archived"
            :plant-id="plant.id"
          />
          <NuxtLink
            :to="{ path: '/ai-assistant', query: { plant: plant.id } }"
            class="icon-btn accent"
            :aria-label="t('plant.aria.ask')"
          >
            <GrowIcon name="spark" />
          </NuxtLink>
          <NuxtLink
            :to="`/plants/${plant.id}/edit`"
            class="icon-btn"
            :aria-label="t('plant.aria.edit')"
          >
            <UIcon
              name="i-tabler-pencil"
              class="size-5"
            />
          </NuxtLink>
          <button
            type="button"
            class="icon-btn"
            :aria-label="t('plant.aria.more')"
            @click="moreSheet = true"
          >
            <UIcon
              name="i-tabler-dots-vertical"
              class="size-5"
            />
          </button>
        </div>
      </div>
      <h1>{{ plant.name }}</h1>
      <p class="head-sub">
        {{ plant.strain || t('plant.unknownStrain') }} <span aria-hidden="true">·</span> <span class="num">{{ t('plant.day', { n: progress.age }) }}</span>
      </p>
    </header>

    <div class="detail-body">
      <section class="card photo-card">
        <div
          v-if="plant.photoId"
          class="photo-frame"
        >
          <PlantPhoto
            :photo-id="plant.photoId"
            :stage="plant.stage"
            :alt="plant.name"
            size="full"
          />
        </div>
        <button
          v-else
          type="button"
          class="photo-frame empty"
          :aria-label="t('plant.menu.changePhoto')"
          @click="setProfilePhoto"
        >
          <PlantPhoto
            :photo-id="null"
            :stage="plant.stage"
          />
          <span class="photo-add">
            <UIcon
              name="i-tabler-camera-plus"
              class="size-4"
            /> {{ t('plant.menu.changePhoto') }}
          </span>
        </button>
        <div class="photo-foot">
          <StageBadge :stage="plant.stage" />
          <span
            class="badge"
            :style="{ color: healthInfo(plant.health).color }"
          >
            <UIcon
              :name="healthInfo(plant.health).icon"
              class="size-3.5"
            /> {{ healthInfo(plant.health).label }}
          </span>
          <span
            v-if="growStreak?.consistent"
            class="badge streak"
            :title="t('plant.weekly.streakTitle')"
          >
            <UIcon
              name="i-tabler-calendar-check"
              class="size-3.5"
            /> {{ t('plant.weekly.streak', { a: growStreak.updated, b: growStreak.weeks }) }}
          </span>
          <span
            v-if="plant.archived"
            class="badge archived"
          ><UIcon
            name="i-tabler-archive"
            class="size-3.5"
          /> {{ t('plant.archived') }}</span>
          <button
            type="button"
            class="badge public-chip"
            :class="{ on: isShared, other: unlinked }"
            :aria-pressed="isShared"
            :disabled="publicBusy"
            :aria-label="unlinked ? t('auth.share.chipOtherAria') : isShared ? t('auth.share.chipPublicAria') : t('auth.share.chipPrivateAria')"
            @click="togglePublic"
          >
            <UIcon
              :name="publicBusy ? 'i-tabler-loader-2' : unlinked ? 'i-tabler-user-question' : isShared ? 'i-tabler-world' : 'i-tabler-lock'"
              class="size-3.5"
              :class="{ 'animate-spin': publicBusy }"
            /> {{ unlinked ? t('auth.share.otherAccount') : isShared ? t('auth.share.public') : t('auth.share.private') }}
          </button>
        </div>
      </section>

      <section
        class="card keys"
        :aria-label="t('plant.aria.journey')"
      >
        <div class="key">
          <strong class="num">{{ progress.age }}</strong>
          <span>{{ t('plant.key.day') }}</span>
        </div>
        <div class="key">
          <strong class="num">{{ weekInStage.week }}<small>/{{ weekInStage.weeks }}</small></strong>
          <span>{{ t('plant.key.week') }}</span>
        </div>
        <div class="key">
          <strong class="num">{{ lastReading?.ph != null ? formatNumber(lastReading.ph, 1) : '–' }}</strong>
          <span>pH</span>
        </div>
        <div class="key">
          <strong class="num">{{ lastReading?.ec != null ? formatNumber(lastReading.ec, 1) : '–' }}</strong>
          <span>EC</span>
        </div>
        <div class="key">
          <strong class="num">{{ latestHeight ?? '–' }}<small v-if="latestHeight != null"> cm</small></strong>
          <span>{{ t('plant.info.height') }}</span>
        </div>
      </section>

      <div
        v-if="!plant.archived"
        class="actions"
        role="group"
        :aria-label="t('plant.aria.log')"
      >
        <button
          v-for="a in loggable"
          :key="a.type"
          type="button"
          class="action"
          :style="{ '--c': a.color }"
          :disabled="tab === 'journal' && selectedDate > todayISO()"
          @click="log(a.type)"
        >
          <span class="action-tile">
            <GrowIcon :name="a.glyph" />
          </span>
          <span class="action-label">{{ a.label }}</span>
        </button>
      </div>

      <section
        class="card stage-card"
        :aria-label="t('plant.aria.journey')"
      >
        <ol class="rail">
          <li
            v-for="s in journey"
            :key="s.id"
            class="rail-stop"
            :class="s.state"
            :aria-current="s.state === 'current' ? 'step' : undefined"
          >
            <span
              class="rail-bar"
              aria-hidden="true"
            >
              <span
                class="rail-bar-fill"
                :style="s.state === 'current' ? { width: `${Math.max(8, progress.percent)}%` } : undefined"
              />
            </span>
            <span
              class="rail-label"
              aria-hidden="true"
            >{{ s.short }}</span>
            <span class="sr-only">{{ s.label }}, {{ t(`plant.railState.${s.state}`) }}</span>
          </li>
        </ol>

        <div class="stage-status">
          <div class="stage-day">
            <p class="stage-label">
              <span>{{ t('plant.dayOf.pre') }}</span><span class="stage-num num">{{ progress.dayInStage }}</span><span>{{ t('plant.dayOf.post', { stage: stage.label.toLowerCase() }) }}</span>
            </p>
            <p
              class="stage-sub num"
              :class="{ overdue: progress.overdue && GROWING_STAGES.includes(plant.stage) }"
            >
              <template v-if="progress.overdue">
                {{ t('plant.pastTypical', { range: stage.range }) }}
              </template>
              <template v-else>
                {{ t('plant.typically', { range: stage.range, p: progress.percent }) }}
              </template>
            </p>
          </div>
          <button
            v-if="upcoming && !plant.archived"
            type="button"
            class="btn next-btn"
            :class="upcoming.action === 'harvest' || upcoming.action === 'dry' ? 'btn-lamp' : 'btn-soft'"
            @click="nextStep"
          >
            <GrowIcon
              :name="upcoming.icon"
              class="text-[18px]"
            /> {{ upcoming.label }}
          </button>
        </div>

        <div
          v-if="harvestEta"
          class="eta"
          :class="harvestEta.status"
        >
          <p class="eta-text num">
            <GrowIcon
              name="harvest"
              class="text-[17px]"
            />
            <span>{{ harvestEtaText }}</span>
          </p>
          <div
            class="eta-bar"
            :style="{ '--win': harvestEta.windowStart, '--pos': harvestEta.position }"
            role="img"
            :aria-label="t('plant.eta.aria', { p: Math.round(harvestEta.position * 100) })"
          >
            <span class="eta-window" />
            <span class="eta-done" />
            <span class="eta-now" />
          </div>
          <p class="eta-note">
            {{ plant.type === 'autoflower' ? t('plant.eta.noteAuto') : t('plant.eta.notePhoto') }}
          </p>
        </div>

        <p
          v-if="watering"
          class="water-line"
          :class="{ overdue: watering.dueIn < 0, due: watering.dueIn === 0 }"
        >
          <GrowIcon
            name="water"
            class="text-[17px]"
          />
          <span>
            <template v-if="watering.dueIn < 0">
              {{ t('plant.water.overdue', { n: -watering.dueIn }) }}
            </template>
            <template v-else-if="watering.dueIn === 0">
              {{ t('plant.water.today') }}
            </template>
            <template v-else>
              {{ watering.dueIn === 1 ? t('plant.water.tomorrow') : t('plant.water.inDays', { n: watering.dueIn }) }}
            </template>
            <span
              v-if="watering.lastDate"
              class="water-last"
            > · {{ t('plant.water.last', { when: formatRelativeDay(watering.lastDate).toLowerCase() }) }}</span>
          </span>
        </p>
        <WateringSmartWatering
          v-if="isGrowing(plant)"
          :plant="plant"
        />

        <div
          v-if="needsHelp"
          class="help-row"
        >
          <p>
            <GrowIcon
              name="pest"
              class="text-[17px]"
            />
            <span>{{ t('plant.ask.prompt') }}</span>
          </p>
          <button
            type="button"
            class="btn btn-soft help-btn"
            @click="askCommunity"
          >
            <GrowIcon name="community" /> {{ t('plant.ask.button') }}
          </button>
        </div>
      </section>

      <CarePlantCarePanel :plant="plant" />

      <section
        v-if="weekDue && publicId"
        class="weekly card"
        :aria-label="t('plant.weekly.cardAria', { n: weekDue })"
      >
        <div class="weekly-text">
          <h2 class="weekly-title">
            {{ t('plant.weekly.cardTitle', { n: weekDue }) }}
          </h2>
          <p class="weekly-sub">
            <template v-if="growStreak">
              {{ t('plant.weekly.progress', { a: growStreak.updated, b: growStreak.weeks }) }}
            </template>
            <template v-else>
              {{ t('plant.weekly.cardText') }}
            </template>
          </p>
        </div>
        <button
          type="button"
          class="btn btn-primary weekly-btn"
          @click="weeklySheet = true"
        >
          <GrowIcon name="photo" /> {{ t('plant.weekly.cardAction') }}
        </button>
      </section>
    </div>

    <div class="tabs-wrap">
      <div
        class="segmented tabs"
        role="tablist"
        :aria-label="t('plant.aria.sections')"
      >
        <button
          v-for="tb in tabs"
          :key="tb.id"
          type="button"
          role="tab"
          :aria-selected="tab === tb.id"
          @click="tab = tb.id"
        >
          {{ tb.label }}
        </button>
      </div>
    </div>

    <!-- Journal -->
    <div
      v-if="tab === 'journal'"
      class="tab-body"
    >
      <div class="card">
        <WeekStrip
          v-model="selectedDate"
          :marked="markedDays"
        />
      </div>

      <div>
        <div class="section-head">
          <h2 class="section-title">
            {{ formatRelativeDay(selectedDate) }}
            <span
              v-if="selectedDate !== todayISO()"
              class="day-of num"
            >{{ t('plant.day', { n: Math.max(0, daysBetween(plant.startDate, selectedDate)) }) }}</span>
          </h2>
          <span
            v-if="dayEntries.length"
            class="section-meta"
          >{{ t('common.entries', { n: dayEntries.length }) }}</span>
        </div>
        <EmptyState
          v-if="!dayEntries.length"
          icon="measure"
          :title="selectedDate > todayISO() ? t('plant.journal.futureTitle') : t('plant.journal.emptyTitle')"
          :text="selectedDate > todayISO() ? t('plant.journal.futureText') : t('plant.journal.emptyText')"
        />
        <div
          v-else
          class="card entry-list"
        >
          <EntryCard
            v-for="e in dayEntries"
            :key="e.id"
            :entry="e"
            @edit="edit"
            @delete="removeEntry"
            @photo="id => openEntryPhoto(e, id)"
          />
        </div>
      </div>
    </div>

    <!-- History -->
    <div
      v-else-if="tab === 'history'"
      class="tab-body"
    >
      <div
        v-if="historyTypes.length > 1"
        class="chips"
      >
        <button
          type="button"
          class="chip"
          :aria-pressed="historyFilter === null"
          @click="historyFilter = null"
        >
          {{ t('plant.history.all') }} <span class="chip-count num">{{ entries.length }}</span>
        </button>
        <button
          v-for="ht in historyTypes"
          :key="ht.type"
          type="button"
          class="chip"
          :aria-pressed="historyFilter === ht.type"
          @click="historyFilter = historyFilter === ht.type ? null : ht.type"
        >
          <GrowIcon
            :name="ht.glyph"
            class="text-[16px]"
            :style="{ color: ht.color }"
          /> {{ ht.label }}
        </button>
      </div>
      <EmptyState
        v-if="!historyGroups.length"
        icon="note"
        :title="t('plant.history.emptyTitle')"
        :text="t('plant.history.emptyText')"
      />
      <div
        v-for="g in historyGroups"
        :key="g.date"
        class="history-day"
      >
        <h3 class="history-date">
          {{ formatDate(g.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }}
          <span class="num">{{ t('plant.day', { n: Math.max(0, daysBetween(plant.startDate, g.date)) }) }}</span>
        </h3>
        <div class="card entry-list">
          <EntryCard
            v-for="e in g.items"
            :key="e.id"
            :entry="e"
            @edit="edit"
            @delete="removeEntry"
            @photo="id => openEntryPhoto(e, id)"
          />
        </div>
      </div>
    </div>

    <!-- Info -->
    <div
      v-else-if="tab === 'info'"
      class="tab-body"
    >
      <section
        v-if="plant.harvest"
        class="harvest card"
      >
        <div class="section-head">
          <h2 class="section-title">
            <GrowIcon name="harvest" /> {{ t('plant.harvest.title') }}
          </h2>
          <button
            type="button"
            class="link edit-link"
            @click="openHarvest('edit')"
          >
            {{ t('common.edit') }}
          </button>
        </div>
        <dl class="harvest-grid">
          <div>
            <dt>{{ t('plant.harvest.harvested') }}</dt><dd>{{ formatDate(plant.harvest.date) }}</dd>
          </div>
          <div>
            <dt>{{ t('plant.harvest.ratio') }}</dt>
            <dd class="num">
              {{ plant.harvest.wetWeight && plant.harvest.dryWeight ? `${Math.round((plant.harvest.dryWeight / plant.harvest.wetWeight) * 100)} %` : '–' }}
            </dd>
          </div>
          <div>
            <dt>{{ t('plant.harvest.wet') }}</dt><dd class="weight num">
              {{ plant.harvest.wetWeight ?? '–' }}<small> g</small>
            </dd>
          </div>
          <div>
            <dt>{{ t('plant.harvest.dry') }}</dt><dd class="weight num lamp">
              {{ plant.harvest.dryWeight ?? '–' }}<small> g</small>
            </dd>
          </div>
        </dl>
        <p
          v-if="plant.harvest.notes"
          class="harvest-notes"
        >
          {{ plant.harvest.notes }}
        </p>
      </section>

      <section class="card info-grid">
        <div
          v-for="d in details"
          :key="d.label"
          class="info-item"
        >
          <UIcon
            :name="d.icon"
            class="size-[18px] info-icon"
          />
          <span class="info-label">{{ d.label }}</span>
          <span class="info-value">{{ d.value }}</span>
        </div>
      </section>

      <KitFeedPlanCard
        :plant="plant"
        @log="log('feed')"
      />
      <EnvironmentPlantCard :plant="plant" />

      <section>
        <h2 class="section-title block-title">
          <GrowIcon name="stage" /> {{ t('plant.info.timeline') }}
        </h2>
        <ol class="timeline card">
          <li
            v-for="(tl, i) in timeline"
            :key="i"
            :class="{ current: tl.current }"
            :style="{ '--c': tl.info.color }"
          >
            <span class="tl-dot"><GrowIcon :name="tl.info.glyph" /></span>
            <div class="tl-text">
              <strong>{{ tl.info.label }}</strong>
              <span class="num">{{ formatDate(tl.date) }} · {{ tl.current ? t('plant.info.soFar', { days: t('common.days', { n: tl.days }) }) : t('common.days', { n: tl.days }) }}</span>
            </div>
          </li>
        </ol>
      </section>

      <section
        v-if="heightPoints.length"
        class="card chart-card"
      >
        <h2 class="section-title block-title">
          <GrowIcon name="measure" /> {{ t('plant.info.height') }}
          <span class="chart-latest num">{{ heightPoints[heightPoints.length - 1]!.value }}<small> cm</small></span>
        </h2>
        <LineChart
          :points="heightPoints"
          unit=" cm"
          color="var(--green)"
          :label="t('plant.info.heightLabel', { v: heightPoints[heightPoints.length - 1]!.value })"
        />
      </section>

      <section class="counts card">
        <div
          v-for="et in entryTypes().filter(x => ['water', 'feed', 'train', 'photo'].includes(x.type))"
          :key="et.type"
          class="count"
          :style="{ '--c': et.color }"
        >
          <GrowIcon
            :name="et.glyph"
            class="count-glyph"
          />
          <strong class="num">{{ counts[et.type] ?? 0 }}</strong>
          <span>{{ et.label }}</span>
        </div>
      </section>

      <section
        v-if="lastFeed"
        class="card last-feed"
      >
        <span class="info-label">{{ t('plant.info.lastFeed', { when: formatRelativeDay(lastFeed.date) }) }}</span>
        <p class="num">
          {{ entrySummary(lastFeed) || t('plant.info.noDetails') }}
        </p>
      </section>

      <section class="card stage-tips">
        <h2 class="section-title block-title">
          <GrowIcon
            :name="stage.glyph"
            :style="{ color: stage.color }"
          /> {{ t('plant.info.about', { stage: stage.label.toLowerCase() }) }}
        </h2>
        <p class="muted">
          {{ stage.description }}
        </p>
        <ul>
          <li
            v-for="tip in stage.tips"
            :key="tip"
          >
            {{ tip }}
          </li>
        </ul>
      </section>

      <section
        v-if="plant.notes"
        class="card notes"
      >
        <span class="info-label">{{ t('plant.info.notes') }}</span>
        <p>{{ plant.notes }}</p>
      </section>
    </div>

    <!-- Photos -->
    <div
      v-else
      class="tab-body"
    >
      <div class="photo-actions">
        <button
          v-if="!plant.archived"
          type="button"
          class="btn btn-soft"
          @click="log('photo')"
        >
          <GrowIcon
            name="photo"
            class="text-[20px]"
          /> {{ t('plant.photos.addToJournal') }}
        </button>
        <button
          type="button"
          class="btn"
          @click="setProfilePhoto"
        >
          <UIcon
            name="i-tabler-user-circle"
            class="size-5"
          /> {{ t('plant.photos.profilePhoto') }}
        </button>
        <NuxtLink
          v-if="photos.filter(ph => ph.entryId).length >= 2"
          :to="`/plants/${plant.id}/timelapse`"
          class="btn btn-soft photo-timelapse"
        >
          <UIcon
            name="i-tabler-movie"
            class="size-5"
          /> {{ t('review.links.timelapse') }}
        </NuxtLink>
      </div>
      <EmptyState
        v-if="!photos.length"
        icon="photo"
        :title="t('plant.photos.emptyTitle')"
        :text="t('plant.photos.emptyText')"
      />
      <div
        v-else
        class="photo-grid"
      >
        <button
          v-for="ph in photos"
          :key="ph.photoId"
          type="button"
          class="photo-cell"
          @click="openPhotos(photos, ph.photoId)"
        >
          <PlantPhoto
            :photo-id="ph.photoId"
            :stage="plant.stage"
          />
          <span class="photo-date num">{{ ph.entryId ? t('plant.dayCap', { n: Math.max(0, daysBetween(plant.startDate, ph.date)) }) : t('plant.photos.profile') }}</span>
        </button>
      </div>
    </div>

    <EntrySheet
      v-model:open="sheetOpen"
      :plant-id="plant.id"
      :type="sheetType"
      :date="selectedDate > todayISO() ? todayISO() : selectedDate"
      :entry="editing"
      @saved="onSaved"
    />

    <PhotoLightbox
      v-model:index="lightboxIndex"
      :items="lightboxItems"
      @delete="deletePhoto"
    />

    <BottomSheet
      v-model:open="stageSheet"
      :title="t('plant.stageSheet.title')"
      icon="i-tabler-arrow-big-right-lines"
    >
      <div class="form-stack">
        <div
          class="stage-list"
          role="radiogroup"
          :aria-label="t('plant.aria.stage')"
        >
          <button
            v-for="s in stages().filter(x => GROWING_STAGES.includes(x.id))"
            :key="s.id"
            type="button"
            role="radio"
            class="stage-row"
            :aria-checked="stageChoice === s.id"
            :style="{ '--c': s.color }"
            @click="stageChoice = s.id"
          >
            <GrowIcon
              :name="s.glyph"
              class="text-[22px]"
            />
            <span class="stage-row-text">
              <strong>{{ s.label }}{{ s.id === plant.stage ? t('plant.stageSheet.current') : '' }}</strong>
              <span>{{ t('plant.stageSheet.light', { range: s.range, light: s.light }) }}</span>
            </span>
            <UIcon
              v-if="stageChoice === s.id"
              name="i-tabler-circle-check-filled"
              class="size-5"
            />
          </button>
        </div>
        <p class="field-hint">
          {{ t('plant.stageSheet.hintBefore') }}<strong>{{ t('plant.stageSheet.hintStrong') }}</strong>{{ t('plant.stageSheet.hintAfter') }}
        </p>
        <div class="field">
          <label
            class="field-label"
            for="stage-date"
          >{{ t('plant.stageSheet.since') }}</label>
          <input
            id="stage-date"
            v-model="stageDate"
            type="date"
            class="input"
            :max="todayISO()"
            :min="stageStartDate(plant)"
          >
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="stageSheet = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="stageChoice === plant.stage"
          @click="applyStage"
        >
          {{ t('plant.stageSheet.save') }}
        </button>
      </template>
    </BottomSheet>

    <BottomSheet
      v-model:open="harvestSheet"
      :title="harvestMode === 'harvest' ? t('plant.harvest.title') : harvestMode === 'dry' ? t('plant.harvest.dryTitle') : t('plant.harvest.editTitle')"
      :icon="harvestMode === 'dry' ? 'i-tabler-scale' : 'i-tabler-basket'"
      icon-color="var(--amber)"
    >
      <form
        class="form-stack"
        @submit.prevent="saveHarvest"
      >
        <p
          v-if="harvestMode === 'harvest'"
          class="muted intro"
        >
          {{ t('plant.harvest.introHarvest') }}
        </p>
        <p
          v-if="harvestMode === 'dry'"
          class="muted intro"
        >
          {{ t('plant.harvest.introDry') }}
        </p>
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="h-wet"
            >{{ t('plant.harvest.wetWeight') }}</label>
            <input
              id="h-wet"
              v-model.number="harvestForm.wet"
              class="input"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="h-dry"
            >{{ t('plant.harvest.dryWeight') }}</label>
            <input
              id="h-dry"
              v-model.number="harvestForm.dry"
              class="input"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
            >
          </div>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="h-date"
          >{{ t('plant.harvest.date') }}</label>
          <input
            id="h-date"
            v-model="harvestForm.date"
            type="date"
            class="input"
            :max="todayISO()"
            :min="harvestMode === 'harvest' ? stageStartDate(plant) : plant.startDate"
          >
        </div>
        <div class="field">
          <label
            class="field-label"
            for="h-notes"
          >{{ t('plant.harvest.notes') }}</label>
          <textarea
            id="h-notes"
            v-model="harvestForm.notes"
            class="input"
            rows="3"
            :placeholder="t('plant.harvest.notesPlaceholder')"
          />
        </div>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="harvestSheet = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveHarvest"
        >
          <UIcon
            name="i-tabler-check"
            class="size-5"
          /> {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>

    <BottomSheet
      v-model:open="moreSheet"
      :title="plant.name"
    >
      <div class="menu">
        <button
          type="button"
          class="menu-item"
          @click="moreSheet = false; openStageSheet()"
        >
          <GrowIcon
            name="stage"
            class="text-[20px]"
          /> {{ t('plant.menu.changeStage') }}
        </button>
        <button
          v-if="plant.harvest"
          type="button"
          class="menu-item"
          @click="moreSheet = false; openHarvest('edit')"
        >
          <GrowIcon
            name="harvest"
            class="text-[20px]"
          /> {{ t('plant.menu.editHarvest') }}
        </button>
        <button
          type="button"
          class="menu-item"
          @click="moreSheet = false; setProfilePhoto()"
        >
          <UIcon
            name="i-tabler-photo-edit"
            class="size-5"
          /> {{ t('plant.menu.changePhoto') }}
        </button>
        <button
          type="button"
          class="menu-item"
          role="switch"
          :aria-checked="isShared"
          :disabled="publicBusy"
          @click="togglePublic"
        >
          <UIcon
            :name="isShared ? 'i-tabler-world' : 'i-tabler-world-off'"
            class="size-5"
          />
          <span class="menu-grow">{{ t('auth.share.toggle') }}</span>
          <span
            class="menu-state"
            :class="{ on: isShared }"
          >{{ isShared ? t('auth.share.on') : t('auth.share.off') }}</span>
        </button>
        <button
          type="button"
          class="menu-item"
          @click="askCommunity"
        >
          <GrowIcon
            name="community"
            class="text-[20px]"
          /> {{ t('plant.ask.menu') }}
        </button>
        <button
          v-if="plant.harvest?.dryWeight != null"
          type="button"
          class="menu-item"
          @click="moreSheet = false; recapSheet = true"
        >
          <GrowIcon
            name="harvest"
            class="text-[20px]"
          /> {{ t('plant.recap.menu') }}
        </button>
        <button
          type="button"
          class="menu-item"
          @click="openShareCard"
        >
          <UIcon
            name="i-tabler-share-2"
            class="size-5"
          /> {{ t('plant.menu.share') }}
        </button>
        <button
          type="button"
          class="menu-item"
          @click="moreSheet = false; navigateTo(`/plants/${plant.id}/timelapse`)"
        >
          <UIcon
            name="i-tabler-movie"
            class="size-5"
          /> {{ t('review.links.timelapse') }}
        </button>
        <button
          type="button"
          class="menu-item"
          @click="moreSheet = false; navigateTo({ path: '/compare', query: { a: plant.id } })"
        >
          <UIcon
            name="i-tabler-arrows-diff"
            class="size-5"
          /> {{ t('review.links.compareWith') }}
        </button>
        <button
          type="button"
          class="menu-item"
          @click="moreSheet = false; navigateTo(`/plants/${plant.id}/export`)"
        >
          <UIcon
            name="i-tabler-file-export"
            class="size-5"
          /> {{ t('review.links.export') }}
        </button>
        <button
          type="button"
          class="menu-item"
          @click="moreSheet = false; spaceSheet = true"
        >
          <UIcon
            name="i-tabler-tent"
            class="size-5"
          /> {{ t('organize.plant.moveToSpace') }}
        </button>
        <NuxtLink
          :to="{ path: '/labels', query: { ids: plant.id } }"
          class="menu-item"
        >
          <UIcon
            name="i-tabler-qrcode"
            class="size-5"
          /> {{ t('organize.plant.label') }}
        </NuxtLink>
        <button
          type="button"
          class="menu-item"
          @click="duplicate"
        >
          <UIcon
            name="i-tabler-copy"
            class="size-5"
          /> {{ t('plant.menu.duplicate') }}
        </button>
        <button
          type="button"
          class="menu-item"
          @click="toggleArchive"
        >
          <UIcon
            :name="plant.archived ? 'i-tabler-archive-off' : 'i-tabler-archive'"
            class="size-5"
          />
          {{ plant.archived ? t('plant.menu.restore') : t('plant.menu.archive') }}
        </button>
        <button
          type="button"
          class="menu-item danger"
          @click="removePlant"
        >
          <UIcon
            name="i-tabler-trash"
            class="size-5"
          /> {{ t('plant.menu.delete') }}
        </button>
      </div>
    </BottomSheet>

    <SpacesMoveSheet
      v-model:open="spaceSheet"
      :plant-ids="[plant.id]"
    />

    <BottomSheet
      v-model:open="shareSheet"
      :title="t('plant.share.title')"
    >
      <div
        class="share-preview"
        :class="{ ready: sharePreview }"
        :aria-busy="shareBusy && !sharePreview"
      >
        <img
          v-if="sharePreview"
          :src="sharePreview"
          :alt="t('plant.share.previewAlt', { name: plant.name })"
        >
        <span
          v-else
          class="share-loading muted"
        >{{ t('plant.share.rendering') }}</span>
      </div>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="shareSheet = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!shareBlob || shareBusy"
          @click="shareCard"
        >
          <UIcon
            :name="isNative ? 'i-tabler-share-2' : 'i-tabler-download'"
            class="size-5"
          /> {{ isNative ? t('plant.share.share') : t('plant.share.download') }}
        </button>
      </template>
    </BottomSheet>

    <LazyCommunityWeeklyUpdateSheet
      v-if="publicId && weeklyUsed"
      v-model:open="weeklySheet"
      :plant="plant"
      :public-id="publicId"
      :week="weekDue ?? Math.max(1, completedWeek(plant, today))"
      @posted="onUpdatePosted"
    />
    <LazyCommunityHarvestRecapSheet
      v-if="plant.harvest && recapUsed"
      v-model:open="recapSheet"
      :plant="plant"
    />
  </div>

  <div v-else>
    <AppHeader
      :title="t('plant.notFound.title')"
      back
    />
    <div class="page">
      <EmptyState
        icon="seedling"
        :title="t('plant.notFound.emptyTitle')"
        :text="t('plant.notFound.emptyText')"
      >
        <NuxtLink
          to="/plants"
          class="btn btn-soft"
        >
          {{ t('plant.notFound.back') }}
        </NuxtLink>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
/* ── Header ─────────────────────────────────────────────────────── */
.detail-head {
  padding: calc(12px + var(--safe-top)) 16px 0;
}

.head-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  margin-bottom: 8px;
}

.head-actions {
  display: flex;
  gap: 8px;
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.head-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 16px 0;
}

/* ── Photo card ─────────────────────────────────────────────────── */
.photo-card {
  overflow: hidden;
}

.photo-frame {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}

.photo-frame.empty {
  position: relative;
  aspect-ratio: 2 / 1;
  padding: 0;
  border: 0;
  background: var(--surface-2);
  color: var(--text);
}

.photo-frame.empty :deep(.placeholder-glyph) {
  font-size: 64px;
}

.photo-add {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  background: rgba(14, 16, 15, 0.8);
  font-size: 12px;
  font-weight: 600;
}

.photo-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid var(--line);
}

.badge.archived {
  color: var(--text-2);
}

.badge.streak {
  color: var(--green);
}

.public-chip {
  position: relative;
  margin-left: auto;
  border: 0;
  color: var(--text-2);
  transition: color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

/* 44px tap target around the small chip */
.public-chip::after {
  content: "";
  position: absolute;
  inset: -10px -4px;
}

.public-chip.on {
  color: var(--green);
}

.public-chip.other {
  color: var(--amber);
}

.public-chip:active:not(:disabled) {
  transform: scale(0.95);
}

/* ── Key numbers ────────────────────────────────────────────────── */
.keys {
  display: flex;
  align-items: stretch;
  padding: 12px 0;
}

.key {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
}

.key + .key {
  border-left: 1px solid var(--line);
}

.key strong {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
  white-space: nowrap;
}

.key small {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
}

.key span {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

/* ── Quick log ──────────────────────────────────────────────────── */
.actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 4px 0;
}

.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-2);
  transition: transform var(--dur-fast) var(--ease-out), opacity var(--dur) ease;
}

.action:active:not(:disabled) {
  transform: scale(0.95);
}

.action:disabled {
  opacity: 0.4;
}

.action-tile {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: var(--c);
  font-size: 26px;
}

.action-label {
  max-width: 100%;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Stage ──────────────────────────────────────────────────────── */
.stage-card {
  padding: 14px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rail {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rail-stop {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.rail-bar {
  display: block;
  height: 4px;
  border-radius: 999px;
  background: var(--track);
  overflow: hidden;
}

.rail-bar-fill {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: var(--green);
  transition: width var(--dur-slow) var(--ease-out);
}

.rail-stop.done .rail-bar-fill {
  width: 100%;
}

.rail-label {
  max-width: 100%;
  overflow: hidden;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rail-stop.done .rail-label {
  color: var(--text-2);
}

.rail-stop.current .rail-label {
  color: var(--text);
  font-weight: 600;
}

.stage-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stage-day {
  min-width: 0;
}

.stage-label {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

.stage-num {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.stage-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.stage-sub.overdue {
  color: var(--red);
}

.next-btn {
  min-height: 44px;
  padding: 0 14px;
  font-size: 13px;
  flex-shrink: 0;
}

.eta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.eta-text {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--amber);
}

.eta.past .eta-text {
  color: var(--red);
}

.eta-bar {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: var(--track);
  overflow: hidden;
}

.eta-bar span {
  position: absolute;
  top: 0;
  bottom: 0;
}

.eta-window {
  left: calc(var(--win) * 100%);
  right: 0;
  background: var(--lamp-soft);
}

.eta-done {
  left: 0;
  width: calc(var(--pos) * 100%);
  border-radius: inherit;
  background: var(--green);
}

.eta-now {
  left: calc(var(--pos) * 100% - 1px);
  width: 2px;
  background: var(--text);
}

.eta-note {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.water-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 13px;
  color: var(--blue);
}

.water-line .grow-icon {
  margin-top: 1px;
}

.water-line.due {
  color: var(--amber);
  font-weight: 600;
}

.water-line.overdue {
  color: var(--red);
  font-weight: 600;
}

.water-last {
  color: var(--text-3);
  font-weight: 400;
}

.help-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.help-row p {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-2);
}

.help-row p .grow-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--amber);
}

.help-btn {
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 14px;
  font-size: 13px;
}

/* ── Weekly update ─────────────────────────────────────────────── */
.weekly {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
}

.weekly-text {
  flex: 1;
  min-width: 0;
}

.weekly-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.weekly-sub {
  margin: 3px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-2);
}

.weekly-btn {
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 16px;
}

/* ── Tabs ───────────────────────────────────────────────────────── */
.tabs-wrap {
  position: sticky;
  top: 0;
  z-index: 10;
  margin-top: 12px;
  padding: calc(8px + var(--safe-top)) 16px 12px;
  background: var(--bg);
}

.tabs button {
  min-height: 40px;
}

.tab-body {
  padding: 4px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.day-of {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-3);
}

.entry-list {
  display: flex;
  flex-direction: column;
}

.chip-count {
  color: var(--text-3);
}

.history-day {
  display: flex;
  flex-direction: column;
}

.history-date {
  display: flex;
  justify-content: space-between;
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.history-date::first-letter {
  text-transform: uppercase;
}

.history-date span {
  font-weight: 400;
  color: var(--text-3);
}

/* ── Info ───────────────────────────────────────────────────────── */
.harvest {
  padding: 16px;
}

.harvest .section-title .grow-icon {
  color: var(--amber);
}

.edit-link {
  min-height: 44px;
  margin: -12px 0;
}

.harvest-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 12px;
  margin: 0;
}

.harvest-grid div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.harvest-grid dt {
  font-size: 12px;
  color: var(--text-3);
}

.harvest-grid dd {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
}

.harvest-grid .weight {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.harvest-grid .weight small {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
}

.harvest-grid .lamp {
  color: var(--amber);
}

.harvest-notes {
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  overflow: hidden;
  background: var(--line);
}

.info-item {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 10px;
  row-gap: 1px;
  padding: 12px 14px;
  background: var(--surface);
}

.info-item:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}

.info-icon {
  grid-row: span 2;
  color: var(--text-3);
  margin-top: 2px;
}

.info-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.block-title {
  margin-bottom: 12px;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0 14px;
  display: flex;
  flex-direction: column;
}

.timeline li {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 0;
}

.timeline li + li {
  border-top: 1px solid var(--line);
}

.tl-dot {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--c);
  font-size: 20px;
  background: color-mix(in srgb, var(--c) 14%, transparent);
}

.tl-text {
  display: flex;
  flex-direction: column;
}

.tl-text strong {
  font-weight: 500;
}

.timeline li.current .tl-text strong {
  font-weight: 600;
}

.tl-text span {
  font-size: 12px;
  color: var(--text-3);
}

.chart-card {
  padding: 16px 14px 12px;
}

.chart-latest {
  margin-left: auto;
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}

.chart-latest small {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
}

.counts {
  display: flex;
  padding: 14px 0;
}

.count {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.count + .count {
  border-left: 1px solid var(--line);
}

.count-glyph {
  font-size: 20px;
  color: var(--c);
}

.count strong {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
}

.count > span:last-child {
  font-size: 12px;
  color: var(--text-3);
}

.last-feed,
.notes,
.stage-tips {
  padding: 16px;
}

.last-feed p,
.notes p {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.stage-tips p {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.55;
}

.stage-tips ul {
  list-style: disc;
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.75;
}

.stage-tips li::marker {
  color: var(--green);
}

/* ── Photos ─────────────────────────────────────────────────────── */
.photo-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.photo-actions .btn {
  font-size: 14px;
  padding: 0 10px;
}

.photo-timelapse {
  grid-column: 1 / -1;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}

.photo-cell {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-2);
}

.photo-date {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(14, 16, 15, 0.8);
  font-size: 11px;
  font-weight: 600;
}

/* ── Sheets ─────────────────────────────────────────────────────── */
.stage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 14px;
  border-radius: var(--radius-control);
  border: 1px solid var(--line-strong);
  background: var(--well);
  color: var(--c);
  text-align: left;
  transition: background var(--dur) ease, border-color var(--dur) ease;
}

.stage-row[aria-checked="true"] {
  border-color: var(--green);
  background: var(--accent-soft);
}

.stage-row-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  color: var(--text);
}

.stage-row-text strong {
  font-weight: 600;
}

.stage-row-text span {
  font-size: 12px;
  color: var(--text-2);
}

.stage-row > :deep(span[class*="i-"]) {
  color: var(--green);
}

.intro {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.share-preview {
  aspect-ratio: 1080 / 1350;
  max-height: 56vh;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--surface);
  overflow: hidden;
}

.share-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.share-loading {
  font-size: 13px;
}

.menu {
  display: flex;
  flex-direction: column;
  padding-bottom: calc(6px + var(--safe-bottom));
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 0 6px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  text-align: left;
}

a.menu-item {
  text-decoration: none;
}

.menu-item:last-child {
  border-bottom: 0;
}

.menu-item .grow-icon,
.menu-item :deep(span[class*="i-"]) {
  color: var(--text-2);
}

.menu-grow {
  flex: 1;
}

.menu-state {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
}

.menu-state.on {
  color: var(--green);
}

.menu-item.danger,
.menu-item.danger :deep(span[class*="i-"]) {
  color: var(--red);
}
</style>
