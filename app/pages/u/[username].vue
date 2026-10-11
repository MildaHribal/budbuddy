<script setup lang="ts">
import type { Profile } from '~/composables/useAuth'
import type { PublicPlant } from '~/utils/grower'
import { POST_SELECT, type Post } from '~/utils/feed/feed'
import { useFeedActions } from '~/utils/feed/actions'
import { isMissingSchema } from '~/utils/dbErrors'
import { badgeGlyph, badgeName, type BadgeDef } from '~/composables/useBadges'

interface MiniProfile { id: string, username: string, display_name: string | null, avatar_url: string | null }
interface TipRow { id: string, body: string, stage: string | null, helpful_count: number, is_hidden: boolean, created_at: string }

type Tab = 'plants' | 'posts' | 'tips'
const PROFILE_COLS = 'id, username, display_name, avatar_url, bio, experience, environments, media, favorite_strain, reputation, created_at'
const PROFILE_COLS_X = `${PROFILE_COLS}, first_grow, light_type, space, pinned_badges`
const PAGE = 20

const route = useRoute()
const { t } = useI18n()
const { user, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { notify } = useNotify()
const { loadMine } = useFeedActions()
const { $goBack } = useNuxtApp()
const sb = useSupabase()

const username = computed(() => String(route.params.username).replace(/^@/, '').toLowerCase())
const profile = ref<Profile | null>(null)
const state = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const plants = ref<PublicPlant[]>([])
const counts = reactive({ posts: 0, followers: 0, following: 0 })
const isFollowing = ref(false)
const followBusy = ref(false)

const mine = computed(() => !!user.value && user.value.id === profile.value?.id)
const name = computed(() => profile.value?.display_name?.trim() || profile.value?.username || '')
const level = computed(() => growerLevel(profile.value?.reputation ?? 0))
const nextLevel = computed(() => (level.value.next == null ? null : growerLevel(level.value.next)))
const perk = computed(() => {
  const id = nextLevel.value?.id ?? level.value.id
  return tOr(`feed.levelSheet.perks.${id}`, '')
})
const levelPct = computed(() => {
  const cur = LEVELS[level.value.tier]?.min ?? 0
  const next = level.value.next
  if (next == null) return 1
  return Math.min(1, Math.max(0, ((profile.value?.reputation ?? 0) - cur) / (next - cur)))
})

// ── Badges ────────────────────────────────────────────────────────
const { loadCatalog, loadEarned } = useBadges()
const badgeDefs = shallowRef<BadgeDef[]>([])
const earnedAt = ref<Record<string, string>>({})
const pinnedBadges = computed(() => (profile.value?.pinned_badges ?? [])
  .map(id => badgeDefs.value.find(d => d.id === id && earnedAt.value[id]))
  .filter((b): b is BadgeDef => !!b)
  .slice(0, 3))

async function loadBadges(uid: string) {
  const [defs, earned] = await Promise.all([loadCatalog(), loadEarned(uid)])
  if (profile.value?.id !== uid) return
  badgeDefs.value = defs
  earnedAt.value = Object.fromEntries(earned.map(e => [e.badge_id, e.earned_at]))
  if (route.hash === '#badges') nextTick(() => document.getElementById('badges')?.scrollIntoView({ block: 'start' }))
}
function scrollToBadges() {
  document.getElementById('badges')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function onPinned(ids: string[]) {
  if (profile.value) profile.value = { ...profile.value, pinned_badges: ids }
  if (mine.value) useAuth().loadProfile()
}
const harvested = computed(() => plants.value.filter(p => p.harvest_dry_g != null && Number(p.harvest_dry_g) > 0))
const totalDry = computed(() => Math.round(harvested.value.reduce((s, p) => s + Number(p.harvest_dry_g), 0)))
const blocked = computed(() => !mine.value && isBlocked(profile.value?.id))
const setup = computed(() => {
  const p = profile.value
  if (!p) return []
  return [
    ...p.environments.map(v => ({ key: `e-${v}`, label: tOr(`profile.env.${v}`, v), icon: v === 'outdoor' ? 'i-tabler-sun' : v === 'greenhouse' ? 'i-tabler-building-warehouse' : 'lamp' })),
    ...p.media.map(v => ({ key: `m-${v}`, label: tOr(`profile.media.${v}`, v), icon: 'i-tabler-shovel' })),
    ...(p.light_type ? [{ key: 'light', label: tOr(`profile.light.${p.light_type}`, p.light_type), icon: p.light_type === 'sun' ? 'i-tabler-sun' : 'lamp' }] : []),
    ...(p.space ? [{ key: 'space', label: t('profile.space', { v: p.space }), icon: 'i-tabler-box' }] : [])
  ]
})

useHead({ title: () => (name.value ? `${name.value} (@${profile.value?.username})` : t('profile.title')) })

async function load() {
  state.value = 'loading'
  loadBlocks()
  const q = (cols: string) => sb.from('profiles').select(cols).eq('username', username.value).maybeSingle()
  let { data, error } = await q(PROFILE_COLS_X)
  if (isMissingSchema(error)) ({ data, error } = await q(PROFILE_COLS))
  if (error) {
    state.value = 'error'
    return
  }
  if (!data) {
    state.value = 'missing'
    return
  }
  profile.value = data as unknown as Profile
  const id = profile.value.id
  badgeDefs.value = []
  earnedAt.value = {}
  loadBadges(id)
  const head = { count: 'exact' as const, head: true }
  const [pl, po, fr, fg, me] = await Promise.all([
    sb.from('public_plants').select('id, owner_id, name, strain, plant_type, stage, environment, medium, start_date, cover_url, harvest_wet_g, harvest_dry_g, archived, updated_at').eq('owner_id', id).order('updated_at', { ascending: false }).limit(60),
    sb.from('posts').select('id', head).eq('author_id', id),
    sb.from('follows').select('follower_id', head).eq('following_id', id),
    sb.from('follows').select('following_id', head).eq('follower_id', id),
    user.value && user.value.id !== id
      ? sb.from('follows').select('follower_id').eq('follower_id', user.value.id).eq('following_id', id).maybeSingle()
      : Promise.resolve({ data: null })
  ])
  plants.value = (pl.data ?? []) as PublicPlant[]
  counts.posts = po.count ?? 0
  counts.followers = fr.count ?? 0
  counts.following = fg.count ?? 0
  isFollowing.value = !!me.data
  state.value = 'ready'
  if (tab.value !== 'plants') loadMore(tab.value)
}

// ── Follow ────────────────────────────────────────────────────────
async function toggleFollow() {
  const p = profile.value
  if (!p || followBusy.value || !requireAuth() || !user.value) return
  const next = !isFollowing.value
  isFollowing.value = next
  counts.followers += next ? 1 : -1
  followBusy.value = true
  const q = next
    ? sb.from('follows').insert({ follower_id: user.value.id, following_id: p.id })
    : sb.from('follows').delete().eq('follower_id', user.value.id).eq('following_id', p.id)
  const { error } = await q
  followBusy.value = false
  if (error && error.code !== '23505') {
    isFollowing.value = !next
    counts.followers += next ? -1 : 1
    notify(t('profile.followError'), { tone: 'error' })
  }
}

// ── Tabs ──────────────────────────────────────────────────────────
const tabs = computed(() => (['plants', 'posts', 'tips'] as const).map(id => ({ id, label: t(`profile.tabs.${id}`) })))
const tab = ref<Tab>((['posts', 'tips'] as string[]).includes(String(route.query.tab)) ? route.query.tab as Tab : 'plants')
watch(tab, (v) => {
  navigateTo({ query: { ...route.query, tab: v === 'plants' ? undefined : v } }, { replace: true })
  if (!lists[v as 'posts' | 'tips']?.started) loadMore(v)
})

const posts = ref<Post[]>([])
const tips = ref<TipRow[]>([])
const lists = reactive({
  posts: { started: false, busy: false, done: false, error: false },
  tips: { started: false, busy: false, done: false, error: false }
})

function resetLists() {
  posts.value = []
  tips.value = []
  for (const l of Object.values(lists)) Object.assign(l, { started: false, busy: false, done: false, error: false })
}

async function loadMore(which: Tab) {
  if (which === 'plants' || !profile.value) return
  const l = lists[which]
  if (l.busy || l.done) return
  l.started = true
  l.busy = true
  l.error = false
  const id = profile.value.id
  const from = which === 'posts' ? posts.value.length : tips.value.length
  const res = which === 'posts'
    ? await sb.from('posts').select(POST_SELECT).eq('author_id', id).order('created_at', { ascending: false }).range(from, from + PAGE - 1)
    : await sb.from('tips').select('id, body, stage, helpful_count, is_hidden, created_at').eq('author_id', id).order('score', { ascending: false }).order('created_at', { ascending: false }).range(from, from + PAGE - 1)
  l.busy = false
  if (res.error) {
    l.error = true
    return
  }
  const rows = res.data ?? []
  if (which === 'posts') {
    const list = rows as unknown as Post[]
    posts.value.push(...list)
    loadMine(list.map(p => p.id))
  } else tips.value.push(...rows as TipRow[])
  if (rows.length < PAGE) l.done = true
}

const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null
onMounted(() => {
  io = new IntersectionObserver((es) => {
    if (es.some(e => e.isIntersecting)) loadMore(tab.value)
  }, { rootMargin: '400px' })
})
watch(sentinel, (el, old) => {
  if (old) io?.unobserve(old)
  if (el) io?.observe(el)
})
onBeforeUnmount(() => io?.disconnect())

// ── Followers / following sheet ───────────────────────────────────
const sheet = ref<'followers' | 'following' | null>(null)
const sheetOpen = computed({
  get: () => sheet.value !== null,
  set: (v) => {
    if (!v) sheet.value = null
  }
})
const people = ref<MiniProfile[]>([])
const peopleBusy = ref(false)

async function openPeople(kind: 'followers' | 'following') {
  const p = profile.value
  if (!p) return
  sheet.value = kind
  people.value = []
  peopleBusy.value = true
  const cols = 'id, username, display_name, avatar_url'
  const { data } = kind === 'followers'
    ? await sb.from('follows').select(`p:profiles!follows_follower_id_fkey(${cols})`).eq('following_id', p.id).order('created_at', { ascending: false }).limit(200)
    : await sb.from('follows').select(`p:profiles!follows_following_id_fkey(${cols})`).eq('follower_id', p.id).order('created_at', { ascending: false }).limit(200)
  peopleBusy.value = false
  if (sheet.value !== kind) return
  people.value = ((data ?? []) as unknown as { p: MiniProfile | null }[]).map(r => r.p).filter((x): x is MiniProfile => !!x && !isBlocked(x.id))
}

watch(username, () => {
  resetLists()
  load()
}, { immediate: true })
watch(() => user.value?.id, (uid, prev) => {
  if (uid !== prev && state.value === 'ready') load()
})

const plantDay = (p: PublicPlant) => (p.start_date ? daysSince(p.start_date) : null)
</script>

<template>
  <div class="profile-page">
    <div class="topbar">
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('common.back')"
        @click="$goBack()"
      >
        <UIcon name="i-tabler-chevron-left" />
      </button>
      <CommunityReportMenu
        v-if="profile && state === 'ready' && !mine"
        target-type="profile"
        :target-id="profile.id"
        :author-id="profile.id"
        :author-name="name"
      />
    </div>

    <!-- loading -->
    <div
      v-if="state === 'loading'"
      class="page"
      aria-busy="true"
      :aria-label="t('common.loading')"
    >
      <div class="sk-hero">
        <span class="sk sk-avatar" />
        <span class="sk sk-line w60" />
        <span class="sk sk-line w40" />
      </div>
      <div class="stats">
        <span
          v-for="i in 6"
          :key="i"
          class="sk sk-stat"
        />
      </div>
    </div>

    <div
      v-else-if="state === 'missing' || state === 'error'"
      class="page"
    >
      <EmptyState
        :icon="state === 'missing' ? 'community' : 'seedling'"
        :title="state === 'missing' ? t('profile.notFound') : t('profile.loadError')"
        :text="state === 'missing' ? t('profile.notFoundText') : undefined"
      >
        <button
          v-if="state === 'error'"
          type="button"
          class="btn btn-soft"
          @click="load"
        >
          <UIcon name="i-tabler-refresh" /> {{ t('profile.retry') }}
        </button>
        <NuxtLink
          v-else
          to="/community"
          class="btn btn-soft"
        >
          {{ t('profile.toCommunity') }}
        </NuxtLink>
      </EmptyState>
    </div>

    <template v-else-if="profile">
      <section class="hero">
        <div
          class="hero-glow"
          aria-hidden="true"
        />
        <div class="avatar-ring">
          <CommunityUserAvatar
            :url="profile.avatar_url"
            :name="name"
            :size="88"
          />
        </div>
        <h1>{{ name }}</h1>
        <p class="handle">
          @{{ profile.username }}
        </p>
        <div class="badges">
          <span
            class="badge"
            :style="{ color: level.color }"
            :title="t('profile.levelHint', { n: profile.reputation })"
          >
            <GrowIcon
              :name="level.glyph"
              class="text-[14px]"
            />{{ level.label }}
          </span>
          <span class="badge exp">{{ t(`profile.experience.${profile.experience}`) }}</span>
          <span
            v-if="profile.first_grow"
            class="badge first"
            :title="t('profile.firstGrowHint')"
          >
            <GrowIcon
              name="seedling"
              class="text-[14px]"
            />{{ t('profile.firstGrow') }}
          </span>
        </div>

        <a
          v-if="pinnedBadges.length"
          href="#badges"
          class="pinned"
          :aria-label="`${t('profile.badges.pinned')}: ${pinnedBadges.map(b => badgeName(b)).join(', ')}`"
          @click.prevent="scrollToBadges"
        >
          <span
            v-for="b in pinnedBadges"
            :key="b.id"
            class="pinned-item"
          >
            <CommunityBadgeMedal
              :glyph="badgeGlyph(b)"
              :tier="b.tier"
              :size="40"
            />
            <span class="pinned-name">{{ badgeName(b) }}</span>
          </span>
        </a>

        <div
          v-if="setup.length"
          class="setup"
        >
          <span
            v-for="s in setup"
            :key="s.key"
            class="setup-chip"
          >
            <GrowIcon
              :name="s.icon"
              class="text-[15px]"
            />{{ s.label }}
          </span>
        </div>

        <p
          v-if="profile.bio"
          class="bio"
        >
          {{ profile.bio }}
        </p>
        <p
          v-if="profile.favorite_strain"
          class="fav"
        >
          <GrowIcon
            name="flowering"
            class="text-[15px]"
          />
          <span>{{ t('profile.favorite') }}:</span> <strong>{{ profile.favorite_strain }}</strong>
        </p>
        <p class="since">
          {{ t('profile.memberSince', { date: formatDate(profile.created_at.slice(0, 10), { month: 'long', year: 'numeric' }) }) }}
        </p>

        <NuxtLink
          v-if="mine"
          to="/settings#account"
          class="btn hero-btn"
        >
          <UIcon name="i-tabler-pencil" /> {{ t('profile.edit') }}
        </NuxtLink>
        <button
          v-else
          type="button"
          class="btn hero-btn"
          :class="isFollowing ? 'following' : 'btn-primary'"
          :aria-pressed="isFollowing"
          @click="toggleFollow"
        >
          <UIcon :name="isFollowing ? 'i-tabler-check' : 'i-tabler-user-plus'" />
          <span class="when-off">{{ isFollowing ? t('profile.following') : t('profile.follow') }}</span>
          <span
            v-if="isFollowing"
            class="when-hover"
          >{{ t('profile.unfollow') }}</span>
        </button>
      </section>

      <div class="page body">
        <section
          class="stats"
          :aria-label="t('profile.title')"
        >
          <div class="stat">
            <span class="stat-num num">{{ plants.length }}</span>
            <span class="stat-label">{{ t('profile.stats.plants') }}</span>
          </div>
          <div class="stat">
            <span class="stat-num num">{{ harvested.length }}<small
              v-if="totalDry"
              class="stat-dry"
            >{{ totalDry }} g</small></span>
            <span class="stat-label">{{ t('profile.stats.harvests') }}</span>
          </div>
          <div class="stat">
            <span class="stat-num num">{{ counts.posts }}</span>
            <span class="stat-label">{{ t('profile.stats.posts') }}</span>
          </div>
          <button
            type="button"
            class="stat tap"
            @click="openPeople('followers')"
          >
            <span class="stat-num num">{{ counts.followers }}</span>
            <span class="stat-label">{{ t('profile.stats.followers') }}</span>
          </button>
          <button
            type="button"
            class="stat tap"
            @click="openPeople('following')"
          >
            <span class="stat-num num">{{ counts.following }}</span>
            <span class="stat-label">{{ t('profile.stats.following') }}</span>
          </button>
          <div class="stat">
            <span
              class="stat-num num"
              :style="{ color: level.color }"
            >{{ profile.reputation }}</span>
            <span class="stat-label">{{ t('profile.stats.reputation') }}</span>
          </div>
        </section>

        <section
          class="level card"
          :style="{ '--lc': level.color }"
          aria-labelledby="h-level"
        >
          <div class="level-head">
            <span class="level-glyph"><GrowIcon
              :name="level.glyph"
              glow
            /></span>
            <div class="level-text">
              <h2
                id="h-level"
                class="level-name"
              >
                {{ level.label }}
              </h2>
              <span class="level-rep num">{{ t('profile.level.rep', { n: profile.reputation }) }}</span>
            </div>
            <span
              v-if="nextLevel"
              class="level-next num"
            >{{ t('profile.level.toNext', { n: (level.next ?? 0) - profile.reputation, next: nextLevel.label }) }}</span>
            <span
              v-else
              class="level-next"
            >{{ t('profile.level.top') }}</span>
          </div>
          <div
            class="progress"
            role="progressbar"
            :aria-valuenow="Math.round(levelPct * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="t('profile.level.title')"
          >
            <div :style="{ width: `${Math.round(levelPct * 100)}%` }" />
          </div>
          <p class="level-perk">
            <strong>{{ nextLevel ? t('profile.level.nextUnlocks', { next: nextLevel.label }) : t('profile.level.now') }}:</strong>
            {{ perk }}
          </p>
          <p
            v-if="mine"
            class="level-how"
          >
            {{ t('profile.level.how') }}
          </p>
        </section>

        <CommunityBadgeGrid
          v-if="badgeDefs.length && !blocked"
          :defs="badgeDefs"
          :earned="earnedAt"
          :pinned="profile.pinned_badges ?? []"
          :owner="mine"
          :user-id="profile.id"
          @pinned="onPinned"
        />

        <p
          v-if="blocked"
          class="blocked-note"
        >
          <UIcon name="i-tabler-ban" /> {{ t('report.blocked', { name }) }}
        </p>

        <section v-else>
          <div
            class="segmented"
            role="tablist"
          >
            <button
              v-for="x in tabs"
              :key="x.id"
              type="button"
              role="tab"
              :aria-selected="tab === x.id"
              @click="tab = x.id"
            >
              {{ x.label }}
            </button>
          </div>

          <!-- Plants -->
          <div
            v-if="tab === 'plants'"
            class="tab-body"
          >
            <EmptyState
              v-if="!plants.length"
              icon="seedling"
              :title="t('profile.empty.plants')"
              :text="t('profile.empty.plantsText')"
            />
            <ul
              v-else
              class="plant-grid rise"
            >
              <li
                v-for="p in plants"
                :key="p.id"
              >
                <NuxtLink
                  :to="`/plant/${p.id}`"
                  class="plant-card card"
                  :style="{ '--stage': stageInfo(p.stage).color }"
                >
                  <div class="plant-cover">
                    <img
                      v-if="p.cover_url"
                      :src="p.cover_url"
                      :alt="p.name"
                      loading="lazy"
                    >
                    <div
                      v-else
                      class="cover-tile"
                    >
                      <GrowIcon
                        :name="stageInfo(p.stage).glyph"
                        :stroke-width="1.2"
                      />
                    </div>
                    <span
                      class="badge stage"
                      :style="{ color: stageInfo(p.stage).color }"
                    >
                      <GrowIcon
                        :name="stageInfo(p.stage).glyph"
                        class="text-[13px]"
                      />{{ stageInfo(p.stage).label }}
                    </span>
                  </div>
                  <div class="plant-meta">
                    <p class="plant-name">
                      {{ p.name }}
                    </p>
                    <p class="plant-sub">
                      <span>{{ p.strain || t('profile.plant.unknownStrain') }}</span>
                      <span
                        v-if="p.harvest_dry_g"
                        class="lamp num"
                      >{{ Math.round(Number(p.harvest_dry_g)) }} g</span>
                      <span
                        v-else-if="plantDay(p) != null"
                        class="num"
                      >{{ t('profile.day', { n: plantDay(p)! }) }}</span>
                    </p>
                  </div>
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Posts -->
          <div
            v-else-if="tab === 'posts'"
            class="tab-body"
          >
            <ul
              v-if="posts.length"
              class="post-list rise"
            >
              <li
                v-for="p in posts"
                :key="p.id"
              >
                <CommunityFeedPostCard
                  :post="p"
                  @edit="navigateTo(`/community/post/${p.id}`)"
                  @deleted="posts = posts.filter(x => x.id !== p.id); counts.posts--"
                />
              </li>
            </ul>
            <EmptyState
              v-else-if="lists.posts.done && !lists.posts.error"
              icon="note"
              :title="t('profile.empty.posts')"
            />
          </div>

          <!-- Tips -->
          <div
            v-else
            class="tab-body"
          >
            <ul
              v-if="tips.length"
              class="post-list rise"
            >
              <li
                v-for="x in tips"
                :key="x.id"
                class="tip card"
              >
                <p
                  v-if="x.is_hidden"
                  class="removed"
                >
                  <UIcon name="i-tabler-eye-off" /> {{ t('profile.removed') }}
                </p>
                <p class="tip-body">
                  {{ x.body }}
                </p>
                <div class="tip-meta">
                  <span
                    v-if="x.stage"
                    class="badge"
                    :style="{ color: stageInfo(x.stage).color }"
                  >
                    <GrowIcon
                      :name="stageInfo(x.stage).glyph"
                      class="text-[13px]"
                    />{{ stageInfo(x.stage).label }}
                  </span>
                  <span class="tip-helpful num">
                    <UIcon name="i-tabler-thumb-up" /> {{ t('profile.helpful', { n: x.helpful_count }) }}
                  </span>
                  <span class="tip-ago num">{{ communityAgo(x.created_at) }}</span>
                  <CommunityReportMenu
                    v-if="!mine"
                    target-type="tip"
                    :target-id="x.id"
                    :author-id="profile.id"
                    :author-name="name"
                  />
                </div>
              </li>
            </ul>
            <EmptyState
              v-else-if="lists.tips.done && !lists.tips.error"
              icon="spark"
              :title="t('profile.empty.tips')"
            />
          </div>

          <template v-if="tab !== 'plants'">
            <div
              v-if="lists[tab].busy"
              class="post-list"
              aria-busy="true"
            >
              <span
                v-for="i in 3"
                :key="i"
                class="sk sk-row"
              />
            </div>
            <div
              v-else-if="lists[tab].error"
              class="list-error"
            >
              <span>{{ t('profile.loadError') }}</span>
              <button
                type="button"
                class="btn btn-soft"
                @click="loadMore(tab)"
              >
                {{ t('profile.retry') }}
              </button>
            </div>
            <div
              v-if="!lists[tab].done"
              ref="sentinel"
              class="sentinel"
              aria-hidden="true"
            />
          </template>
        </section>
      </div>

      <BottomSheet
        v-model:open="sheetOpen"
        :title="sheet === 'following' ? t('profile.stats.following') : t('profile.stats.followers')"
      >
        <div
          v-if="peopleBusy"
          class="people"
        >
          <span
            v-for="i in 4"
            :key="i"
            class="sk sk-person"
          />
        </div>
        <p
          v-else-if="!people.length"
          class="muted people-empty"
        >
          {{ t('profile.empty.list') }}
        </p>
        <ul
          v-else
          class="people"
        >
          <li
            v-for="u in people"
            :key="u.id"
          >
            <NuxtLink
              :to="`/u/${u.username}`"
              class="person"
              @click="sheet = null"
            >
              <CommunityUserAvatar
                :url="u.avatar_url"
                :name="u.display_name || u.username"
                :size="40"
              />
              <span class="person-text">
                <span class="person-name">{{ u.display_name || u.username }}</span>
                <span class="person-handle">@{{ u.username }}</span>
              </span>
              <UIcon
                name="i-tabler-chevron-right"
                class="person-go"
              />
            </NuxtLink>
          </li>
        </ul>
      </BottomSheet>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  position: relative;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(12px + var(--safe-top)) 16px 4px;
  pointer-events: none;
}

.topbar > * {
  pointer-events: auto;
}

.topbar :deep(.more-btn) {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(7, 8, 10, 0.66);
  border: 1px solid var(--line);
  color: var(--text);
}

/* ── Hero ── */
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 20px 8px;
  margin-top: -40px;
}

