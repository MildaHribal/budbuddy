<script setup lang="ts">
import { useFeedActions } from '~/utils/feed/actions'
import { authorName, COMMENT_SELECT, POST_SELECT, type Comment, type Post } from '~/utils/feed/feed'
import { haptic } from '~/utils/haptics'

definePageMeta({ hideNav: true })

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { user, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { notify } = useNotify()
const { confirm } = useConfirm()
const { loadMine, fail } = useFeedActions()

const id = computed(() => String(route.params.id))
const post = ref<Post | null>(null)
const status = ref<'loading' | 'ok' | 'missing' | 'error'>('loading')
const comments = ref<Comment[]>([])
const likedComments = ref(new Set<string>())

useHead({ title: () => post.value?.title || t('feed.detail.title') })

async function load() {
  status.value = 'loading'
  const sb = useSupabase()
  const [p, c] = await Promise.all([
    sb.from('posts').select(POST_SELECT).eq('id', id.value).maybeSingle(),
    sb.from('comments').select(COMMENT_SELECT).eq('post_id', id.value).order('created_at', { ascending: true }).limit(500)
  ])
  if (p.error || c.error) {
    status.value = p.error?.code === '22P02' ? 'missing' : 'error'
    return
  }
  if (!p.data) {
    status.value = 'missing'
    return
  }
  post.value = p.data as Post
  comments.value = (c.data ?? []) as Comment[]
  status.value = 'ok'
  loadMine([post.value.id])
  loadCommentLikes()
  if (route.hash === '#comments' || route.hash.startsWith('#c-')) {
    await nextTick()
    const el = document.getElementById(route.hash.slice(1)) ?? document.getElementById('comments')
    el?.scrollIntoView({ block: route.hash === '#comments' ? 'start' : 'center' })
  }
}

async function loadCommentLikes() {
  const uid = user.value?.id
  const ids = comments.value.map(c => c.id)
  if (!uid || !ids.length) return
  const { data } = await useSupabase().from('comment_likes').select('comment_id').eq('user_id', uid).in('comment_id', ids)
  likedComments.value = new Set((data ?? []).map(r => r.comment_id as string))
}

onMounted(() => {
  loadBlocks()
  load()
})
watch(id, load)
watch(() => user.value?.id, () => {
  loadBlocks()
  loadCommentLikes()
  if (post.value) loadMine([post.value.id])
})

// ── Threads ────────────────────────────────────────────────────────

const shown = computed(() => comments.value.filter(c => !isBlocked(c.author_id)))
const byId = computed(() => new Map(comments.value.map(c => [c.id, c])))

function rootOf(c: Comment): string {
  let cur = c
  for (let i = 0; i < 10 && cur.parent_id; i++) {
    const parent = byId.value.get(cur.parent_id)
    if (!parent) break
    cur = parent
  }
  return cur.id
}

const threads = computed(() => {
  const accepted = post.value?.accepted_comment_id
  const tops = shown.value.filter(c => !c.parent_id || !byId.value.has(c.parent_id))
  const replies = new Map<string, Comment[]>()
  for (const c of shown.value) {
    if (!c.parent_id || !byId.value.has(c.parent_id)) continue
    const root = rootOf(c)
    if (!replies.has(root)) replies.set(root, [])
    replies.get(root)!.push(c)
  }
  const list = tops.map(c => ({ comment: c, replies: replies.get(c.id) ?? [] }))
  const i = list.findIndex(x => x.comment.id === accepted)
  if (i > 0) list.unshift(...list.splice(i, 1))
  return list
})

/** accepted answer that is a reply: pinned on top as well */
const pinned = computed(() => {
  const a = post.value?.accepted_comment_id
  const c = a ? byId.value.get(a) : null
  return c && c.parent_id && !isBlocked(c.author_id) ? c : null
})

const isOwner = computed(() => !!user.value && user.value.id === post.value?.author_id)
const isQuestion = computed(() => post.value?.category === 'question')
const canAccept = (c: Comment) => isOwner.value && isQuestion.value && c.author_id !== user.value?.id

// ── Comment actions ────────────────────────────────────────────────

async function likeComment(c: Comment) {
  if (!requireAuth() || !user.value) return
  const on = !likedComments.value.has(c.id)
  const apply = (v: boolean) => {
    const next = new Set(likedComments.value)
    if (v) next.add(c.id)
    else next.delete(c.id)
    likedComments.value = next
    c.likes_count = Math.max(0, c.likes_count + (v ? 1 : -1))
  }
  apply(on)
  if (on) haptic('tap')
  const sb = useSupabase()
  const { error } = on
    ? await sb.from('comment_likes').insert({ user_id: user.value.id, comment_id: c.id })
    : await sb.from('comment_likes').delete().eq('user_id', user.value.id).eq('comment_id', c.id)
  if (error && error.code !== '23505') {
    apply(!on)
    fail(error)
  }
}

async function accept(c: Comment) {
  const p = post.value
  if (!p || !requireAuth()) return
  const prev = p.accepted_comment_id
  const next = prev === c.id ? null : c.id
  p.accepted_comment_id = next
  const { error } = await useSupabase().from('posts').update({ accepted_comment_id: next }).eq('id', p.id)
  if (error) {
    p.accepted_comment_id = prev
    fail(error)
    return
  }
  if (next) notify(t('feed.detail.bestMarked'), { icon: 'i-tabler-circle-check' })
}

async function removeComment(c: Comment) {
  const ok = await confirm({ title: t('feed.detail.deleteCommentTitle'), confirmLabel: t('feed.delete'), danger: true })
  if (!ok) return
  const { error } = await useSupabase().from('comments').delete().eq('id', c.id)
  if (error) {
    fail(error)
    return
  }
  // replies cascade in the DB
  const gone = new Set([c.id, ...comments.value.filter(x => x.parent_id && rootOf(x) === c.id).map(x => x.id)])
  comments.value = comments.value.filter(x => !gone.has(x.id))
  if (post.value) {
    post.value.comments_count = Math.max(0, post.value.comments_count - gone.size)
    if (post.value.accepted_comment_id && gone.has(post.value.accepted_comment_id)) post.value.accepted_comment_id = null
  }
  notify(t('feed.detail.commentDeleted'), { tone: 'info' })
}

async function saveComment(c: Comment, body: string) {
  const prev = c.body
  c.body = body
  const { error } = await useSupabase().from('comments').update({ body }).eq('id', c.id)
  if (error) {
    c.body = prev
    fail(error)
  }
}

// ── Composer ───────────────────────────────────────────────────────

const draft = ref('')
const replyTo = ref<Comment | null>(null)
const sending = ref(false)
const input = ref<HTMLTextAreaElement | null>(null)

function startReply(c: Comment) {
  if (!requireAuth()) return
  replyTo.value = c
  input.value?.focus()
}

function focusComposer() {
  if (!requireAuth()) return
  input.value?.focus()
}

async function send() {
  const p = post.value
  const body = draft.value.trim()
  if (!p || !body || sending.value) return
  if (!requireAuth() || !user.value) return
  sending.value = true
  const parent = replyTo.value ? rootOf(replyTo.value) : null
  const { data, error } = await useSupabase().from('comments')
    .insert({ post_id: p.id, author_id: user.value.id, parent_id: parent, body })
    .select(COMMENT_SELECT).single()
  sending.value = false
  if (error || !data) {
    fail(error)
    return
  }
  comments.value.push(data as Comment)
  p.comments_count++
  draft.value = ''
  replyTo.value = null
  haptic('success')
  await nextTick()
  document.getElementById(`c-${(data as Comment).id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

// ── Post actions ───────────────────────────────────────────────────

const composerOpen = ref(false)
function onSaved(p: Post) {
  post.value = p
}
function onDeleted() {
  if (window.history.state?.back) router.back()
  else router.replace('/community')
}
</script>

<template>
  <div class="detail-root">
    <AppHeader
      :title="t('feed.detail.title')"
      back
    />

    <div
      v-if="status === 'loading'"
      class="page"
    >
      <CommunityFeedPostSkeleton photo />
    </div>

    <div
      v-else-if="status !== 'ok' || !post || isBlocked(post.author_id)"
      class="page"
    >
      <EmptyState
        :icon="status === 'error' ? 'pest' : 'community'"
        :title="status === 'error' ? t('feed.loadError') : post && isBlocked(post.author_id) ? t('feed.detail.blocked') : t('feed.detail.notFound')"
        :text="status === 'error' ? t('feed.err.offline') : post && isBlocked(post.author_id) ? t('feed.detail.blockedText') : t('feed.detail.notFoundText')"
      >
        <button
          v-if="status === 'error'"
          type="button"
          class="btn btn-soft"
          @click="load"
        >
          <UIcon name="i-tabler-refresh" /> {{ t('feed.retry') }}
        </button>
        <NuxtLink
          v-else
          to="/community"
          class="btn btn-soft"
        >
          {{ t('feed.detail.back') }}
        </NuxtLink>
      </EmptyState>
    </div>

    <template v-else>
      <div class="page post-page">
        <CommunityFeedPostCard
          :post="post"
          detail
          @edit="composerOpen = true"
          @deleted="onDeleted"
          @comment="focusComposer"
        />

        <section
          id="comments"
          class="comments"
        >
          <div class="section-head">
            <h2 class="section-title">
              <UIcon name="i-tabler-message-circle" />
              {{ t('feed.detail.comments') }}
            </h2>
            <span class="section-meta num">{{ post.comments_count }}</span>
          </div>

          <div
            v-if="pinned"
            :id="`c-${pinned.id}-pin`"
            class="pinned"
          >
            <CommunityFeedCommentItem
              :comment="pinned"
              :liked="likedComments.has(pinned.id)"
              accepted
              :can-accept="canAccept(pinned)"
              @like="likeComment(pinned)"
              @reply="startReply(pinned)"
              @delete="removeComment(pinned)"
              @accept="accept(pinned)"
              @save="saveComment(pinned, $event)"
            />
          </div>

          <p
            v-if="!threads.length"
            class="muted none"
          >
            {{ t('feed.detail.noComments') }}
          </p>

          <div
            v-for="th in threads"
            :key="th.comment.id"
            class="thread"
          >
            <CommunityFeedCommentItem
              :id="`c-${th.comment.id}`"
              :comment="th.comment"
              :liked="likedComments.has(th.comment.id)"
              :accepted="post.accepted_comment_id === th.comment.id"
              :can-accept="canAccept(th.comment)"
              @like="likeComment(th.comment)"
              @reply="startReply(th.comment)"
              @delete="removeComment(th.comment)"
              @accept="accept(th.comment)"
              @save="saveComment(th.comment, $event)"
            />
            <div
              v-if="th.replies.length"
              class="replies"
            >
              <CommunityFeedCommentItem
                v-for="r in th.replies"
                :id="`c-${r.id}`"
                :key="r.id"
                :comment="r"
                reply
                :liked="likedComments.has(r.id)"
                :accepted="post.accepted_comment_id === r.id"
                :can-accept="canAccept(r)"
                @like="likeComment(r)"
                @reply="startReply(r)"
                @delete="removeComment(r)"
                @accept="accept(r)"
                @save="saveComment(r, $event)"
              />
            </div>
          </div>
        </section>
      </div>

      <form
        class="composer"
        @submit.prevent="send"
      >
        <div
          v-if="replyTo"
          class="replying"
        >
          <UIcon name="i-tabler-corner-down-right" />
          <span>{{ t('feed.detail.replyingTo', { name: replyTo.is_ai ? t('feed.detail.ai') : authorName(replyTo.author) }) }}</span>
          <button
            type="button"
            class="icon-btn cancel"
            :aria-label="t('feed.detail.cancelReply')"
            @click="replyTo = null"
          >
            <UIcon name="i-tabler-x" />
          </button>
        </div>
        <div class="composer-row">
          <textarea
            ref="input"
            v-model="draft"
            class="composer-input"
            rows="1"
            maxlength="2000"
            lang="en"
            enterkeyhint="send"
            :placeholder="isQuestion ? t('feed.detail.writeAnswer') : t('feed.detail.writeComment')"
            :aria-label="isQuestion ? t('feed.detail.writeAnswer') : t('feed.detail.writeComment')"
            @focus="!user && requireAuth()"
          />
          <button
            type="submit"
            class="send"
            :disabled="!draft.trim() || sending"
            :aria-label="t('feed.detail.send')"
          >
            <UIcon :name="sending ? 'i-tabler-loader-2' : 'i-tabler-arrow-up'" />
          </button>
        </div>
      </form>

      <CommunityFeedComposer
        v-model:open="composerOpen"
        :post="post"
        @saved="onSaved"
      />
    </template>
  </div>
</template>

<style scoped>
.detail-root {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.post-page {
  flex: 1;
  gap: 22px;
  padding-top: 4px;
}

.comments {
  display: flex;
  flex-direction: column;
}

.section-head {
  margin-bottom: 2px;
}

.none {
  margin: 8px 0 0;
  font-size: 14px;
}

.pinned {
  margin: 0 12px 6px;
}

.thread {
  border-bottom: 1px solid var(--line);
  padding-bottom: 4px;
}

.thread:last-child {
  border-bottom: 0;
}

.replies {
  margin-left: 22px;
  padding-left: 14px;
  border-left: 1px solid var(--line-strong);
}

.composer {
  position: sticky;
  bottom: 0;
  z-index: 10;
  padding: 10px 20px calc(10px + var(--safe-bottom));
  background: linear-gradient(180deg, rgba(11, 13, 16, 0.96) 0%, #07080a 100%);
  border-top: 1px solid var(--line);
  box-shadow: 0 -12px 24px -12px rgba(0, 0, 0, 0.7);
}

:global(html.kb-open) .composer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--kb, 0px);
  padding-bottom: 10px;
}

:global(html.kb-open) .post-page {
  padding-bottom: 120px;
}

.replying {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -4px 0 6px;
  font-size: 12px;
  color: var(--text-2);
}

.replying span {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.replying .cancel {
  width: 36px;
  height: 36px;
  font-size: 16px;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--text-3);
}

.composer-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 4px 4px 4px 14px;
  border-radius: 22px;
  border: 1px solid var(--line-strong);
  background: #0b0d10;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
  transition: border-color var(--dur) ease, box-shadow var(--dur) ease;
}

.composer-row:focus-within {
  border-color: var(--leaf);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5), 0 0 0 3px rgba(155, 227, 107, 0.14);
}

.composer-input {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  max-height: 140px;
  padding: 9px 0;
  border: 0;
  background: none;
  color: var(--text);
  font-size: 16px;
  line-height: 1.4;
  resize: none;
  outline: none;
  field-sizing: content;
}

.composer-input::placeholder {
  color: #6b7669;
}

.send {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(180deg, #b3ef87 0%, var(--leaf) 55%, #86d257 100%);
  color: var(--on-accent);
  font-size: 20px;
  transition: transform var(--dur-fast) var(--ease-out), opacity var(--dur) ease;
}

.send:disabled {
  opacity: 0.35;
}

.send:active:not(:disabled) {
  transform: scale(0.92);
}
</style>
