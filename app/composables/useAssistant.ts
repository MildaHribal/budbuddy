// AI assistant: one chat per plant plus a general one, stored on the device.

import { Preferences } from '@capacitor/preferences'
import { reactive, ref, shallowReactive, shallowRef } from 'vue'
import type { DiagHit, DiagResult } from '~/ai/diagnose'
import type { KbHit } from '~/ai/kb'
import { LlmError, type LlmErrorCode } from '~/ai/llm'
import { translate } from '~/composables/useI18n'
import { parseAnswer } from '~/ai/markers'
import { buildKbQuery, buildTurnText, isSmallTalk, prepareHistory, summarizePlant, systemInstruction, wantsLongAnswer, type HistoryTurn } from '~/ai/prompt'
import { pickGuideLinks, type GuideLink } from '~/ai/guideLinks'
import { findPassages, searchRemoteKb } from '~/ai/remoteKb'
import { AI_PACK_URL, deletePack as removeDownloadedPack, downloadPack, resolveAiSource, storedBytes, type AiSource } from '~/ai/pack'
import { AiPack, assetPackAvailable, assetPackBase, type AssetPackState } from '~/ai/assetPack'
import { AI_GENERATION } from '../../shared/aiModels'
import { CHAT_KEY, chatSnapshot, setChatPruner } from '~/utils/chatStore'
import { createId } from '~/utils/id'
import { locale } from '~/utils/locale'
import { blobToDataUrl, compressImage } from '~/utils/image'

const STORAGE_KEY = CHAT_KEY
const MAX_MESSAGES = 40
export const GENERAL_THREAD = 'general'

export interface AssistantSource {
  n: number
  title: string
  url?: string
  kind: KbHit['kind']
  snippet: string
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  /** data URL preview of the attached photo */
  thumb?: string
  /** had a photo whose preview was dropped from storage */
  thumbDropped?: boolean
  diag?: DiagHit[]
  diagModel?: string
  unsupported?: string[]
  sources?: AssistantSource[]
  /** suggested quick replies from a <<reply: …>> marker */
  replies?: string[]
  /** the model asked for a photo (<<photo>>) */
  askPhoto?: boolean
  error?: string
  errorCode?: LlmErrorCode
  model?: string
  pending?: boolean
  status?: string
  /** guide lessons that cover the topic */
  guide?: GuideLink[]
  /** curated passages shown word for word when the AI server could not be reached */
  fallback?: { title: string, text: string, lang: string }[]
  reported?: boolean
}

export type ModuleState = 'idle' | 'loading' | 'ready' | 'missing'

const threads = reactive<Record<string, AssistantMessage[]>>({})
const lastThread = ref<string | null>(null)
const busy = ref(false)
const classifierState = ref<ModuleState>('idle')
const kbState = ref<ModuleState>('idle')
const aiSource = shallowRef<AiSource | null>(null)
const diagnoseMod = shallowRef<typeof import('~/ai/diagnose') | null>(null)
const kbMod = shallowRef<typeof import('~/ai/kb') | null>(null)
let loadPromise: Promise<void> | null = null
let controller: AbortController | null = null
let aiSettings: ReturnType<typeof useAiSettings> | null = null
/** failed questions of this session, kept with their photo for retry */
const lastAttempt = shallowReactive(new Map<string, { question: string, file: Blob | null }>())

function persist() {
  const data = chatSnapshot(threads, MAX_MESSAGES)
  Preferences.set({ key: STORAGE_KEY, value: JSON.stringify({ threads: data, lastThread: lastThread.value }) })
    .catch(e => console.error('[BudBuddy] could not save the chat', e))
}

function loadChats(): Promise<void> {
  if (!loadPromise) {
    // threads of removed plants are dropped here too, or the next save would bring them back
    setChatPruner(async (keep) => {
      await loadPromise
      for (const key of Object.keys(threads)) if (!keep(key)) Reflect.deleteProperty(threads, key)
      if (lastThread.value && !keep(lastThread.value)) lastThread.value = null
      persist()
    })
    loadPromise = Preferences.get({ key: STORAGE_KEY })
      .then(({ value }) => {
        if (!value) return
        const raw = JSON.parse(value) as { threads?: Record<string, AssistantMessage[]>, lastThread?: string }
        for (const [key, list] of Object.entries(raw.threads ?? {})) {
          if (Array.isArray(list)) threads[key] = list.filter(m => m && typeof m.text === 'string' && !m.pending)
        }
        lastThread.value = typeof raw.lastThread === 'string' ? raw.lastThread : null
      })
      .catch(() => {
      })
  }
  return loadPromise
}

let appBase = '/'
let sourcePromise: Promise<AiSource | null> | null = null

