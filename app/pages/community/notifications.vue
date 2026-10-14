<script setup lang="ts">
import { useOnlineRetry } from '~/utils/feed/online'
import { isMissingSchema } from '~/utils/dbErrors'
import { badgeDesc, badgeGlyph, badgeName } from '~/composables/useBadges'

type Kind = 'like' | 'reaction' | 'comment' | 'reply' | 'follow' | 'accepted' | 'tip_vote' | 'challenge' | 'moderation' | 'badge' | 'solve_ping' | 'update'
interface Actor { id: string, username: string, display_name: string | null, avatar_url: string | null }
interface Row {
  id: string
  type: Kind
  actor_id: string | null
  post_id: string | null
  comment_id: string | null
  read_at: string | null
  created_at: string
  meta?: Record<string, unknown> | null
  actor: Actor | null
  post: { id: string, title: string | null, body: string } | null
}
interface Item {
  key: string
  type: Kind
  lead: Row
  rows: Row[]
  actors: Actor[]
}

const PAGE = 20
const NuxtLink = resolveComponent('NuxtLink')
const GLYPH: Record<Kind, { icon: string, color: string }> = {
  like: { icon: 'i-tabler-heart-filled', color: 'var(--red)' },
  reaction: { icon: 'vegetative', color: 'var(--green)' },
  comment: { icon: 'i-tabler-message-circle', color: 'var(--blue)' },
  reply: { icon: 'i-tabler-arrow-back-up', color: 'var(--blue)' },
  follow: { icon: 'i-tabler-user-plus', color: 'var(--green)' },
  accepted: { icon: 'i-tabler-circle-check', color: 'var(--green)' },
  tip_vote: { icon: 'i-tabler-thumb-up', color: 'var(--green)' },
  challenge: { icon: 'i-tabler-trophy', color: 'var(--amber)' },
  moderation: { icon: 'i-tabler-shield-check', color: 'var(--text-2)' },
  badge: { icon: 'i-tabler-award', color: 'var(--amber)' },
  solve_ping: { icon: 'i-tabler-circle-check', color: 'var(--amber)' },
  update: { icon: 'photo', color: 'var(--green)' }
}
const REACTION_KINDS = ['like', 'healthy', 'training', 'frosty', 'helpful']

