// Validation / normalisation of persisted data and migration from the
// pre-2.0 storage format (separate keys per plant journal, base64 photos inline).
import { detectLocale, isLocale } from './locale'
import type {
  EntryType,
  GrowData,
  GuideProgress,
  Harvest,
  HealthLevel,
  JournalEntry,
  Location,
  Medium,
  Plant,
  PlantSharing,
  PlantType,
  StageChange,
  StageId,
  Task,
  TrainingMethod
} from '../types/grow'
import { isValidISODate, toISODate, todayISO } from './date'
import { blankEntry } from './entries'
import { normalizeEnvironment } from './env/schema'
import { createId } from './id'
import { isStageId } from './stages'

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback

const isoDate = (v: unknown, fallback: string): string => {
  if (isValidISODate(v)) return v
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return toISODate(d)
  }
  return fallback
}

const ENTRY_TYPES: EntryType[] = ['water', 'feed', 'train', 'pest', 'measure', 'note', 'photo', 'stage', 'harvest']
const METHODS: TrainingMethod[] = ['topping', 'fim', 'lst', 'scrog', 'defoliation', 'lollipop', 'transplant', 'other']
const MEDIA: Medium[] = ['soil', 'coco', 'hydro', 'other']
const LOCATIONS: Location[] = ['indoor', 'outdoor', 'greenhouse']
const TYPES: PlantType[] = ['photoperiod', 'autoflower']

export function emptyData(): GrowData {
  return {
    version: 2,
    plants: [],
    entries: [],
    tasks: [],
    settings: { growerName: '', initialized: false, lightsOn: '06:00', lightHours: 18, language: detectLocale(), reminders: false, reminderTime: '18:00', onboarded: false, demo: false },
    guide: emptyGuide()
  }
}

export function emptyGuide(): GuideProgress {
  return { done: [], quiz: {}, checks: {}, environment: null, medium: null }
}

const GUIDE_MEDIA = ['soil', 'coco', 'hydro'] as const

export function normalizeGuide(raw: unknown): GuideProgress {
  const g = emptyGuide()
  if (!raw || typeof raw !== 'object') return g
  const r = raw as Record<string, unknown>
  if (Array.isArray(r.done)) g.done = [...new Set(r.done.filter((d): d is string => typeof d === 'string'))]
  if (r.quiz && typeof r.quiz === 'object') {
    for (const [k, v] of Object.entries(r.quiz)) {
      const n = num(v)
      if (n !== null && n >= 0) g.quiz[k] = Math.round(n)
    }
  }
  if (r.checks && typeof r.checks === 'object') {
    for (const [k, v] of Object.entries(r.checks)) {
      if (Array.isArray(v)) g.checks[k] = [...new Set(v.filter((i): i is number => Number.isInteger(i) && i >= 0))]
    }
  }
  g.environment = LOCATIONS.includes(r.environment as Location) ? (r.environment as Location) : null
  g.medium = (GUIDE_MEDIA as readonly unknown[]).includes(r.medium) ? (r.medium as GuideProgress['medium']) : null
  return g
}

function normalizeStage(v: unknown): StageId {
  const s = str(v).toLowerCase()
  if (isStageId(s)) return s
  if (s === 'pre-flower' || s === 'ripening') return 'flowering'
  return 'seedling'
}

export function normalizePlant(raw: Record<string, unknown>): Plant {
  const now = new Date().toISOString()
  const startDate = isoDate(raw.startDate ?? raw.plantingDate ?? raw.createdAt, todayISO())
  const stage = normalizeStage(raw.stage)
  const history = Array.isArray(raw.stageHistory)
    ? (raw.stageHistory as Record<string, unknown>[])
        .filter(h => h && isStageId(h.stage))
        .map(h => ({ stage: h.stage as StageId, date: isoDate(h.date, startDate) }))
    : []
  const stageHistory: StageChange[] = history.length ? history : [{ stage, date: startDate }]

  const h = raw.harvest as Record<string, unknown> | null | undefined
  const harvest: Harvest | null = h && typeof h === 'object'
    ? { date: isoDate(h.date, todayISO()), wetWeight: num(h.wetWeight), dryWeight: num(h.dryWeight), notes: str(h.notes) }
    : null

  const health = Math.round(num(raw.health) ?? 4)

  return {
    id: str(raw.id) || String(raw.id ?? '') || createId(),
    name: str(raw.name).trim() || 'Unnamed plant',
    strain: str(raw.strain).trim(),
    type: oneOf(raw.type, TYPES, 'photoperiod'),
    stage,
    stageHistory,
    startDate,
    potSize: str(raw.potSize),
    medium: oneOf(raw.medium, MEDIA, 'soil'),
    location: oneOf(raw.location, LOCATIONS, 'indoor'),
    wateringInterval: num(raw.wateringInterval),
    // old data stored health as a 0–100 percentage
    health: (health > 5 ? Math.max(1, Math.min(5, Math.round(health / 20))) : Math.max(1, Math.min(5, health))) as HealthLevel,
    photoId: str(raw.photoId) || null,
    notes: str(raw.notes),
    harvest,
    archived: raw.archived === true,
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
    ...withSharing(raw.sharing)
  }
}

// only shared plants carry the key
function withSharing(v: unknown): { sharing?: PlantSharing } {
  if (!v || typeof v !== 'object') return {}
  const r = v as Record<string, unknown>
  const publicId = str(r.publicId)
  return publicId ? { sharing: { publicId, syncedAt: str(r.syncedAt) } } : {}
}