/** The downloaded pack is not reachable by URL, so ort-web gets blob: URLs for its runtime files. */
async function ortPaths(source: AiSource): Promise<string | { wasm: string, mjs: string }> {
  if (source.kind !== 'download' || !source.fetch) return `${source.base}ort/`
  const blobUrl = async (file: string, type: string) => {
    const res = await source.fetch!(`${source.base}ort/${file}`)
    return URL.createObjectURL(new Blob([await res.arrayBuffer()], { type }))
  }
  const [wasm, mjs] = await Promise.all([blobUrl('ort-wasm-simd-threaded.wasm', 'application/wasm'), blobUrl('ort-wasm-simd-threaded.mjs', 'text/javascript')])
  return { wasm, mjs }
}

function initOffline(baseURL: string) {
  appBase = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
  if (classifierState.value !== 'idle' && kbState.value !== 'idle') return
  if (classifierState.value === 'idle') classifierState.value = 'loading'
  if (kbState.value === 'idle') kbState.value = 'loading'
  sourcePromise ??= resolveAiSource(appBase, assetPackBase)
  sourcePromise.then(async (source) => {
    aiSource.value = source
    if (!source) {
      classifierState.value = 'missing'
      kbState.value = 'missing'
      return
    }
    const ortPath = await ortPaths(source).catch(() => `${source.base}ort/`)
    if (classifierState.value === 'loading') {
      import('~/ai/diagnose')
        .then(async (mod) => {
          const ok = await mod.initClassifier(`${source.base}classifier/`, ortPath, source.fetch)
          diagnoseMod.value = ok ? mod : null
          classifierState.value = ok ? 'ready' : 'missing'
        })
        .catch((e) => {
          console.warn('[BudBuddy] photo classifier unavailable', e)
          classifierState.value = 'missing'
        })
    }
    if (kbState.value === 'loading') {
      import('~/ai/kb')
        .then(async (mod) => {
          mod.configureKb({ wasmPaths: ortPath, ...(source.fetch ? { fetch: source.fetch } : {}) })
          const ok = await mod.initKb(`${source.base}kb/`)
          kbMod.value = ok ? mod : null
          kbState.value = ok ? 'ready' : 'missing'
        })
        .catch((e) => {
          console.warn('[BudBuddy] knowledge base unavailable', e)
          kbState.value = 'missing'
        })
    }
  })
}

/** Looks for the files again, e.g. after a download finished. */
function reloadOffline() {
  sourcePromise = null
  if (classifierState.value !== 'ready') classifierState.value = 'idle'
  if (kbState.value !== 'ready') kbState.value = 'idle'
  initOffline(appBase)
}

// ── Offline AI pack (download on demand) ──
export type PackStatus = 'unavailable' | 'bundled' | 'none' | 'downloading' | 'paused' | 'failed' | 'installed' | 'needs_confirmation'
const pack = reactive({ status: 'none' as PackStatus, done: 0, total: 0, error: '' })
let packAbort: AbortController | null = null

const packKind = () => (assetPackAvailable() ? 'asset-pack' as const : AI_PACK_URL ? 'download' as const : null)

async function refreshPack(baseURL?: string) {
  if (baseURL) appBase = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
  const source = await (sourcePromise ??= resolveAiSource(appBase, assetPackBase))
  if (source?.kind === 'bundled') pack.status = 'bundled'
  else if (source) pack.status = 'installed'
  else if (!packKind()) pack.status = 'unavailable'
  else if (pack.status !== 'downloading') {
    pack.done = packKind() === 'download' ? await storedBytes() : 0
    pack.status = pack.done > 0 ? 'paused' : 'none'
  }
}

function onPadState(s: AssetPackState) {
  pack.done = s.bytes
  pack.total = s.total
  if (s.status === 'completed') {
    pack.status = 'installed'
    reloadOffline()
  } else if (s.status === 'failed') {
    pack.status = 'failed'
  } else if (s.status === 'needs_confirmation' || s.status === 'waiting_wifi') {
    pack.status = 'needs_confirmation'
  } else if (s.status === 'canceled' || s.status === 'none') {
    pack.status = 'paused'
  } else {
    pack.status = 'downloading'
  }
}

let padListening = false

async function startPackDownload() {
  if (pack.status === 'downloading') return
  pack.error = ''
  const kind = packKind()
  if (kind === 'asset-pack') {
    if (!padListening) {
      padListening = true
      await AiPack.addListener('progress', onPadState)
    }
    pack.status = 'downloading'
    await AiPack.fetch().catch((e) => {
      pack.status = 'failed'
      pack.error = String((e as Error)?.message ?? e)
    })
    return
  }
  if (kind !== 'download') return
  packAbort = new AbortController()
  pack.status = 'downloading'
  try {
    await downloadPack(AI_PACK_URL, {
      signal: packAbort.signal,
      onProgress: (p) => {
        pack.done = p.done
        pack.total = p.total
      }
    })
    pack.status = 'installed'
    reloadOffline()
  } catch (e) {
    pack.status = packAbort?.signal.aborted ? 'paused' : 'failed'
    if (!packAbort?.signal.aborted) pack.error = String((e as Error)?.message ?? e)
  } finally {
    packAbort = null
  }
}

