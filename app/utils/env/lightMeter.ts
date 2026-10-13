// Lux → PPFD estimate. A lux meter weights light by the human eye, so the factor depends on the lamp's spectrum.
// Factors (µmol/m²/s per lux) follow the widely used Apogee / Thimijan & Heins (1983) conversion tables;
// blurple LEDs are a rough guess because their red/blue peaks sit where the eye (and lux) is least sensitive.

import type { LightType } from '~/types/environment'
import { dli } from '~/utils/calc'

export const LIGHT_TYPES: LightType[] = ['led-white', 'sun', 'hps', 'cmh', 'fluorescent', 'blurple']

export const LUX_TO_PPFD: Record<LightType, number> = {
  'sun': 0.0185,
  'led-white': 0.0152,
  'hps': 0.0122,
  'cmh': 0.0145,
  'fluorescent': 0.0135,
  'blurple': 0.03
}

/** Factors with a wide error band even with a perfect sensor. */
export const ROUGH_TYPES: LightType[] = ['blurple']

export function luxToPpfd(lux: number, type: LightType, calibration = 1): number {
  if (!Number.isFinite(lux) || lux <= 0) return 0
  return lux * LUX_TO_PPFD[type] * (calibration > 0 ? calibration : 1)
}

export interface LightEstimate {
  ppfd: number
  dli: number
}

export function estimateLight(lux: number, type: LightType, hours: number, calibration = 1): LightEstimate {
  const ppfd = luxToPpfd(lux, type, calibration)
  return { ppfd: Math.round(ppfd), dli: Math.round(dli(ppfd, Math.min(24, Math.max(0, hours))) * 10) / 10 }
}

export type PpfdBand = 'low' | 'seedling' | 'veg' | 'flower' | 'high'

/** Rough PPFD guidance for photoperiod cannabis. */
export function ppfdBand(ppfd: number): PpfdBand {
  if (ppfd < 150) return 'low'
  if (ppfd < 400) return 'seedling'
  if (ppfd < 700) return 'veg'
  if (ppfd <= 1000) return 'flower'
  return 'high'
}

/**
 * Smooths jittery sensor samples: median of the last values, so a hand moving over the phone does not spike the reading.
 */
export function medianLux(samples: number[]): number {
  const v = samples.filter(n => Number.isFinite(n) && n >= 0).sort((a, b) => a - b)
  if (!v.length) return 0
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2
}
