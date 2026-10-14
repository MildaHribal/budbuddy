import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { effectScope, watch } from 'vue'
import { haptic } from '~/utils/haptics'
import { contentIssue } from './content'
import { errorKind, isDemoPost, shareUrl, storagePath, type Post, type ReactionKind } from './feed'

// Shared across the feed, detail and saved pages so state stays in sync.
const mine = ref(new Map<string, ReadonlySet<ReactionKind>>())
const saved = ref(new Set<string>())
/** null = unknown, false = post_reactions not deployed yet (fall back to post_likes) */
let reactionsTable: boolean | null = null
let scoped = false

const missingTable = (e: { code?: string } | null) => e?.code === 'PGRST205' || e?.code === '42P01'

export function useFeedActions() {
  const { t } = useI18n()
  const { user, profile, requireAuth } = useAuth()
  const { notify } = useNotify()
  const { confirm } = useConfirm()

  if (!scoped) {
    scoped = true
    // Never show the previous account's reactions or saves (M4).
    effectScope(true).run(() => watch(() => user.value?.id ?? null, () => {
      mine.value = new Map()
      saved.value = new Set()
    }))
  }

  function fail(e: { message: string, code?: string } | Error | null | undefined) {
    const kind = errorKind(e, profile.value?.is_banned)
    if (kind === 'contact' || kind === 'sale') {
      notify(t(`feed.blocked.${kind}`), { tone: 'error', icon: 'i-tabler-shield-x', duration: 6000 })
      return
    }
    notify(t(`feed.err.${kind}`), { tone: 'error' })
  }

  /** Lenient pre-check; resolves true when the text may be sent. */
  async function preCheck(...texts: (string | null | undefined)[]): Promise<boolean> {
    const issue = contentIssue(...texts)
    if (!issue) return true
    return confirm({ title: t(`feed.precheck.${issue}Title`), message: t(`feed.precheck.${issue}Text`), confirmLabel: t('feed.precheck.sendAnyway') })
  }

  async function fetchReactions(uid: string, ids: string[]) {
    const sb = useSupabase()
    if (reactionsTable !== false) {
      const { data, error } = await sb.from('post_reactions').select('post_id, kind').eq('user_id', uid).in('post_id', ids)
      if (!error) {
        reactionsTable = true
        return (data ?? []) as { post_id: string, kind: ReactionKind }[]
      }
      if (!missingTable(error)) return null
      reactionsTable = false
    }
    const { data, error } = await sb.from('post_likes').select('post_id').eq('user_id', uid).in('post_id', ids)
    return error ? null : (data ?? []).map(r => ({ post_id: r.post_id as string, kind: 'like' as const }))
  }

  /** Loads my reactions and saves for these posts. */
  async function loadMine(ids: string[]) {
    ids = ids.filter(id => !isDemoPost(id))
    const uid = user.value?.id
    if (!uid) {
      mine.value = new Map()
      saved.value = new Set()
      return
    }
    if (!ids.length) return
    const [r, s] = await Promise.all([
      fetchReactions(uid, ids),
      useSupabase().from('saves').select('post_id').eq('user_id', uid).in('post_id', ids)
    ])
    if (user.value?.id !== uid) return
    if (r) {
      const next = new Map(mine.value)
      for (const id of ids) next.delete(id)
      for (const row of r) next.set(row.post_id, new Set([...(next.get(row.post_id) ?? []), row.kind]))
      mine.value = next
    }
    if (!s.error) {
      const ns = new Set(saved.value)
      for (const id of ids) ns.delete(id)
      for (const row of s.data ?? []) ns.add(row.post_id as string)
      saved.value = ns
    }
  }

  const has = (postId: string, kind: ReactionKind) => !!mine.value.get(postId)?.has(kind)

  function sample(post: Post): boolean {
    if (!isDemoPost(post.id)) return false
    notify(t('feed.demo.readOnly'), { tone: 'info', icon: 'i-tabler-flask-2' })
    return true
  }

  function apply(post: Post, kind: ReactionKind, on: boolean) {
    const set = new Set(mine.value.get(post.id) ?? [])
    if (on) set.add(kind)
    else set.delete(kind)
    const next = new Map(mine.value)
    next.set(post.id, set)
    mine.value = next
    const d = on ? 1 : -1
    post.likes_count = Math.max(0, post.likes_count + d)
    const r = { ...(post.reactions ?? {}) }
    r[kind] = Math.max(0, (r[kind] ?? 0) + d)
    post.reactions = r
  }

  /** Optimistic toggle with rollback; resolves to the new state. */
  async function toggleReaction(post: Post, kind: ReactionKind): Promise<boolean> {
    if (sample(post)) return has(post.id, kind)
    if (!requireAuth() || !user.value) return has(post.id, kind)
    const uid = user.value.id
    const on = !has(post.id, kind)
    apply(post, kind, on)
    if (on) haptic('tap')
    const sb = useSupabase()
    const run = async () => {
      if (reactionsTable === false) {
        if (kind !== 'like') return { error: { message: 'unsupported', code: 'PGRST205' } }
        return on
          ? sb.from('post_likes').insert({ user_id: uid, post_id: post.id })
          : sb.from('post_likes').delete().eq('user_id', uid).eq('post_id', post.id)
      }
      return on
        ? sb.from('post_reactions').insert({ user_id: uid, post_id: post.id, kind })
        : sb.from('post_reactions').delete().eq('user_id', uid).eq('post_id', post.id).eq('kind', kind)
    }
    let { error } = await run()
    if (error && missingTable(error) && reactionsTable !== false) {
      reactionsTable = false
      ;({ error } = await run())
    }
    if (error && error.code !== '23505') {
      apply(post, kind, !on)
      fail(error)
      return !on
    }
    return on
  }

  function setSaved(id: string, on: boolean) {
    const next = new Set(saved.value)
    if (on) next.add(id)
    else next.delete(id)
    saved.value = next
  }

  async function toggleSave(post: Post) {
    if (sample(post)) return
    if (!requireAuth() || !user.value) return
    const on = !saved.value.has(post.id)
    setSaved(post.id, on)
    const sb = useSupabase()
    const { error } = on
      ? await sb.from('saves').insert({ user_id: user.value.id, post_id: post.id })
      : await sb.from('saves').delete().eq('user_id', user.value.id).eq('post_id', post.id)
    if (error && error.code !== '23505') {
      setSaved(post.id, !on)
      fail(error)
      return
    }
    notify(t(on ? 'feed.saved' : 'feed.unsaved'), { tone: 'info', icon: on ? 'i-tabler-bookmark-filled' : 'i-tabler-bookmark' })
  }

  async function share(post: Post) {
    if (sample(post)) return
    const url = shareUrl(post.id)
    const title = post.title || t('feed.shareTitle')
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title, text: title, url, dialogTitle: t('feed.share') })
      } else if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        notify(t('feed.linkCopied'), { tone: 'info', icon: 'i-tabler-link' })
      }
    } catch (e) {
      if (!/cancel|abort/i.test(String(e))) notify(t('feed.err.generic'), { tone: 'error' })
    }
  }

  async function deletePost(post: Post): Promise<boolean> {
    const ok = await confirm({ title: t('feed.deletePostTitle'), message: t('feed.deletePostText'), confirmLabel: t('feed.delete'), danger: true })
    if (!ok) return false
    const sb = useSupabase()
    const { error } = await sb.from('posts').delete().eq('id', post.id)
    if (error) {
      fail(error)
      return false
    }
    const paths = post.images.map(storagePath).filter((p): p is string => !!p)
    if (paths.length) sb.storage.from('media').remove(paths).catch(() => {})
    notify(t('feed.deleted'), { tone: 'info' })
    return true
  }

  return { mine, saved, has, loadMine, toggleReaction, toggleSave, share, deletePost, fail, preCheck }
}
