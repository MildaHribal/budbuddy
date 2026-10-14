import { Preferences } from '@capacitor/preferences'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, triggerRef } from 'vue'
import { apply, forecast, gameHourToMs, msToGameHour, newGame, observe, plantVisual, syncToNow } from '../../shared/game/sim'
import { JOURNAL_BONUS, levelForXp, STRAINS } from '../../shared/game/content/catalog'
import type { JournalEntry, Plant } from '~/types/grow'
import type { ActionResult, Forecast, GameAction, GameEvent, GameState, L10n, Observation, PlantVisual, StrainDef } from '../../shared/game/types'
import { GAME_RESTORED } from '~/utils/gameBackup'
import { translate } from './useI18n'
import { useNotify } from './useUi'
import { GAME_H_PER_REAL_H, GAME_KEY, gameText, journalBonusCandidates, planNotices, strainOf, type PlannedNotice } from '~/utils/gameUi'

export const GAME_CHANGED = 'budbuddy:game-changed'
const TICK_MS = 30_000
const SAVE_DELAY = 400

// Module-level singleton. The sim mutates the raw object; triggerRef tells Vue after each change.
const game = shallowRef<GameState | null>(null)
const version = ref(0)
const ready = ref(false)
const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const simError = ref<string | null>(null)
let unreadable: string | null = null
let initPromise: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let ticker: ReturnType<typeof setInterval> | null = null
let clockUsers = 0
let listening = false

const errorText = (e: unknown) => String((e as Error)?.message ?? e)
const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

function isGameState(v: unknown): v is GameState {
  const s = v as GameState
  return !!s && typeof s === 'object' && s.v === 1 && Array.isArray(s.tents) && !!s.plants && typeof s.plants === 'object'
}

async function writeNow() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (loadError.value || !game.value) return
  try {
    await Preferences.set({ key: GAME_KEY, value: JSON.stringify(game.value) })
    saveError.value = null
  } catch (e) {
    saveError.value = errorText(e)
    throw e
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    writeNow().catch(e => console.error('[Game] save failed', e))
  }, SAVE_DELAY)
}

/** `clock` = only time moved; listeners (notifications) may skip those. */
function touch(cause: 'clock' | 'change' = 'change') {
  version.value++
  triggerRef(game)
  scheduleSave()
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(GAME_CHANGED, { detail: cause }))
}

function runSync(): boolean {
  const s = game.value
  if (!s) return false
  const before = s.nowH
  try {
    syncToNow(s, Date.now())
    simError.value = null
  } catch (e) {
    console.error('[Game] sync failed', e)
    simError.value = errorText(e)
    return false
  }
  return s.nowH !== before
}

/** Advances the game to the current real time; saves when time moved. */
function sync() {
  if (runSync()) touch('clock')
}

async function load() {
  const { value } = await Preferences.get({ key: GAME_KEY })
  if (value) {
    let parsed: unknown
    try {
      parsed = JSON.parse(value)
    } catch {
      parsed = null
    }
    if (!isGameState(parsed)) {
      unreadable = value
      loadError.value = 'unreadable'
      return
    }
    game.value = parsed
    sync()
    return
  }
  game.value = newGame(randomSeed(), Date.now())
  touch()
  await writeNow()
}

function onVisibility() {
  if (document.visibilityState === 'visible') sync()
  else if (saveTimer) writeNow().catch(e => console.error('[Game] save failed', e))
}

export function initGame(): Promise<void> {
  if (!initPromise) {
    initPromise = load()
      .catch((e) => {
        console.error('[Game] load failed', e)
        loadError.value = errorText(e)
      })
      .finally(() => {
        ready.value = true
        if (!listening && typeof document !== 'undefined') {
          listening = true
          document.addEventListener('visibilitychange', onVisibility)
          window.addEventListener(GAME_RESTORED, () => {
            if (saveTimer) clearTimeout(saveTimer)
            saveTimer = null
            game.value = null
            unreadable = null
            retryLoad()
          })
        }
      })
  }
  return initPromise
}

/** Retries a failed load (storage error, not unreadable data). */
async function retryLoad() {
  initPromise = null
  loadError.value = null
  ready.value = false
  await initGame()
}

/** Starts over. An unreadable save is kept under its own key first. */
async function startNewGame() {
  if (unreadable) {
    await Preferences.set({ key: `${GAME_KEY}.corrupt-${Date.now()}`, value: unreadable })
    unreadable = null
  }
  const keepNotify = game.value?.settings.notifications ?? true
  game.value = newGame(randomSeed(), Date.now())
  game.value.settings.notifications = keepNotify
  loadError.value = null
  touch()
  await writeNow()
}

function act(action: GameAction): ActionResult {
  const s = game.value
  if (!s) return { ok: false, reason: 'invalid' }
  runSync()
  let result: ActionResult
  try {
    result = apply(s, action)
  } catch (e) {
    console.error('[Game] action failed', action, e)
    return { ok: false, reason: 'invalid' }
  }
  touch()
  return result
}

function markEventsRead(ids?: string[]) {
  const s = game.value
  if (!s) return
  let changed = false
  for (const e of s.events) {
    if (!e.read && (!ids || ids.includes(e.id))) {
      e.read = true
      changed = true
    }
  }
  if (changed) touch()
}

