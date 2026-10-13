// AI proxy: validates the app's Gemini request and streams the answer back.
// Providers are tried in AI_PROVIDERS order (default "gemini"), skipping unconfigured ones:
// gemini (GEMINI_API_KEY), cloudflare Workers AI (CF_AI_TOKEN, CF_ACCOUNT_ID, CF_AI_MODEL) and
// local, an Ollama gateway on the owner's PC (LOCAL_AI_URL, LOCAL_AI_TOKEN, LOCAL_AI_MODEL).
// The last two are converted to the Gemini SSE the app parses.
import { AI_GENERATION, AI_MODEL, isAllowedModel } from '../../shared/aiModels.ts'
import { env } from '../../shared/env.ts'

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models'
const MAX_BODY_BYTES = 6_000_000
// Netlify stops a function (streaming included) after 60 s; end cleanly before that.
const DEADLINE_MS = 55_000
const MAX_CONTENTS = 24
const MAX_PARTS = 8
const MAX_IMAGES = 3
const MAX_TEXT = 60_000
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

// only the Android app (and local dev); the hosted websites must not spend the Gemini quota
const FIXED_ORIGINS = new Set(['https://localhost', 'http://localhost', 'capacitor://localhost'])

export type ErrorReason = 'not_configured' | 'unauthorized' | 'forbidden_origin' | 'bad_request' | 'too_large' | 'quota' | 'server_key' | 'model' | 'upstream' | 'timeout'

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true
  if (FIXED_ORIGINS.has(origin)) return true
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && isAllowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-BudBuddy-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

const fail = (status: number, reason: ErrorReason, message: string, headers: Record<string, string>, extra: Record<string, unknown> = {}) =>
  Response.json({ error: { reason, message, ...extra } }, { status, headers })

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback

interface Part {
  text?: string
  inlineData?: { mimeType: string, data: string }
}

export interface GeminiBody {
  systemInstruction?: { parts: { text: string }[] }
  contents: { role: 'user' | 'model', parts: Part[] }[]
  generationConfig: { maxOutputTokens: number, temperature?: number, thinkingConfig: { thinkingBudget: number }, mediaResolution?: string }
}

/** Rebuilds the request from allowed fields only. */
export function validateChatRequest(raw: unknown): { model: string, body: GeminiBody } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Body must be a JSON object.' }
  const r = raw as Record<string, unknown>
  // older app builds still ask for the previous model; serve them with the current one
  if (!isAllowedModel(r.model) && r.model !== 'gemini-3.8-flash') return { error: 'Model is not allowed.' }

  if (!Array.isArray(r.contents) || !r.contents.length || r.contents.length > MAX_CONTENTS) return { error: 'Invalid contents.' }
  let images = 0
  const contents: GeminiBody['contents'] = []
  for (const c of r.contents as Record<string, unknown>[]) {
    if (!c || (c.role !== 'user' && c.role !== 'model') || !Array.isArray(c.parts) || !c.parts.length || c.parts.length > MAX_PARTS) {
      return { error: 'Invalid contents entry.' }
    }
    const parts: Part[] = []
    for (const p of c.parts as Record<string, unknown>[]) {
      const inline = p?.inlineData as Record<string, unknown> | undefined
      if (typeof p?.text === 'string' && p.text.length <= MAX_TEXT) {
        parts.push({ text: p.text })
      } else if (inline && typeof inline.mimeType === 'string' && IMAGE_TYPES.has(inline.mimeType)
        && typeof inline.data === 'string' && /^[A-Za-z0-9+/]+=*$/.test(inline.data) && c.role === 'user') {
        if (++images > MAX_IMAGES) return { error: 'Too many images.' }
        parts.push({ inlineData: { mimeType: inline.mimeType, data: inline.data } })
      } else {
        return { error: 'Invalid part.' }
      }
    }
    contents.push({ role: c.role, parts })
  }

  const body: GeminiBody = { contents, generationConfig: { maxOutputTokens: AI_GENERATION.defaultOutputTokens, thinkingConfig: { thinkingBudget: AI_GENERATION.thinkingBudget } } }
  const sys = (r.systemInstruction as { parts?: { text?: unknown }[] } | undefined)?.parts
  if (sys !== undefined) {
    if (!Array.isArray(sys) || sys.length > 4 || sys.some(p => typeof p?.text !== 'string' || p.text.length > MAX_TEXT)) {
      return { error: 'Invalid systemInstruction.' }
    }
    body.systemInstruction = { parts: sys.map(p => ({ text: p.text as string })) }
  }

  const gen = (r.generationConfig ?? {}) as Record<string, unknown>
  body.generationConfig.maxOutputTokens = clamp(gen.maxOutputTokens, 64, AI_GENERATION.maxOutputTokens, AI_GENERATION.defaultOutputTokens)
  if (typeof gen.temperature === 'number' && gen.temperature >= 0 && gen.temperature <= 2) body.generationConfig.temperature = gen.temperature
  if (images) body.generationConfig.mediaResolution = AI_GENERATION.mediaResolution

  return { model: AI_MODEL, body }
}

