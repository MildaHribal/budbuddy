import type { EntryType, JournalEntry, TrainingMethod } from '../types/grow'

export interface EntryTypeInfo {
  type: EntryType
  label: string
  /** past-tense label shown in the journal */
  verb: string
  icon: string
  color: string
  /** can be logged from the action grid */
  loggable: boolean
}

export const ENTRY_TYPES: EntryTypeInfo[] = [
  { type: 'water', label: 'Water', verb: 'Watered', icon: 'i-tabler-droplet-filled', color: '#4fc3f7', loggable: true },
  { type: 'feed', label: 'Feed', verb: 'Fed nutrients', icon: 'i-tabler-flask', color: '#a78bfa', loggable: true },
  { type: 'train', label: 'Train', verb: 'Training', icon: 'i-tabler-scissors', color: '#34d399', loggable: true },
  { type: 'pest', label: 'Pest', verb: 'Pest treatment', icon: 'i-tabler-bug', color: '#f97316', loggable: true },
  { type: 'measure', label: 'Measure', verb: 'Measurement', icon: 'i-tabler-ruler-measure', color: '#2dd4bf', loggable: true },
  { type: 'note', label: 'Note', verb: 'Note', icon: 'i-tabler-notes', color: '#fbbf24', loggable: true },
  { type: 'photo', label: 'Photo', verb: 'Photo', icon: 'i-tabler-camera', color: '#ec4899', loggable: true },
  { type: 'stage', label: 'Stage', verb: 'Stage change', icon: 'i-tabler-arrow-big-right-lines', color: '#7bc74d', loggable: false },
  { type: 'harvest', label: 'Harvest', verb: 'Harvested', icon: 'i-tabler-basket', color: '#facc15', loggable: false }
]

const BY_TYPE = Object.fromEntries(ENTRY_TYPES.map(e => [e.type, e])) as Record<EntryType, EntryTypeInfo>

export function entryInfo(type: EntryType): EntryTypeInfo {
  return BY_TYPE[type] ?? BY_TYPE.note
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

export function trainingLabel(m: TrainingMethod | null): string {
  return TRAINING_METHODS.find(t => t.value === m)?.label ?? ''
}

export function formatVolume(ml: number | null): string {
  if (ml == null) return ''
  return ml >= 1000 ? `${+(ml / 1000).toFixed(2)} L` : `${ml} ml`
}

/** Short one-line summary of the measurable values of an entry. */
export function entrySummary(e: JournalEntry): string {
  const parts: string[] = []
  if (e.type === 'train' && e.method) parts.push(trainingLabel(e.method))
  if (e.type === 'pest' && e.product) parts.push(e.product)
  if (e.amountMl != null) parts.push(formatVolume(e.amountMl))
  if (e.nutrients) parts.push(e.nutrients)
  if (e.ph != null) parts.push(`pH ${e.ph}`)
  if (e.ec != null) parts.push(`EC ${e.ec}`)
  if (e.heightCm != null) parts.push(`${e.heightCm} cm`)
  if (e.tempC != null) parts.push(`${e.tempC} °C`)
  if (e.humidity != null) parts.push(`${e.humidity} % RH`)
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
