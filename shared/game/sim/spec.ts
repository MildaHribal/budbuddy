import type { Tent } from '../types.ts'
import { equipmentDef } from './content.ts'

/** Numbers the sim needs from a tent's installed equipment. */
export interface TentSpec {
  widthCm: number
  depthCm: number
  heightCm: number
  slots: number
  /** light leak in the dark period 0..1 */
  leak: number
  areaM2: number
  volM3: number
  light: { watts: number, ppfd: number, heat: number } | null
  exhaustM3h: number
  airflow: number
  dehumLpd: number
  humLpd: number
  heaterW: number
  acW: number
  meters: { ph: boolean, ec: boolean, climate: boolean, ppfd: boolean, moisture: boolean }
  irrigation: boolean
}

const DEFAULT_TENT: Record<string, number> = { widthCm: 60, heightCm: 140, slots: 2 }

export function tentSpec(tent: Tent): TentSpec {
  const t = equipmentDef(tent.tentItem)?.stats ?? DEFAULT_TENT
  const widthCm = t.widthCm || 60
  const depthCm = t.depthCm || widthCm
  const heightCm = t.heightCm || 140
  const l = equipmentDef(tent.light)
  const spec: TentSpec = {
    widthCm,
    depthCm,
    heightCm,
    slots: Math.max(1, Math.floor(t.slots || 2)),
    leak: t.leak ?? 0,
    areaM2: (widthCm * depthCm) / 1e4,
    volM3: (widthCm * depthCm * heightCm) / 1e6,
    light: l && l.slot === 'light' ? { watts: l.stats.watts ?? 0, ppfd: l.stats.ppfd ?? 0, heat: l.stats.heat ?? 0 } : null,
    exhaustM3h: 0,
    airflow: 0,
    dehumLpd: 0,
    humLpd: 0,
    heaterW: 0,
    acW: 0,
    meters: { ph: false, ec: false, climate: false, ppfd: false, moisture: false },
    irrigation: false
  }
  for (const id of tent.gear) {
    const e = equipmentDef(id)
    if (!e) continue
    const s = e.stats
    switch (e.slot) {
      case 'exhaust':
        spec.exhaustM3h += s.m3h ?? 0
        break
      case 'fan':
        spec.airflow += s.airflow ?? 0
        break
      case 'dehumidifier':
        spec.dehumLpd += s.lPerDay ?? 0
        break
      case 'humidifier':
        spec.humLpd += s.lPerDay ?? 0
        break
      case 'heater':
        spec.heaterW += s.watts ?? 0
        break
      case 'ac':
        spec.acW += s.watts ?? 0
        break
      case 'irrigation':
        spec.irrigation ||= (s.auto ?? 0) > 0
        break
      case 'meter':
        spec.meters.ph ||= !!s.ph
        spec.meters.ec ||= !!s.ec
        spec.meters.climate ||= !!s.climate
        spec.meters.ppfd ||= !!s.ppfd
        spec.meters.moisture ||= !!s.moisture
        break
    }
  }
  if (spec.exhaustM3h > 0) spec.airflow += 0.15
  spec.airflow = Math.min(1, spec.airflow)
  return spec
}