function cancelPackDownload() {
  if (packKind() === 'asset-pack') AiPack.cancel().catch(() => {})
  packAbort?.abort()
}

async function confirmPackDownload() {
  await AiPack.confirm().catch(() => {})
}

async function removePack() {
  cancelPackDownload()
  if (packKind() === 'asset-pack') await AiPack.remove().catch(() => {})
  await removeDownloadedPack()
  diagnoseMod.value = null
  kbMod.value = null
  aiSource.value = null
  classifierState.value = 'missing'
  kbState.value = 'missing'
  sourcePromise = null
  pack.done = 0
  pack.status = packKind() ? 'none' : 'unavailable'
}

function thread(key: string): AssistantMessage[] {
  if (!threads[key]) threads[key] = []
  return threads[key]
}

/** Skips failed questions and their errors. */
function historyOf(list: AssistantMessage[]): HistoryTurn[] {
  const turns: HistoryTurn[] = []
  for (let i = 0; i < list.length; i++) {
    const m = list[i]!
    if (m.pending || m.error) continue
    const next = list[i + 1]
    if (m.role === 'user' && next?.error) continue
    turns.push({ role: m.role, text: m.text, hadPhoto: !!m.thumb || !!m.thumbDropped })
  }
  return turns
}

const toSources = (hits: KbHit[]): AssistantSource[] => hits.map((h, i) => ({
  n: i + 1,
  title: h.title,
  url: h.url,
  kind: h.kind,
  snippet: h.text.replace(/\s+/g, ' ').trim().slice(0, 240)
}))

/** Top curated passages, shown word for word when there is no connection. */
export function offlineCards(hits: readonly KbHit[], max = 3): NonNullable<AssistantMessage['fallback']> {
  return hits.filter(h => h.kind !== 'corpus').slice(0, max).map((h) => {
    const lines = h.text.replace(/^(Tip|Rada|Mýtus|Symptom):\s*/gm, '').trim().split('\n')
    // the first line usually repeats the title
    if (lines[0]?.trim() === h.title.trim()) lines.shift()
    const text = lines.join('\n').trim()
    return { title: h.title, text: text.length > 700 ? `${text.slice(0, 699)}…` : text, lang: h.lang }
  })
}

export interface AskInput {
  threadKey: string
  question: string
  file?: Blob | null
}

