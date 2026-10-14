<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { useOnlineRetry } from '~/utils/feed/online'
import { useFeedActions } from '~/utils/feed/actions'
import type { GlyphName } from '~/utils/glyphs'
import { authorName, CATEGORIES, ensureSchema, HELP_CATEGORIES, hotScore, keysetOr, PAGE, POST_SELECT, type Category, type ComposerPrefill, type Cursor, type Post } from '~/utils/feed/feed'
import { useInfinite } from '~/utils/feed/infinite'

const { t } = useI18n()
useHead({ title: () => t('feed.title') })

const route = useRoute()
const router = useRouter()
const { user, profile, signedIn, accepted, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { loadMine } = useFeedActions()
const { state: grow } = useGrow()
/** the web demo garden gets sample posts after the real ones */
const demoCommunity = computed(() => !Capacitor.isNativePlatform() && grow.settings.demo)

type Mode = 'forYou' | 'following' | 'new' | 'popular' | 'unanswered'
const MODES: Mode[] = ['forYou', 'unanswered', 'following', 'new', 'popular']
const initialTab = String(route.query.tab ?? '')
const mode = ref<Mode>((MODES as string[]).includes(initialTab) ? initialTab as Mode : 'forYou')
const category = ref<Category | null>(null)

const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref(false)
const done = ref(false)
let cursor: Cursor | null = null
let gen = 0
/** ranked first pages for forYou / popular */
let pool: Post[] | null = null
let poolPos = 0
/** oldest row of the forYou pool: chronological keyset continues from here */
let poolTail: Cursor | null = null
let following: string[] | null = null
const POOL = 100
const demoShown = ref(false)

async function demoPage(): Promise<Post[]> {
  if (!demoCommunity.value || mode.value === 'following') return []
  const { demoFeed } = await import('~/utils/feed/demoFeed')
  let rows = demoFeed().posts.filter(p => !category.value || p.category === category.value)
  if (mode.value === 'unanswered') rows = rows.filter(p => HELP_CATEGORIES.includes(p.category) && !p.accepted_comment_id && !p.comments_count)
  if (mode.value === 'popular') rows.sort((a, b) => b.likes_count - a.likes_count)
  if (mode.value === 'forYou') {
    const now = Date.now()
    rows.sort((a, b) => hotScore(b, now) - hotScore(a, now))
  }
  return rows
}

const visible = computed(() => posts.value.filter(p => !isBlocked(p.author_id)))
const initial = computed(() => loading.value && !posts.value.length)
const cursorOf = (p: Post): Cursor => ({ at: p.created_at, id: p.id })

async function fetchPage(): Promise<{ rows: Post[], end: boolean }> {
  const sb = useSupabase()
  const base = () => {
    const q = sb.from('posts').select(POST_SELECT)
    return category.value ? q.eq('category', category.value) : q
  }
  const chrono = async (q: ReturnType<typeof base>, from: Cursor | null) => {
    if (from) q = q.or(keysetOr(from))
    const { data, error: e } = await q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE)
    if (e) throw e
    const rows = (data ?? []) as Post[]
    if (rows.length) cursor = cursorOf(rows[rows.length - 1]!)
    return { rows, end: rows.length < PAGE }
  }
  const fromPool = () => {
    const rows = pool!.slice(poolPos, poolPos + PAGE)
    poolPos += rows.length
    return rows
  }

  switch (mode.value) {
    case 'new':
      return chrono(base(), cursor)
    case 'unanswered': {
      if (category.value && !HELP_CATEGORIES.includes(category.value)) return { rows: [], end: true }
      const q = sb.from('posts').select(POST_SELECT)
        .in('category', category.value ? [category.value] : HELP_CATEGORIES as string[])
        .is('accepted_comment_id', null)
        .eq('comments_count', 0)
      return chrono(q, cursor)
    }
    case 'following': {
      const uid = user.value?.id
      if (!uid) return { rows: [], end: true }
      if (!following) {
        const { data, error: e } = await sb.from('follows').select('following_id').eq('follower_id', uid)
        if (e) throw e
        following = (data ?? []).map(r => r.following_id as string)
      }
      if (!following.length) return { rows: [], end: true }
      return chrono(base().in('author_id', following), cursor)
    }
    case 'popular': {
      // Rank once, then page locally so live like counts can't reorder pages.
      if (!pool) {
        const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
        const { data, error: e } = await base().gte('created_at', since).order('likes_count', { ascending: false }).order('comments_count', { ascending: false }).order('created_at', { ascending: false }).limit(POOL)
        if (e) throw e
        pool = (data ?? []) as Post[]
      }
      const rows = fromPool()
      return { rows, end: poolPos >= pool.length }
    }
    case 'forYou': {
      if (!pool) {
        const { data, error: e } = await base().order('created_at', { ascending: false }).order('id', { ascending: false }).limit(POOL)
        if (e) throw e
        const raw = (data ?? []) as Post[]
        poolTail = raw.length === POOL ? cursorOf(raw[raw.length - 1]!) : null
        const now = Date.now()
        pool = raw.map(p => ({ p, s: hotScore(p, now) })).sort((a, b) => b.s - a.s).map(x => x.p)
      }
      if (poolPos < pool.length) {
        const rows = fromPool()
        return { rows, end: poolPos >= pool.length && !poolTail }
      }
      if (!poolTail) return { rows: [], end: true }
      return chrono(base(), cursor ?? poolTail)
    }
  }
}