const { t } = useI18n()
const { user, profile, signedIn, ready, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { unread } = useNotifications()
const { loadCatalog, byId } = useBadges()
const { notify } = useNotify()
const sb = useSupabase()

useHead({ title: () => t('notifications.title') })

const rows = ref<Row[]>([])
const busy = ref(false)
const done = ref(false)
const error = ref(false)
/** ids that were unread when the page opened, kept highlighted */
const fresh = ref(new Set<string>())

const BASE = 'id, type, actor_id, post_id, comment_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url), post:posts(id, title, body)'
let withMeta = true

async function fetchPage(uid: string, from: number) {
  const q = (cols: string) => sb.from('notifications').select(cols)
    .eq('user_id', uid).order('created_at', { ascending: false }).range(from, from + PAGE - 1)
  if (withMeta) {
    const res = await q(`${BASE}, meta`)
    if (!isMissingSchema(res.error)) return res
    withMeta = false
  }
  return q(BASE)
}

async function loadMore() {
  const uid = user.value?.id
  if (!uid || busy.value || done.value) return
  busy.value = true
  error.value = false
  const { data, error: e } = await fetchPage(uid, rows.value.length)
  busy.value = false
  if (uid !== user.value?.id) return
  if (e) {
    error.value = true
    return
  }
  const list = (data ?? []) as unknown as Row[]
  for (const r of list) if (!r.read_at) fresh.value.add(r.id)
  const seen = new Set(rows.value.map(r => r.id))
  rows.value.push(...list.filter(r => !seen.has(r.id)))
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
  error.value = false
  fresh.value = new Set()
  if (!user.value) return
  loadBlocks()
  loadCatalog()
  await loadMore()
  markAllRead()
}

watch(() => user.value?.id, init, { immediate: true })

async function remove(item: Item) {
  const ids = new Set(item.rows.map(r => r.id))
  const before = rows.value
  rows.value = rows.value.filter(r => !ids.has(r.id))
  const { error: e } = await sb.from('notifications').delete().in('id', [...ids])
  if (e) {
    rows.value = before
    notify(t('profile.loadError'), { tone: 'error' })
  } else notify(t('notifications.deleted'), { tone: 'info' })
}

const meta = (r: Row, k: string) => {
  const v = r.meta?.[k]
  return typeof v === 'string' || typeof v === 'number' ? String(v) : ''
}

function groupKey(r: Row): string | null {
  const day = toISODate(new Date(r.created_at))
  if ((r.type === 'reaction' || r.type === 'like') && r.post_id) return `r:${r.post_id}`
  if (r.type === 'follow') return `f:${day}`
  if (r.type === 'tip_vote') return `t:${day}`
  return null
}

// "@a and 4 others reacted": rows sharing a key collapse into the newest one
const items = computed<Item[]>(() => {
  const out: Item[] = []
  const byKey = new Map<string, Item>()
  for (const r of rows.value) {
    if (isBlocked(r.actor_id)) continue
    const key = groupKey(r)
    const hit = key ? byKey.get(key) : undefined
    if (hit) {
      hit.rows.push(r)
      if (r.actor && !hit.actors.some(a => a.id === r.actor!.id)) hit.actors.push(r.actor)
      continue
    }
    const item: Item = { key: key ?? r.id, type: r.type === 'like' && key ? 'reaction' : r.type, lead: r, rows: [r], actors: r.actor ? [r.actor] : [] }
    if (key) byKey.set(key, item)
    out.push(item)
  }
  for (const i of out) if (i.rows.length === 1) i.type = i.lead.type
  return out
})

const groups = computed(() => {
  const today = todayISO()
  const out: { key: string, label: string, items: Item[] }[] = [
    { key: 'today', label: t('notifications.today'), items: [] },
    { key: 'earlier', label: t('notifications.earlier'), items: [] }
  ]
  for (const i of items.value) out[toISODate(new Date(i.lead.created_at)) === today ? 0 : 1]!.items.push(i)
  return out.filter(g => g.items.length)
})

const nameOf = (a: Actor | null | undefined) => a?.display_name?.trim() || a?.username || t('notifications.someone')
const isFresh = (i: Item) => i.rows.some(r => fresh.value.has(r.id))
const badgeOf = (i: Item) => byId(meta(i.lead, 'badge') || meta(i.lead, 'badge_id'))

function line(i: Item): string {
  const r = i.lead
  const name = nameOf(r.actor)
  const others = i.actors.length - 1
  if (others > 0 && (i.type === 'reaction' || i.type === 'follow' || i.type === 'tip_vote')) {
    return t(`notifications.grouped.${i.type}`, { name, n: others })
  }
  switch (r.type) {
    case 'reaction': {
      const kind = meta(r, 'kind')
      return kind && kind !== 'like' && REACTION_KINDS.includes(kind)
        ? t('notifications.reactionKind', { name, kind: t(`notifications.kinds.${kind}`) })
        : t('notifications.types.reaction', { name })
    }
    case 'badge': {
      const b = badgeOf(i)
      return b ? t('notifications.types.badge', { badge: badgeName(b) }) : t('notifications.types.badgeAny')
    }
    case 'solve_ping':
      return r.actor ? t('notifications.types.solve_ping', { name }) : t('notifications.types.solvePingAny')
    case 'challenge': {
      const rank = meta(r, 'rank')
      return rank ? t('notifications.types.challengeRank', { rank }) : t('notifications.types.challenge')
    }
    case 'moderation': {
      if (meta(r, 'target_type') !== 'strain_photo') return t('notifications.types.moderation')
      const strain = meta(r, 'strain') || '?'
      const reason = meta(r, 'reason')
      if (meta(r, 'status') === 'approved') return t('notifications.types.photoApproved', { strain })
      return reason ? t('notifications.types.photoRejectedWhy', { strain, reason }) : t('notifications.types.photoRejected', { strain })
    }
    case 'update': {
      const week = meta(r, 'week_no') || meta(r, 'week')
      const plant = meta(r, 'plant_name') || meta(r, 'plant')
      if (week && plant) return t('notifications.types.update', { name, week, plant })
      return week ? t('notifications.types.updateWeek', { name, week }) : t('notifications.types.updateAny', { name })
    }
    default:
      return t(`notifications.types.${r.type}`, { name })
  }
}

function link(i: Item): string | null {
  const r = i.lead
  switch (r.type) {
    case 'follow':
      return i.actors.length > 1 && profile.value ? `/u/${profile.value.username}` : r.actor ? `/u/${r.actor.username}` : null
    case 'tip_vote':
      return profile.value ? `/u/${profile.value.username}?tab=tips` : null
    case 'challenge': {
      const slug = meta(r, 'slug')
      return slug ? `/challenges/${slug}` : '/challenges'
    }
    case 'badge':
      return profile.value ? `/u/${profile.value.username}#badges` : null
    case 'update': {
      const plant = meta(r, 'plant_id')
      return plant ? `/plant/${plant}` : r.actor ? `/u/${r.actor.username}` : null
    }
    case 'solve_ping':
      return r.post_id ? `/community/post/${r.post_id}?solve=1` : null
    case 'moderation':
      if (meta(r, 'target_type') === 'strain_photo') return meta(r, 'slug') ? `/strains/${meta(r, 'slug')}` : null
      return r.post_id ? `/community/post/${r.post_id}${r.comment_id ? `#c-${r.comment_id}` : ''}` : null
    default:
      return r.post_id ? `/community/post/${r.post_id}${r.comment_id ? `#c-${r.comment_id}` : ''}` : null
  }
}
const snippet = (i: Item) => {
  if (i.type === 'badge') {
    const b = badgeOf(i)
    return b ? badgeDesc(b) : ''
  }
  const s = i.lead.post?.title || i.lead.post?.body || ''
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
useOnlineRetry(() => error.value, loadMore)
</script>

<template>
  <div>
    <AppHeader
      :title="t('notifications.title')"
      back
    />
    <div class="page">
      <template v-if="!ready" />
      <EmptyState
        v-else-if="!signedIn"
        icon="community"
        :title="t('notifications.signIn')"
      >
        <button
          type="button"
          class="btn btn-primary"
          @click="requireAuth()"
        >
          {{ t('notifications.signInBtn') }}
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
          icon="seedling"
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
          v-else-if="done && !items.length"
          icon="lamp"
          :title="t('notifications.empty')"
          :text="t('notifications.emptyText')"
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
            class="list card"
          >
            <li
              v-for="i in g.items"
              :key="i.key"
              class="item"
              :class="{ fresh: isFresh(i) }"
            >
              <component
                :is="link(i) ? NuxtLink : 'div'"
                :to="link(i) ?? undefined"
                class="item-main"
              >
                <span
                  class="dot"
                  aria-hidden="true"
                />
                <span
                  class="who"
                  :class="{ stack: i.actors.length > 1 }"
                >
                  <CommunityBadgeMedal
                    v-if="i.type === 'badge'"
                    :glyph="badgeGlyph(badgeOf(i))"
                    :tier="badgeOf(i)?.tier ?? 2"
                    :size="40"
                  />
                  <template v-else-if="i.actors.length">
                    <CommunityUserAvatar
                      :url="i.actors[0]!.avatar_url"
                      :name="nameOf(i.actors[0])"
                      :size="40"
                    />
                    <CommunityUserAvatar
                      v-if="i.actors[1]"
                      class="second"
                      :url="i.actors[1].avatar_url"
                      :name="nameOf(i.actors[1])"
                      :size="24"
                    />
                    <span
                      class="kind"
                      :style="{ color: GLYPH[i.type]?.color }"
                    ><GrowIcon :name="GLYPH[i.type]?.icon ?? 'note'" /></span>
                  </template>
                  <span
                    v-else
                    class="tile"
                    :style="{ color: GLYPH[i.type]?.color }"
                  ><GrowIcon :name="GLYPH[i.type]?.icon ?? 'note'" /></span>
                </span>
                <span class="text">
                  <span class="line">{{ line(i) }}</span>
                  <span
                    v-if="snippet(i)"
                    class="snippet"
                  >{{ snippet(i) }}</span>
                  <span class="foot">
                    <span class="ago num">{{ communityAgo(i.lead.created_at) }}</span>
                    <span
                      v-if="i.type === 'solve_ping'"
                      class="cta"
                    >{{ t('notifications.solveCta') }} <UIcon name="i-tabler-chevron-right" /></span>
                  </span>
                </span>
              </component>
              <button
                type="button"
                class="del"
                :aria-label="i.rows.length > 1 ? t('notifications.deleteGroup') : t('notifications.delete')"
                @click="remove(i)"
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
  gap: 24px;
  padding-top: 4px;
}

.group-label {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.list {
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: hidden;
}

.item {
  position: relative;
  display: flex;
  align-items: stretch;
}

.item + .item {
  border-top: 1px solid var(--line);
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 56px;
  padding: 10px 0 10px 10px;
  color: inherit;
  text-decoration: none;
}

.dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  margin-top: 17px;
  border-radius: 50%;
  background: transparent;
}

.fresh .dot {
  background: var(--green);
}

.who {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.who.stack {
  width: 54px;
}

.who .second {
  position: absolute;
  right: 0;
  top: -4px;
  border: 2px solid var(--surface);
}

.who.stack .kind {
  right: 10px;
}

.tile {
  width: 40px;
  height: 40px;
  display: inline-grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, currentColor 14%, transparent);
  font-size: 20px;
}

.kind {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  border: 2px solid var(--surface);
  font-size: 11px;
}

.text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
  padding-top: 1px;
}

.line {
  font-size: 15px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.fresh .line {
  font-weight: 600;
}

.snippet {
  font-size: 13px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.foot {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  color: var(--green);
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
  height: 64px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--line);
  animation: pulse 1.4s ease-in-out infinite;
}

.list:not(.card) {
  gap: 8px;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
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