export function normalizeEntry(raw: Record<string, unknown>): JournalEntry {
  return {
    ...blankEntry(),
    id: str(raw.id) || createId(),
    plantId: String(raw.plantId ?? ''),
    type: oneOf(raw.type, ENTRY_TYPES, 'note'),
    date: isoDate(raw.date, todayISO()),
    note: str(raw.note),
    amountMl: num(raw.amountMl),
    ph: num(raw.ph),
    ec: num(raw.ec),
    nutrients: str(raw.nutrients),
    method: raw.method ? oneOf(raw.method, METHODS, 'other') : null,
    product: str(raw.product),
    heightCm: num(raw.heightCm),
    tempC: num(raw.tempC),
    humidity: num(raw.humidity),
    photoIds: Array.isArray(raw.photoIds) ? raw.photoIds.filter((p): p is string => typeof p === 'string') : [],
    stage: isStageId(raw.stage) ? raw.stage : null,
    createdAt: str(raw.createdAt, new Date().toISOString())
  }
}

export function normalizeTask(raw: Record<string, unknown>): Task {
  return {
    id: str(raw.id) || createId(),
    title: str(raw.title ?? raw.label).trim() || 'Task',
    date: isoDate(raw.date, todayISO()),
    plantId: raw.plantId == null ? null : String(raw.plantId),
    done: raw.done === true,
    createdAt: str(raw.createdAt, new Date().toISOString())
  }
}

const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []

const isHHMM = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

/** Accepts anything that looks like saved/imported data and returns a valid GrowData. */
export function normalizeData(raw: unknown): GrowData {
  const data = emptyData()
  if (!raw || typeof raw !== 'object') return data
  const r = raw as Record<string, unknown>
  data.plants = objects(r.plants).map(normalizePlant)
  const ids = new Set(data.plants.map(p => p.id))
  data.entries = objects(r.entries).map(normalizeEntry).filter(e => ids.has(e.plantId))
  data.tasks = objects(r.tasks).map(normalizeTask)
  const s = (r.settings ?? {}) as Record<string, unknown>
  const lightHours = Number(s.lightHours)
  data.settings = {
    growerName: str(s.growerName),
    initialized: s.initialized !== false,
    lightsOn: isHHMM(s.lightsOn) ? s.lightsOn : '06:00',
    lightHours: Number.isFinite(lightHours) && lightHours >= 0 && lightHours <= 24 ? Math.round(lightHours) : 18,
    language: isLocale(s.language) ? s.language : detectLocale(),
    reminders: s.reminders === true,
    reminderTime: isHHMM(s.reminderTime) ? s.reminderTime : '18:00',
    // existing gardens skip the first-run guide
    onboarded: s.onboarded === true || (s.onboarded === undefined && data.plants.length > 0),
    demo: s.demo === true
  }
  data.guide = normalizeGuide(r.guide)
  const env = normalizeEnvironment(r.environment, ids)
  if (env) data.environment = env
  return data
}

// ── Legacy (v1) migration ────────────────────────────────────────────

export interface LegacyInput {
  plants: Record<string, unknown>[]
  /** plantId → journal entries */
  journals: Record<string, Record<string, unknown>[]>
  /** YYYY-MM-DD → day actions */
  dayActions: Record<string, Record<string, unknown>[]>
}

export interface MigrationResult {
  data: GrowData
  /** photos still encoded as data URLs that need to be moved into the photo store */
  photos: { id: string, dataUrl: string }[]
}

function parseMl(amount: string): number | null {
  const m = amount.replace(',', '.').match(/^\s*(\d+(?:\.\d+)?)\s*(ml|l)?\s*$/i)
  if (!m) return null
  const value = Number(m[1])
  return m[2]?.toLowerCase() === 'l' ? value * 1000 : value
}

export function migrateLegacy(input: LegacyInput): MigrationResult {
  const data = emptyData()
  data.settings.initialized = true
  const photos: MigrationResult['photos'] = []

  const takePhoto = (v: unknown): string | null => {
    if (typeof v !== 'string' || !v.startsWith('data:image')) return null
    const id = createId()
    photos.push({ id, dataUrl: v })
    return id
  }

  for (const raw of input.plants) {
    const legacyId = String(raw.id)
    const plant = normalizePlant({ ...raw, id: legacyId, photoId: null })
    plant.photoId = takePhoto(raw.photoPreview)
    data.plants.push(plant)

    for (const e of input.journals[legacyId] ?? []) {
      const amount = str(e.amount).trim()
      const base = normalizeEntry({ ...e, plantId: legacyId })
      switch (e.type) {
        case 'nutrients':
          base.type = 'feed'
          base.nutrients = amount
          break
        case 'trim':
          base.type = 'train'
          base.method = 'other'
          break
        case 'repellent':
          base.type = 'pest'
          break
        case 'water': {
          const ml = parseMl(amount)
          base.amountMl = ml
          if (ml === null && amount) base.note = [amount, base.note].filter(Boolean).join(' – ')
          break
        }
        default:
          if (amount) base.note = [base.note, amount].filter(Boolean).join(' – ')
      }
      const photoId = takePhoto(e.photo)
      if (photoId) base.photoIds = [photoId]
      data.entries.push(base)
    }
  }

  for (const [date, actions] of Object.entries(input.dayActions)) {
    for (const a of actions) data.tasks.push(normalizeTask({ ...a, date }))
  }

  return { data, photos }
}
