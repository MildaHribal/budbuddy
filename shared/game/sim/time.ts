import { REAL_MS_PER_GAME_HOUR } from '../types.ts'
import type { GameState } from '../types.ts'

/** Real-time catch-up limit for syncToNow. */
export const MAX_CATCHUP_REAL_MS = 3 * 24 * 3_600_000
/** Real hours expressed in game hours. */
export const realH = (h: number): number => (h * 3_600_000) / REAL_MS_PER_GAME_HOUR
/** Game day starts with lights on at this hour. */
export const LIGHTS_ON_AT = 6

export function gameHourToMs(state: GameState, h: number): number {
  return state.syncedAtMs + (h - state.nowH) * REAL_MS_PER_GAME_HOUR
}

export function msToGameHour(state: GameState, ms: number): number {
  return state.nowH + (ms - state.syncedAtMs) / REAL_MS_PER_GAME_HOUR
}

export const hourOfDay = (h: number): number => ((h % 24) + 24) % 24

export function lightsOnAt(h: number, lightHours: number): boolean {
  if (lightHours >= 24) return true
  if (lightHours <= 0) return false
  return hourOfDay(h - LIGHTS_ON_AT) < lightHours
}