interface UpstreamError {
  error?: {
    message?: string
    status?: string
    details?: { reason?: string, retryDelay?: string, violations?: { quotaId?: string, quotaValue?: string }[] }[]
  }
}

export interface ProxyError {
  reason: ErrorReason
  message: string
  retryAfterSec?: number
  daily?: boolean
  limit?: number
}

export function upstreamError(status: number, data: UpstreamError | null): ProxyError {
  const details = data?.error?.details ?? []
  if (status === 429) {
    const delay = Number.parseFloat(details.find(d => d.retryDelay)?.retryDelay ?? '')
    const daily = details.flatMap(d => d.violations ?? []).find(v => /PerDay/i.test(v.quotaId ?? ''))
    const limit = Number(daily?.quotaValue)
    return {
      reason: 'quota',
      message: 'Gemini quota exceeded.',
      ...(Number.isFinite(delay) ? { retryAfterSec: Math.ceil(delay) } : {}),
      ...(daily ? { daily: true } : {}),
      ...(Number.isFinite(limit) && limit > 0 ? { limit } : {})
    }
  }
  if (status === 401 || status === 403 || details.some(d => d.reason === 'API_KEY_INVALID')) return { reason: 'server_key', message: 'The server API key was rejected.' }
  if (status === 404) return { reason: 'model', message: 'Model not available.' }
  if (status === 400) return { reason: 'bad_request', message: data?.error?.message ?? 'Bad request.' }
  return { reason: 'upstream', message: `Gemini error ${status}.` }
}

type Provider = 'gemini' | 'cloudflare' | 'local'
const PROVIDERS: Provider[] = ['gemini', 'cloudflare', 'local']
/** next() resolves to the chunks to forward, or null at the end. */
type Upstream = { next: () => Promise<Uint8Array[] | null> }
type Attempt = Upstream | { error: ProxyError | ErrorReason, fallthrough: boolean }

const CF_ACCOUNT = 'a77f82ef009ae83b18d338ffa77e3699'
const CF_MODEL = '@cf/google/gemma-4-26b-a4b-it'
const LOCAL_MODEL = 'gemma4:e4b'
// a provider that has not started streaming by then is skipped (cold model, stuck tunnel)
const FIRST_BYTE_MS = 8_000

const configured: Record<Provider, () => boolean> = {
  gemini: () => !!env('GEMINI_API_KEY'),
  cloudflare: () => !!env('CF_AI_TOKEN'),
  local: () => !!(env('LOCAL_AI_URL') && env('LOCAL_AI_TOKEN'))
}

export function providerChain(): Provider[] {
  const list = (env('AI_PROVIDERS') || 'gemini').split(',').map(p => p.trim()).filter((p): p is Provider => PROVIDERS.includes(p as Provider))
  return [...new Set(list)].filter(p => configured[p]())
}

const texts = (parts: Part[]) => parts.flatMap(p => p.text !== undefined ? [p.text] : []).join('\n\n')
const systemText = (body: GeminiBody) => body.systemInstruction?.parts.map(p => p.text).join('\n\n')

export function toOllamaMessages(body: GeminiBody) {
  const messages: { role: 'system' | 'user' | 'assistant', content: string, images?: string[] }[] = []
  const sys = systemText(body)
  if (sys) messages.push({ role: 'system', content: sys })
  for (const c of body.contents) {
    const images = c.parts.flatMap(p => p.inlineData ? [p.inlineData.data] : [])
    messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: texts(c.parts), ...(images.length ? { images } : {}) })
  }
  return messages
}

