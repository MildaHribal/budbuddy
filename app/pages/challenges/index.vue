<script setup lang="ts">
import { useOnlineRetry } from '~/utils/feed/online'
import { challengeDescription, challengePhase, challengeTitle, rankEntries, type Challenge, type ChallengeEntry } from '~/utils/challenge'

const { t } = useI18n()
useHead({ title: () => t('challenge.title') })

const sb = useSupabase()
const { isBlocked, load: loadBlocks } = useBlocks()

const PAGE = 20
const loading = ref(true)
const failed = ref(false)
const current = ref<Challenge | null>(null)
const currentCount = ref(0)
const past = ref<{ c: Challenge, winners: ChallengeEntry[] }[]>([])
const pastDone = ref(false)
const pastBusy = ref(false)
const now = ref(Date.now())

const phase = computed(() => (current.value ? challengePhase(current.value, now.value) : null))

async function winnersOf(id: string): Promise<ChallengeEntry[]> {
  const { data } = await queryEntries(q => q.eq('challenge_id', id).order('votes_count', { ascending: false }).order('created_at').limit(6))
  return rankEntries((data ?? []) as unknown as ChallengeEntry[]).filter(e => !isBlocked(e.user_id)).slice(0, 3)
}

async function loadPast() {
  if (pastBusy.value || pastDone.value) return
  pastBusy.value = true
  try {
    const iso = new Date().toISOString()
    const { data, error } = await sb.from('challenges').select('*').lt('voting_ends_at', iso)
      .order('voting_ends_at', { ascending: false }).range(past.value.length, past.value.length + PAGE - 1)
    if (error) throw error
    const list = (data ?? []) as Challenge[]
    if (list.length < PAGE) pastDone.value = true
    const withWinners = await Promise.all(list.map(async c => ({ c, winners: await winnersOf(c.id) })))
    past.value.push(...withWinners)
  } finally {
    pastBusy.value = false
  }
}

async function load() {
  loading.value = true
  failed.value = false
  past.value = []
  pastDone.value = false
  now.value = Date.now()
  try {
    await loadBlocks()
    const iso = new Date().toISOString()
    // running first, else the next one to start
    const { data, error } = await sb.from('challenges').select('*').gte('voting_ends_at', iso)
      .order('starts_at').limit(4)
    if (error) throw error
    const list = (data ?? []) as Challenge[]
    current.value = list.find(c => challengePhase(c) !== 'upcoming') ?? list[0] ?? null
    if (current.value) {
      const { count } = await sb.from('challenge_entries').select('id', { count: 'exact', head: true }).eq('challenge_id', current.value.id)
      currentCount.value = count ?? 0
    }
    await loadPast()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

const sentinel = ref<HTMLElement | null>(null)
useIntersectionObserver(sentinel, ([e]) => {
  if (e?.isIntersecting && !loading.value) loadPast().catch(() => {})
}, { rootMargin: '300px' })

const monthLabel = (iso: string) => new Intl.DateTimeFormat(intlLocale(), { month: 'long', year: 'numeric' }).format(new Date(iso))
const authorName = (e: ChallengeEntry) => e.author?.display_name || e.author?.username || '—'
const crownDate = computed(() => (current.value ? new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: intlLocale() === 'cs-CZ' ? 'numeric' : 'short' }).format(new Date(current.value.voting_ends_at)) : null))
useOnlineRetry(() => failed.value, load)
</script>

