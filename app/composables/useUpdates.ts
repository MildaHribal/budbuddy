import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { newerRelease, type Release } from '~/utils/updates'

export const DOWNLOAD_PAGE = 'https://budbuddy.hribal.site/download.html'
const LATEST = 'https://api.github.com/repos/MildaHribal/budbuddy/releases/latest'
const CHECKED_KEY = 'budbuddy:update-checked'
const DISMISSED_KEY = 'budbuddy:update-dismissed'
const DAY = 24 * 3600 * 1000

const current = ref<{ version: string, build: number } | null>(null)
const available = ref<Release | null>(null)
const checking = ref(false)
const failed = ref(false)
/** set by the start-up check; the update sheet shows it once per version */
const prompt = ref(false)

/** Sideloaded APK: no store updates, so the app asks GitHub Releases for a newer build. */
export function useUpdates() {
  async function loadCurrent() {
    if (!Capacitor.isNativePlatform() || current.value) return
    const info = await App.getInfo().catch(() => null)
    if (info) current.value = { version: info.version, build: Number(info.build) || 0 }
  }

  async function check(): Promise<Release | null> {
    if (!Capacitor.isNativePlatform()) return null
    checking.value = true
    failed.value = false
    try {
      const info = await App.getInfo()
      current.value = { version: info.version, build: Number(info.build) || 0 }
      const res = await fetch(LATEST, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`github ${res.status}`)
      available.value = newerRelease(await res.json(), current.value.build)
      await Preferences.set({ key: CHECKED_KEY, value: String(Date.now()) }).catch(() => {})
      return available.value
    } catch {
      failed.value = true
      return null
    } finally {
      checking.value = false
    }
  }

  /** At most once a day; asks once per new version. */
  async function checkOnStart() {
    if (!Capacitor.isNativePlatform()) return
    const last = Number((await Preferences.get({ key: CHECKED_KEY }).catch(() => ({ value: null }))).value) || 0
    if (Date.now() - last < DAY) return
    const rel = await check()
    if (!rel) return
    const dismissed = (await Preferences.get({ key: DISMISSED_KEY }).catch(() => ({ value: null }))).value
    if (dismissed !== String(rel.build)) prompt.value = true
  }

  async function dismiss() {
    prompt.value = false
    if (available.value) await Preferences.set({ key: DISMISSED_KEY, value: String(available.value.build) }).catch(() => {})
  }

  return { current: readonly(current), available: readonly(available), checking: readonly(checking), failed: readonly(failed), prompt, loadCurrent, check, checkOnStart, dismiss }
}
