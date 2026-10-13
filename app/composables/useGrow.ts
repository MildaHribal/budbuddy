import { Preferences } from '@capacitor/preferences'
import { reactive, readonly, ref, watch } from 'vue'
import type { GrowData, Harvest, JournalEntry, Plant, StageId, Task } from '~/types/grow'
import { addDays, daysBetween, todayISO } from '~/utils/date'
import { buildDemoData } from '~/utils/demo'
import { blankEntry } from '~/utils/entries'
import { createId } from '~/utils/id'
import { blobToDataUrl, compressImage, dataUrlToBlob } from '~/utils/image'
import { photoStore, type StoredPhoto } from '~/utils/photoStore'
import { wateringBase } from '~/utils/reminders'
import { isGrowing, stageStartDate } from '~/utils/stages'
import { suggestWatering, type WateringSuggestion } from '~/utils/watering'
import { resetPhotoUrls, THUMB_SUFFIX } from './useUi'
import { emptyEnvironment } from '~/utils/env/schema'
import { emptyData, migrateLegacy, normalizeData, normalizePlant, type LegacyInput } from '~/utils/schema'

const STORAGE_KEY = 'budbuddy:data'
const LEGACY_PLANTS_KEY = 'my-trees-data'

// Module-level singleton: every component shares one source of truth.
const state = reactive<GrowData>(emptyData())
const ready = ref(false)
/** set when stored data could not be read – saving is disabled so nothing gets overwritten */
const loadError = ref<string | null>(null)
/** photos saved in this session that are not referenced yet (an open form) – never garbage-collect them */
const pendingPhotos = new Set<string>()
let initPromise: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function writeNow() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(state) })
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    writeNow().catch(e => console.error('[BudBuddy] save failed', e))
  }, 250)
}

let dataEpoch = 0
let demoSeed: Promise<void> | null = null
let demoSeedDue = false

function replaceState(data: GrowData) {
  dataEpoch++
  demoSeedDue = false
  resetPhotoUrls()
  state.plants = data.plants
  state.entries = data.entries
  state.tasks = data.tasks
  state.settings = data.settings
  state.guide = data.guide
  state.feeding = data.feeding
  state.costs = data.costs
  state.inventory = data.inventory
  state.legal = data.legal
  state.environment = data.environment
  state.spaces = data.spaces ?? []
  state.hunts = data.hunts ?? []
}

/** Writable store for feature composables (useSpaces, useHunts); pages use useGrow().state. */
export const growStore = state

async function readLegacy(): Promise<LegacyInput | null> {
  const { value } = await Preferences.get({ key: LEGACY_PLANTS_KEY })
  if (!value) return null
  const input: LegacyInput = { plants: [], journals: {}, dayActions: {} }
  try {
    const plants = JSON.parse(value)
    if (Array.isArray(plants)) input.plants = plants
  } catch {
    return null
  }
  const { keys } = await Preferences.keys()
  for (const key of keys) {
    const parse = async () => {
      const v = (await Preferences.get({ key })).value
      try {
        const arr = v ? JSON.parse(v) : []
        return Array.isArray(arr) ? arr : []
      } catch {
        return []
      }
    }
    if (key.startsWith('plant-journal:')) input.journals[key.slice('plant-journal:'.length)] = await parse()
    else if (key.startsWith('actions:')) input.dayActions[key.slice('actions:'.length)] = await parse()
  }
  return input
}

async function removeLegacyKeys() {
  const { keys } = await Preferences.keys()
  await Promise.all(
    keys
      .filter(k => k === LEGACY_PLANTS_KEY || k.startsWith('plant-journal:') || k.startsWith('actions:'))
      .map(key => Preferences.remove({ key }))
  )
}

/** Deletes stored photos that no plant or entry points to any more. */
async function collectGarbagePhotos() {
  if (loadError.value) return
  const used = new Set<string>(pendingPhotos)
  for (const p of state.plants) if (p.photoId) used.add(p.photoId)
  for (const e of state.entries) e.photoIds.forEach(id => used.add(id))
  for (const id of [...used]) used.add(id + THUMB_SUFFIX)
  const all = await photoStore.all()
  await Promise.all(all.filter(p => !used.has(p.id)).map(p => photoStore.delete(p.id)))
}

