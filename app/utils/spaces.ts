import type { GrowSpace, Location, Plant } from '../types/grow'
import { createId } from './id'
import { isGrowing } from './stages'

const LOCATIONS: Location[] = ['indoor', 'outdoor', 'greenhouse']
const isHHMM = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function normalizeSpace(raw: Record<string, unknown>, fallback: { lightsOn: string, lightHours: number }): GrowSpace {
  const now = new Date().toISOString()
  const location = LOCATIONS.includes(raw.location as Location) ? (raw.location as Location) : 'indoor'
  const hours = raw.lightHours === null ? null : Number(raw.lightHours)
  return {
    id: str(raw.id) || createId(),
    name: str(raw.name).trim().slice(0, 40) || 'Tent',
    location,
    size: str(raw.size).trim().slice(0, 40),
    light: str(raw.light).trim().slice(0, 60),
    lightsOn: isHHMM(raw.lightsOn) ? raw.lightsOn : fallback.lightsOn,
    lightHours: hours === null
      ? null
      : Number.isFinite(hours) && hours >= 0 && hours <= 24 ? Math.round(hours) : (location === 'outdoor' ? null : fallback.lightHours),
    notes: str(raw.notes).slice(0, 500),
    createdAt: str(raw.createdAt) || now,
    updatedAt: str(raw.updatedAt) || now
  }
}

/** Schedule shown for a space; null when it only gets daylight. */
export function spaceSchedule(space: Pick<GrowSpace, 'lightsOn' | 'lightHours'>): { lightsOn: string, hours: number } | null {
  return space.lightHours === null ? null : { lightsOn: space.lightsOn, hours: space.lightHours }
}

export function plantsInSpace<P extends Pick<Plant, 'spaceId' | 'archived'>>(plants: readonly P[], spaceId: string, includeArchived = false): P[] {
  return plants.filter(p => p.spaceId === spaceId && (includeArchived || !p.archived))
}

/**
 * The global light card stays on the home screen while some growing indoor plant has no lit space,
 * so growers who never create a tent keep the old behaviour.
 */
export function needsGlobalLight(plants: readonly Plant[], spaces: readonly GrowSpace[]): boolean {
  const lit = new Set(spaces.filter(s => s.lightHours !== null).map(s => s.id))
  if (!lit.size) return true
  const known = new Set(spaces.map(s => s.id))
  return plants.some(p => isGrowing(p) && p.location !== 'outdoor' && (!p.spaceId || !known.has(p.spaceId)))
}