async function loadMore() {
  if (loading.value || done.value || error.value) return
  const my = gen
  loading.value = true
  try {
    await ensureSchema()
    const { rows, end } = await fetchPage()
    if (my !== gen) return
    const seen = new Set(posts.value.map(p => p.id))
    posts.value.push(...rows.filter(p => !seen.has(p.id)))
    loadMine(rows.map(p => p.id))
    if (end) {
      const demo = await demoPage()
      if (my !== gen) return
      posts.value.push(...demo)
      demoShown.value = demo.length > 0
      done.value = true
    }
  } catch {
    if (my === gen) error.value = true
  } finally {
    if (my === gen) loading.value = false
  }
}

const sentinel = ref<HTMLElement | null>(null)
const { pump } = useInfinite(sentinel, loadMore, () => !loading.value && !done.value && !error.value)

async function reset() {
  gen++
  posts.value = []
  demoShown.value = false
  cursor = null
  pool = null
  poolPos = 0
  poolTail = null
  done.value = false
  error.value = false
  loading.value = false
  await loadMore()
  await nextTick()
  pump()
}

async function retry() {
  error.value = false
  await loadMore()
  pump()
}

watch([mode, category], reset)
watch(() => user.value?.id, () => {
  following = null
  loadBlocks()
  if (mode.value === 'following') reset()
  else loadMine(posts.value.map(p => p.id))
})

// 48h "did it work?" ping: at most once an hour per device; errors don't matter.
const PING_KEY = 'bb.feed.pingAt'
function pingUnsolved() {
  if (!user.value) return
  try {
    const last = Number(localStorage.getItem(PING_KEY) ?? 0)
    if (Date.now() - last < 3_600_000) return
    localStorage.setItem(PING_KEY, String(Date.now()))
  } catch {
    return
  }
  Promise.resolve(useSupabase().rpc('ping_unsolved')).catch(() => {})
}
watch(accepted, v => v && pingUnsolved())

onMounted(() => {
  loadBlocks()
  reset()
  pingUnsolved()
  openFromQuery()
})

