import { Preferences } from '@capacitor/preferences'
import { gateState, parseRecord, recordFor, type AgeRecord, type Birth } from '~/utils/ageGate'

// Own key, so a garden reset, demo or backup restore never asks again.
const KEY = 'budbuddy:age'

const record = ref<AgeRecord | null>(null)
const loaded = ref(false)
let loading: Promise<void> | null = null

export function useAgeGate() {
  loading ??= Preferences.get({ key: KEY })
    .then((r) => {
      record.value = parseRecord(r.value)
    })
    .catch(() => {})
    .finally(() => {
      loaded.value = true
    })

  const status = computed(() => (loaded.value ? gateState(record.value, new Date()) : 'loading'))

  async function submit(country: string, birth: Birth) {
    const rec = recordFor(country, birth, new Date())
    record.value = rec
    await Preferences.set({ key: KEY, value: JSON.stringify(rec) }).catch(() => {})
  }

  return { status, record: readonly(record), submit }
}
