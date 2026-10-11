import type { GlyphName } from './glyphs'
import type { EntryType, JournalEntry, TrainingMethod } from '../types/grow'
import { locale } from './locale'

export interface EntryTypeInfo {
  type: EntryType
  label: string
  /** past-tense label shown in the journal */
  verb: string
  icon: string
  glyph: GlyphName
  color: string
  /** can be logged from the action grid */
  loggable: boolean
}

export const ENTRY_TYPES: EntryTypeInfo[] = [
  { type: 'water', label: 'Water', verb: 'Watered', icon: 'i-tabler-droplet-filled', glyph: 'water', color: '#7cc8f2', loggable: true },
  { type: 'feed', label: 'Feed', verb: 'Fed nutrients', icon: 'i-tabler-flask', glyph: 'feed', color: '#c9a2ff', loggable: true },
  { type: 'train', label: 'Train', verb: 'Training', icon: 'i-tabler-scissors', glyph: 'train', color: '#9be36b', loggable: true },
  { type: 'pest', label: 'Pest', verb: 'Pest treatment', icon: 'i-tabler-bug', glyph: 'pest', color: '#ff8a5c', loggable: true },
  { type: 'measure', label: 'Measure', verb: 'Measurement', icon: 'i-tabler-ruler-measure', glyph: 'measure', color: '#6fe0c8', loggable: true },
  { type: 'note', label: 'Note', verb: 'Note', icon: 'i-tabler-notes', glyph: 'note', color: '#c9d4c4', loggable: true },
  { type: 'photo', label: 'Photo', verb: 'Photo', icon: 'i-tabler-camera', glyph: 'photo', color: '#a9b8ff', loggable: true },
  { type: 'stage', label: 'Stage', verb: 'Stage change', icon: 'i-tabler-arrow-big-right-lines', glyph: 'stage', color: '#9be36b', loggable: false },
  { type: 'harvest', label: 'Harvest', verb: 'Harvested', icon: 'i-tabler-basket', glyph: 'harvest', color: '#ffd28a', loggable: false }
]

const ENTRY_CS: Record<EntryType, Pick<EntryTypeInfo, 'label' | 'verb'>> = {
  water: { label: 'Zálivka', verb: 'Zalito' },
  feed: { label: 'Hnojení', verb: 'Pohnojeno' },
  train: { label: 'Tvarování', verb: 'Tvarování' },
  pest: { label: 'Škůdci', verb: 'Ošetření proti škůdcům' },
  measure: { label: 'Měření', verb: 'Měření' },
  note: { label: 'Poznámka', verb: 'Poznámka' },
  photo: { label: 'Fotka', verb: 'Fotka' },
  stage: { label: 'Fáze', verb: 'Změna fáze' },
  harvest: { label: 'Sklizeň', verb: 'Sklizeno' }
}

const BY_TYPE = Object.fromEntries(ENTRY_TYPES.map(e => [e.type, e])) as Record<EntryType, EntryTypeInfo>

const localizeEntry = (e: EntryTypeInfo): EntryTypeInfo => (locale.value === 'cs' ? { ...e, ...ENTRY_CS[e.type] } : e)

/** Localized entry types; ENTRY_TYPES stays the English base. */
export function entryTypes(): EntryTypeInfo[] {
  return ENTRY_TYPES.map(localizeEntry)
}

export function entryInfo(type: EntryType): EntryTypeInfo {
  return localizeEntry(BY_TYPE[type] ?? BY_TYPE.note)
}

export const TRAINING_METHODS: { value: TrainingMethod, label: string }[] = [
  { value: 'topping', label: 'Topping' },
  { value: 'fim', label: 'FIM' },
  { value: 'lst', label: 'LST' },
  { value: 'scrog', label: 'SCROG' },
  { value: 'defoliation', label: 'Defoliation' },
  { value: 'lollipop', label: 'Lollipopping' },
  { value: 'transplant', label: 'Transplant' },
  { value: 'other', label: 'Other' }
]

const TRAINING_CS: Partial<Record<TrainingMethod, string>> = {
  defoliation: 'Defoliace',
  transplant: 'Přesazení',
  other: 'Jiné'
}

export function trainingMethods(): { value: TrainingMethod, label: string }[] {
  return locale.value === 'cs' ? TRAINING_METHODS.map(t => ({ ...t, label: TRAINING_CS[t.value] ?? t.label })) : TRAINING_METHODS
}

export function trainingLabel(m: TrainingMethod | null): string {
  return trainingMethods().find(t => t.value === m)?.label ?? ''
}

const decimal = (n: number) => (locale.value === 'cs' ? String(n).replace('.', ',') : String(n))

export function formatVolume(ml: number | null): string {
  if (ml == null) return ''
  return ml >= 1000 ? `${decimal(+(ml / 1000).toFixed(2))} L` : `${ml} ml`
}

/** Short one-line summary of the measurable values of an entry. */
export function entrySummary(e: JournalEntry): string {
  const parts: string[] = []
  if (e.type === 'train' && e.method) parts.push(trainingLabel(e.method))
  if (e.type === 'pest' && e.product) parts.push(e.product)
  if (e.amountMl != null) parts.push(formatVolume(e.amountMl))
  if (e.nutrients) parts.push(e.nutrients)
  if (e.ph != null) parts.push(`pH ${decimal(e.ph)}`)
  if (e.ec != null) parts.push(`EC ${decimal(e.ec)}`)
  if (e.heightCm != null) parts.push(`${decimal(e.heightCm)} cm`)
  if (e.tempC != null) parts.push(`${decimal(e.tempC)} °C`)
  if (e.humidity != null) parts.push(`${decimal(e.humidity)} % ${locale.value === 'cs' ? 'RV' : 'RH'}`)
  return parts.join(' · ')
}

export function blankEntry(): Omit<JournalEntry, 'id' | 'plantId' | 'type' | 'date' | 'createdAt'> {
  return {
    note: '',
    amountMl: null,
    ph: null,
    ec: null,
    nutrients: '',
    method: null,
    product: '',
    heightCm: null,
    tempC: null,
    humidity: null,
    photoIds: [],
    stage: null
  }
}
