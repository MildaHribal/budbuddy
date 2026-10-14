import type { Tent } from '../types.ts'
import type { TentSpec } from './spec.ts'
import { hourOfDay } from './time.ts'

export const svp = (t: number): number => 0.6108 * Math.exp((17.27 * t) / (t + 237.3))

/** Leaf VPD; LED-lit leaves run ~1.5 °C under air temperature. */
export function vpd(tempC: number, rh: number, lightsOn: boolean): number {
  const leaf = tempC - (lightsOn ? 1.5 : 0.5)
  return Math.max(0, svp(leaf) - svp(tempC) * (rh / 100))
}

export interface Ambient {
  tempC: number
  rh: number
  power: boolean
}

export function ambientAt(h: number, tempOffset: number, rhOffset: number, power: boolean): Ambient {
  const d = hourOfDay(h)
  return {
    tempC: 21 + 2 * Math.sin((2 * Math.PI * (d - 9)) / 24) + tempOffset,
    rh: Math.min(95, 48 + rhOffset),
    power
  }
}

/** air changes per hour through open tent vents without a fan */
const PASSIVE_ACH = 20
/** RH points added by one real litre per hour of water vapour into one m³ (before ventilation). */
const VAPOUR_RH = 300

/**
 * Pulls the tent air toward an equipment-limited steady state for this hour.
 * transpLph is the canopy's physiological transpiration in litres per hour.
 */
export function stepClimate(tent: Tent, spec: TentSpec, amb: Ambient, lightsOn: boolean, transpLph: number): void {
  const p = amb.power
  const ach = (p ? spec.exhaustM3h / spec.volM3 : 0) + PASSIVE_ACH
  const vent = 1 / (1 + ach / 100)
  let t = amb.tempC + (lightsOn && spec.light ? spec.light.heat * tent.dim * vent : 0)
  const target = tent.climate
  if (p && spec.heaterW > 0 && t < target.tempC) t = Math.min(target.tempC, t + (spec.heaterW / 15) * vent)
  if (p && spec.acW > 0 && t > target.tempC) t = Math.max(target.tempC, t - spec.acW / 40)

  const ventRh = 1 / (1 + ach / 80)
  let rh = (amb.rh * svp(amb.tempC)) / svp(t) + ((transpLph / spec.volM3) * VAPOUR_RH * ventRh)
  const cap = (lpd: number): number => ((lpd / 24 / spec.volM3) * VAPOUR_RH * ventRh)
  if (p && spec.dehumLpd > 0 && rh > target.rh) rh = Math.max(target.rh, rh - cap(spec.dehumLpd))
  if (p && spec.humLpd > 0 && rh < target.rh) rh = Math.min(target.rh, rh + cap(spec.humLpd))
  rh = Math.min(99, Math.max(15, rh))

  const env = tent.env
  env.tempC += (t - env.tempC) * 0.7
  env.rh += (rh - env.rh) * 0.7
  env.lightsOn = lightsOn
  env.lightHours = tent.lightHours
  env.airflow = p ? spec.airflow : 0
  env.leak = lightsOn ? 0 : spec.leak
  env.vpd = vpd(env.tempC, env.rh, lightsOn)
}
