<script setup lang="ts">
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
              <GrowIcon name="lamp" />{{ t('challenge.current') }}
            </h2>
          </div>
          <NuxtLink
            v-if="current && phase"
            :to="`/challenges/${current.slug}`"
            class="hero"
          >
            <div
              class="hero-bg"
              aria-hidden="true"
            >
              <img
                v-if="current.cover_url"
                :src="current.cover_url"
                alt=""
              >
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
              <UIcon name="i-tabler-trophy" />{{ t('challenge.past') }}
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
            class="past rise"
          >
            <li
              v-for="p in past"
              :key="p.c.id"
            >
              <NuxtLink
                :to="`/challenges/${p.c.slug}`"
                class="past-card card"
              >
                <div class="past-head">
                  <div>
                    <p class="past-title">
                      {{ challengeTitle(p.c) }}
                    </p>
                    <p class="section-meta">
                      {{ monthLabel(p.c.starts_at) }}
                    </p>
                  </div>
                  <UIcon
                    name="i-tabler-chevron-right"
                    class="chev"
                  />
                </div>
                <ol
                  v-if="p.winners.length"
                  class="mini-podium"
                >
                  <li
                    v-for="(w, i) in p.winners"
                    :key="w.id"
                    :class="{ first: i === 0 }"
                  >
                    <img
                      :src="w.image_url"
                      alt=""
                      loading="lazy"
                    >
                    <span class="mini-place num">{{ i + 1 }}</span>
                    <span class="mini-name">{{ authorName(w) }}</span>
                  </li>
                </ol>
                <p
                  v-else
                  class="section-meta"
                >
                  {{ t('challenge.noWinners') }}
                </p>
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
  background: linear-gradient(100deg, var(--surface) 30%, var(--surface-3) 50%, var(--surface) 70%);
  background-size: 300% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.hero-sk { height: 320px; border-radius: var(--radius-lg); }
.row-sk { height: 140px; }

@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: 0 0; }
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
  position: relative;
  display: block;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 210, 138, 0.2);
  background: linear-gradient(180deg, #211f1a 0%, var(--surface-2) 100%);
  box-shadow: var(--panel-shadow);
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  isolation: isolate;
  transition: transform var(--dur-fast) var(--ease-out);
}

.hero:active {
  transform: scale(0.985);
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 160px;
  z-index: -1;
  background: radial-gradient(70% 100% at 50% -10%, rgba(255, 210, 138, 0.22), transparent 70%);
}

.hero-bg {
  height: 150px;
  position: relative;
}

.hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  mask-image: linear-gradient(180deg, #000 40%, transparent);
}

.hero-bg:not(:has(img)) {
  height: 24px;
}

.hero-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 18px 18px;
  margin-top: -32px;
  position: relative;
}

.hero-bg:not(:has(img)) + .hero-body {
  margin-top: 0;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.15;
}

.desc {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.5;
}

.hero-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.count {
  font-size: 13px;
  color: var(--text-2);
  padding-bottom: 4px;
}

.small {
  margin: 0;
  font-size: 13px;
}

.past {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.past-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  color: inherit;
  text-decoration: none;
}

.past-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.past-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
}

.chev {
  color: var(--text-3);
  font-size: 20px;
}

.mini-podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mini-podium li {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.mini-podium img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
}

.mini-podium .first img {
  border-color: rgba(255, 210, 138, 0.5);
  box-shadow: 0 0 16px -4px rgba(255, 210, 138, 0.45);
}

.mini-place {
  position: absolute;
  top: 5px;
  left: 5px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(7, 8, 10, 0.72);
  font-size: 11px;
  font-weight: 600;
}

.first .mini-place {
  background: var(--lamp);
  color: #1a1206;
}

.mini-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-2);
}

.sentinel {
  height: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
</style>