type OpenAiContent = string | ({ type: 'text', text: string } | { type: 'image_url', image_url: { url: string } })[]

export function toOpenAiMessages(body: GeminiBody) {
  const messages: { role: 'system' | 'user' | 'assistant', content: OpenAiContent }[] = []
  const sys = systemText(body)
  if (sys) messages.push({ role: 'system', content: sys })
  for (const c of body.contents) {
    const role = c.role === 'model' ? 'assistant' : 'user'
    if (!c.parts.some(p => p.inlineData)) {
      messages.push({ role, content: texts(c.parts) })
      continue
    }
    messages.push({ role, content: c.parts.map(p => p.inlineData
      ? { type: 'image_url' as const, image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } }
      : { type: 'text' as const, text: p.text ?? '' }) })
  }
  return messages
}

interface Delta { text: string, done?: boolean, finish?: string, prompt?: number, out?: number, failed?: boolean }

const ollamaDelta = (line: string): Delta | null => {
  const c = JSON.parse(line) as { message?: { content?: string }, done?: boolean, done_reason?: string, prompt_eval_count?: number, eval_count?: number, error?: string }
  if (c.error) return { text: '', failed: true }
  return { text: c.message?.content ?? '', done: c.done, finish: c.done_reason === 'length' ? 'MAX_TOKENS' : 'STOP', prompt: c.prompt_eval_count, out: c.eval_count }
}

const openAiDelta = (line: string): Delta | null => {
  if (!line.startsWith('data:')) return null
  const data = line.slice(5).trim()
  if (data === '[DONE]') return null
  const c = JSON.parse(data) as { choices?: { delta?: { content?: string | null }, finish_reason?: string | null }[], usage?: { prompt_tokens?: number, completion_tokens?: number }, error?: unknown, errors?: unknown[] }
  if (c.error || c.errors?.length) return { text: '', failed: true }
  const choice = c.choices?.[0]
  const finish = choice?.finish_reason
  return {
    text: choice?.delta?.content ?? '',
    done: !!finish,
    finish: finish === 'length' ? 'MAX_TOKENS' : 'STOP',
    prompt: c.usage?.prompt_tokens,
    out: c.usage?.completion_tokens
  }
}

/** Line-based upstream stream (Ollama NDJSON or OpenAI SSE) to the Gemini SSE events the app parses. */
export function toGeminiSse(parse: (line: string) => Delta | null, modelVersion: string) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ''
  const state = { failed: false }
  const convert = (line: string): string | null => {
    let d: Delta | null
    try {
      d = parse(line)
    } catch {
      return null
    }
    if (!d) return null
    if (d.failed) {
      state.failed = true
      return JSON.stringify({ budbuddy: { error: 'upstream' } })
    }
    if (!d.text && !d.done) return null
    const candidate: Record<string, unknown> = { content: { role: 'model', parts: [{ text: d.text }] } }
    const event: Record<string, unknown> = { candidates: [candidate], modelVersion }
    if (d.done) {
      candidate.finishReason = d.finish
      if (d.prompt !== undefined || d.out !== undefined) {
        event.usageMetadata = { promptTokenCount: d.prompt ?? 0, candidatesTokenCount: d.out ?? 0, totalTokenCount: (d.prompt ?? 0) + (d.out ?? 0) }
      }
    }
    return JSON.stringify(event)
  }
  const push = (chunk: Uint8Array, flush = false): Uint8Array[] => {
    buffer += decoder.decode(chunk, { stream: !flush })
    const lines = buffer.replace(/\r\n/g, '\n').split('\n')
    buffer = flush ? '' : lines.pop() ?? ''
    return lines.flatMap((l) => {
      const e = l.trim() ? convert(l.trim()) : null
      return e ? [encoder.encode(`data: ${e}\n\n`)] : []
    })
  }
  return Object.assign(state, { push })
}

interface Call {
  provider: Provider
  url: string
  headers: Record<string, string>
  body: unknown
  signal: AbortSignal
  firstByteMs: number
}

const limited = (status: number, data: unknown) => status === 429 || /"code"\s*:\s*4006\b/.test(JSON.stringify(data ?? ''))

