import { Preferences } from '@capacitor/preferences'
import { GAME_KEY } from './gameUi'

/** Fired after a backup restored the game save; useGame reloads on it. */
export const GAME_RESTORED = 'budbuddy:game-restored'

const looksLikeGame = (v: unknown): v is Record<string, unknown> => {
  const s = v as { v?: unknown, tents?: unknown, plants?: unknown }
  return !!s && typeof s === 'object' && s.v === 1 && Array.isArray(s.tents) && !!s.plants && typeof s.plants === 'object'
}

/** The saved Shadow Grow game for a backup file, or null when there is none (or it is unreadable). */
export async function readGameForBackup(): Promise<Record<string, unknown> | null> {
  const { value } = await Preferences.get({ key: GAME_KEY })
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return looksLikeGame(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Restores the game from a backup's `game` field. Returns false (and changes nothing) when the field is missing or invalid. */
export async function restoreGameFromBackup(raw: unknown): Promise<boolean> {
  if (!looksLikeGame(raw)) return false
  await Preferences.set({ key: GAME_KEY, value: JSON.stringify(raw) })
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(GAME_RESTORED))
  return true
}