.hero-glow {
  position: absolute;
  inset: -40px 0 auto;
  height: 260px;
  background: radial-gradient(60% 70% at 50% 0%, rgba(255, 210, 138, 0.16), transparent 70%);
  pointer-events: none;
}

.avatar-ring {
  position: relative;
  margin-top: 28px;
  padding: 4px;
  border-radius: 50%;
  background: conic-gradient(from 200deg, var(--leaf-deep), var(--leaf), var(--lamp), var(--leaf-deep));
  box-shadow: 0 0 28px rgba(155, 227, 107, 0.25);
}

.avatar-ring :deep(.avatar) {
  border: 3px solid var(--bg);
}

h1 {
  position: relative;
  margin: 14px 0 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.handle {
  margin: 2px 0 0;
  color: var(--text-3);
  font-size: 14px;
}

.badges {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.badge.exp {
  color: var(--text-2);
}

.badge.first {
  color: #c8f08f;
}

.badges {
  flex-wrap: wrap;
  justify-content: center;
}

.pinned {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 14px;
  padding: 4px;
}

.pinned-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 72px;
}

.pinned-name {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-2);
  text-align: center;
  overflow-wrap: anywhere;
}

/* ── Level ── */
.level {
  padding: 14px 16px 16px;
}

.level-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.level-glyph {
  font-size: 26px;
  color: var(--lc);
  display: inline-flex;
}

