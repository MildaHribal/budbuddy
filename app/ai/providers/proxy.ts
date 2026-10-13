// Gemini via the proxy (netlify/functions/chat.mts, served by Supabase Edge Functions); the key stays on the server.
import { AI_MODEL } from '../../../shared/aiModels'
import { formatTime } from '../../utils/date'
import { translate, type Params } from '../../composables/useI18n'
import { LlmError, networkError, type ChatTurn, type LlmAnswer, type LlmImage, type LlmProvider, type LlmRequest } from '../llm'

export interface ProxyEndpoint {
  url: string
  /** must match BUDBUDDY_APP_TOKEN on the server, if set */
  token?: string
}

interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string, data: string }
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export function toGeminiContents(history: readonly ChatTurn[], userText: string, image?: LlmImage | null): GeminiContent[] {
  const contents: GeminiContent[] = history.map(t => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] }))
  const parts: GeminiPart[] = []
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } })
  parts.push({ text: userText })
  const last = contents[contents.length - 1]
  if (last?.role === 'user') last.parts.push(...parts)
  else contents.push({ role: 'user', parts })
  return contents
}

export function parseSse(buffer: string): { events: string[], rest: string } {
  const blocks = buffer.replace(/\r\n/g, '\n').split('\n\n')
  const rest = blocks.pop() ?? ''
  const events: string[] = []
  for (const block of blocks) {
    const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n')
    if (data) events.push(data)
  }
  return { events, rest }
}

const msg = (key: string, params?: Params) => translate(`ai.errors.${key}`, params)

const safetyError = () => new LlmError('safety', msg('safety'))

interface ProxyErrorBody {
  error?: { reason?: string, message?: string, retryAfterSec?: number, daily?: boolean, limit?: number }
}

/** Free-tier daily quotas reset at midnight Pacific time; returns e.g. "zítra kolem 9:00". */
export function quotaResetLabel(now = new Date()): string {
  let msLeft: number
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(now)
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
    msLeft = (24 * 3600 - ((get('hour') % 24) * 3600 + get('minute') * 60 + get('second'))) * 1000
  } catch {
    msLeft = (24 * 3600 * 1000) - ((now.getTime() - 8 * 3600 * 1000) % (24 * 3600 * 1000))
  }
  const reset = new Date(now.getTime() + msLeft)
  reset.setSeconds(0, 0)
  const sameDay = reset.toDateString() === now.toDateString()
  return msg(sameDay ? 'resetToday' : 'resetTomorrow', { time: formatTime(reset.toISOString()).replace(/^0(\d)/, '$1') })
}

export function proxyError(status: number, body: ProxyErrorBody | null, model: string): LlmError {
  const err = body?.error
  switch (err?.reason) {
    case 'not_configured':
      return new LlmError('not-configured', msg('notConfigured'))
    case 'server_key':
      return new LlmError('not-configured', msg('serverKey'))
    case 'unauthorized':
      return new LlmError('not-configured', msg('unauthorized'))
    case 'forbidden_origin':
      return new LlmError('not-configured', msg('forbiddenOrigin'))
    case 'quota': {
      if (err.daily) {
        const limit = err.limit ? msg('quotaLimit', { n: err.limit }) : ''
        return new LlmError('quota', msg('quotaDaily', { limit, when: quotaResetLabel() }))
      }
      const wait = err.retryAfterSec ? msg('quotaWait', { sec: err.retryAfterSec }) : ''
      return new LlmError('quota', msg('quota', { wait }), err.retryAfterSec)
    }
    case 'model':
      return new LlmError('model', msg('model', { model }))
    case 'too_large':
      return new LlmError('unknown', msg('tooLarge'))
    case 'timeout':
      return new LlmError('timeout', msg('timeout'))
    case 'bad_request':
      return new LlmError('unknown', msg('badRequest', { message: err.message ?? msg('badRequestFallback') }))
  }
  if (status === 429) return new LlmError('rate-limit', msg('rateLimit'))
  if (status === 404) return new LlmError('not-configured', msg('notFound'))
  if (status >= 500) return new LlmError('overloaded', msg('overloaded'))
  return new LlmError('unknown', msg('status', { status }))
}