async function load() {
  const { value } = await Preferences.get({ key: STORAGE_KEY })
  if (value) {
    try {
      replaceState(normalizeData(JSON.parse(value)))
      return
    } catch (e) {
      // Keep the unreadable copy so it can be recovered by hand, then start over.
      console.error('[BudBuddy] stored data is corrupted, starting fresh', e)
      await Preferences.set({ key: `${STORAGE_KEY}.corrupt-${Date.now()}`, value })
    }
  }

  const legacy = await readLegacy()
  if (legacy) {
    const { data, photos } = migrateLegacy(legacy)
    for (const p of photos) {
      try {
        await photoStore.put({ id: p.id, blob: await dataUrlToBlob(p.dataUrl), createdAt: new Date().toISOString() })
      } catch (e) {
        console.error('[BudBuddy] could not migrate photo', e)
      }
    }
    replaceState(data)
    await writeNow()
    await removeLegacyKeys()
    return
  }

  replaceState(buildDemoData())
  await writeNow()
  seedDemoInBackground()
}

function seedDemoNow(): Promise<void> {
  demoSeedDue = false
  const epoch = dataEpoch
  demoSeed ??= import('~/utils/demoPhotos')
    .then(m => m.seedDemoPhotos(state, () => epoch === dataEpoch))
    .catch(e => console.warn('[BudBuddy] demo photos not seeded', e))
    .finally(() => (demoSeed = null))
  return demoSeed
}

/**
 * Copies the bundled demo photos into the store once the app is idle; until then photoUrl() serves the bundled files.
 * On first run ~750 KB of photos would otherwise compete with the boot on a slow connection.
 */
function seedDemoInBackground(delay = 4000) {
  demoSeedDue = true
  const run = () => {
    if (demoSeedDue) seedDemoNow()
  }
  setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 5000 }) : run()), delay)
}

export function initGrow() {
  if (!initPromise) {
    initPromise = load()
      .then(() => {
        watch(state, scheduleSave, { deep: true })
        collectGarbagePhotos().catch(() => {})
      })
      .catch((e) => {
        console.error('[BudBuddy] failed to load data', e)
        loadError.value = String((e as Error)?.message ?? e)
      })
      .finally(() => {
        ready.value = true
        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && saveTimer) writeNow()
          })
        }
      })
  }
  return initPromise
}

/** Writable state for feature composables (useFeeding, useCosts, useInventory, useLegal). */
export function growStateForKit(): GrowData {
  return state
}

// ── Plants ─────────────────────────────────────────────────────────

export type PlantInput = Partial<Omit<Plant, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>> & { name: string }

function touch(plant: Plant) {
  plant.updatedAt = new Date().toISOString()
}

function getPlant(id: string): Plant | undefined {
  return state.plants.find(p => p.id === id)
}

function addPlant(input: PlantInput): Plant {
  const now = new Date().toISOString()
  const plant = normalizePlant({ ...input, id: createId(), createdAt: now, updatedAt: now })
  plant.photoId = input.photoId ?? null
  plant.stageHistory = [{ stage: plant.stage, date: plant.startDate }]
  state.plants.unshift(plant)
  return plant
}

function updatePlant(id: string, patch: Partial<Plant>) {
  const plant = getPlant(id)
  if (!plant) return
  const { stage, ...rest } = patch
  Object.assign(plant, rest)
  // Editing the start date keeps the first history item in sync.
  if (patch.startDate && plant.stageHistory[0]) plant.stageHistory[0].date = patch.startDate
  if (stage && stage !== plant.stage) setStage(id, stage)
  touch(plant)
}

function deletePlant(id: string) {
  state.plants = state.plants.filter(p => p.id !== id)
  state.entries = state.entries.filter(e => e.plantId !== id)
  state.tasks = state.tasks.filter(t => t.plantId !== id)
  for (const h of state.hunts ?? []) {
    h.candidates = h.candidates.filter(c => c.plantId !== id)
    if (h.keeper?.plantId === id) h.keeper = null
  }
  collectGarbagePhotos().catch(() => {})
}

function setStage(id: string, stage: StageId, date = todayISO()) {
  const plant = getPlant(id)
  if (!plant || plant.stage === stage) return
  plant.stage = stage
  plant.stageHistory.push({ stage, date })
  addEntry({ plantId: id, type: 'stage', date, stage })
  touch(plant)
}