<template>
  <div>
    <AppHeader
      :title="t('challenge.title')"
      :subtitle="t('challenge.subtitle')"
      back
    />
    <div class="page">
      <template v-if="loading">
        <div class="skeleton hero-sk" />
        <div class="skeleton row-sk" />
      </template>

      <div
        v-else-if="failed"
        class="error card"
      >
        <p class="muted">
          {{ t('challenge.loadError') }}
        </p>
        <button
          type="button"
          class="btn btn-soft"
          @click="load"
        >
          <UIcon name="i-tabler-refresh" />{{ t('challenge.retry') }}
        </button>
      </div>

      <template v-else>
        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('challenge.current') }}
            </h2>
          </div>
          <NuxtLink
            v-if="current && phase"
            :to="`/challenges/${current.slug}`"
            class="hero card"
          >
            <div
              class="hero-cover"
              aria-hidden="true"
            >
              <img
                v-if="current.cover_url"
                :src="current.cover_url"
                alt=""
              >
              <UIcon
                v-else
                name="i-tabler-trophy"
              />
            </div>
            <div class="hero-body">
              <div class="hero-top">
                <ChallengePhaseBadge :phase="phase" />
                <span class="section-meta num">{{ monthLabel(current.starts_at) }}</span>
              </div>
              <h3>{{ challengeTitle(current) }}</h3>
              <p
                v-if="current.description"
                class="desc"
              >
                {{ challengeDescription(current) }}
              </p>
              <div class="hero-foot">
                <ChallengeCountdown
                  :challenge="current"
                  @phase="now = Date.now()"
                />
                <span class="count num">{{ t('challenge.entries', { n: currentCount }) }}</span>
              </div>
              <span class="btn btn-primary btn-block">
                {{ phase === 'entries' ? t('challenge.enter') : t('challenge.viewEntries') }}
                <UIcon name="i-tabler-arrow-right" />
              </span>
            </div>
          </NuxtLink>
          <EmptyState
            v-else
            icon="lamp"
            :title="t('challenge.noCurrent')"
            :text="t('challenge.noCurrentText')"
          />
        </section>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('challenge.past') }}
            </h2>
          </div>
          <EmptyState
            v-if="!past.length"
            icon="harvest"
            :title="t('challenge.noPastTitle')"
            :text="crownDate ? t('challenge.noPastDated', { date: crownDate }) : t('challenge.noPast')"
          />
          <ul
            v-else
            class="past card rise"
          >
            <li
              v-for="p in past"
              :key="p.c.id"
            >
              <NuxtLink
                :to="`/challenges/${p.c.slug}`"
                class="past-row"
              >
                <span class="past-thumb">
                  <img
                    v-if="p.winners[0]"
                    :src="p.winners[0].image_url"
                    alt=""
                    loading="lazy"
                  >
                  <UIcon
                    v-else
                    name="i-tabler-trophy"
                  />
                </span>
                <span class="past-text">
                  <span class="past-title">{{ challengeTitle(p.c) }}</span>
                  <span class="past-meta">
                    <span class="num">{{ monthLabel(p.c.starts_at) }}</span>
                    <template v-if="p.winners[0]"> · {{ authorName(p.winners[0]) }}</template>
                    <template v-else> · {{ t('challenge.noWinners') }}</template>
                  </span>
                </span>
                <UIcon
                  name="i-tabler-chevron-right"
                  class="chev"
                />
              </NuxtLink>
            </li>
          </ul>
          <div
            v-if="!pastDone"
            ref="sentinel"
            class="sentinel"
          />
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--line);
  animation: pulse 1.4s ease-in-out infinite;
}

.hero-sk { height: 360px; }
.row-sk { height: 120px; }

@keyframes pulse {
  50% { opacity: 0.55; }
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.hero {
  display: block;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.hero:active {
  transform: scale(0.985);
}

.hero-cover {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  background: var(--surface-2);
  color: var(--text-3);
  font-size: 40px;
}

.hero-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px 16px;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.desc {
  margin: 0;
  color: var(--text-2);
  font-size: 15px;
  line-height: 1.45;
}

.hero-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
}

.count {
  flex-shrink: 0;
  padding-bottom: 3px;
  font-size: 13px;
  color: var(--text-2);
}

.hero .btn {
  margin-top: 4px;
}

.past {
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: hidden;
}

.past li + li {
  border-top: 1px solid var(--line);
}

.past-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 8px 12px 8px 8px;
  color: inherit;
  text-decoration: none;
}

.past-thumb {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-3);
  font-size: 22px;
}

.past-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.past-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.past-title {
  font-size: 15px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.past-meta {
  font-size: 13px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chev {
  flex-shrink: 0;
  color: var(--text-3);
  font-size: 20px;
}

.sentinel {
  height: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
</style>