.level-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.level-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--lc);
}

.level-rep {
  font-size: 12px;
  color: var(--text-3);
}

.level-next {
  max-width: 48%;
  font-size: 12px;
  font-weight: 500;
  text-align: right;
  color: var(--text-2);
}

.level .progress > div {
  background: linear-gradient(90deg, color-mix(in srgb, var(--lc) 55%, #0b0d10), var(--lc));
}

.level-perk {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.level-perk strong {
  color: var(--text);
  font-weight: 600;
}

.level-how {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-3);
}

.setup {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
}

.setup-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
}

.setup-chip .grow-icon,
.setup-chip .iconify {
  color: var(--leaf);
}

.bio {
  margin: 14px 0 0;
  max-width: 34ch;
  font-size: 15px;
  line-height: 1.45;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.fav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.fav .grow-icon {
  color: #c9a2ff;
}

.fav strong {
  color: var(--text);
  font-weight: 600;
}

.since {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.hero-btn {
  margin-top: 16px;
  min-width: 180px;
}

.hero-btn.following {
  color: var(--leaf);
}

.when-hover {
  display: none;
}

@media (hover: hover) {
  .hero-btn.following:hover .when-off {
    display: none;
  }

  .hero-btn.following:hover .when-hover {
    display: inline;
  }

  .hero-btn.following:hover {
    color: var(--danger);
  }
}

/* ── Stats ── */
.body {
  padding-top: 20px;
  gap: 22px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 68px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight);
  text-align: left;
  min-width: 0;
}

.stat.tap {
  transition: transform var(--dur-fast) var(--ease-out);
}

.stat.tap:active {
  transform: scale(0.96);
}

.stat-num {
  font-size: 26px;
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.stat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.lamp {
  color: var(--lamp);
}

.stat-dry {
  margin-left: 6px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--lamp);
}

.blocked-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--line);
  color: var(--text-2);
  font-size: 14px;
}

