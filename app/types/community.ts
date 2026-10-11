import type { EntryType, StageId } from './grow'

/** One shared journal entry inside public_plants.timeline (written by usePlantSharing). */
export interface PublicTimelineItem {
  date: string
  type: EntryType
  /** measured facts, e.g. "1 l · pH 6.2" */
  summary: string
  note?: string
  /** stage entries only */
  stage?: StageId
  photoUrl?: string
}

/** Profile fields embedded as the author of community content. */
export interface PublicAuthor {
  username: string
  display_name: string | null
  avatar_url: string | null
  reputation?: number | null
}
