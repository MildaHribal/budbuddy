import { locale } from '~/utils/locale'
import { isGlyphName } from '~/utils/glyphs'

export interface BadgeDef {
  id: string
  name_en: string
  name_cs: string | null
  desc_en: string
  desc_cs: string | null
  glyph: string | null
  tier: number
}
export interface EarnedBadge { badge_id: string, earned_at: string }

const catalog = shallowRef<BadgeDef[]>([])
let catalogP: Promise<BadgeDef[]> | null = null
/** badge waiting for the one-time celebration sheet */
const celebrate = shallowRef<(BadgeDef & { earned_at: string }) | null>(null)

const SEEN_KEY = (uid: string) => `budbuddy:badges-seen:${uid}`
const CELEBRATE_DAYS = 14
export const MAX_PINNED = 3

function readSeen(uid: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY(uid))
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return new Set()
  }
}
function writeSeen(uid: string, ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY(uid), JSON.stringify([...ids]))
  } catch { /* storage unavailable */ }
}

export function pinErrorKey(message: string | undefined): string {
  return /only pin badges you have earned/i.test(message ?? '') ? 'profile.badges.pinEarned' : 'profile.badges.pinFailed'
}

export function badgeName(b: BadgeDef): string {
  return (locale.value === 'cs' && b.name_cs) || b.name_en
}
export function badgeDesc(b: BadgeDef): string {
  return (locale.value === 'cs' && b.desc_cs) || b.desc_en
}
export function badgeGlyph(b: Pick<BadgeDef, 'glyph'> | null | undefined): string {
  // only GrowIcon glyphs: tabler names from the DB wouldn't be in the offline icon bundle
  return b?.glyph && isGlyphName(b.glyph) ? b.glyph : 'i-tabler-award'
}
export function badgeColor(tier: number | null | undefined): string {
  if ((tier ?? 1) >= 3) return '#c9a2ff'
  if ((tier ?? 1) === 2) return 'var(--lamp)'
  return 'var(--leaf)'
}

/** Badge catalogue + per-user earned badges. Tables may be missing on old DBs → empty lists. */
export function useBadges() {
  const sb = useSupabase()

  function loadCatalog(): Promise<BadgeDef[]> {
    catalogP ??= (async () => {
      const { data, error } = await sb.from('badges').select('id, name_en, name_cs, desc_en, desc_cs, glyph, tier').order('tier').order('id')
      if (error) {
        catalogP = null
        return []
      }
      catalog.value = (data ?? []) as BadgeDef[]
      return catalog.value
    })()
    return catalogP
  }

  async function loadEarned(uid: string): Promise<EarnedBadge[]> {
    const { data, error } = await sb.from('user_badges').select('badge_id, earned_at').eq('user_id', uid).order('earned_at', { ascending: false })
    return error ? [] : (data ?? []) as EarnedBadge[]
  }

  /** null on success, else a profile.badges.* message key */
  async function savePinned(uid: string, ids: string[]): Promise<string | null> {
    const { error } = await sb.from('profiles').update({ pinned_badges: ids.slice(0, MAX_PINNED) }).eq('id', uid)
    if (!error) return null
    return pinErrorKey(error.message)
  }

  const byId = (id: string | null | undefined) => catalog.value.find(b => b.id === id) ?? null

  /** Queues the newest recently earned badge not yet celebrated on this device. */
  async function checkCelebration(uid: string) {
    if (celebrate.value) return
    const [defs, earned] = await Promise.all([loadCatalog(), loadEarned(uid)])
    if (!defs.length) return
    const cutoff = Date.now() - CELEBRATE_DAYS * 86400e3
    const seen = readSeen(uid) ?? new Set(earned.filter(e => new Date(e.earned_at).getTime() <= cutoff).map(e => e.badge_id))
    const next = earned.find(e => !seen.has(e.badge_id) && new Date(e.earned_at).getTime() > cutoff)
    const def = next && defs.find(d => d.id === next.badge_id)
    if (def && next) celebrate.value = { ...def, earned_at: next.earned_at }
  }

  function markCelebrated(uid: string, id: string) {
    const seen = readSeen(uid) ?? new Set<string>()
    seen.add(id)
    writeSeen(uid, seen)
    if (celebrate.value?.id === id) celebrate.value = null
  }

  return { catalog, celebrate, loadCatalog, loadEarned, savePinned, byId, checkCelebration, markCelebrated }
}