/** Converted stream, but only once the first text event arrived; anything else before that falls through. */
async function convertedStream(call: Call, convert: ReturnType<typeof toGeminiSse>): Promise<Attempt> {
  const firstByte = new AbortController()
  const timer = setTimeout(() => firstByte.abort(), call.firstByteMs)
  try {
    const res = await fetch(call.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...call.headers },
      body: JSON.stringify(call.body),
      signal: AbortSignal.any([call.signal, firstByte.signal])
    })
    console.log(`[chat] ${call.provider} ${res.status}`)
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => null)
      return { error: limited(res.status, data) ? { reason: 'quota', message: `${call.provider} quota exceeded.` } : 'upstream', fallthrough: true }
    }
    const reader = res.body.getReader()
    let ended = false
    const next = async (): Promise<Uint8Array[] | null> => {
      if (ended) return null
      for (;;) {
        const { done, value } = await reader.read()
        if (done) {
          ended = true
          const rest = convert.push(new Uint8Array(), true)
          return rest.length ? rest : null
        }
        const events = convert.push(value)
        if (events.length) return events
      }
    }
    const first = await next()
    if (!first || convert.failed) {
      await reader.cancel().catch(() => {})
      return { error: 'upstream', fallthrough: true }
    }
    clearTimeout(timer)
    let pending: Uint8Array[] | null = first
    return { next: async () => {
      const out = pending ?? await next()
      pending = null
      return out
    } }
  } catch {
    console.error(`[chat] ${call.provider} ${firstByte.signal.aborted ? 'first-byte timeout' : 'unreachable'}`)
    return { error: call.signal.aborted ? 'timeout' : 'upstream', fallthrough: !call.signal.aborted }
  } finally {
    clearTimeout(timer)
  }
}

function callCloudflare(body: GeminiBody, signal: AbortSignal, firstByteMs: number): Promise<Attempt> {
  const model = env('CF_AI_MODEL') || CF_MODEL
  return convertedStream({
    provider: 'cloudflare',
    url: `https://api.cloudflare.com/client/v4/accounts/${env('CF_ACCOUNT_ID') || CF_ACCOUNT}/ai/v1/chat/completions`,
    headers: { Authorization: `Bearer ${env('CF_AI_TOKEN')}` },
    body: {
      model,
      messages: toOpenAiMessages(body),
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: body.generationConfig.maxOutputTokens,
      ...(body.generationConfig.temperature !== undefined ? { temperature: body.generationConfig.temperature } : {}),
      // thinking models (Gemma 4, Qwen 3) would spend the whole budget on reasoning
      chat_template_kwargs: { enable_thinking: false }
    },
    signal,
    firstByteMs
  }, toGeminiSse(openAiDelta, model))
}

function callLocal(body: GeminiBody, signal: AbortSignal, firstByteMs: number): Promise<Attempt> {
  const model = env('LOCAL_AI_MODEL') || LOCAL_MODEL
  return convertedStream({
    provider: 'local',
    url: env('LOCAL_AI_URL')!,
    headers: { Authorization: `Bearer ${env('LOCAL_AI_TOKEN')}` },
    body: {
      model,
      messages: toOllamaMessages(body),
      options: { num_predict: body.generationConfig.maxOutputTokens, ...(body.generationConfig.temperature !== undefined ? { temperature: body.generationConfig.temperature } : {}) }
    },
    signal,
    firstByteMs
  }, toGeminiSse(ollamaDelta, `local/${model}`))
}