async function ask({ threadKey, question, file = null }: AskInput) {
  if (busy.value) return
  const grow = useGrow()
  const ai = aiSettings
  if (!ai) return
  const list = thread(threadKey)
  const history = historyOf(list)
  lastThread.value = threadKey

  busy.value = true
  controller = new AbortController()
  const signal = controller.signal

  list.push({ id: createId(), role: 'user', text: question.trim(), createdAt: new Date().toISOString() })
  const userMsg = list[list.length - 1]!
  list.push({ id: createId(), role: 'assistant', text: '', createdAt: new Date().toISOString(), pending: true, status: translate(file ? 'ai.status.photo' : 'ai.status.context') })
  // The array holds a reactive proxy – always mutate through it.
  const reply = list[list.length - 1]!
  let found: KbHit[] = []

  try {
    let image: { mimeType: string, base64: string } | null = null
    let diagnosis: DiagResult | null = null
    let prepared: Blob | null = null
    if (file) {
      try {
        prepared = await compressImage(file, 768, 0.85)
        const thumb = await compressImage(file, 320, 0.7)
        userMsg.thumb = await blobToDataUrl(thumb)
        const dataUrl = await blobToDataUrl(prepared)
        image = { mimeType: prepared.type || 'image/jpeg', base64: dataUrl.slice(dataUrl.indexOf(',') + 1) }
      } catch {
        throw new LlmError('unknown', translate('ai.errors.photo'))
      }
      const classifier = diagnoseMod.value
      if (classifier && prepared) {
        reply.status = translate('ai.status.diagnose')
        try {
          diagnosis = await classifier.diagnosePhoto(prepared, 3, locale.value)
          reply.diag = diagnosis.diag.slice(0, 3)
          reply.diagModel = diagnosis.modelVersion
          reply.unsupported = diagnosis.unsupported
        } catch (e) {
          console.warn('[BudBuddy] photo diagnosis failed', e)
        }
      }
    }

    const plant = threadKey === GENERAL_THREAD ? undefined : grow.getPlant(threadKey)
    const plantContext = plant
      ? summarizePlant({ plant, entries: grow.state.entries, tasks: grow.state.tasks, light: grow.state.settings })
      : null

    // null = no search for small talk; [] = searched (or no knowledge pack) and nothing found
    let passages: KbHit[] | null = !file && isSmallTalk(question, history.length > 0) ? null : []
    let searched = false
    if (passages) {
      reply.status = translate('ai.status.kb')
      const previous = file ? null : history.findLast(h => h.role === 'user')?.text ?? null
      const { url: chatUrl, token } = ai.endpoint
      const found = await findPassages(buildKbQuery({ question, diagnosis, plant, previous }), kbMod.value, q => searchRemoteKb(q, { chatUrl, token, signal }))
      passages = found.passages
      searched = found.via !== null
    }
    reply.sources = toSources(passages ?? [])
    found = passages ?? []
    if (passages) {
      const guide = pickGuideLinks(question, [...passages.filter(h => h.kind !== 'corpus').map(h => h.title), ...(diagnosis?.diag[0] && diagnosis.diag[0].p >= 0.5 ? [diagnosis.diag[0].label] : [])])
      reply.guide = guide.length ? guide : undefined
    }
    if (signal.aborted) throw new LlmError('aborted', translate('ai.errors.aborted'))

    const provider = ai.provider.value
    reply.status = translate('ai.status.asking', { provider: provider.label })
    const answer = await provider.generate({
      system: systemInstruction(),
      history: prepareHistory(history),
      userText: buildTurnText({
        question,
        plantContext,
        diagnosis,
        photoWithoutClassifier: !!image && !diagnosis,
        passages,
        kbAvailable: searched || kbState.value === 'ready'
      }),
      image,
      maxOutputTokens: wantsLongAnswer(question) ? AI_GENERATION.maxOutputTokens : undefined,
      signal,
      onText: (text) => {
        reply.text = parseAnswer(text).text
        reply.status = undefined
      }
    })
    const parsed = parseAnswer(answer.text)
    if (!parsed.text && !parsed.replies.length) throw new LlmError('empty', translate('ai.errors.empty'))
    reply.text = parsed.text
    reply.replies = parsed.replies.length ? parsed.replies : undefined
    reply.askPhoto = parsed.photo || undefined
    reply.model = answer.modelVersion ?? provider.model
    lastAttempt.delete(threadKey)
  } catch (e) {
    const err = e instanceof LlmError ? e : new LlmError('unknown', translate('ai.errors.generic'))
    if (!(e instanceof LlmError)) console.error('[BudBuddy] assistant failed', e)
    if (err.code === 'aborted' && reply.text.trim()) {
      reply.text += `\n\n${translate('ai.notes.stopped')}`
    } else {
      reply.error = err.message
      reply.errorCode = err.code
      lastAttempt.set(threadKey, { question, file })
      const cards = err.code === 'offline' ? offlineCards(found) : []
      if (cards.length) reply.fallback = cards
    }
  } finally {
    reply.pending = false
    reply.status = undefined
    busy.value = false
    controller = null
    persist()
  }
}

function retry(threadKey: string) {
  const attempt = lastAttempt.get(threadKey)
  const list = threads[threadKey]
  if (!attempt || !list || busy.value) return
  const last = list[list.length - 1]
  if (last?.error) list.splice(list.length - 2, 2)
  return ask({ threadKey, ...attempt })
}

function stop() {
  controller?.abort()
}

function clearThread(key: string) {
  stop()
  Reflect.deleteProperty(threads, key)
  lastAttempt.delete(key)
  persist()
}

function clearAll() {
  stop()
  for (const key of Object.keys(threads)) Reflect.deleteProperty(threads, key)
  lastAttempt.clear()
  lastThread.value = null
  return Preferences.remove({ key: STORAGE_KEY })
}

function selectThread(key: string) {
  lastThread.value = key
  persist()
}

export function useAssistant() {
  aiSettings ??= useAiSettings()
  loadChats()
  return {
    ready: loadChats,
    threads,
    lastThread,
    busy,
    classifierState,
    kbState,
    aiSource,
    initOffline,
    pack,
    refreshPack,
    startPackDownload,
    cancelPackDownload,
    confirmPackDownload,
    removePack,
    markReported: (threadKey: string, id: string) => {
      const m = threads[threadKey]?.find(x => x.id === id)
      if (m) {
        m.reported = true
        persist()
      }
    },
    ask,
    retry,
    canRetry: (key: string) => lastAttempt.has(key),
    stop,
    clearThread,
    clearAll,
    selectThread
  }
}
