// The weekly challenge run: its own game state under its own key, separate from the main farm.
// state.log is on, so every action is recorded with its game hour for the server replay.
import { Preferences } from '@capacitor/preferences'
import { computed, ref, shallowRef, triggerRef } from 'vue'
import * as sim from '~~/shared/game/sim'
import type { ActionResult, ChallengeDef, ChallengeScore, GameAction, GameState, Observation, PlantVisual } from '~~/shared/game/types'
import { initGame, useGame } from '~/composables/useGame'
import { submitRun, type SubmitReply } from './api'
import { rewardDue, type RewardLedger } from './rewards'

export const CHALLENGE_KEY = 'budbuddy:game-challenge'
const REWARD_KEY = 'budbuddy:game-challenge-rewards'
const SAVE_DELAY = 400

export interface SubmittedRun extends SubmitReply { coins: number, atMs: number }
export interface ChallengeRun {
  v: 1
  challengeId: string
  endsAt: string
  def: ChallengeDef
  state: GameState
  submitted?: SubmittedRun
}

const run = shallowRef<ChallengeRun | null>(null)
const version = ref(0)
const ready = ref(false)
const loadError = ref(false)
let loading: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Same starting state replayChallenge builds (gear set, plant already sown at hour 0, empty log). */
export function challengeStartState(def: ChallengeDef, nowMs: number): GameState {
  const s = sim.newChallenge(def, nowMs)
  s.log = []
  return s
}

async function writeNow() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  if (run.value) await Preferences.set({ key: CHALLENGE_KEY, value: JSON.stringify(run.value) })
  else await Preferences.remove({ key: CHALLENGE_KEY })
}

function touch() {
  version.value++
  triggerRef(run)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => writeNow().catch(e => console.error('[Challenge] save failed', e)), SAVE_DELAY)
}

function isRun(v: unknown): v is ChallengeRun {
  const r = v as ChallengeRun
  return !!r && r.v === 1 && typeof r.challengeId === 'string' && !!r.def && !!r.state && Array.isArray(r.state.log)
}

function load(): Promise<void> {
  loading ??= Preferences.get({ key: CHALLENGE_KEY }).then(({ value }) => {
    let parsed: unknown = null
    try {
      parsed = value ? JSON.parse(value) : null
    } catch { /* unreadable: start fresh */ }
    run.value = isRun(parsed) ? parsed : null
    if (run.value) sync()
  }).catch((e) => {
    console.error('[Challenge] load failed', e)
    loadError.value = true
    loading = null
  }).finally(() => {
    ready.value = true
  })
  return loading
}

function sync() {
  const s = run.value?.state
  if (!s || run.value?.submitted) return
  const before = s.nowH
  try {
    sim.syncToNow(s, Date.now())
  } catch (e) {
    console.error('[Challenge] sync failed', e)
    return
  }
  if (s.nowH !== before) touch()
}

function start(challenge: { id: string, endsAt: string, def: ChallengeDef }): ActionResult {
  const state = challengeStartState(challenge.def, Date.now())
  run.value = { v: 1, challengeId: challenge.id, endsAt: challenge.endsAt, def: challenge.def, state }
  touch()
  return Object.keys(state.plants).length ? { ok: true } : { ok: false, reason: 'invalid' }
}

function act(action: GameAction): ActionResult {
  const s = run.value?.state
  if (!s || run.value?.submitted) return { ok: false, reason: 'invalid' }
  try {
    sim.syncToNow(s, Date.now())
    const r = sim.apply(s, action)
    touch()
    return r
  } catch (e) {
    console.error('[Challenge] action failed', action, e)
    return { ok: false, reason: 'invalid' }
  }
}

async function discard() {
  run.value = null
  version.value++
  await writeNow()
}

/** The score the shared replay gives this log on this device (the server repeats it). */
function localScore(): ChallengeScore | null {
  const r = run.value
  if (!r?.state.log?.length) return null
  try {
    return sim.replayChallenge(r.def, r.state.log)
  } catch (e) {
    console.warn('[Challenge] local replay failed', e)
    return null
  }
}

async function readLedger(): Promise<Record<string, RewardLedger>> {
  const { value } = await Preferences.get({ key: REWARD_KEY })
  try {
    const v = value ? JSON.parse(value) : {}
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/** Pays the weekly reward into the main farm. Ledger first: a crash can lose coins, never double them. */
async function payReward(challengeId: string, rank: number): Promise<number> {
  const ledger = await readLedger()
  const { coins, ledger: next } = rewardDue(ledger[challengeId], rank)
  if (!coins) return 0
  await Preferences.set({ key: REWARD_KEY, value: JSON.stringify({ ...ledger, [challengeId]: next }) })
  const game = useGame()
  await initGame()
  if (!game.state.value) return 0
  game.sync()
  await game.grantCoins(coins, {
    en: `Shadow Challenge ${challengeId}: ${coins} coins for your verified run (rank ${rank}).`,
    cs: `Stínová výzva ${challengeId}: ${coins} mincí za ověřený pokus (${rank}. místo).`
  }, `challenge-${challengeId}-${next.placementPaid}`)
  return coins
}

async function submit(): Promise<SubmittedRun> {
  const r = run.value
  if (!r?.state.log?.length) throw new Error('no run')
  const reply = await submitRun(r.challengeId, r.state.log, localScore())
  const coins = await payReward(r.challengeId, reply.rank).catch((e) => {
    console.error('[Challenge] reward failed', e)
    return 0
  })
  r.submitted = { ...reply, coins, atMs: Date.now() }
  touch()
  await writeNow()
  return r.submitted
}

export function useChallengeRun() {
  load()
  const state = computed(() => {
    void version.value
    return run.value?.state ?? null
  })
  /** harvest and cure are done: the run has a scored result */
  const finished = computed(() => (state.value?.history.length ?? 0) > 0)
  const plant = computed(() => {
    const s = state.value
    return s ? Object.values(s.plants)[0] ?? null : null
  })
  const observation = computed<Observation | null>(() => {
    const s = state.value
    const p = plant.value
    if (!s || !p || p.stage === 'harvested') return null
    try {
      return sim.observe(s, p.id)
    } catch {
      return null
    }
  })
  const visual = computed<PlantVisual | null>(() => {
    const s = state.value
    const p = plant.value
    const tent = p && s?.tents.find(t => t.id === p.tentId)
    if (!p || !tent) return null
    try {
      return sim.plantVisual(p, tent)
    } catch {
      return null
    }
  })
  return { run, state, version, ready, loadError, finished, plant, observation, visual, start, act, sync, discard, submit, localScore, flush: writeNow }
}
