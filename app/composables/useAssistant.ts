// AI assistant: one chat per plant plus a general one, stored on the device.

import { Preferences } from '@capacitor/preferences'
import { reactive, ref, shallowReactive, shallowRef } from 'vue'
import type { DiagHit, DiagResult } from '~/ai/diagnose'
import type { KbHit } from '~/ai/kb'
import { LlmError, type LlmErrorCode } from '~/ai/llm'
import { translate } from '~/composables/useI18n'
import { buildKbQuery, buildTurnText, prepareHistory, summarizePlant, systemInstruction, type HistoryTurn } from '~/ai/prompt'
import { createId } from '~/utils/id'
import { locale } from '~/utils/locale'
import { blobToDataUrl, compressImage } from '~/utils/image'

const STORAGE_KEY = 'budbuddy:ai-chat'
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
  diag?: DiagHit[]
  diagModel?: string
  unsupported?: string[]
  sources?: AssistantSource[]
  error?: string
  errorCode?: LlmErrorCode
  model?: string
  pending?: boolean
  status?: string
}

export type ModuleState = 'idle' | 'loading' | 'ready' | 'missing'

const threads = reactive<Record<string, AssistantMessage[]>>({})
const lastThread = ref<string | null>(null)
const busy = ref(false)
const classifierState = ref<ModuleState>('idle')
const kbState = ref<ModuleState>('idle')
const diagnoseMod = shallowRef<typeof import('~/ai/diagnose') | null>(null)
const kbMod = shallowRef<typeof import('~/ai/kb') | null>(null)
let loadPromise: Promise<void> | null = null
let controller: AbortController | null = null
let aiSettings: ReturnType<typeof useAiSettings> | null = null
/** failed questions of this session, kept with their photo for retry */
const lastAttempt = shallowReactive(new Map<string, { question: string, file: Blob | null }>())

function persist() {
  const data: Record<string, AssistantMessage[]> = {}
  for (const [key, list] of Object.entries(threads)) {
    const done = list.filter(m => !m.pending).slice(-MAX_MESSAGES)
    if (done.length) data[key] = done
  }
  Preferences.set({ key: STORAGE_KEY, value: JSON.stringify({ threads: data, lastThread: lastThread.value }) })
    .catch(e => console.error('[BudBuddy] could not save the chat', e))
}

function loadChats(): Promise<void> {
  if (!loadPromise) {
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

function initOffline(baseURL: string) {
  const base = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
  if (classifierState.value === 'idle') {
    classifierState.value = 'loading'
    import('~/ai/diagnose')
      .then(async (mod) => {
        const ok = await mod.initClassifier(`${base}ai/classifier/`)
        diagnoseMod.value = ok ? mod : null
        classifierState.value = ok ? 'ready' : 'missing'
      })
      .catch((e) => {
        console.warn('[BudBuddy] photo classifier unavailable', e)
        classifierState.value = 'missing'
      })
  }
  if (kbState.value === 'idle') {
    kbState.value = 'loading'
    import('~/ai/kb')
      .then(async (mod) => {
        const ok = await mod.initKb(`${base}ai/kb/`)
        kbMod.value = ok ? mod : null
        kbState.value = ok ? 'ready' : 'missing'
      })
      .catch((e) => {
        console.warn('[BudBuddy] knowledge base unavailable', e)
        kbState.value = 'missing'
      })
  }
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
    turns.push({ role: m.role, text: m.text, hadPhoto: !!m.thumb })
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
  await ai.ready()
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

  try {
    let image: { mimeType: string, base64: string } | null = null
    let diagnosis: DiagResult | null = null
    let prepared: Blob | null = null
    if (file) {
      try {
        prepared = await compressImage(file, 1024, 0.85)
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

    let passages: KbHit[] = []
    const kb = kbMod.value
    if (kb) {
      reply.status = translate('ai.status.kb')
      try {
        passages = await kb.searchKb(buildKbQuery(question, diagnosis), 12)
      } catch (e) {
        console.warn('[BudBuddy] knowledge search failed', e)
      }
    }
    reply.sources = toSources(passages)
    if (signal.aborted) throw new LlmError('aborted', translate('ai.errors.aborted'))

    const provider = ai.provider.value
    reply.status = translate('ai.status.asking', { provider: provider.label })
    const answer = await provider.generate({
      model: ai.model.value,
      system: systemInstruction(),
      history: prepareHistory(history),
      userText: buildTurnText({
        question,
        plantContext,
        diagnosis,
        photoWithoutClassifier: !!image && !diagnosis,
        passages,
        kbAvailable: kbState.value === 'ready'
      }),
      image,
      signal,
      onText: (text) => {
        reply.text = text
        reply.status = undefined
      }
    })
    reply.text = answer.text
    reply.model = answer.modelVersion ?? ai.model.value
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
    initOffline,
    ask,
    retry,
    canRetry: (key: string) => lastAttempt.has(key),
    stop,
    clearThread,
    clearAll,
    selectThread
  }
}
