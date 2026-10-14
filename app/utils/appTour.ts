import type { Plant, Settings } from '../types/grow'

export type TourStepId = 'garden' | 'today' | 'tents' | 'log' | 'journal' | 'ai' | 'more' | 'done'
/** where a step happens: home, the hero plant's page, or wherever the bottom nav is visible */
export type TourPlace = 'home' | 'plant' | 'nav'

export interface TourStep {
  id: TourStepId
  place: TourPlace
  /** selectors whose union is highlighted; none = a centred card over the scrim */
  targets: string[]
}

// existing page structure, so the pages need no tour-specific markup
export const TOUR_STEPS: readonly TourStep[] = [
  { id: 'garden', place: 'home', targets: ['section[aria-labelledby="plants-title"]'] },
  { id: 'today', place: 'home', targets: ['section[aria-labelledby="tasks-title"]'] },
  { id: 'tents', place: 'home', targets: ['section[aria-labelledby="tents-title"]'] },
  { id: 'log', place: 'plant', targets: ['.detail .actions'] },
  { id: 'journal', place: 'plant', targets: ['.detail .tabs-wrap', '.detail .tab-body > .card'] },
  { id: 'ai', place: 'nav', targets: ['.bottom-nav a[href="/ai-assistant"]'] },
  { id: 'more', place: 'nav', targets: ['.bottom-nav a[href="/guide"]', '.bottom-nav a[href="/community"]'] },
  { id: 'done', place: 'home', targets: [] }
]

/**
 * How the tour runs: 'first' right after the native onboarding, 'demo' replayed over the demo garden,
 * 'preview' replayed over the grower's own garden (the demo is shown without saving, then the garden comes back).
 */
export type TourMode = 'first' | 'demo' | 'preview'

type Garden = { settings: Pick<Settings, 'demo'>, plants: Pick<Plant, 'demo'>[] }

/** Only the untouched demo garden: never anything the grower made or restored. */
export function isDemoGarden(g: Garden): boolean {
  return g.settings.demo && g.plants.length > 0 && g.plants.every(p => p.demo)
}

export interface FirstRunInput extends Garden {
  native: boolean
  /** the tour was started before on this device */
  seen: boolean
  /** stored data was unreadable or set aside */
  troubled: boolean
}

/** The tour starts by itself once: on a fresh native install, over the demo garden. */
export function startsFirstRun(i: FirstRunInput): boolean {
  return i.native && !i.seen && !i.troubled && isDemoGarden(i)
}

export function replayMode(g: Garden): Exclude<TourMode, 'first'> {
  return isDemoGarden(g) ? 'demo' : 'preview'
}

/** The plant whose page the tour opens: the demo's flowering hero, with the fullest journal. */
export function tourPlant<P extends Pick<Plant, 'id' | 'stage' | 'archived'>>(plants: P[]): P | undefined {
  const active = plants.filter(p => !p.archived)
  return active.find(p => p.stage === 'flowering') ?? active[0]
}
