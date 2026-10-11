// AI proxy: validates the app's Gemini request and streams the answer back.
// The key comes only from the GEMINI_API_KEY env var.
import { AI_GENERATION, isAllowedModel } from '../../shared/aiModels'

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models'
const MAX_BODY_BYTES = 6_000_000
// Netlify stops a function (streaming included) after 60 s; end cleanly before that.
const DEADLINE_MS = 55_000
const MAX_CONTENTS = 24
const MAX_PARTS = 8
const MAX_IMAGES = 3
const MAX_TEXT = 60_000
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

const FIXED_ORIGINS = new Set(['https://localhost', 'http://localhost', 'capacitor://localhost', 'https://budbuddy.hribal.site'])

export type ErrorReason = 'not_configured' | 'unauthorized' | 'forbidden_origin' | 'bad_request' | 'too_large' | 'quota' | 'server_key' | 'model' | 'upstream' | 'timeout'

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true
  if (FIXED_ORIGINS.has(origin)) return true
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true
  return [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL].includes(origin)
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
  generationConfig: { maxOutputTokens: number, temperature?: number, thinkingConfig: { thinkingBudget: number } }
}

/** Rebuilds the request from allowed fields only. */
export function validateChatRequest(raw: unknown): { model: string, body: GeminiBody } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Body must be a JSON object.' }
  const r = raw as Record<string, unknown>
  if (!isAllowedModel(r.model)) return { error: 'Model is not allowed.' }

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

  return { model: r.model, body }
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

export default async (req: Request): Promise<Response> => {
  const started = Date.now()
  const origin = req.headers.get('origin')
  const headers = cors(origin)

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return fail(405, 'bad_request', 'Use POST.', headers)
  if (!isAllowedOrigin(origin)) return fail(403, 'forbidden_origin', 'Origin not allowed.', headers)

  const token = process.env.BUDBUDDY_APP_TOKEN
  if (token && req.headers.get('x-budbuddy-token') !== token) return fail(401, 'unauthorized', 'Missing or wrong app token.', headers)

  const key = process.env.GEMINI_API_KEY
  if (!key) return fail(503, 'not_configured', 'AI is not configured on the server.', headers)

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

  // Gemini is called before the response starts (thinking is off, so headers arrive in ~1 s);
  // the body is then pulled chunk by chunk. Starting the fetch after returning stalled on Netlify.
  const abort = new AbortController()
  const deadline = AbortSignal.timeout(Math.max(1000, DEADLINE_MS - (Date.now() - started)))
  const signal = AbortSignal.any([abort.signal, deadline])
  const encoder = new TextEncoder()
  const event = (error: ProxyError | ErrorReason) => encoder.encode(`\n\ndata: ${JSON.stringify({ budbuddy: { error } })}\n\n`)

  let first: Uint8Array | null = null
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  try {
    const call = (body: GeminiBody) => fetch(`${GEMINI}/${checked.model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal
    })
    let upstream = await call(checked.body)
    let data: UpstreamError | null = null
    if (upstream.status === 400) {
      data = await upstream.json().catch(() => null) as UpstreamError | null
      // models that can't switch thinking off reject the config; retry with the model's default
      if (/thinking/i.test(data?.error?.message ?? '')) {
        const { thinkingConfig: _, ...generationConfig } = checked.body.generationConfig
        upstream = await call({ ...checked.body, generationConfig } as GeminiBody)
        data = null
      }
    }
    console.log(`[chat] upstream ${upstream.status} after ${Date.now() - started} ms`)
    if (!upstream.ok || !upstream.body) {
      data ??= await upstream.json().catch(() => null) as UpstreamError | null
      first = event(upstreamError(upstream.status, data))
    } else {
      reader = upstream.body.getReader()
    }
  } catch {
    console.error(`[chat] ${deadline.aborted ? 'deadline' : 'upstream failure'} after ${Date.now() - started} ms`)
    first = event(deadline.aborted ? 'timeout' : 'upstream')
  }

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!reader) {
        controller.enqueue(first ?? event('upstream'))
        controller.close()
        return
      }
      try {
        const { done, value } = await reader.read()
        if (done) {
          console.log(`[chat] done after ${Date.now() - started} ms`)
          controller.close()
        } else {
          controller.enqueue(value)
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
