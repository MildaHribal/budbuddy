import type { JournalEntry, PhotoAlign, Plant, StageId } from '../../types/grow'
import { daysBetween } from '../date'
import { IDENTITY } from './align'

export interface TimelapseFrame {
  photoId: string
  entryId: string
  date: string
  /** days since the plant was started */
  day: number
  stage: StageId
  align: PhotoAlign
}

type StagePlant = Pick<Plant, 'stageHistory' | 'startDate' | 'stage'>

/** Stage the plant was in on `date`, from its stage history. */
export function stageOn(plant: StagePlant, date: string): StageId {
  let stage = plant.stageHistory[0]?.stage ?? plant.stage
  for (const h of plant.stageHistory) {
    if (h.date <= date) stage = h.stage
    else break
  }
  return stage
}

const byTime = (a: JournalEntry, b: JournalEntry) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)

/** Every journal photo of the plant, oldest first. */
export function timelapseFrames(plant: StagePlant & Pick<Plant, 'id'>, entries: readonly JournalEntry[]): TimelapseFrame[] {
  const frames: TimelapseFrame[] = []
  const seen = new Set<string>()
  for (const e of entries.filter(x => x.plantId === plant.id && x.photoIds.length).sort(byTime)) {
    for (const photoId of e.photoIds) {
      if (seen.has(photoId)) continue
      seen.add(photoId)
      frames.push({
        photoId,
        entryId: e.id,
        date: e.date,
        day: Math.max(0, daysBetween(plant.startDate, e.date)),
        stage: stageOn(plant, e.date),
        align: e.align?.[photoId] ?? IDENTITY
      })
    }
  }
  return frames
}

/**
 * Photo to show as the ghost when a new photo is added on `date`:
 * the newest earlier (or same-day) journal photo that is not part of the new entry.
 */
export function ghostFrame(plant: StagePlant & Pick<Plant, 'id'>, entries: readonly JournalEntry[], date: string, exclude: readonly string[] = []): TimelapseFrame | null {
  const skip = new Set(exclude)
  const frames = timelapseFrames(plant, entries).filter(f => f.date <= date && !skip.has(f.photoId))
  return frames[frames.length - 1] ?? null
}

export interface FrameStep {
  /** index of the photo shown */
  from: number
  /** next photo when cross-fading, else same as from */
  to: number
  /** 0–1 blend toward `to` */
  mix: number
}

/**
 * Video frames for a timelapse: each photo holds for 1/photosPerSecond seconds.
 * With `smooth` the last 40 % of every hold cross-fades into the next photo.
 */
export function videoSteps(count: number, photosPerSecond: number, fps: number, smooth: boolean, holdLast = 1): FrameStep[] {
  if (count <= 0) return []
  const per = Math.max(1, Math.round(fps / Math.max(0.25, photosPerSecond)))
  const steps: FrameStep[] = []
  for (let i = 0; i < count; i++) {
    const last = i === count - 1
    const n = last ? per + Math.round(fps * holdLast) : per
    const fadeFrom = Math.floor(per * 0.6)
    for (let k = 0; k < n; k++) {
      if (smooth && !last && k >= fadeFrom) {
        const mix = (k - fadeFrom + 1) / (per - fadeFrom + 1)
        steps.push({ from: i, to: i + 1, mix: easeInOut(mix) })
      } else {
        steps.push({ from: i, to: i, mix: 0 })
      }
    }
  }
  return steps
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** Length of the exported clip in seconds. */
export function clipSeconds(count: number, photosPerSecond: number, fps: number, holdLast = 1): number {
  return videoSteps(count, photosPerSecond, fps, false, holdLast).length / fps
}
