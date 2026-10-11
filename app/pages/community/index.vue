<script setup lang="ts">
import { useFeedActions } from '~/utils/feed/actions'
import { authorName, CATEGORIES, hotScore, PAGE, POST_SELECT, type Category, type Post } from '~/utils/feed/feed'

const { t } = useI18n()
useHead({ title: () => t('feed.title') })

const { user, profile, signedIn, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { loadMine } = useFeedActions()

type Mode = 'forYou' | 'following' | 'new' | 'popular'
const MODES: Mode[] = ['forYou', 'following', 'new', 'popular']
const mode = ref<Mode>('forYou')
const category = ref<Category | null>(null)

const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref(false)
const done = ref(false)
let offset = 0
let gen = 0
let pool: Post[] | null = null
let following: string[] | null = null

const visible = computed(() => posts.value.filter(p => !isBlocked(p.author_id)))
const initial = computed(() => loading.value && !posts.value.length)

async function fetchPage(): Promise<Post[]> {
  const sb = useSupabase()
  const base = () => {
    const q = sb.from('posts').select(POST_SELECT)
    return category.value ? q.eq('category', category.value) : q
  }
  const page = async (q: ReturnType<typeof base>, from: number) => {
    const { data, error: e } = await q.range(from, from + PAGE - 1)
    if (e) throw e
    return (data ?? []) as Post[]
  }

  switch (mode.value) {
    case 'new':
      return page(base().order('created_at', { ascending: false }), offset)
    case 'popular': {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
      return page(base().gte('created_at', since).order('likes_count', { ascending: false }).order('comments_count', { ascending: false }).order('created_at', { ascending: false }), offset)
    }
    case 'following': {
      const uid = user.value?.id
      if (!uid) return []
      if (!following) {
        const { data, error: e } = await sb.from('follows').select('following_id').eq('follower_id', uid)
        if (e) throw e
        following = (data ?? []).map(r => r.following_id as string)
      }
      if (!following.length) return []
      return page(base().in('author_id', following).order('created_at', { ascending: false }), offset)
    }
    case 'forYou': {
      // Rank the latest 100 by engagement with time decay, then continue chronologically.
      if (!pool) {
        const { data, error: e } = await base().order('created_at', { ascending: false }).limit(100)
        if (e) throw e
        const now = Date.now()
        pool = ((data ?? []) as Post[]).map(p => ({ p, s: hotScore(p, now) })).sort((a, b) => b.s - a.s).map(x => x.p)
      }
      if (offset < pool.length) {
        const slice = pool.slice(offset, offset + PAGE)
        if (slice.length === PAGE || pool.length < 100) return slice
        return slice.concat(await older(slice.length))
      }
      return older(0)
    }
  }

  async function older(have: number) {
    if (!pool?.length || pool.length < 100) return []
    const oldest = pool.reduce((m, p) => (p.created_at < m ? p.created_at : m), pool[0]!.created_at)
    const { data, error: e } = await base().lt('created_at', oldest).order('created_at', { ascending: false }).range(offset + have - pool.length, offset - pool.length + PAGE - 1)
    if (e) throw e
    return (data ?? []) as Post[]
  }
}

async function loadMore() {
  if (loading.value || done.value || error.value) return
  const my = gen
  loading.value = true
  try {
    const rows = await fetchPage()
    if (my !== gen) return
    const seen = new Set(posts.value.map(p => p.id))
    posts.value.push(...rows.filter(p => !seen.has(p.id)))
    offset += rows.length
    if (rows.length < PAGE) done.value = true
    loadMine(rows.map(p => p.id))
  } catch {
    if (my === gen) error.value = true
  } finally {
    if (my === gen) loading.value = false
  }
}

function reset() {
  gen++
  posts.value = []
  offset = 0
  pool = null
  done.value = false
  error.value = false
  loading.value = false
  loadMore()
}

function retry() {
  error.value = false
  loadMore()
}

watch([mode, category], reset)
watch(() => user.value?.id, () => {
  following = null
  loadBlocks()
  if (mode.value === 'following') reset()
  else loadMine(posts.value.map(p => p.id))
})

// Infinite scroll
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
onMounted(() => {
  loadBlocks()
  reset()
  observer = new IntersectionObserver((es) => {
    if (es.some(e => e.isIntersecting)) loadMore()
  }, { rootMargin: '600px 0px' })
  if (sentinel.value) observer.observe(sentinel.value)
})
onBeforeUnmount(() => observer?.disconnect())

// Composer
const composerOpen = ref(false)
const editing = ref<Post | null>(null)
function compose() {
  if (!requireAuth()) return
  editing.value = null
  composerOpen.value = true
}
function edit(p: Post) {
  editing.value = p
  composerOpen.value = true
}
function onSaved(p: Post, created: boolean) {
  if (created) {
    if (!category.value || category.value === p.category) posts.value.unshift(p)
    return
  }
  const i = posts.value.findIndex(x => x.id === p.id)
  if (i !== -1) posts.value[i] = p
}
function onDeleted(p: Post) {
  posts.value = posts.value.filter(x => x.id !== p.id)
}

const EXPLORE = [
  { to: '/community/tips', key: 'tips', glyph: 'note' },
  { to: '/strains', key: 'strains', glyph: 'flowering' },
  { to: '/challenges', key: 'challenges', glyph: 'i-tabler-trophy' }
] as const

const emptyState = computed(() => {
  if (mode.value === 'following' && !signedIn.value) return { icon: 'community', title: t('feed.empty.signedOutTitle'), text: t('feed.empty.signedOutText'), signIn: true }
  if (mode.value === 'following' && following && !following.length) return { icon: 'community', title: t('feed.empty.followingTitle'), text: t('feed.empty.followingText'), signIn: false }
  if (category.value) return { icon: 'vegetative', title: t('feed.empty.title'), text: t('feed.empty.category'), signIn: false }
  return { icon: 'seedling', title: t('feed.empty.title'), text: t('feed.empty.text'), signIn: false }
})
</script>

<template>
  <div>
    <AppHeader :title="t('feed.title')">
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
          class="me"
          :aria-label="t('feed.myProfile')"
        >
          <CommunityUserAvatar
            :url="profile.avatar_url"
            :name="authorName(profile)"
            :size="40"
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
      <nav
        class="explore"
        :aria-label="t('feed.explore.label')"
      >
        <NuxtLink
          v-for="e in EXPLORE"
          :key="e.key"
          :to="e.to"
          class="explore-card card"
        >
          <GrowIcon
            :name="e.glyph"
            class="explore-glyph"
          />
          <span class="explore-title">{{ t(`feed.explore.${e.key}`) }}</span>
          <span class="explore-text">{{ t(`feed.explore.${e.key}Text`) }}</span>
        </NuxtLink>
      </nav>

      <div class="filters">
        <div
          class="segmented"
          role="tablist"
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
        <CommunityFeedPostCard
          v-for="p in visible"
          :key="p.id"
          :post="p"
          @edit="edit"
          @deleted="onDeleted"
        />
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

      <EmptyState
        v-else-if="done"
        :icon="emptyState.icon"
        :title="emptyState.title"
        :text="emptyState.text"
      >
        <button
          v-if="emptyState.signIn"
          type="button"
          class="btn btn-soft"
          @click="requireAuth()"
        >
          {{ t('feed.signIn') }}
        </button>
        <button
          v-else
          type="button"
          class="btn btn-soft"
          @click="compose"
        >
          <UIcon name="i-tabler-plus" /> {{ t('feed.newPost') }}
        </button>
      </EmptyState>

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
      :aria-label="t('feed.newPost')"
      @click="compose"
    >
      <UIcon name="i-tabler-plus" />
    </button>

    <CommunityFeedComposer
      v-model:open="composerOpen"
      :post="editing"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.me {
  display: inline-flex;
  border-radius: 50%;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
}

.feed-page {
  gap: 18px;
  padding-top: 4px;
}

.explore {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.explore-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 12px 12px 11px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.explore-card:active {
  transform: scale(0.97);
}

.explore-glyph {
  font-size: 22px;
  color: var(--leaf);
  margin-bottom: 6px;
}

.explore-title {
  font-size: 13px;
  font-weight: 600;
}

.explore-text {
  font-size: 11px;
  line-height: 1.3;
  color: var(--text-3);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.segmented button {
  font-size: 13px;
  min-height: 38px;
  white-space: nowrap;
}

.cats {
  margin: 0 -20px;
  padding: 0 20px 2px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sentinel {
  height: 1px;
  margin-top: -18px;
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
  color: var(--leaf);
}

.end {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.end .grow-icon {
  color: var(--leaf);
  font-size: 16px;
}

.fab {
  position: fixed;
  right: 20px;
  bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px);
  z-index: 30;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(180deg, #b3ef87 0%, var(--leaf) 55%, #86d257 100%);
  color: var(--on-accent);
  font-size: 26px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 10px 26px -8px rgba(155, 227, 107, 0.6);
  transition: transform var(--dur-fast) var(--ease-out);
}

.fab:active {
  transform: scale(0.92);
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