.tab-body {
  margin-top: 14px;
}

/* ── Plants ── */
.plant-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plant-card {
  display: block;
  overflow: hidden;
  transition: transform var(--dur-fast) var(--ease-out);
}

.plant-card:active {
  transform: scale(0.97);
}

.plant-cover {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.plant-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-tile {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 54px;
  color: var(--stage);
  background: radial-gradient(90% 80% at 50% 0%, color-mix(in srgb, var(--stage) 26%, #10251a) 0%, #0d1d12 55%, #070d09 100%);
}

.cover-tile .grow-icon {
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--stage) 45%, transparent));
}

.badge.stage {
  position: absolute;
  left: 8px;
  bottom: 8px;
  background: color-mix(in srgb, currentColor 14%, color-mix(in srgb, var(--bg) 88%, transparent));
}

.plant-meta {
  padding: 10px 12px 12px;
}

.plant-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-sub {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.plant-sub span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Posts / tips ── */
.post-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.removed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--text-3);
}

.tip {
  padding: 14px 14px 6px;
}

.tip-body {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.tip-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-3);
}

.tip-helpful {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--leaf);
}

.tip-ago {
  margin-left: auto;
}

.list-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-2);
}

.sentinel {
  height: 1px;
}

/* ── People sheet ── */
.people {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0 0 8px;
  list-style: none;
}

.people-empty {
  padding: 12px 0 20px;
  text-align: center;
}

.person {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--line);
}

.person-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.person-name {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-handle {
  font-size: 12px;
  color: var(--text-3);
}

.person-go {
  color: var(--text-3);
}

/* ── Skeletons ── */
.sk {
  display: block;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--surface) 0%, var(--surface-3) 50%, var(--surface) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.sk-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 8px;
}

.sk-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
}

.sk-line {
  height: 14px;
}

.w60 {
  width: 60%;
}

.w40 {
  width: 40%;
}

.sk-stat {
  height: 68px;
  border-radius: 14px;
}

.sk-row {
  height: 96px;
  border-radius: 16px;
}

.sk-person {
  height: 52px;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sk {
    animation: none;
  }
}
</style>
