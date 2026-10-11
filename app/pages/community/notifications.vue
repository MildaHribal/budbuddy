<script setup lang="ts">
type Kind = 'like' | 'comment' | 'reply' | 'follow' | 'accepted' | 'tip_vote' | 'challenge' | 'moderation'
interface Actor { id: string, username: string, display_name: string | null, avatar_url: string | null }
interface Row {
  id: string
  type: Kind
  actor_id: string | null
  post_id: string | null
  comment_id: string | null
  read_at: string | null
  created_at: string
  actor: Actor | null
  post: { id: string, title: string | null, body: string } | null
}

const PAGE = 20
const NuxtLink = resolveComponent('NuxtLink')
const GLYPH: Record<Kind, { icon: string, color: string }> = {
  like: { icon: 'i-tabler-heart-filled', color: '#ff8fb8' },
  comment: { icon: 'i-tabler-message-circle', color: '#7cc8f2' },
  reply: { icon: 'i-tabler-arrow-back-up', color: '#7cc8f2' },
  follow: { icon: 'i-tabler-user-plus', color: '#9be36b' },
  accepted: { icon: 'i-tabler-circle-check', color: '#9be36b' },
  tip_vote: { icon: 'i-tabler-thumb-up', color: '#9be36b' },
  challenge: { icon: 'i-tabler-trophy', color: '#ffd28a' },
  moderation: { icon: 'i-tabler-shield-check', color: '#a9b5a6' }
}

const { t } = useI18n()
const { user, profile, signedIn, ready, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { unread } = useNotifications()
const { notify } = useNotify()
const sb = useSupabase()

useHead({ title: () => t('profile.notif.title') })

const rows = ref<Row[]>([])
const busy = ref(false)
const done = ref(false)
const error = ref(false)
/** ids that were unread when the page opened, kept highlighted */
const fresh = ref(new Set<string>())

const SELECT = 'id, type, actor_id, post_id, comment_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url), post:posts(id, title, body)'

async function loadMore() {
  const uid = user.value?.id
  if (!uid || busy.value || done.value) return
  busy.value = true
  error.value = false
  const from = rows.value.length
  const { data, error: e } = await sb.from('notifications').select(SELECT)
    .eq('user_id', uid).order('created_at', { ascending: false }).range(from, from + PAGE - 1)
  busy.value = false
  if (e) {
    error.value = true
    return
  }
  const list = (data ?? []) as unknown as Row[]
  for (const r of list) if (!r.read_at) fresh.value.add(r.id)
  rows.value.push(...list)
  if (list.length < PAGE) done.value = true
}

async function markAllRead() {
  const uid = user.value?.id
  if (!uid) return
  unread.value = 0
  await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null)
}

async function init() {
  rows.value = []
  done.value = false
  fresh.value = new Set()
  if (!user.value) return
  loadBlocks()
  await loadMore()
  markAllRead()
}

watch(() => user.value?.id, init, { immediate: true })

async function remove(r: Row) {
  const i = rows.value.indexOf(r)
  if (i < 0) return
  rows.value.splice(i, 1)
  const { error: e } = await sb.from('notifications').delete().eq('id', r.id)
  if (e) {
    rows.value.splice(i, 0, r)
    notify(t('profile.loadError'), { tone: 'error' })
  } else notify(t('profile.notif.deleted'), { tone: 'info' })
}

const visible = computed(() => rows.value.filter(r => !isBlocked(r.actor_id)))
const groups = computed(() => {
  const today = todayISO()
  const out: { key: string, label: string, items: Row[] }[] = [
    { key: 'today', label: t('profile.notif.today'), items: [] },
    { key: 'earlier', label: t('profile.notif.earlier'), items: [] }
  ]
  for (const r of visible.value) out[toISODate(new Date(r.created_at)) === today ? 0 : 1]!.items.push(r)
  return out.filter(g => g.items.length)
})

const actorName = (r: Row) => r.actor?.display_name?.trim() || r.actor?.username || t('profile.notif.someone')
function link(r: Row): string | null {
  switch (r.type) {
    case 'follow':
      return r.actor ? `/u/${r.actor.username}` : null
    case 'tip_vote':
      return profile.value ? `/u/${profile.value.username}?tab=tips` : null
    case 'challenge':
      return '/challenges'
    case 'moderation':
      return r.post_id ? `/community/post/${r.post_id}` : null
    default:
      return r.post_id ? `/community/post/${r.post_id}${r.comment_id ? `#c-${r.comment_id}` : ''}` : null
  }
}
const snippet = (r: Row) => {
  const s = r.post?.title || r.post?.body || ''
  return s.length > 70 ? `${s.slice(0, 70).trimEnd()}…` : s
}

