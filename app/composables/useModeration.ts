export type ModTarget = 'post' | 'comment' | 'tip' | 'profile' | 'plant' | 'strain' | 'entry'
export type ModHideable = 'post' | 'comment' | 'tip' | 'plant' | 'entry'

export interface ModPreview {
  type: ModTarget
  id: string
  title: string | null
  text: string | null
  image: string | null
  authorId: string | null
  isHidden: boolean
  createdAt: string | null
}

interface Spec {
  table: string
  select: string
  author: string | null
  hideable: boolean
  map: (r: Record<string, unknown>) => Pick<ModPreview, 'title' | 'text' | 'image'>
}

const s = (v: unknown) => (typeof v === 'string' && v ? v : null)

export const MOD_TARGETS: Record<ModTarget, Spec> = {
  post: { table: 'posts', select: 'id, title, body, images, author_id, is_hidden, created_at', author: 'author_id', hideable: true, map: r => ({ title: s(r.title), text: s(r.body), image: (r.images as string[] | null)?.[0] ?? null }) },
  comment: { table: 'comments', select: 'id, body, author_id, is_hidden, created_at', author: 'author_id', hideable: true, map: r => ({ title: null, text: s(r.body), image: null }) },
  tip: { table: 'tips', select: 'id, body, author_id, is_hidden, created_at', author: 'author_id', hideable: true, map: r => ({ title: null, text: s(r.body), image: null }) },
  profile: { table: 'profiles', select: 'id, username, display_name, bio, avatar_url, created_at', author: 'id', hideable: false, map: r => ({ title: s(r.display_name) ?? s(r.username), text: s(r.bio), image: s(r.avatar_url) }) },
  plant: { table: 'public_plants', select: 'id, name, strain, cover_url, owner_id, is_hidden, created_at', author: 'owner_id', hideable: true, map: r => ({ title: s(r.name), text: s(r.strain), image: s(r.cover_url) }) },
  strain: { table: 'strains', select: 'id, name, description, image_url, created_by, created_at', author: 'created_by', hideable: false, map: r => ({ title: s(r.name), text: s(r.description), image: s(r.image_url) }) },
  entry: { table: 'challenge_entries', select: 'id, caption, image_url, user_id, is_hidden, created_at', author: 'user_id', hideable: true, map: r => ({ title: null, text: s(r.caption), image: s(r.image_url) }) }
}

export const MOD_HIDEABLE: ModHideable[] = ['post', 'comment', 'tip', 'plant', 'entry']

function toPreview(type: ModTarget, r: Record<string, unknown>): ModPreview {
  const spec = MOD_TARGETS[type]
  return {
    type,
    id: r.id as string,
    ...spec.map(r),
    authorId: spec.author ? s(r[spec.author]) : null,
    isHidden: r.is_hidden === true,
    createdAt: s(r.created_at)
  }
}

export interface ModAuthor { id: string, username: string, display_name: string | null, avatar_url: string | null, is_banned: boolean, is_admin: boolean }

const MEDIA_COLS: Partial<Record<ModTarget, string>> = {
  post: 'images',
  plant: 'cover_url, timeline',
  entry: 'image_url'
}

/** Storage paths of media URLs found in a row (post images, plant cover + timeline photos, entry image). */
export function mediaPaths(row: Record<string, unknown> | null): string[] {
  if (!row) return []
  const urls: unknown[] = []
  for (const v of Object.values(row)) {
    if (Array.isArray(v)) for (const x of v) urls.push(typeof x === 'object' && x ? (x as { photoUrl?: unknown }).photoUrl : x)
    else urls.push(v)
  }
  const out = new Set<string>()
  for (const u of urls) {
    if (typeof u !== 'string') continue
    const i = u.indexOf(MEDIA_MARK)
    if (i >= 0) out.add(decodeURIComponent(u.slice(i + MEDIA_MARK.length).split('?')[0]!))
  }
  return [...out]
}
const MEDIA_MARK = '/object/public/media/'

export function useModeration() {
  const sb = useSupabase()

  async function fetchTargets(type: ModTarget, ids: string[]): Promise<Map<string, ModPreview>> {
    const out = new Map<string, ModPreview>()
    if (!ids.length) return out
    const spec = MOD_TARGETS[type]
    const { data, error } = await sb.from(spec.table).select(spec.select).in('id', ids)
    if (error) throw error
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) out.set(r.id as string, toPreview(type, r))
    return out
  }

  async function fetchHidden(type: ModHideable, limit = 50): Promise<ModPreview[]> {
    const spec = MOD_TARGETS[type]
    const { data, error } = await sb.from(spec.table).select(spec.select).eq('is_hidden', true)
      .order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(r => toPreview(type, r))
  }

  async function fetchAuthors(ids: (string | null)[]): Promise<Map<string, ModAuthor>> {
    const uniq = [...new Set(ids.filter((x): x is string => !!x))]
    const out = new Map<string, ModAuthor>()
    if (!uniq.length) return out
    const { data, error } = await sb.from('profiles').select('id, username, display_name, avatar_url, is_banned, is_admin').in('id', uniq)
    if (error) throw error
    for (const p of (data ?? []) as ModAuthor[]) out.set(p.id, p)
    return out
  }

  async function setHidden(type: ModTarget, id: string, hidden: boolean) {
    if (!MOD_TARGETS[type].hideable) return
    const { error } = await sb.from(MOD_TARGETS[type].table).update({ is_hidden: hidden }).eq('id', id)
    if (error) throw error
  }

  /** Deletes the content and, best effort, the photos it uploaded. */
  async function deleteTarget(type: ModTarget, id: string) {
    if (type === 'profile') return
    const cols = MEDIA_COLS[type]
    const { data } = cols ? await sb.from(MOD_TARGETS[type].table).select(cols).eq('id', id).maybeSingle() : { data: null }
    const { error } = await sb.from(MOD_TARGETS[type].table).delete().eq('id', id)
    if (error) throw error
    const paths = mediaPaths(data as Record<string, unknown> | null)
    if (paths.length) await sb.storage.from('media').remove(paths).catch(() => {})
  }

  async function setBanned(userId: string, banned: boolean) {
    const { error } = await sb.from('profiles').update({ is_banned: banned }).eq('id', userId)
    if (error) throw error
  }

  async function closeReports(type: ModTarget, id: string, status: 'resolved' | 'dismissed') {
    const me = useAuth().user.value?.id ?? null
    const { error } = await sb.from('reports').update({ status, resolved_by: me })
      .eq('target_type', type).eq('target_id', id).eq('status', 'open')
    if (error) throw error
  }

  return { fetchTargets, fetchHidden, fetchAuthors, setHidden, deleteTarget, setBanned, closeReports }
}