function harvestPlant(id: string, harvest: Harvest) {
  const plant = getPlant(id)
  if (!plant) return
  plant.harvest = harvest
  addEntry({ plantId: id, type: 'harvest', date: harvest.date, note: harvest.notes ?? '' })
  setStage(id, 'drying', harvest.date)
  touch(plant)
}

function updateHarvest(id: string, patch: Partial<Harvest>) {
  const plant = getPlant(id)
  if (!plant) return
  plant.harvest = { date: todayISO(), wetWeight: null, dryWeight: null, notes: '', ...plant.harvest, ...patch }
  touch(plant)
}

function setArchived(id: string, archived: boolean) {
  const plant = getPlant(id)
  if (!plant) return
  plant.archived = archived
  touch(plant)
}

// ── Journal ────────────────────────────────────────────────────────

export type EntryInput = Partial<Omit<JournalEntry, 'id' | 'createdAt'>> & Pick<JournalEntry, 'plantId' | 'type'>

function addEntry(input: EntryInput): JournalEntry {
  const entry: JournalEntry = {
    ...blankEntry(),
    date: todayISO(),
    ...input,
    id: createId(),
    createdAt: new Date().toISOString()
  }
  state.entries.push(entry)
  return entry
}

function updateEntry(id: string, patch: Partial<JournalEntry>) {
  const entry = state.entries.find(e => e.id === id)
  if (entry) Object.assign(entry, patch, { id: entry.id })
}

/** Removes an entry and returns it so the caller can offer undo. */
function deleteEntry(id: string): JournalEntry | undefined {
  const entry = state.entries.find(e => e.id === id)
  state.entries = state.entries.filter(e => e.id !== id)
  return entry
}

function restoreEntry(entry: JournalEntry) {
  if (!getPlant(entry.plantId)) return
  if (!state.entries.some(e => e.id === entry.id)) state.entries.push(entry)
}

