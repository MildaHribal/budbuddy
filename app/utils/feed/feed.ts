import { growerLevel } from '~/utils/grower'
import { intlLocale } from '~/utils/locale'
import type { PlantContext } from '~/utils/plantContext'

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
  first_grow?: boolean | null
}

export const HELP_CATEGORIES: readonly Category[] = ['question', 'problem']

export const SYMPTOMS = ['yellowing', 'spots', 'burn', 'claw', 'droop', 'curl', 'purple', 'pests', 'mould', 'slow', 'other'] as const
export type Symptom = typeof SYMPTOMS[number]

export const REACTIONS = ['like', 'healthy', 'training', 'frosty', 'helpful'] as const
export type ReactionKind = typeof REACTIONS[number]

export const REACTION_GLYPH: Record<ReactionKind, { glyph: string, on: string, color: string }> = {
  like: { glyph: 'i-tabler-heart', on: 'i-tabler-heart-filled', color: 'var(--leaf)' },
  healthy: { glyph: 'vegetative', on: 'vegetative', color: 'var(--leaf)' },
  training: { glyph: 'train', on: 'train', color: 'var(--info)' },
  frosty: { glyph: 'i-tabler-snowflake', on: 'i-tabler-snowflake', color: '#e4eefc' },
  helpful: { glyph: 'i-tabler-bulb', on: 'i-tabler-bulb-filled', color: 'var(--lamp)' }
}

/** Plant snapshot as stored in posts.plant_context. */
export interface PostPlantContext {
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

export function toPostContext(c: PlantContext): PostPlantContext {
  return {
    name: c.name,
    strain: c.strain || undefined,
    type: c.type,
    stage: c.stage,
    day: c.day,
    dayInStage: c.dayInStage,
    medium: c.medium,
    environment: c.environment,
    lastWater: c.lastWater?.date ?? null,
    lastFeed: c.lastFeed ? { date: c.lastFeed.date, ph: c.lastFeed.ph, ec: c.lastFeed.ec } : null,
    notes: c.recentNotes.map(n => `${n.date}: ${n.text.slice(0, 160)}`)
  }
}

export interface ComposerPrefill {
  category?: Category
  /** local journal plant id: attaches its context and latest photos */
  plant?: string | null
  title?: string
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
  plant_context: PostPlantContext | null
  likes_count: number
  comments_count: number
  accepted_comment_id: string | null
  is_hidden: boolean
  edited_at: string | null
  created_at: string
  author: Author | null
  plant: LinkedPlant | null
  status?: 'open' | 'solved' | null
  solved_at?: string | null
  symptom_tags?: string[] | null
  reactions?: Partial<Record<ReactionKind, number>> | null
  solver?: { author: { username: string } | null } | null
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

const AUTHOR_V1 = 'id, username, display_name, avatar_url, reputation'
const AUTHOR_V2 = `${AUTHOR_V1}, first_grow`
const SOLVER = 'solver:comments!posts_accepted_fk(author:profiles!comments_author_id_fkey(username))'
const postSelect = (a: string) => `*, author:profiles!posts_author_id_fkey(${a}), plant:public_plants(id, name, strain, stage, cover_url), ${SOLVER}`
// Live bindings: downgraded by ensureSchema() while profiles.first_grow is not deployed yet.
// eslint-disable-next-line import/no-mutable-exports
export let POST_SELECT = postSelect(AUTHOR_V2) as '*'
// eslint-disable-next-line import/no-mutable-exports
export let COMMENT_SELECT = `*, author:profiles!comments_author_id_fkey(${AUTHOR_V2})` as '*'
export const PAGE = 20

let schemaCheck: Promise<void> | null = null
/** Falls back to the pre-wave-2 author columns when the DB doesn't have them yet. */
export function ensureSchema(): Promise<void> {
  schemaCheck ??= (async () => {
    const { error } = await useSupabase().from('profiles').select('first_grow').limit(0)
    if (error?.code === '42703') {
      POST_SELECT = postSelect(AUTHOR_V1) as '*'
      COMMENT_SELECT = `*, author:profiles!comments_author_id_fkey(${AUTHOR_V1})` as '*'
    }
  })().catch(() => {})
  return schemaCheck
}

export const isHelp = (p: Pick<Post, 'category'>) => HELP_CATEGORIES.includes(p.category)
export const isSolved = (p: Pick<Post, 'status' | 'accepted_comment_id'>) => p.status === 'solved' || !!p.accepted_comment_id
export const reactionCount = (p: Post, k: ReactionKind) => p.reactions?.[k] ?? (k === 'like' && !p.reactions ? p.likes_count : 0)

/** Keyset cursor on (created_at desc, id desc). */
export interface Cursor { at: string, id: string }
export function keysetOr(c: Cursor, at = 'created_at', id = 'id'): string {
  return `${at}.lt."${c.at}",and(${at}.eq."${c.at}",${id}.lt.${c.id})`
}

export const shareUrl = (id: string) => `https://budbuddy.hribal.site/community/post/${id}`

export function authorName(a: Author | null | undefined): string {
  return a?.display_name?.trim() || a?.username || '?'
}

// ── Reputation levels ──────────────────────────────────────────────

export function repLevel(rep: number) {
  const l = growerLevel(rep)
  return { ...l, key: l.id }
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

export type ErrorKind = 'rate' | 'banned' | 'offline' | 'generic' | 'contact' | 'sale'

export function errorKind(e: { message: string, code?: string } | Error | null | undefined, banned = false): ErrorKind {
  const msg = (e?.message ?? '').toLowerCase()
  const blocked = msg.match(/content_blocked:\s*(contact|sale)/)
  if (blocked) return blocked[1] as 'contact' | 'sale'
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
