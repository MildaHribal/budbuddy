import { ref, type Ref } from 'vue'
import { useNativeStorage } from './useNativeStorage'

export interface DayAction {
  id: string
  label: string
  done: boolean
  createdAt: string
}

export type DayStore = {
  actions: Ref<DayAction[]>
  load: () => Promise<void>
  add: (label: string) => Promise<void>
  toggle: (id: string, done: boolean) => Promise<void>
  remove: (id: string) => Promise<void>
  updateLabel: (id: string, newLabel: string) => Promise<void>
  clear: () => Promise<void>
}

const stores = new Map<string, DayStore>()

// Helper function for local date YYYY-MM-DD
const getLocalISODate = (d?: Date | string) => {
  const date = d ? new Date(d) : new Date()
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - (offset * 60 * 1000))
  return local.toISOString().split('T')[0]
}

export const useDayActions = (dateParam?: Date | string): DayStore => {
  // Key must match local date
  const dateKey = getLocalISODate(dateParam)
  const key = `actions:${dateKey}`

  if (stores.has(key)) {
    return stores.get(key)!
  }

  const { getObject, setObject } = useNativeStorage()
  const actions = ref<DayAction[]>([])

  const save = async () => {
    // Save a deep copy of the value
    await setObject(key, actions.value)
  }

  const load = async () => {
    try {
      const stored = await getObject<DayAction[]>(key)
      // If nothing is stored, set empty array, otherwise use loaded data
      actions.value = stored || []
    } catch (e) {
      console.error('Error loading actions', e)
      actions.value = []
    }
  }

  const add = async (label: string) => {
    const item: DayAction = {
      id: Date.now().toString(),
      label,
      done: false,
      createdAt: new Date().toISOString()
    }
    actions.value.push(item)
    await save()
  }

  const toggle = async (id: string, done: boolean) => {
    const it = actions.value.find(a => a.id === id)
    if (it) {
      it.done = done
      await save()
    }
  }

  const remove = async (id: string) => {
    actions.value = actions.value.filter(a => a.id !== id)
    await save()
  }

  const updateLabel = async (id: string, newLabel: string) => {
    const it = actions.value.find(a => a.id === id)
    if (it) {
      it.label = newLabel
      await save()
    }
  }

  const clear = async () => {
    actions.value = []
    await save()
  }

  const store: DayStore = {
    actions,
    load,
    add,
    toggle,
    remove,
    updateLabel,
    clear
  }

  // Initial load
  load()

  stores.set(key, store)
  return store
}