function entriesFor(plantId: string): JournalEntry[] {
  return state.entries
    .filter(e => e.plantId === plantId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

function lastEntryOf(plantId: string, types: JournalEntry['type'][]): JournalEntry | undefined {
  let last: JournalEntry | undefined
  for (const e of state.entries) {
    if (e.plantId !== plantId || !types.includes(e.type)) continue
    if (!last || e.date > last.date || (e.date === last.date && e.createdAt > last.createdAt)) last = e
  }
  return last
}

export interface WateringStatus {
  lastDate: string | null
  nextDate: string
  /** negative = overdue by n days */
  dueIn: number
  /** days between waterings in use */
  interval: number
  /** interval comes from the smart suggestion */
  smart: boolean
}

function wateringSuggestion(plant: Plant): WateringSuggestion {
  const dates = state.entries.filter(e => e.plantId === plant.id && (e.type === 'water' || e.type === 'feed')).map(e => e.date)
  return suggestWatering({ dates, potSize: plant.potSize, medium: plant.medium, stage: plant.stage, stageSince: stageStartDate(plant) })
}

function wateringStatus(plant: Plant, today = todayISO()): WateringStatus | null {
  // harvested plants (drying, curing) are not watered any more
  if (!isGrowing(plant)) return null
  const interval = plant.wateringAuto ? wateringSuggestion(plant).days : plant.wateringInterval
  if (!interval || interval <= 0) return null
  const last = lastEntryOf(plant.id, ['water', 'feed'])
  const from = wateringBase(plant.startDate, plant.createdAt, last?.date)
  const nextDate = addDays(from, interval)
  return { lastDate: last?.date ?? null, nextDate, dueIn: daysBetween(today, nextDate), interval, smart: !!plant.wateringAuto }
}

// ── Tasks ──────────────────────────────────────────────────────────

function addTask(title: string, date = todayISO(), plantId: string | null = null): Task {
  const task: Task = { id: createId(), title: title.trim(), date, plantId, done: false, createdAt: new Date().toISOString() }
  state.tasks.push(task)
  return task
}

function updateTask(id: string, patch: Partial<Task>) {
  const task = state.tasks.find(t => t.id === id)
  if (task) Object.assign(task, patch, { id: task.id })
}

function deleteTask(id: string): Task | undefined {
  const task = state.tasks.find(t => t.id === id)
  state.tasks = state.tasks.filter(t => t.id !== id)
  return task
}

function restoreTask(task: Task) {
  if (task.plantId && !getPlant(task.plantId)) return
  if (!state.tasks.some(t => t.id === task.id)) state.tasks.push(task)
}

// ── Photos ─────────────────────────────────────────────────────────

async function savePhoto(file: Blob): Promise<string> {
  const blob = await compressImage(file)
  const id = createId()
  pendingPhotos.add(id)
  await photoStore.put({ id, blob, createdAt: new Date().toISOString() })
  return id
}

/** Deletes photo blobs nothing refers to any more (e.g. after removing a photo). */
function cleanupPhotos() {
  collectGarbagePhotos().catch(() => {})
}

// ── Environment ────────────────────────────────────────────────────

/** Mutable environment collection, created on first use (see useEnvironment). */
function environmentData() {
  state.environment ??= emptyEnvironment()
  return state.environment
}

// ── Backup / reset ─────────────────────────────────────────────────

/**
 * Streams the backup as JSON chunks so large photo libraries never have to sit
 * in memory as one giant string (important in the Android WebView).
 */
async function exportBackup(write: (chunk: string) => Promise<void>): Promise<{ photos: number }> {
  if (demoSeedDue || demoSeed) await seedDemoNow()
  await collectGarbagePhotos()
  const data = JSON.parse(JSON.stringify(state)) as GrowData
  const head = JSON.stringify({ app: 'budbuddy', exportedAt: new Date().toISOString(), ...data })
  await write(`${head.slice(0, -1)},"photos":[`)
  const photos = (await photoStore.all()).filter(p => !p.id.endsWith(THUMB_SUFFIX))
  for (const [i, p] of photos.entries()) {
    const item = JSON.stringify({ id: p.id, createdAt: p.createdAt, dataUrl: await blobToDataUrl(p.blob) })
    await write(i ? `,${item}` : item)
  }
  await write(']}')
  return { photos: photos.length }
}

export class NotBackupError extends Error {
  constructor() {
    super('This file is not a BudBuddy backup.')
    this.name = 'NotBackupError'
  }
}

async function importBackup(json: string): Promise<{ plants: number, entries: number, photos: number, skipped: number }> {
  const raw = JSON.parse(json)
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.plants)) {
    throw new NotBackupError()
  }
  const data = normalizeData(raw)
  data.settings.initialized = true
  const list: { id?: unknown, dataUrl?: unknown, createdAt?: unknown }[] = Array.isArray(raw.photos) ? raw.photos : []

  // Decode everything first – the current photos are only replaced once the backup is known to be good.
  const photos: StoredPhoto[] = []
  let skipped = 0
  for (const p of list) {
    if (typeof p?.id !== 'string' || typeof p.dataUrl !== 'string' || !p.dataUrl.startsWith('data:image')) continue
    try {
      photos.push({ id: p.id, blob: await dataUrlToBlob(p.dataUrl), createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString() })
    } catch {
      skipped++
    }
  }
  await photoStore.replaceAll(photos)
  replaceState(data)
  await writeNow()
  return { plants: data.plants.length, entries: data.entries.length, photos: photos.length, skipped }
}

async function eraseAll() {
  await photoStore.clear()
  const fresh = emptyData()
  fresh.settings.initialized = true
  replaceState(fresh)
  await writeNow()
}

async function loadDemo() {
  await photoStore.clear()
  const demo = buildDemoData()
  demo.guide = JSON.parse(JSON.stringify(state.guide))
  replaceState(demo)
  await writeNow()
  seedDemoInBackground(0)
}

export function useGrow() {
  return {
    state: readonly(state) as GrowData,
    ready,
    init: initGrow,
    getPlant,
    addPlant,
    updatePlant,
    deletePlant,
    setStage,
    harvestPlant,
    updateHarvest,
    setArchived,
    addEntry,
    updateEntry,
    deleteEntry,
    restoreEntry,
    entriesFor,
    lastEntryOf,
    wateringStatus,
    wateringSuggestion,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    savePhoto,
    cleanupPhotos,
    environmentData,
    loadError,
    exportBackup,
    importBackup,
    eraseAll,
    loadDemo,
    updateSettings: (patch: Partial<GrowData['settings']>) => Object.assign(state.settings, patch),
    updateGuide: (patch: Partial<GrowData['guide']>) => Object.assign(state.guide, patch)
  }
}