const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null
onMounted(() => {
  io = new IntersectionObserver(es => es.some(e => e.isIntersecting) && loadMore(), { rootMargin: '300px' })
})
watch(sentinel, (el, old) => {
  if (old) io?.unobserve(old)
  if (el) io?.observe(el)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div>
    <AppHeader
      :title="t('profile.notif.title')"
      back
    />
    <div class="page">
      <template v-if="!ready" />
      <EmptyState
        v-else-if="!signedIn"
        icon="community"
        :title="t('profile.notif.signIn')"
      >
        <button
          type="button"
          class="btn btn-primary"
          @click="requireAuth()"
        >
          {{ t('profile.notif.signInBtn') }}
        </button>
      </EmptyState>

      <template v-else>
        <div
          v-if="busy && !rows.length"
          class="list"
          aria-busy="true"
          :aria-label="t('common.loading')"
        >
          <span
            v-for="i in 5"
            :key="i"
            class="sk"
          />
        </div>

        <EmptyState
          v-else-if="error && !rows.length"
          icon="i-tabler-plant-off"
          :title="t('profile.loadError')"
        >
          <button
            type="button"
            class="btn btn-soft"
            @click="loadMore"
          >
            <UIcon name="i-tabler-refresh" /> {{ t('profile.retry') }}
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="done && !visible.length"
          icon="lamp"
          :title="t('profile.notif.empty')"
          :text="t('profile.notif.emptyText')"
        />

        <section
          v-for="g in groups"
          :key="g.key"
        >
          <h2 class="group-label">
            {{ g.label }}
          </h2>
          <TransitionGroup
            tag="ul"
            name="nlist"
            class="list"
          >
            <li
              v-for="r in g.items"
              :key="r.id"
              class="item"
              :class="{ fresh: fresh.has(r.id) }"
            >
              <component
                :is="link(r) ? NuxtLink : 'div'"
                :to="link(r) ?? undefined"
                class="item-main"
              >
                <span class="who">
                  <CommunityUserAvatar
                    v-if="r.actor"
                    :url="r.actor.avatar_url"
                    :name="actorName(r)"
                    :size="44"
                  />
                  <span
                    v-else
                    class="sys-avatar"
                  ><GrowIcon name="lamp" /></span>
                  <span
                    class="kind"
                    :style="{ color: GLYPH[r.type].color }"
                  ><UIcon :name="GLYPH[r.type].icon" /></span>
                </span>
                <span class="text">
                  <span class="line">{{ t(`profile.notif.types.${r.type}`, { name: actorName(r) }) }}</span>
                  <span
                    v-if="snippet(r)"
                    class="snippet"
                  >{{ snippet(r) }}</span>
                  <span class="ago num">{{ communityAgo(r.created_at) }}</span>
                </span>
              </component>
              <button
                type="button"
                class="del"
                :aria-label="t('profile.notif.delete')"
                @click="remove(r)"
              >
                <UIcon name="i-tabler-x" />
              </button>
            </li>
          </TransitionGroup>
        </section>

        <button
          v-if="error && rows.length"
          type="button"
          class="btn btn-soft"
          @click="loadMore"
        >
          {{ t('profile.retry') }}
        </button>
        <div
          v-if="!done && rows.length"
          ref="sentinel"
          class="sentinel"
          aria-hidden="true"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  gap: 20px;
  padding-top: 4px;
}

.group-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
}

.list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  position: relative;
  display: flex;
  align-items: stretch;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight);
}

.item.fresh {
  border-color: rgba(255, 210, 138, 0.28);
  background: linear-gradient(180deg, rgba(255, 210, 138, 0.07), transparent 70%), var(--panel);
}

.item.fresh::before {
  content: '';
  position: absolute;
  top: 18px;
  left: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lamp);
  box-shadow: 0 0 10px rgba(255, 210, 138, 0.6);
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 12px;
  padding: 12px 4px 12px 12px;
}

.who {
  position: relative;
  flex-shrink: 0;
  height: 44px;
}

.sys-avatar {
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--lamp);
  font-size: 20px;
}

.kind {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 22px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  box-shadow: 0 0 0 2px var(--surface-2);
  font-size: 13px;
}

.text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.line {
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.snippet {
  font-size: 13px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ago {
  font-size: 12px;
  color: var(--text-3);
}

.del {
  width: 44px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14px;
  border: 0;
  background: none;
  color: var(--text-3);
  font-size: 18px;
}

.del:active {
  color: var(--text);
}

.sk {
  display: block;
  height: 70px;
  border-radius: 16px;
  background: linear-gradient(90deg, var(--surface) 0%, var(--surface-3) 50%, var(--surface) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

.nlist-enter-active,
.nlist-leave-active {
  transition: opacity var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.nlist-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.nlist-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

.nlist-leave-active {
  position: absolute;
  width: 100%;
}

.sentinel {
  height: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .sk {
    animation: none;
  }

  .nlist-enter-active,
  .nlist-leave-active {
    transition: none;
  }
}
</style>