/** Adds coins from outside the sim (challenge rewards) with an info event, then saves. */
async function grantCoins(n: number, text: L10n, eventId?: string): Promise<boolean> {
  const s = game.value
  if (!s || !Number.isFinite(n) || n <= 0) return false
  s.coins += Math.round(n)
  const event: GameEvent = { id: eventId ?? `grant-${s.nowH}-${s.events.length}`, atH: s.nowH, kind: 'info', text }
  s.events.push(event)
  touch()
  await writeNow()
  return true
}

function setNotifications(on: boolean) {
  if (!game.value) return
  game.value.settings.notifications = on
  touch()
}

/**
 * Real journal bonus: harvested journal plants with >= 28 days of entries and >= 5 own photos
 * pay JOURNAL_BONUS once (max one per 30 days per space). Returns the rewarded plant names.
 */
function claimJournalBonus(plants: readonly Plant[], entries: readonly JournalEntry[]): string[] {
  const s = game.value
  if (!s) return []
  const ids = journalBonusCandidates(plants, entries, s.rewardedReal)
  if (!ids.length) return []
  const names: string[] = []
  for (const id of ids) {
    const name = plants.find(p => p.id === id)?.name ?? ''
    names.push(name)
    s.coins += JOURNAL_BONUS.coins
    s.xp += JOURNAL_BONUS.xp
    s.rewardedReal.push(id)
    const event: GameEvent = {
      id: `real-${id}`,
      atH: s.nowH,
      kind: 'info',
      text: {
        en: `Your real grow ${name} is in the jar. ${JOURNAL_BONUS.coins} coins added for logging it from start to finish.`,
        cs: `Tvůj skutečný grow ${name} je ve sklenici. Za poctivý deník od začátku do konce máš ${JOURNAL_BONUS.coins} mincí.`
      }
    }
    s.events.push(event)
  }
  s.level = Math.max(s.level, levelForXp(s.xp))
  touch()
  return names
}

/** Notification moments for the next real 12 hours (empty when off). */
function plannedNotices(): PlannedNotice[] {
  const s = game.value
  if (!s || !s.settings.notifications) return []
  try {
    const list = forecast(s, 12 * GAME_H_PER_REAL_H)
    return planNotices(list, h => gameHourToMs(s, h), Date.now())
  } catch (e) {
    console.warn('[Game] forecast failed', e)
    return []
  }
}

/** Keeps the game clock running while a game screen is open. */
export function useGameClock() {
  onMounted(() => {
    clockUsers++
    initGame().then(sync)
    ticker ??= setInterval(() => {
      if (document.visibilityState === 'visible') sync()
    }, TICK_MS)
  })
  onBeforeUnmount(() => {
    clockUsers = Math.max(0, clockUsers - 1)
    if (!clockUsers && ticker) {
      clearInterval(ticker)
      ticker = null
    }
  })
}

const forecasts = computed<Forecast[]>(() => {
  void version.value
  const s = game.value
  if (!s) return []
  try {
    return forecast(s, 3 * GAME_H_PER_REAL_H)
  } catch {
    return []
  }
})

export function useGame() {
  initGame()

  const observeCache = new Map<string, { v: number, obs: Observation | null }>()
  function observePlant(plantId: string): Observation | null {
    const s = game.value
    if (!s?.plants[plantId]) return null
    const hit = observeCache.get(plantId)
    if (hit && hit.v === version.value) return hit.obs
    let obs: Observation | null = null
    try {
      obs = observe(s, plantId)
    } catch (e) {
      console.warn('[Game] observe failed', e)
    }
    observeCache.set(plantId, { v: version.value, obs })
    return obs
  }

  function visualOf(plantId: string): PlantVisual | null {
    const s = game.value
    const plant = s?.plants[plantId]
    const tent = plant && s?.tents.find(t => t.id === plant.tentId)
    if (!plant || !tent) return null
    try {
      return plantVisual(plant, tent)
    } catch (e) {
      console.warn('[Game] visual failed', e)
      return null
    }
  }

  const strain = (id: string): StrainDef | undefined => (game.value ? strainOf(game.value, STRAINS, id) : undefined)

  return {
    state: game,
    version,
    ready,
    loadError,
    saveError,
    simError,
    forecasts,
    act,
    sync,
    retryLoad,
    startNewGame,
    markEventsRead,
    setNotifications,
    grantCoins,
    claimJournalBonus,
    plannedNotices,
    observe: observePlant,
    visual: visualOf,
    strain,
    gameHourToMs: (h: number) => (game.value ? gameHourToMs(game.value, h) : Date.now()),
    msToGameHour: (ms: number) => (game.value ? msToGameHour(game.value, ms) : 0),
    flush: writeNow
  }
}

/** For tests: drop the singleton. */
export function resetGameForTests() {
  game.value = null
  initPromise = null
  loadError.value = null
  saveError.value = null
  simError.value = null
  ready.value = false
  unreadable = null
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
}

/** Toast for an ActionResult: the sim's own message when it has one, otherwise the given text. */
export function useGameFeedback() {
  const { notify } = useNotify()
  return (r: ActionResult, okText?: string) => {
    if (r.ok) {
      const msg = r.message ? gameText(r.message) : okText
      if (msg) notify(msg)
    } else {
      notify(r.message ? gameText(r.message) : translate(`game.reason.${r.reason}`), { tone: 'error', duration: 4000 })
    }
    return r.ok
  }
}
