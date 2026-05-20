// composables/usePlantJournal.ts
import { ref } from 'vue'
import { useNativeStorage } from './useNativeStorage'

export type JournalEntryType
  = | 'water'
    | 'nutrients'
    | 'trim'
    | 'repellent'
    | 'note'
    | 'photo'

export interface JournalEntry {
  id: string
  plantId: string | number
  date: string // YYYY-MM-DD
  type: JournalEntryType
  note?: string
  photo?: string // base64 data URL
  amount?: string // e.g. "500 ml" for water / nutrients dose
  createdAt: string
}

const STORAGE_PREFIX = 'plant-journal:'

const caches = new Map<string | number, JournalEntry[]>()

export const usePlantJournal = (plantId: string | number) => {
  const { getObject, setObject } = useNativeStorage()
  const key = `${STORAGE_PREFIX}${plantId}`

  const entries = ref<JournalEntry[]>(caches.get(plantId) ?? [])

  const save = async () => {
    caches.set(plantId, entries.value)
    await setObject(key, entries.value)
  }

  const load = async () => {
    try {
      const stored = await getObject<JournalEntry[]>(key)
      entries.value = stored ?? []
      caches.set(plantId, entries.value)
    } catch {
      entries.value = []
    }
  }

  const addEntry = async (data: Omit<JournalEntry, 'id' | 'plantId' | 'createdAt'>) => {
    const entry: JournalEntry = {
      id: Date.now().toString(),
      plantId,
      createdAt: new Date().toISOString(),
      ...data
    }
    entries.value.unshift(entry)
    await save()
    return entry
  }

  const removeEntry = async (id: string) => {
    entries.value = entries.value.filter(e => e.id !== id)
    await save()
  }

  const updateEntry = async (id: string, patch: Partial<JournalEntry>) => {
    const idx = entries.value.findIndex(e => e.id === id)
    const existing = entries.value[idx]
    if (existing) {
      entries.value[idx] = { ...existing, ...patch }
      await save()
    }
  }

  const entriesForDate = (date: string) =>
    entries.value.filter(e => e.date === date)

  const allPhotos = () =>
    entries.value
      .filter(e => e.type === 'photo' && e.photo)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // Call load immediately
  load()

  return { entries, load, addEntry, removeEntry, updateEntry, entriesForDate, allPhotos }
}