async function callGemini(body: GeminiBody, model: string, signal: AbortSignal, firstByteMs: number): Promise<Attempt> {
  const key = env('GEMINI_API_KEY')!
  const headersBy = new AbortController()
  const timer = setTimeout(() => headersBy.abort(), firstByteMs)
  const call = (b: GeminiBody) => fetch(`${GEMINI}/${model}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(b),
    signal: AbortSignal.any([signal, headersBy.signal])
  })
  let upstream: Response
  try {
    upstream = await call(body)
  } finally {
    clearTimeout(timer)
  }
  let data: UpstreamError | null = null
  if (upstream.status === 400) {
    data = await upstream.json().catch(() => null) as UpstreamError | null
    // models that can't switch thinking off reject the config; retry with the model's default
    if (/thinking/i.test(data?.error?.message ?? '')) {
      const { thinkingConfig: _, ...generationConfig } = body.generationConfig
      upstream = await call({ ...body, generationConfig } as GeminiBody)
      data = null
    }
  }
  console.log(`[chat] gemini ${upstream.status}`)
  if (upstream.ok && upstream.body) {
    const reader = upstream.body.getReader()
    return { next: async () => {
      const { done, value } = await reader.read()
      return done ? null : [value]
    } }
  }
  data ??= await upstream.json().catch(() => null) as UpstreamError | null
  return { error: upstreamError(upstream.status, data), fallthrough: upstream.status === 429 || upstream.status >= 500 }
}

export default async (req: Request): Promise<Response> => {
  const started = Date.now()
  const origin = req.headers.get('origin')
  const headers = cors(origin)

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return fail(405, 'bad_request', 'Use POST.', headers)
  if (!isAllowedOrigin(origin)) return fail(403, 'forbidden_origin', 'Origin not allowed.', headers)

  const token = env('BUDBUDDY_APP_TOKEN')
  if (token && req.headers.get('x-budbuddy-token') !== token) return fail(401, 'unauthorized', 'Missing or wrong app token.', headers)

  const providers = providerChain()
  if (!providers.length) return fail(503, 'not_configured', 'AI is not configured on the server.', headers)

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail(413, 'too_large', 'Request too large.', headers)
  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) return fail(413, 'too_large', 'Request too large.', headers)

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return fail(400, 'bad_request', 'Invalid JSON.', headers)
  }
  const checked = validateChatRequest(raw)
  if ('error' in checked) return fail(400, 'bad_request', checked.error, headers)

  // The upstream is called before the response starts; the body is then pulled chunk by chunk.
  // Starting the fetch after returning stalled on Netlify.
  const abort = new AbortController()
  const deadline = AbortSignal.timeout(Math.max(1000, DEADLINE_MS - (Date.now() - started)))
  const signal = AbortSignal.any([abort.signal, deadline])
  const encoder = new TextEncoder()
  const event = (error: ProxyError | ErrorReason) => encoder.encode(`\n\ndata: ${JSON.stringify({ budbuddy: { error } })}\n\n`)

  let first: Uint8Array | null = null
  let upstream: Upstream | null = null
  for (const [i, provider] of providers.entries()) {
    // the last provider gets the whole deadline: a cold local model may need longer to load
    const firstByteMs = i < providers.length - 1 ? FIRST_BYTE_MS : DEADLINE_MS
    let attempt: Attempt
    try {
      attempt = provider === 'local'
        ? await callLocal(checked.body, signal, firstByteMs)
        : provider === 'cloudflare' ? await callCloudflare(checked.body, signal, firstByteMs) : await callGemini(checked.body, checked.model, signal, firstByteMs)
    } catch {
      console.error(`[chat] ${provider} ${deadline.aborted ? 'deadline' : 'failure'} after ${Date.now() - started} ms`)
      attempt = { error: deadline.aborted ? 'timeout' : 'upstream', fallthrough: !deadline.aborted }
    }
    if ('next' in attempt) {
      console.log(`[chat] ${provider} streaming after ${Date.now() - started} ms`)
      upstream = attempt
      break
    }
    first = event(attempt.error)
    if (!attempt.fallthrough) break
  }

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!upstream) {
        controller.enqueue(first ?? event('upstream'))
        controller.close()
        return
      }
      try {
        const chunks = await upstream.next()
        if (!chunks) {
          console.log(`[chat] done after ${Date.now() - started} ms`)
          controller.close()
        } else {
          chunks.forEach(c => controller.enqueue(c))
        }
      } catch {
        if (abort.signal.aborted) return
        console.error(`[chat] ${deadline.aborted ? 'deadline' : 'stream failure'} after ${Date.now() - started} ms`)
        controller.enqueue(event(deadline.aborted ? 'timeout' : 'upstream'))
        controller.close()
      }
    },
    cancel() {
      abort.abort()
    }
  })

  return new Response(stream, {
    headers: { ...headers, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' }
  })
}

export const config = {
  path: '/api/chat',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] }
}
