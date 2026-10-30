import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { shouldAskSupport, type SupportState } from '~/utils/supportPrompt'

const KEY = 'budbuddy:support'
const open = ref(false)
let counted = false

async function read(): Promise<SupportState> {
  const raw = (await Preferences.get({ key: KEY }).catch(() => ({ value: null }))).value
  try {
    const s = raw ? JSON.parse(raw) as Partial<SupportState> : {}
    return { firstOpen: Number(s.firstOpen) || Date.now(), opens: Number(s.opens) || 0, lastShown: Number(s.lastShown) || 0, never: s.never === true }
  } catch {
    return { firstOpen: Date.now(), opens: 0, lastShown: 0, never: false }
  }
}
const write = (s: SupportState) => Preferences.set({ key: KEY, value: JSON.stringify(s) }).catch(() => {})

/** "Support BudBuddy" sheet: opened from settings or, now and then, on its own (native only). */
export function useSupport() {
  /** Counts this app start and opens the sheet when it is time. */
  async function onStart(unlimited: boolean) {
    if (counted || !Capacitor.isNativePlatform()) return
    counted = true
    const s = await read()
    s.opens++
    const ask = shouldAskSupport(s, Date.now(), unlimited)
    if (ask) s.lastShown = Date.now()
    await write(s)
    if (ask) open.value = true
  }

  async function never() {
    open.value = false
    await write({ ...(await read()), never: true })
  }

  return { open, onStart, never, show: () => (open.value = true) }
}
