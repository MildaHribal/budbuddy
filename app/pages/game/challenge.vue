<script setup lang="ts">
import { STRAINS } from '~~/shared/game/content/catalog'
import { COMMUNITY_NAMESPACES, loadNamespaces } from '~/composables/useI18n'
import { authUiWanted } from '~/utils/authUi'
import { CHALLENGE_LEVEL } from '~/utils/gameUi'
import { ChallengeError, fetchCurrentChallenge, type CurrentChallenge } from '~/components/game/challenge/api'
import { useChallengeRun } from '~/components/game/challenge/useChallengeRun'

const { t } = useI18n()
useHead({ title: () => t('gameChallenge.title') })
const { notify } = useNotify()
const { confirm } = useConfirm()
const { requireAuth } = useAuth()
const game = useGame()
const runner = useChallengeRun()
const { run, ready: runReady, finished } = runner

/** a run takes roughly this many real hours from seed to jar (autoflower + dry + cure) */
const RUN_REAL_H = 30

const challenge = ref<CurrentChallenge | null>(null)
const loading = ref(true)
const failed = ref(false)
const now = ref(Date.now())
const busy = ref(false)
const submitError = ref<string | null>(null)
const boardKey = ref(0)

async function load() {
  loading.value = true
  failed.value = false
  try {
    challenge.value = await fetchCurrentChallenge()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setInterval> | undefined
function tick() {
  now.value = Date.now()
  runner.sync()
}
function onVisible() {
  if (document.visibilityState === 'visible') tick()
  else runner.flush().catch(() => {})
}
onMounted(() => {
  load()
  timer = setInterval(tick, 30_000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
  runner.flush().catch(() => {})
})

// offline with a run in progress: keep playing from the saved definition
const shown = computed(() => challenge.value ?? (run.value ? { id: run.value.challengeId, endsAt: run.value.endsAt, def: run.value.def, startsAt: '' } : null))
const weekNo = (id: string) => Number(id.split('-W')[1] ?? 0)
const msLeft = computed(() => (shown.value ? Date.parse(shown.value.endsAt) - now.value : 0))
const timeLeft = computed(() => {
  const ms = msLeft.value
  if (ms <= 0) return t('gameChallenge.ended')
  const h = Math.floor(ms / 3_600_000)
  return h < 24 ? t('gameChallenge.hoursLeft', { h: Math.max(1, h) }) : t('gameChallenge.timeLeft', { d: Math.floor(h / 24), h: h % 24 })
})
const shortTime = computed(() => msLeft.value > 0 && msLeft.value < RUN_REAL_H * 3_600_000)
const strainName = computed(() => {
  const id = shown.value?.def.strainId ?? ''
  return STRAINS.find(s => s.id === id)?.name ?? id
})
const level = computed(() => game.state.value?.level ?? 1)
const stale = computed(() => !!run.value && ((!!challenge.value && run.value.challengeId !== challenge.value.id) || Date.parse(run.value.endsAt) < now.value))

type Phase = 'loading' | 'error' | 'locked' | 'intro' | 'stale' | 'play' | 'submit' | 'result'
const phase = computed<Phase>(() => {
  if (!runReady.value || (loading.value && !run.value)) return 'loading'
  if (run.value) {
    if (stale.value) return 'stale'
    if (run.value.submitted) return 'result'
    return finished.value ? 'submit' : 'play'
  }
  if (failed.value || !challenge.value) return 'error'
  return level.value < CHALLENGE_LEVEL ? 'locked' : 'intro'
})

function start() {
  if (!challenge.value) return
  const r = runner.start(challenge.value)
  if (!r.ok) notify(t('gameChallenge.err.generic'), { tone: 'error' })
}

async function askSignIn(): Promise<boolean> {
  authUiWanted.value = true
  await loadNamespaces([...COMMUNITY_NAMESPACES]).catch(() => {})
  return requireAuth()
}

const localScore = computed(() => (phase.value === 'submit' ? runner.localScore() : null))

async function submit() {
  if (busy.value) return
  submitError.value = null
  if (!(await askSignIn())) return
  busy.value = true
  try {
    const r = await runner.submit()
    boardKey.value++
    if (r.coins) notify(t('gameChallenge.result.coins', { n: r.coins }))
  } catch (e) {
    const reason = e instanceof ChallengeError ? e.reason : 'generic'
    const known = ['auth_required', 'closed', 'too_fast', 'unfinished', 'replay_failed', 'quota', 'banned', 'network']
    submitError.value = t(`gameChallenge.err.${known.includes(reason) ? reason : 'generic'}`)
  } finally {
    busy.value = false
  }
}

async function again() {
  const ok = await confirm({ title: t('gameChallenge.result.againTitle'), message: t('gameChallenge.result.againText'), confirmLabel: t('gameChallenge.result.againOk') })
  if (!ok) return
  await runner.discard()
  start()
}

const result = computed(() => run.value?.submitted ?? null)
const fmt = (n: number | undefined) => Math.round(Number(n ?? 0)).toLocaleString()
</script>

<template>
  <div>
    <AppHeader
      :title="t('gameChallenge.title')"
      :subtitle="t('gameChallenge.subtitle')"
      back
    />
    <div class="page">
      <template v-if="phase === 'loading'">
        <div class="skeleton week-sk" />
        <div class="skeleton board-sk" />
      </template>

      <div
        v-else-if="phase === 'error'"
        class="card notice"
        role="alert"
      >
        <p class="sub">
          {{ t('gameChallenge.loadError') }}
        </p>
        <button
          type="button"
          class="btn btn-soft"
          @click="load"
        >
          <UIcon name="i-tabler-refresh" />{{ t('gameChallenge.retry') }}
        </button>
      </div>

      <template v-else-if="shown">
        <section
          class="card week"
          :class="{ compact: phase === 'play' }"
        >
          <div class="week-top">
            <h2 class="section-title">
              {{ t('gameChallenge.week', { n: weekNo(shown.id) }) }}
            </h2>
            <span class="time num">{{ timeLeft }}</span>
          </div>
          <p class="strain">
            {{ strainName }}
          </p>
          <p class="setup">
            {{ t('gameChallenge.setup', { medium: t(`gameChallenge.medium.${shown.def.medium}`), pot: shown.def.potL }) }}
          </p>
          <p
            v-if="phase !== 'play'"
            class="rules"
          >
            {{ t('gameChallenge.rules') }}
          </p>

          <template v-if="phase === 'intro'">
            <p
              v-if="shortTime"
              class="hint warn"
            >
              {{ t('gameChallenge.shortTime') }}
            </p>
            <button
              type="button"
              class="btn btn-primary btn-block"
              :disabled="msLeft <= 0"
              @click="start"
            >
              {{ t('gameChallenge.start') }}
            </button>
            <p class="hint">
              {{ t('gameChallenge.separate') }}
            </p>
          </template>

          <div
            v-else-if="phase === 'locked'"
            class="locked"
          >
            <p class="locked-title">
              {{ t('gameChallenge.locked.title', { n: CHALLENGE_LEVEL }) }}
            </p>
            <p class="sub">
              {{ t('gameChallenge.locked.text', { n: CHALLENGE_LEVEL }) }}
            </p>
          </div>
        </section>

        <div
          v-if="phase === 'stale' && run"
          class="card notice"
        >
          <p class="notice-title">
            {{ t('gameChallenge.stale.title', { week: run.challengeId }) }}
          </p>
          <p class="sub">
            {{ t('gameChallenge.stale.text') }}
          </p>
          <button
            type="button"
            class="btn btn-soft"
            @click="runner.discard()"
          >
            {{ t('gameChallenge.stale.clear') }}
          </button>
        </div>

        <GameChallengePlay
          v-if="phase === 'play'"
          @clear="runner.discard()"
        />

        <section
          v-if="phase === 'submit'"
          class="card notice submit"
        >
          <p class="notice-title">
            {{ t('gameChallenge.submit.title') }}
          </p>
          <p class="sub">
            {{ t('gameChallenge.submit.text') }}
          </p>
          <p
            v-if="localScore"
            class="sub num"
          >
            {{ t('gameChallenge.submit.local', { n: fmt(localScore.score) }) }}
          </p>
          <p
            v-if="submitError"
            class="field-error"
            role="alert"
          >
            {{ submitError }}
          </p>
          <button
            type="button"
            class="btn btn-primary btn-block"
            :disabled="busy"
            :aria-busy="busy"
            @click="submit"
          >
            <UIcon
              v-if="busy"
              name="i-tabler-loader-2"
              class="spin"
            />{{ busy ? t('gameChallenge.submit.busy') : t('gameChallenge.submit.button') }}
          </button>
        </section>

        <section
          v-if="phase === 'result' && result"
          class="card result"
          :aria-label="t('gameChallenge.result.title')"
        >
          <div class="result-head">
            <p class="label">
              {{ t('gameChallenge.result.title') }}
            </p>
            <p class="score num">
              {{ fmt(result.best.score) }}
            </p>
          </div>
          <dl class="stats">
            <div>
              <dt>{{ t('gameChallenge.result.quality') }}</dt>
              <dd class="num">
                {{ t('gameChallenge.result.qValue', { n: Math.round(result.best.quality) }) }}
              </dd>
            </div>
            <div>
              <dt>{{ t('gameChallenge.result.dry') }}</dt>
              <dd class="num">
                {{ t('gameChallenge.result.gValue', { n: Math.round(result.best.dryG) }) }}
              </dd>
            </div>
            <div>
              <dt>{{ t('gameChallenge.result.rank') }}</dt>
              <dd class="num">
                {{ result.rank }}
              </dd>
            </div>
          </dl>
          <div class="result-foot">
            <p
              v-if="!result.improved"
              class="sub"
            >
              {{ t('gameChallenge.result.kept', { n: fmt(result.best.score) }) }}
            </p>
            <p
              v-if="result.coins"
              class="sub coins"
            >
              {{ t('gameChallenge.result.coins', { n: result.coins }) }}
            </p>
            <button
              v-if="msLeft > 0 && challenge"
              type="button"
              class="btn btn-block"
              @click="again"
            >
              {{ t('gameChallenge.result.again') }}
            </button>
          </div>
        </section>

        <GameChallengeLeaderboard
          v-if="phase !== 'locked'"
          :challenge-id="shown.id"
          :week-label="t('gameChallenge.week', { n: weekNo(shown.id) })"
          :refresh-key="boardKey"
          @sign-in="askSignIn"
        />
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

.week-sk { height: 220px; }
.board-sk { height: 240px; }

@keyframes pulse {
  50% { opacity: 0.55; }
}

.notice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
}

.notice-title,
.locked-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.week {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
}

.week-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.time {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--amber);
}

.strain {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.setup {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.rules {
  margin: 8px 0 4px;
  font-size: 15px;
  line-height: 1.45;
  color: var(--text-2);
}

.week .btn {
  margin-top: 8px;
}

.hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.45;
}

.hint.warn {
  color: var(--amber);
  font-size: 13px;
}

.locked {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.submit .btn {
  margin-top: 6px;
  gap: 8px;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.result {
  padding: 0;
  overflow: hidden;
}

.result-head {
  padding: 16px 16px 12px;
}

.label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.score {
  margin: 4px 0 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--green);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  border-top: 1px solid var(--line);
}

.stats > div {
  padding: 12px 14px;
  min-width: 0;
}

.stats > div + div {
  border-left: 1px solid var(--line);
}

dt {
  font-size: 12px;
  color: var(--text-3);
}

dd {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.15;
}

.result-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--line);
}

.coins {
  color: var(--green);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton,
  .spin {
    animation: none;
  }
}
</style>