interface StreamChunk {
  candidates?: { content?: { parts?: { text?: string, thought?: boolean }[] }, finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  modelVersion?: string
  error?: { message?: string }
  /** string = stream cut off; object = Gemini error reported after the headers were sent */
  budbuddy?: { error?: string | NonNullable<ProxyErrorBody['error']> }
}

interface RunningAnswer extends LlmAnswer {
  finishReason?: string
  cutOff?: string
}

const BLOCK_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY'])

export function applyChunk(answer: RunningAnswer, chunk: StreamChunk): void {
  const late = chunk.budbuddy?.error
  if (typeof late === 'object') throw proxyError(502, { error: late }, AI_MODEL)
  if (late) {
    answer.cutOff = late
    return
  }
  if (chunk.error) throw new LlmError('overloaded', msg('unfinished'))
  if (chunk.promptFeedback?.blockReason) throw safetyError()
  const cand = chunk.candidates?.[0]
  for (const part of cand?.content?.parts ?? []) {
    if (part.text && !part.thought) answer.text += part.text
  }
  if (cand?.finishReason) answer.finishReason = cand.finishReason
  if (chunk.modelVersion) answer.modelVersion = chunk.modelVersion
}

export function finishAnswer(answer: RunningAnswer): LlmAnswer {
  const reason = answer.finishReason
  if (!answer.text.trim()) {
    if (answer.cutOff === 'timeout') throw proxyError(504, { error: { reason: 'timeout' } }, '')
    if (answer.cutOff) throw new LlmError('overloaded', msg('broken'))
    if (reason && BLOCK_REASONS.has(reason)) throw safetyError()
    if (reason === 'RECITATION') throw new LlmError('safety', msg('recitation'))
    throw new LlmError('empty', reason && reason !== 'STOP' ? msg('emptyReason', { reason }) : msg('empty'))
  }
  let text = answer.text
  const note = answer.cutOff === 'timeout'
    ? 'timeoutCut'
    : answer.cutOff
      ? 'connectionCut'
      : reason && BLOCK_REASONS.has(reason) ? 'safetyCut' : reason === 'MAX_TOKENS' ? 'maxTokens' : null
  if (note) text += `\n\n${translate(`ai.notes.${note}`)}`
  return { text, modelVersion: answer.modelVersion }
}

export function createProxyProvider(endpoint: ProxyEndpoint): LlmProvider {
  async function generate(req: LlmRequest): Promise<LlmAnswer> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw networkError(null)
    const answer: RunningAnswer = { text: '' }
    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(endpoint.token ? { 'X-BudBuddy-Token': endpoint.token } : {})
        },
        body: JSON.stringify({
          model: AI_MODEL,
          systemInstruction: { parts: [{ text: req.system }] },
          contents: toGeminiContents(req.history, req.userText, req.image),
          ...(req.maxOutputTokens ? { generationConfig: { maxOutputTokens: req.maxOutputTokens } } : {})
        }),
        signal: req.signal
      })
      if (!res.ok) {
        let body: ProxyErrorBody | null = null
        try {
          body = await res.json()
        } catch {
          // e.g. Netlify's own rate-limit response
        }
        throw proxyError(res.status, body, AI_MODEL)
      }

      const handle = (data: string) => {
        let chunk: StreamChunk
        try {
          chunk = JSON.parse(data)
        } catch {
          return // partial event cut by the server deadline
        }
        const before = answer.text
        applyChunk(answer, chunk)
        if (answer.text !== before) req.onText?.(answer.text)
      }

      if (res.body && typeof res.body.getReader === 'function') {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          buffer += decoder.decode(value, { stream: !done })
          const { events, rest } = parseSse(done ? `${buffer}\n\n` : buffer)
          buffer = rest
          events.forEach(handle)
          if (done) break
        }
      } else {
        parseSse(`${await res.text()}\n\n`).events.forEach(handle)
      }
    } catch (e) {
      throw networkError(e)
    }
    return finishAnswer(answer)
  }

  return {
    id: 'proxy',
    get label() {
      return translate('ai.provider')
    },
    model: AI_MODEL,
    generate,
    async test() {
      const res = await generate({ system: translate('ai.test.system'), history: [], userText: translate('ai.test.prompt') })
      return res.modelVersion ?? AI_MODEL
    }
  }
}
