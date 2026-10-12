import type { PublicAuthor } from '../types/community'
import { locale } from './locale'

export interface Challenge {
  id: string
  slug: string
  title: string
  description: string
  title_cs?: string | null
  description_cs?: string | null
  cover_url: string | null
  starts_at: string
  ends_at: string
  voting_ends_at: string
  finalized_at?: string | null
  created_at?: string
}

export type EntryAuthor = PublicAuthor

export interface ChallengeEntry {
  id: string
  challenge_id: string
  user_id: string
  plant_id: string | null
  image_url: string
  caption: string | null
  /** null while voting is open (challenge_entries_public hides results) */
  votes_count: number | null
  is_hidden?: boolean
  created_at: string
  author?: EntryAuthor | null
}

export type ChallengePhase = 'upcoming' | 'entries' | 'voting' | 'finished'

export function challengePhase(c: Pick<Challenge, 'starts_at' | 'ends_at' | 'voting_ends_at'>, now = Date.now()): ChallengePhase {
  if (now < Date.parse(c.starts_at)) return 'upcoming'
  if (now <= Date.parse(c.ends_at)) return 'entries'
  if (now <= Date.parse(c.voting_ends_at)) return 'voting'
  return 'finished'
}

/** The moment the current phase ends (null once finished). */
export function phaseDeadline(c: Pick<Challenge, 'starts_at' | 'ends_at' | 'voting_ends_at'>, now = Date.now()): string | null {
  const p = challengePhase(c, now)
  if (p === 'upcoming') return c.starts_at
  if (p === 'entries') return c.ends_at
  if (p === 'voting') return c.voting_ends_at
  return null
}

/** The DB accepts votes from the start until voting ends. */
export function canVote(c: Pick<Challenge, 'starts_at' | 'ends_at' | 'voting_ends_at'>, now = Date.now()): boolean {
  const p = challengePhase(c, now)
  return p === 'entries' || p === 'voting'
}

export function splitDuration(ms: number): { d: number, h: number, m: number, s: number } {
  const total = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
}

/** Highest votes first; ties go to the earlier entry. */
export function rankEntries<T extends Pick<ChallengeEntry, 'votes_count' | 'created_at'>>(list: T[]): T[] {
  return [...list].sort((a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0) || a.created_at.localeCompare(b.created_at))
}

export function challengeTitle(c: Pick<Challenge, 'title' | 'title_cs'>): string {
  return (locale.value === 'cs' && c.title_cs?.trim()) || c.title
}

export function challengeDescription(c: Pick<Challenge, 'description' | 'description_cs'>): string {
  return (locale.value === 'cs' && c.description_cs?.trim()) || c.description
}

/** The vote trigger rejects accounts younger than 3 days or without any activity. */
export function isVoteIneligible(message: string | undefined): boolean {
  return /vote_not_eligible|eligib/i.test(message ?? '')
}

const pad = (n: number) => String(n).padStart(2, '0')

export function localDateISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Entries 1st–25th, voting until the month's last day; after the 20th it proposes next month. */
export function defaultChallengeDates(now = new Date()): { month: string, starts: string, ends: string, votingEnds: string } {
  const base = now.getDate() > 20 ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1)
  const y = base.getFullYear()
  const m = base.getMonth()
  return {
    month: `${y}-${pad(m + 1)}`,
    starts: localDateISO(new Date(y, m, 1)),
    ends: localDateISO(new Date(y, m, 25)),
    votingEnds: localDateISO(new Date(y, m + 1, 0))
  }
}

/** Local start or end of the given yyyy-mm-dd day as an ISO timestamp. */
export function dayBoundary(iso: string, end = false): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = end ? new Date(y!, m! - 1, d!, 23, 59, 59) : new Date(y!, m! - 1, d!, 0, 0, 0)
  return date.toISOString()
}

export function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
}
