import type { PublicTimelineItem } from '../types/community'
import type { EntryType, StageId } from '../types/grow'
import { translate } from '../composables/useI18n'
import { formatDate } from './date'

export type GrowerLevel = 'seedling' | 'sprout' | 'veg' | 'flowering' | 'master'

/** Reputation thresholds (research #11); each level unlocks a privilege. */
export const LEVELS: { id: GrowerLevel, min: number, color: string, glyph: string }[] = [
  { id: 'seedling', min: 0, color: '#a5ada8', glyph: 'germination' },
  { id: 'sprout', min: 25, color: '#8fd97a', glyph: 'seedling' },
  { id: 'veg', min: 100, color: '#3dd173', glyph: 'vegetative' },
  { id: 'flowering', min: 300, color: '#b58cf5', glyph: 'flowering' },
  { id: 'master', min: 1000, color: '#f2b544', glyph: 'harvest' }
]

export interface GrowerLevelInfo {
  id: GrowerLevel
  /** 0-based tier */
  tier: number
  glyph: string
  color: string
  label: string
  /** reputation needed for the next level (null at the top) */
  next: number | null
}

export function growerLevel(reputation: number): GrowerLevelInfo {
  const rep = Math.max(0, reputation || 0)
  let tier = 0
  for (let i = 0; i < LEVELS.length; i++) if (rep >= LEVELS[i]!.min) tier = i
  const l = LEVELS[tier]!
  return { id: l.id, tier, glyph: l.glyph, color: l.color, label: translate(`feed.levels.${l.id}`), next: LEVELS[tier + 1]?.min ?? null }
}

export interface PublicPlant {
  id: string
  owner_id: string
  name: string
  strain: string | null
  plant_type: 'photoperiod' | 'autoflower' | null
  stage: string
  environment: string | null
  medium: string | null
  start_date: string | null
  cover_url: string | null
  harvest_wet_g: number | null
  harvest_dry_g: number | null
  archived: boolean
  timeline: unknown
  updated_at: string
}

/** Parsed timeline row for display. */
export type PublicTimelineEntry = Required<Pick<PublicTimelineItem, 'date' | 'type' | 'summary'>> & {
  id: string
  note: string
  stage: StageId | null
  photoUrl: string | null
}

const TYPES: EntryType[] = ['water', 'feed', 'train', 'pest', 'measure', 'note', 'photo', 'stage', 'harvest']
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Tolerant reader for public_plants.timeline (PublicTimelineItem[]). */
export function parsePublicTimeline(raw: unknown): PublicTimelineEntry[] {
  if (!Array.isArray(raw)) return []
  const out: PublicTimelineEntry[] = []
  raw.forEach((r, i) => {
    if (!r || typeof r !== 'object') return
    const o = r as Record<string, unknown>
    const date = str(o.date).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const type = TYPES.includes(o.type as EntryType) ? o.type as EntryType : 'note'
    const url = str(o.photoUrl)
    out.push({
      id: `t${i}`,
      date,
      type,
      summary: str(o.summary),
      note: str(o.note),
      stage: (str(o.stage) || null) as StageId | null,
      photoUrl: /^https?:/.test(url) ? url : null
    })
  })
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

/** Short relative time for timestamps ("5 min", "3 h", then a date). */
export function communityAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return translate('profile.ago.now')
  if (s < 3600) return translate('profile.ago.m', { n: Math.floor(s / 60) })
  if (s < 86400) return translate('profile.ago.h', { n: Math.floor(s / 3600) })
  if (s < 7 * 86400) return translate('profile.ago.d', { n: Math.floor(s / 86400) })
  return formatDate(iso.slice(0, 10), { day: 'numeric', month: 'short' })
}

/** Translates a key, falling back to the raw value when no string exists. */
export function tOr(key: string, fallback: string): string {
  const v = translate(key)
  return v === key ? fallback : v
}