// FAB hides while scrolling down, comes back on scroll up.
const fabHidden = ref(false)
let lastY = 0
let scroller: HTMLElement | null = null
function onScroll() {
  const y = scroller?.scrollTop ?? 0
  if (Math.abs(y - lastY) < 8) return
  fabHidden.value = y > lastY && y > 120
  lastY = y
}
onMounted(() => {
  scroller = document.querySelector<HTMLElement>('.app-scroll')
  scroller?.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => scroller?.removeEventListener('scroll', onScroll))

// Composer
const composerOpen = ref(false)
const editing = ref<Post | null>(null)
const prefill = ref<ComposerPrefill | null>(null)
let pendingCompose: ComposerPrefill | null = null

function compose(pre: ComposerPrefill | null = null) {
  if (!requireAuth()) {
    pendingCompose = pre ?? {}
    return
  }
  editing.value = null
  prefill.value = pre
  composerOpen.value = true
}
watch(accepted, (v) => {
  if (v && pendingCompose) {
    const pre = pendingCompose
    pendingCompose = null
    compose(Object.keys(pre).length ? pre : null)
  }
})

/** /community?compose=problem&plant=<localPlantId> */
function openFromQuery() {
  const c = String(route.query.compose ?? '')
  if (!(CATEGORIES as readonly string[]).includes(c)) return
  const plant = typeof route.query.plant === 'string' ? route.query.plant : null
  const { compose: _c, plant: _p, ...rest } = route.query
  router.replace({ query: rest })
  compose({ category: c as Category, plant })
}

function edit(p: Post) {
  editing.value = p
  prefill.value = null
  composerOpen.value = true
}
function onSaved(p: Post, created: boolean) {
  if (created) {
    const fits = (!category.value || category.value === p.category) && mode.value !== 'following' && (mode.value !== 'unanswered' || HELP_CATEGORIES.includes(p.category))
    if (fits) posts.value.unshift(p)
    return
  }
  const i = posts.value.findIndex(x => x.id === p.id)
  if (i !== -1) posts.value[i] = p
}
function onDeleted(p: Post) {
  posts.value = posts.value.filter(x => x.id !== p.id)
}

function showUnanswered() {
  category.value = null
  mode.value = 'unanswered'
  document.getElementById('feed-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const EXPLORE = [
  { to: '/community/tips', key: 'tips', glyph: 'note' },
  { to: '/strains', key: 'strains', glyph: 'flowering' },
  { to: '/challenges', key: 'challenges', glyph: 'i-tabler-trophy' }
] as const

const EXAMPLES = ['a', 'b', 'c'] as const
/** few posts: show how a good question looks */
const showExamples = computed(() => done.value && !error.value && visible.value.length < 4 && !category.value && (mode.value === 'forYou' || mode.value === 'new'))

const emptyState = computed((): { icon: GlyphName, title: string, text: string, action: 'signIn' | 'ask' | 'post' | null } => {
  if (mode.value === 'following' && !signedIn.value) return { icon: 'community', title: t('feed.empty.signedOutTitle'), text: t('feed.empty.signedOutText'), action: 'signIn' as const }
  if (mode.value === 'following' && following && !following.length) return { icon: 'community', title: t('feed.empty.followingTitle'), text: t('feed.empty.followingText'), action: null }
  if (mode.value === 'unanswered') return { icon: 'seedling', title: t('feed.unanswered.title'), text: t('feed.unanswered.text'), action: 'ask' as const }
  if (category.value) return { icon: 'vegetative', title: t('feed.empty.title'), text: t('feed.empty.category'), action: 'post' as const }
  return { icon: 'seedling', title: t('feed.home.firstTitle'), text: t('feed.home.firstText'), action: 'post' as const }
})
useOnlineRetry(() => error.value, retry)
</script>

<template>
  <div>
    <AppHeader
      :title="t('feed.title')"
      :subtitle="t('feed.subtitle')"
    >
      <template #actions>
        <NuxtLink
          to="/community/saved"
          class="icon-btn"
          :aria-label="t('feed.savedPage.title')"
        >
          <UIcon name="i-tabler-bookmark" />
        </NuxtLink>
        <CommunityAdminLink />
        <CommunityNotificationBell />
        <NuxtLink
          v-if="profile"
          :to="`/u/${profile.username}`"
          class="icon-btn me"
          :aria-label="t('feed.myProfile')"
        >
          <CommunityUserAvatar
            :url="profile.avatar_url"
            :name="authorName(profile)"
            :size="32"
          />
        </NuxtLink>
        <button
          v-else
          type="button"
          class="icon-btn"
          :aria-label="t('feed.signIn')"
          @click="requireAuth()"
        >
          <UIcon name="i-tabler-user-circle" />
        </button>
      </template>
    </AppHeader>

    <div class="page feed-page">
      <section
        class="starter card"
        :aria-label="t('feed.newPost')"
      >
        <button
          type="button"
          class="starter-prompt"
          @click="compose()"
        >
          <CommunityUserAvatar
            :url="profile?.avatar_url"
            :name="profile ? authorName(profile) : '?'"
            :size="32"
          />
          <span>{{ t('feed.home.starter') }}</span>
        </button>
        <div class="starter-actions">
          <button
            type="button"
            class="btn starter-act"
            @click="compose({ category: 'problem' })"
          >
            <GrowIcon
              name="pest"
              class="ask-glyph"
            />
            {{ t('feed.home.ask') }}
          </button>
          <button
            type="button"
            class="btn starter-act"
            @click="compose({ category: 'plants' })"
          >
            <GrowIcon
              name="photo"
              class="show-glyph"
            />
            {{ t('feed.home.show') }}
          </button>
        </div>
      </section>

      <nav
        class="explore card"
        :aria-label="t('feed.explore.label')"
      >
        <NuxtLink
          v-for="e in EXPLORE"
          :key="e.key"
          :to="e.to"
          class="explore-row"
        >
          <span class="explore-icon">
            <GrowIcon :name="e.glyph" />
          </span>
          <span class="explore-text">
            <span class="explore-title">{{ t(`feed.explore.${e.key}`) }}</span>
            <span class="explore-sub">{{ t(`feed.explore.${e.key}Text`) }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="explore-chev"
          />
        </NuxtLink>
      </nav>

      <div
        id="feed-tabs"
        class="filters"
      >
        <div
          class="tabs"
          role="tablist"
          :aria-label="t('feed.title')"
        >
          <button
            v-for="m in MODES"
            :key="m"
            type="button"
            role="tab"
            :aria-selected="mode === m"
            @click="mode = m"
          >
            {{ t(`feed.tabs.${m}`) }}
          </button>
        </div>
        <div class="chips cats">
          <button
            type="button"
            class="chip"
            :aria-pressed="category === null"
            @click="category = null"
          >
            {{ t('feed.cats.all') }}
          </button>
          <button
            v-for="c in CATEGORIES"
            :key="c"
            type="button"
            class="chip"
            :aria-pressed="category === c"
            @click="category = category === c ? null : c"
          >
            {{ t(`feed.cats.${c}`) }}
          </button>
        </div>
      </div>

      <div
        v-if="initial"
        class="list"
      >
        <CommunityFeedPostSkeleton photo />
        <CommunityFeedPostSkeleton />
        <CommunityFeedPostSkeleton photo />
      </div>

      <div
        v-else-if="visible.length"
        class="list rise"
      >
        <p
          v-if="demoShown"
          class="demo-feed-note"
        >
          <UIcon name="i-tabler-flask-2" />
          <span>{{ t('feed.demo.note') }}</span>
        </p>
        <template
          v-for="(p, i) in visible"
          :key="p.id"
        >
          <CommunityFeedPostCard
            :post="p"
            @edit="edit"
            @deleted="onDeleted"
          />
          <CommunityFeedWeeklyDigest
            v-if="i === 0 && mode === 'forYou'"
            @unanswered="showUnanswered"
          />
          <CommunityFeedGrowersStrip v-if="i === 2" />
        </template>
        <CommunityFeedGrowersStrip v-if="visible.length < 3 && done" />
      </div>

      <div
        v-else-if="error"
        class="state"
      >
        <EmptyState
          icon="pest"
          :title="t('feed.loadError')"
          :text="t('feed.err.offline')"
        >
          <button
            type="button"
            class="btn btn-soft"
            @click="retry"
          >
            <UIcon name="i-tabler-refresh" /> {{ t('feed.retry') }}
          </button>
        </EmptyState>
      </div>

      <template v-else-if="done">
        <EmptyState
          :icon="emptyState.icon"
          :title="emptyState.title"
          :text="emptyState.text"
        >
          <button
            v-if="emptyState.action === 'signIn'"
            type="button"
            class="btn btn-soft"
            @click="requireAuth()"
          >
            {{ t('feed.signIn') }}
          </button>
          <button
            v-else-if="emptyState.action === 'ask'"
            type="button"
            class="btn btn-soft"
            @click="compose({ category: 'question' })"
          >
            <GrowIcon name="i-tabler-help-circle" /> {{ t('feed.home.ask') }}
          </button>
          <button
            v-else-if="emptyState.action === 'post'"
            type="button"
            class="btn btn-soft"
            @click="compose()"
          >
            <UIcon name="i-tabler-plus" /> {{ t('feed.newPost') }}
          </button>
        </EmptyState>
        <CommunityFeedWeeklyDigest
          v-if="mode === 'forYou'"
          @unanswered="showUnanswered"
        />
        <CommunityFeedGrowersStrip />
      </template>

      <section
        v-if="showExamples"
        class="examples card"
        aria-labelledby="examples-title"
      >
        <h2
          id="examples-title"
          class="ex-title"
        >
          {{ t('feed.home.examplesTitle') }}
        </h2>
        <p class="ex-text">
          {{ t('feed.home.examplesText') }}
        </p>
        <ul class="ex-list">
          <li
            v-for="k in EXAMPLES"
            :key="k"
          >
            <button
              type="button"
              class="ex"
              lang="en"
              @click="compose({ category: 'question', title: t(`feed.home.examples.${k}`) })"
            >
              <GrowIcon name="i-tabler-help-circle" />
              <span>{{ t(`feed.home.examples.${k}`) }}</span>
            </button>
          </li>
        </ul>
      </section>

      <div
        ref="sentinel"
        class="sentinel"
        aria-hidden="true"
      />
      <div
        v-if="visible.length && (loading || error || done)"
        class="foot"
      >
        <UIcon
          v-if="loading"
          name="i-tabler-loader-2"
          class="spin"
        />
        <button
          v-else-if="error"
          type="button"
          class="btn btn-ghost"
          @click="retry"
        >
          <UIcon name="i-tabler-refresh" /> {{ t('feed.retry') }}
        </button>
        <span
          v-else
          class="end"
        ><GrowIcon name="seedling" /> {{ t('feed.end') }}</span>
      </div>
    </div>

    <button
      type="button"
      class="fab"
      :class="{ away: fabHidden }"
      :aria-label="t('feed.newPost')"
      @click="compose()"
    >
      <UIcon name="i-tabler-plus" />
    </button>

    <CommunityFeedComposer
      v-model:open="composerOpen"
      :post="editing"
      :prefill="prefill"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.demo-feed-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

.me {
  padding: 0;
}

.feed-page {
  gap: 16px;
  padding-top: 4px;
  /* clear the FAB above the nav so the last card's actions stay tappable */
  padding-bottom: calc(76px + 24px);
}

.starter {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.starter-prompt {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 6px 14px 6px 8px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-control);
  background: var(--well);
  color: var(--text-3);
  font-size: 15px;
  text-align: left;
  transition: border-color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.starter-prompt:active {
  transform: scale(0.985);
  border-color: var(--green);
}

.starter-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.starter-act {
  min-height: 44px;
  padding: 0 10px;
  font-size: 14px;
  color: var(--text-2);
}

.starter-act .grow-icon {
  font-size: 19px;
}

.ask-glyph {
  color: var(--red);
}

.show-glyph {
  color: var(--green);
}

.examples {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 16px 8px;
}

.ex-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.ex-text {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-3);
}

.ex-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ex-list li + li {
  border-top: 1px solid var(--line);
}

.ex {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 48px;
  padding: 12px 0;
  border: 0;
  background: none;
  color: var(--text);
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
}

.ex .grow-icon {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 17px;
  color: var(--blue);
}

.explore {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.explore-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 12px;
  color: inherit;
  text-decoration: none;
  transition: background var(--dur-fast) ease;
}

.explore-row + .explore-row {
  border-top: 1px solid var(--line);
}

.explore-row:active {
  background: var(--surface-2);
}

.explore-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 22px;
}

.explore-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.explore-title {
  font-size: 15px;
  font-weight: 600;
}

.explore-sub {
  font-size: 12px;
  color: var(--text-3);
}

.explore-chev {
  flex-shrink: 0;
  color: var(--text-3);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* underline tabs: five labels don't fit a segmented control at 390px */
.tabs {
  display: flex;
  margin: 0 -16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tabs button {
  flex: 0 0 auto;
  position: relative;
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  background: none;
  color: var(--text-3);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition: color var(--dur) ease;
}

.tabs button::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -1px;
  height: 2px;
  border-radius: 1px;
  background: transparent;
  transition: background var(--dur) ease;
}

.tabs button[aria-selected="true"] {
  color: var(--text);
}

.tabs button[aria-selected="true"]::after {
  background: var(--green);
}

.cats {
  margin: 0 -16px;
  padding: 0 16px 2px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sentinel {
  height: 1px;
  margin-top: -16px;
}

.foot {
  display: flex;
  justify-content: center;
  min-height: 48px;
  align-items: center;
  color: var(--text-3);
  font-size: 13px;
}

.foot .spin {
  font-size: 22px;
  color: var(--green);
}

.end {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.end .grow-icon {
  color: var(--green);
  font-size: 16px;
}

.fab {
  position: fixed;
}

.fab.away {
  transform: translateY(calc(100% + 32px));
  opacity: 0;
  pointer-events: none;
}

:global(.kb-open) .fab {
  display: none;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
