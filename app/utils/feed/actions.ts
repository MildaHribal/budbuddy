import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { haptic } from '~/utils/haptics'
import { errorKind, shareUrl, storagePath, type Post } from './feed'

// Shared across the feed, detail and saved pages so state stays in sync.
const liked = ref(new Set<string>())
const saved = ref(new Set<string>())

export function useFeedActions() {
  const { t } = useI18n()
  const { user, profile, requireAuth } = useAuth()
  const { notify } = useNotify()

  function fail(e: { message: string, code?: string } | Error | null | undefined) {
    notify(t(`feed.err.${errorKind(e, profile.value?.is_banned)}`), { tone: 'error' })
  }

  /** Loads which of these posts I liked / saved. */
  async function loadMine(ids: string[]) {
    const uid = user.value?.id
    if (!uid || !ids.length) return
    const sb = useSupabase()
    const [l, s] = await Promise.all([
      sb.from('post_likes').select('post_id').eq('user_id', uid).in('post_id', ids),
      sb.from('saves').select('post_id').eq('user_id', uid).in('post_id', ids)
    ])
    const nl = new Set(liked.value)
    const ns = new Set(saved.value)
    for (const id of ids) {
      nl.delete(id)
      ns.delete(id)
    }
    for (const r of l.data ?? []) nl.add(r.post_id as string)
    for (const r of s.data ?? []) ns.add(r.post_id as string)
    liked.value = nl
    saved.value = ns
  }

  function setIn(set: typeof liked, id: string, on: boolean) {
    const next = new Set(set.value)
    if (on) next.add(id)
    else next.delete(id)
    set.value = next
  }

  async function toggleLike(post: Post): Promise<boolean> {
    if (!requireAuth() || !user.value) return false
    const on = !liked.value.has(post.id)
    setIn(liked, post.id, on)
    post.likes_count = Math.max(0, post.likes_count + (on ? 1 : -1))
    if (on) haptic('tap')
    const sb = useSupabase()
    const { error } = on
      ? await sb.from('post_likes').insert({ user_id: user.value.id, post_id: post.id })
      : await sb.from('post_likes').delete().eq('user_id', user.value.id).eq('post_id', post.id)
    if (error && error.code !== '23505') {
      setIn(liked, post.id, !on)
      post.likes_count = Math.max(0, post.likes_count + (on ? -1 : 1))
      fail(error)
      return false
    }
    return on
  }

  async function toggleSave(post: Post) {
    if (!requireAuth() || !user.value) return
    const on = !saved.value.has(post.id)
    setIn(saved, post.id, on)
    const sb = useSupabase()
    const { error } = on
      ? await sb.from('saves').insert({ user_id: user.value.id, post_id: post.id })
      : await sb.from('saves').delete().eq('user_id', user.value.id).eq('post_id', post.id)
    if (error && error.code !== '23505') {
      setIn(saved, post.id, !on)
      fail(error)
      return
    }
    notify(t(on ? 'feed.saved' : 'feed.unsaved'), { tone: 'info', icon: on ? 'i-tabler-bookmark-filled' : 'i-tabler-bookmark' })
  }

  async function share(post: Post) {
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
    const { confirm } = useConfirm()
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

  return { liked, saved, loadMine, toggleLike, toggleSave, share, deletePost, fail }
}
