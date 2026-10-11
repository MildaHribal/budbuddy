<script setup lang="ts">
import { canVote, challengePhase, rankEntries, type Challenge, type ChallengeEntry } from '~/utils/challenge'

const route = useRoute()
const { t } = useI18n()
const sb = useSupabase()
const { user, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { notify } = useNotify()
const { confirm } = useConfirm()

const PAGE = 20
const slug = computed(() => String(route.params.slug))
const challenge = ref<Challenge | null>(null)
const loading = ref(true)
const failed = ref(false)
const entries = ref<ChallengeEntry[]>([])
const entriesDone = ref(false)
const entriesBusy = ref(false)
const winners = ref<ChallengeEntry[]>([])
const myEntry = ref<ChallengeEntry | null>(null)
const myVote = ref<string | null>(null)
const voteBusy = ref(false)
const enterOpen = ref(false)
const now = ref(Date.now())

useHead({ title: () => challenge.value?.title ?? t('challenge.title') })

const phase = computed(() => (challenge.value ? challengePhase(challenge.value, now.value) : null))
const votingOpen = computed(() => !!challenge.value && canVote(challenge.value, now.value))
const visible = computed(() => entries.value.filter(e => !isBlocked(e.user_id) && e.user_id !== user.value?.id))
const monthLabel = (iso: string) => new Intl.DateTimeFormat(intlLocale(), { month: 'long', year: 'numeric' }).format(new Date(iso))
const name = (e: ChallengeEntry) => e.author?.display_name || e.author?.username || '—'

async function loadEntries() {
  if (!challenge.value || entriesBusy.value || entriesDone.value) return
  entriesBusy.value = true
  try {
    let q = sb.from('challenge_entries').select(ENTRY_SELECT).eq('challenge_id', challenge.value.id)
    q = phase.value === 'finished'
      ? q.order('votes_count', { ascending: false }).order('created_at')
      : q.order('created_at', { ascending: false })
    const { data, error } = await q.range(entries.value.length, entries.value.length + PAGE - 1)
    if (error) throw error
    const list = (data ?? []) as unknown as ChallengeEntry[]
    if (list.length < PAGE) entriesDone.value = true
    const seen = new Set(entries.value.map(e => e.id))
    entries.value.push(...list.filter(e => !seen.has(e.id)))
  } finally {
    entriesBusy.value = false
  }
}

async function loadMine() {
  myEntry.value = null
  myVote.value = null
  const uid = user.value?.id
  if (!uid || !challenge.value) return
  const [entry, vote] = await Promise.all([
    sb.from('challenge_entries').select(ENTRY_SELECT).eq('challenge_id', challenge.value.id).eq('user_id', uid).maybeSingle(),
    sb.from('challenge_votes').select('entry_id').eq('challenge_id', challenge.value.id).eq('user_id', uid).maybeSingle()
  ])
  myEntry.value = (entry.data as unknown as ChallengeEntry | null) ?? null
  myVote.value = (vote.data?.entry_id as string | undefined) ?? null
}

async function loadWinners() {
  winners.value = []
  if (!challenge.value || phase.value !== 'finished') return
  const { data } = await sb.from('challenge_entries').select(ENTRY_SELECT).eq('challenge_id', challenge.value.id)
    .order('votes_count', { ascending: false }).order('created_at').limit(6)
  winners.value = rankEntries((data ?? []) as unknown as ChallengeEntry[]).filter(e => !isBlocked(e.user_id)).slice(0, 3)
}

async function load() {
  loading.value = true
  failed.value = false
  entries.value = []
  entriesDone.value = false
  now.value = Date.now()
  try {
    await loadBlocks()
    const { data, error } = await sb.from('challenges').select('*').eq('slug', slug.value).maybeSingle()
    if (error) throw error
    challenge.value = data as Challenge | null
    if (challenge.value) await Promise.all([loadEntries(), loadMine(), loadWinners()])
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(slug, load)
watch(() => user.value?.id, () => loadMine().catch(() => {}))

const sentinel = ref<HTMLElement | null>(null)
useIntersectionObserver(sentinel, ([e]) => {
  if (e?.isIntersecting && !loading.value) loadEntries().catch(() => {})
}, { rootMargin: '400px' })

function bump(id: string | null, delta: number) {
  if (!id) return
  for (const list of [entries.value, winners.value]) {
    const e = list.find(x => x.id === id)
    if (e) e.votes_count = Math.max(0, e.votes_count + delta)
  }
}

async function vote(e: ChallengeEntry) {
  if (!requireAuth() || !user.value || !challenge.value || voteBusy.value) return
  if (!votingOpen.value) return notify(t('challenge.votingClosed'), { tone: 'info' })
  const prev = myVote.value
  const removing = prev === e.id
  voteBusy.value = true
  myVote.value = removing ? null : e.id
  bump(prev, -1)
  if (!removing) bump(e.id, 1)
  const { error } = removing
    ? await sb.from('challenge_votes').delete().eq('user_id', user.value.id).eq('challenge_id', challenge.value.id)
    : await sb.from('challenge_votes').upsert(
        { user_id: user.value.id, challenge_id: challenge.value.id, entry_id: e.id },
        { onConflict: 'user_id,challenge_id' }
      )
  voteBusy.value = false
  if (!error) return
  myVote.value = prev
  if (!removing) bump(e.id, -1)
  bump(prev, 1)
  notify(error.message.includes('closed') ? t('challenge.votingClosed') : t('challenge.voteError'), { tone: 'error' })
}

function startEntry() {
  if (!requireAuth()) return
  enterOpen.value = true
}

function onEntered(entry: ChallengeEntry) {
  myEntry.value = entry
}

async function withdraw() {
  const e = myEntry.value
  if (!e) return
  const ok = await confirm({ title: t('challenge.withdrawConfirm'), message: t('challenge.withdrawText'), confirmLabel: t('challenge.withdraw'), danger: true })
  if (!ok) return
  const { error } = await sb.from('challenge_entries').delete().eq('id', e.id)
  if (error) return notify(t('challenge.sheet.error'), { tone: 'error' })
  removeChallengeImage(e.image_url)
  myEntry.value = null
  entries.value = entries.value.filter(x => x.id !== e.id)
  notify(t('challenge.withdrawn'), { tone: 'info' })
}

const editOpen = ref(false)
const editCaption = ref('')
const editBusy = ref(false)
function startEdit() {
  editCaption.value = myEntry.value?.caption ?? ''
  editOpen.value = true
}
async function saveCaption() {
  const e = myEntry.value
  if (!e) return
  editBusy.value = true
  const caption = editCaption.value.trim() || null
  const { error } = await sb.from('challenge_entries').update({ caption }).eq('id', e.id)
  editBusy.value = false
  if (error) return notify(t('challenge.sheet.error'), { tone: 'error' })
  e.caption = caption
  editOpen.value = false
}
</script>

<template>
  <div>
    <AppHeader
      :title="challenge?.title ?? t('challenge.title')"
      :subtitle="challenge ? monthLabel(challenge.starts_at) : undefined"
      back
    />
    <div class="page">
      <template v-if="loading">
        <div class="skeleton head-sk" />
        <div class="grid">
          <div
            v-for="i in 4"
            :key="i"
            class="skeleton tile-sk"
          />
        </div>
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

      <EmptyState
        v-else-if="!challenge || !phase"
        icon="lamp"
        :title="t('challenge.notFound')"
        :text="t('challenge.notFoundText')"
      >
        <NuxtLink
          to="/challenges"
          class="btn btn-soft"
        >
          {{ t('challenge.back') }}
        </NuxtLink>
      </EmptyState>

      <template v-else>
        <section class="intro card">
          <img
            v-if="challenge.cover_url"
            :src="challenge.cover_url"
            alt=""
            class="cover"
          >
          <div class="intro-body">
            <ChallengePhaseBadge :phase="phase" />
            <p
              v-if="challenge.description"
              class="desc"
            >
              {{ challenge.description }}
            </p>
            <ChallengeCountdown
              :challenge="challenge"
              @phase="now = Date.now()"
            />
            <p
              v-if="phase !== 'finished'"
              class="rules"
            >
              <UIcon name="i-tabler-info-circle" />{{ t('challenge.rules') }}
            </p>
            <button
              v-if="phase === 'entries' && !myEntry"
              type="button"
              class="btn btn-primary btn-block"
              @click="startEntry"
            >
              <UIcon name="i-tabler-photo-plus" />{{ t('challenge.enter') }}
            </button>
          </div>
        </section>

        <ChallengePodium
          v-if="phase === 'finished' && winners.length"
          :winners="winners"
          :title="t('challenge.podiumTitle')"
        />

        <section v-if="myEntry">
          <div class="section-head">
            <h2 class="section-title">
              <GrowIcon name="photo" />{{ t('challenge.yourEntry') }}
            </h2>
            <span class="section-meta num">{{ t('challenge.votes', { n: myEntry.votes_count }) }}</span>
          </div>
          <article class="mine card">
            <img
              :src="myEntry.image_url"
              :alt="myEntry.caption || ''"
            >
            <div class="mine-body">
              <p
                v-if="myEntry.is_hidden"
                class="removed"
              >
                <UIcon name="i-tabler-eye-off" />{{ t('challenge.removed') }}
              </p>
              <p
                v-if="myEntry.caption"
                class="caption"
                lang="en"
              >
                {{ myEntry.caption }}
              </p>
              <div class="mine-actions">
                <button
                  v-if="phase !== 'finished'"
                  type="button"
                  class="btn btn-ghost"
                  @click="startEdit"
                >
                  <UIcon name="i-tabler-pencil" />{{ t('common.edit') }}
                </button>
                <button
                  v-if="phase !== 'finished'"
                  type="button"
                  class="btn btn-danger"
                  @click="withdraw"
                >
                  {{ t('challenge.withdraw') }}
                </button>
              </div>
            </div>
          </article>
        </section>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              <UIcon name="i-tabler-layout-grid" />{{ t('challenge.allEntries') }}
            </h2>
          </div>
          <EmptyState
            v-if="!visible.length && entriesDone"
            icon="photo"
            :title="t('challenge.noEntries')"
            :text="phase === 'entries' ? t('challenge.noEntriesText') : undefined"
          />
          <ul
            v-else
            class="grid rise"
          >
            <li
              v-for="e in visible"
              :key="e.id"
              class="tile"
            >
              <div class="shot">
                <img
                  :src="e.image_url"
                  :alt="e.caption || name(e)"
                  loading="lazy"
                >
                <div class="tile-more">
                  <CommunityReportMenu
                    target-type="entry"
                    :target-id="e.id"
                    :author-id="e.user_id"
                    :author-name="name(e)"
                  />
                </div>
              </div>
              <div class="tile-body">
                <CommunityAuthorChip
                  :author="e.author"
                  :size="22"
                  :badge="false"
                  class="who"
                />
                <p
                  v-if="e.caption"
                  class="tile-caption"
                  lang="en"
                >
                  {{ e.caption }}
                </p>
                <button
                  v-if="votingOpen"
                  type="button"
                  class="vote"
                  :class="{ on: myVote === e.id }"
                  :aria-pressed="myVote === e.id"
                  :aria-label="myVote === e.id ? t('challenge.removeVote') : t('challenge.voteFor', { name: name(e) })"
                  @click="vote(e)"
                >
                  <UIcon :name="myVote === e.id ? 'i-tabler-star-filled' : 'i-tabler-star'" />
                  <span class="num">{{ e.votes_count }}</span>
                  <span class="vote-label">{{ myVote === e.id ? t('challenge.voted') : t('challenge.vote') }}</span>
                </button>
                <span
                  v-else
                  class="votes num"
                >
                  <UIcon name="i-tabler-star" />{{ t('challenge.votes', { n: e.votes_count }) }}
                </span>
              </div>
            </li>
          </ul>
          <div
            v-if="!entriesDone"
            ref="sentinel"
            class="sentinel"
          />
        </section>
      </template>
    </div>

    <ChallengeEnterSheet
      v-if="challenge"
      v-model:open="enterOpen"
      :challenge="challenge"
      @entered="onEntered"
    />

    <BottomSheet
      v-model:open="editOpen"
      :title="t('challenge.sheet.caption')"
    >
      <form
        class="form-stack"
        @submit.prevent="saveCaption"
      >
        <textarea
          v-model="editCaption"
          class="input"
          maxlength="300"
          rows="2"
          lang="en"
          :placeholder="t('challenge.sheet.captionPlaceholder')"
        />
        <p class="field-hint">
          {{ t('challenge.sheet.english') }}
        </p>
        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="editBusy"
        >
          {{ t('common.save') }}
        </button>
      </form>
    </BottomSheet>
  </div>
</template>

<style scoped>
.skeleton {
  border-radius: var(--radius);
  background: linear-gradient(100deg, var(--surface) 30%, var(--surface-3) 50%, var(--surface) 70%);
  background-size: 300% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.head-sk { height: 220px; }
.tile-sk { aspect-ratio: 4 / 5; }

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

.intro {
  overflow: hidden;
}

.cover {
  display: block;
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.intro-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
}

.desc {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.5;
}

.rules {
  display: flex;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}

.rules .iconify {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 15px;
}

.mine {
  display: flex;
  gap: 12px;
  padding: 10px;
}

.mine > img {
  width: 104px;
  height: 104px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 12px;
}

.mine-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mine-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.mine-actions .btn {
  min-height: 44px;
  padding: 0 12px;
  font-size: 13px;
}

.removed {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
  color: #ff9aa3;
}

.caption {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tile {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: var(--panel-shadow);
  overflow: hidden;
}

.shot {
  position: relative;
  aspect-ratio: 4 / 5;
  background: var(--surface);
}

.shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tile-more {
  position: absolute;
  top: 4px;
  right: 4px;
  border-radius: 12px;
  background: rgba(7, 8, 10, 0.55);
  backdrop-filter: blur(6px);
}

.tile-more :deep(.more-btn) {
  color: var(--text);
}

.tile-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.who {
  flex: none;
  gap: 6px;
  min-height: 32px;
}

.who :deep(.chip-name) {
  font-size: 12px;
}

.tile-caption {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.vote {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
  transition: background var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.vote:active {
  transform: scale(0.96);
}

.vote .iconify {
  font-size: 18px;
}

.vote-label {
  margin-left: auto;
}

.vote.on {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--leaf);
}

.vote.on .iconify {
  animation: vote-burst 420ms var(--ease-out);
  filter: drop-shadow(0 0 6px rgba(155, 227, 107, 0.6));
}

@keyframes vote-burst {
  0% { transform: scale(0.6); }
  55% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.votes {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-3);
}

.sentinel {
  height: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton,
  .vote.on .iconify {
    animation: none;
  }
}
</style>
