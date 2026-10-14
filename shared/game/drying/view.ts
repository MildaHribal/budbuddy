// Read models for the drying screen. Pure, no i18n: the UI maps the keys to text.
import { REAL_MS_PER_GAME_HOUR, type CureJar, type DryBatch } from '../types.ts'
import { JAR_RH_HI, JAR_RH_LO, MOLD_LOSS_FROM, OVERDRY, READY_HI, WET_MOISTURE, hoursToMoisture, type CureBreakdown } from './model.ts'

export type DryStatus = 'steady' | 'fast' | 'humid' | 'stalled' | 'ready' | 'overdry'
export type JarStatus = 'wet' | 'burp' | 'stale' | 'fine' | 'dry'

/** A full dry shorter than this (game hours, ~2 real hours) is too fast for the terpenes. */
const FAST_FULL_DRY_H = 140

export function climateStatus(moisture: number, tempC: number, rh: number): DryStatus {
  if (moisture < OVERDRY) return 'overdry'
  if (moisture <= READY_HI) return 'ready'
  if (hoursToMoisture(moisture, READY_HI, tempC, rh) == null) return 'stalled'
  if (rh > 63) return 'humid'
  const full = hoursToMoisture(WET_MOISTURE, READY_HI, tempC, rh) ?? Infinity
  return tempC > 21 || full < FAST_FULL_DRY_H ? 'fast' : 'steady'
}

export function dryStatus(b: DryBatch): DryStatus {
  return climateStatus(b.moisture, b.tempC, b.rh)
}

export function moldVisible(risk: number): 'none' | 'musty' | 'mold' {
  return risk > MOLD_LOSS_FROM ? 'mold' : risk > 0.2 ? 'musty' : 'none'
}

export function jarStatus(jar: CureJar, due: boolean): JarStatus {
  if (jar.jarRh > 70) return 'wet'
  if (jar.jarRh > JAR_RH_HI) return 'burp'
  if (due) return 'stale'
  return jar.jarRh < JAR_RH_LO ? 'dry' : 'fine'
}

/** Game hours to real time split into hours and minutes. */
export function realDuration(gameH: number): { h: number, m: number } {
  const min = Math.max(0, Math.round(gameH * REAL_MS_PER_GAME_HOUR / 60_000))
  return { h: Math.floor(min / 60), m: min % 60 }
}

/** i18n key suffix and params for a game-hour span shown as real time. */
export function durationParts(gameH: number): { key: 'hm' | 'm' | 'lt', h: number, m: number } {
  const d = realDuration(gameH)
  return { key: d.h > 0 ? 'hm' : d.m > 0 ? 'm' : 'lt', ...d }
}

export interface CureResult {
  name: string
  breakdown: CureBreakdown
  dryG: number
}
