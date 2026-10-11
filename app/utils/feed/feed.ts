import { growerLevel } from '~/utils/grower'
import { intlLocale } from '~/utils/locale'

export const CATEGORIES = ['question', 'plants', 'harvest', 'problem', 'gear', 'outdoor', 'general'] as const
export type Category = typeof CATEGORIES[number]

export const CATEGORY_GLYPH: Record<Category, string> = {
  question: 'i-tabler-help-circle',
  plants: 'vegetative',
  harvest: 'harvest',
  problem: 'pest',
  gear: 'lamp',
  outdoor: 'i-tabler-sun',
  general: 'community'
}

export interface Author {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  reputation: number
}

export interface PlantContext {
  name?: string
  strain?: string
  type?: string
  stage?: string
  day?: number
  dayInStage?: number
  medium?: string
  environment?: string
  lastWater?: string | null
  lastFeed?: { date: string, ph: number | null, ec: number | null } | null
  notes?: string[]
}

export interface LinkedPlant {
  id: string
  name: string
  strain: string | null
  stage: string
  cover_url: string | null
}

export interface Post {
  id: string
  author_id: string
  category: Category
  title: string | null
  body: string
  images: string[]
  plant_id: string | null
  plant_context: PlantContext | null
  likes_count: number
  comments_count: number
  accepted_comment_id: string | null
  is_hidden: boolean
  edited_at: string | null
  created_at: string
  author: Author | null
  plant: LinkedPlant | null
}

export interface Comment {
  id: string
  post_id: string
  author_id: string | null
  parent_id: string | null
  body: string
  is_ai: boolean
  likes_count: number
  is_hidden: boolean
  created_at: string
  author: Author | null
}

const AUTHOR = 'id, username, display_name, avatar_url, reputation'
export const POST_SELECT = `*, author:profiles!posts_author_id_fkey(${AUTHOR}), plant:public_plants(id, name, strain, stage, cover_url)`
export const COMMENT_SELECT = `*, author:profiles!comments_author_id_fkey(${AUTHOR})`
export const PAGE = 20

export const shareUrl = (id: string) => `https://budbuddy.hribal.site/community/post/${id}`

export function authorName(a: Author | null | undefined): string {
  return a?.display_name?.trim() || a?.username || '?'
}

// ── Reputation levels ──────────────────────────────────────────────

export interface Level { key: 'seedling' | 'grower' | 'cultivator' | 'master', glyph: string, color: string }

export function repLevel(rep: number): Level {
  const { id, glyph, color } = growerLevel(rep)
  return { key: id, glyph, color }
}

// ── Ranking ────────────────────────────────────────────────────────

/** "For you": engagement with gravity-style time decay. */
export function hotScore(p: Pick<Post, 'likes_count' | 'comments_count' | 'created_at'>, now = Date.now()): number {
  const hours = Math.max(0, (now - new Date(p.created_at).getTime()) / 3_600_000)
  return (p.likes_count + p.comments_count * 2 + 1) / Math.pow(hours + 2, 1.5)
}

// ── Time ───────────────────────────────────────────────────────────

/** Compact relative time: now, 5m, 3h, 2d, then a date. */
export function relTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto', style: 'narrow' })
  if (s < 60) return rtf.format(0, 'second')
  if (s < 3600) return rtf.format(-Math.floor(s / 60), 'minute')
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), 'hour')
  if (s < 86400 * 7) return rtf.format(-Math.floor(s / 86400), 'day')
  return new Date(iso).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: s > 86400 * 300 ? 'numeric' : undefined })
}

// ── Errors ─────────────────────────────────────────────────────────

export type ErrorKind = 'rate' | 'banned' | 'offline' | 'generic'

export function errorKind(e: { message: string, code?: string } | Error | null | undefined, banned = false): ErrorKind {
  const msg = (e?.message ?? '').toLowerCase()
  if (msg.includes('rate limit')) return 'rate'
  if (banned || (e && 'code' in e && e.code === '42501') || msg.includes('row-level security')) return 'banned'
  if (msg.includes('failed to fetch') || msg.includes('network') || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'offline'
  return 'generic'
}

// ── Storage ────────────────────────────────────────────────────────

/** media/<uid>/... path from a public URL (null for foreign URLs). */
export function storagePath(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/)
  return m?.[1] ? decodeURIComponent(m[1]) : null
}
