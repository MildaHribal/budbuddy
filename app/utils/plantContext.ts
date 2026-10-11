import type { Location, Medium, StageId } from '~/types/grow'
import { useGrow } from '~/composables/useGrow'
import { stageProgress } from '~/utils/stages'

export interface PlantContext {
  name: string
  strain: string
  stage: StageId
  /** days since start */
  day: number
  /** day within the current stage */
  dayInStage: number
  type: 'photoperiod' | 'autoflower'
  medium: Medium
  environment: Location
  /** light schedule, e.g. "18/6" */
  light: string
  lastWater: { date: string, amountMl: number | null, ph: number | null } | null
  lastFeed: { date: string, ph: number | null, ec: number | null, nutrients: string } | null
  /** newest first, max 3, trimmed */
  recentNotes: { date: string, text: string }[]
  /** latest 3 local photo ids (IndexedDB), newest first */
  photoIds: string[]
}

/** Snapshot of a local plant for a help request; null when the plant does not exist. */
export function buildPlantContext(plantId: string): PlantContext | null {
  const grow = useGrow()
  const p = grow.getPlant(plantId)
  if (!p) return null
  const entries = grow.entriesFor(plantId)
  const prog = stageProgress(p)
  const hours = grow.state.settings.lightHours
  const water = entries.find(e => e.type === 'water' || e.type === 'feed')
  const feed = entries.find(e => e.type === 'feed')
  const photoIds: string[] = []
  for (const e of entries) {
    for (const id of e.photoIds) if (photoIds.length < 3 && !photoIds.includes(id)) photoIds.push(id)
  }
  if (photoIds.length < 3 && p.photoId && !photoIds.includes(p.photoId)) photoIds.push(p.photoId)
  return {
    name: p.name,
    strain: p.strain,
    stage: p.stage,
    day: prog.age,
    dayInStage: prog.dayInStage,
    type: p.type,
    medium: p.medium,
    environment: p.location,
    light: p.location === 'outdoor' ? 'sun' : `${hours}/${24 - hours}`,
    lastWater: water ? { date: water.date, amountMl: water.amountMl, ph: water.ph } : null,
    lastFeed: feed ? { date: feed.date, ph: feed.ph, ec: feed.ec, nutrients: feed.nutrients } : null,
    recentNotes: entries
      .filter(e => e.note.trim())
      .slice(0, 3)
      .map(e => ({ date: e.date, text: e.note.trim().replace(/\s+/g, ' ').slice(0, 200) })),
    photoIds
  }
}
