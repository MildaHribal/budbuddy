// AI proxy: validates the app's Gemini request and streams the answer back.
// The key comes only from the GEMINI_API_KEY env var.
import { isAllowedModel } from '../../shared/aiModels'

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models'
const MAX_BODY_BYTES = 6_000_000
// Netlify stops a function (streaming included) after 60 s; end cleanly before that.
const DEADLINE_MS = 55_000
const MAX_OUTPUT_TOKENS = 4096
const DEFAULT_OUTPUT_TOKENS = 2048
const MAX_THINKING_TOKENS = 2048
const DEFAULT_THINKING_TOKENS = 1024
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

const fail = (status: number, reason: ErrorReason, message: string, headers: Record<string, string>, retryAfterSec?: number) =>
  Response.json({ error: { reason, message, ...(retryAfterSec ? { retryAfterSec } : {}) } }, { status, headers })

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

  const body: GeminiBody = { contents, generationConfig: { maxOutputTokens: DEFAULT_OUTPUT_TOKENS, thinkingConfig: { thinkingBudget: DEFAULT_THINKING_TOKENS } } }
  const sys = (r.systemInstruction as { parts?: { text?: unknown }[] } | undefined)?.parts
  if (sys !== undefined) {
    if (!Array.isArray(sys) || sys.length > 4 || sys.some(p => typeof p?.text !== 'string' || p.text.length > MAX_TEXT)) {
      return { error: 'Invalid systemInstruction.' }
    }
    body.systemInstruction = { parts: sys.map(p => ({ text: p.text as string })) }
  }

  const gen = (r.generationConfig ?? {}) as Record<string, unknown>
  body.generationConfig.maxOutputTokens = clamp(gen.maxOutputTokens, 64, MAX_OUTPUT_TOKENS, DEFAULT_OUTPUT_TOKENS)
  const thinking = (gen.thinkingConfig ?? {}) as Record<string, unknown>
  body.generationConfig.thinkingConfig.thinkingBudget = clamp(thinking.thinkingBudget, 0, MAX_THINKING_TOKENS, DEFAULT_THINKING_TOKENS)
  if (typeof gen.temperature === 'number' && gen.temperature >= 0 && gen.temperature <= 2) body.generationConfig.temperature = gen.temperature

  return { model: r.model, body }
}

interface UpstreamError {
  error?: { message?: string, status?: string, details?: { reason?: string, retryDelay?: string }[] }
}

function upstreamFailure(status: number, data: UpstreamError | null, headers: Record<string, string>): Response {
  const details = data?.error?.details ?? []
  if (status === 429) {
    const delay = Number.parseFloat(details.find(d => d.retryDelay)?.retryDelay ?? '')
    return fail(429, 'quota', 'Gemini quota exceeded.', headers, Number.isFinite(delay) ? Math.ceil(delay) : undefined)
  }
  if (status === 401 || status === 403 || details.some(d => d.reason === 'API_KEY_INVALID')) {
    return fail(502, 'server_key', 'The server API key was rejected.', headers)
  }
  if (status === 404) return fail(502, 'model', 'Model not available.', headers)
  if (status === 400) return fail(400, 'bad_request', data?.error?.message ?? 'Bad request.', headers)
  return fail(502, 'upstream', `Gemini error ${status}.`, headers)
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

  const abort = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    abort.abort()
  }, DEADLINE_MS - (Date.now() - started))

  let upstream: Response
  try {
    upstream = await fetch(`${GEMINI}/${checked.model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(checked.body),
      signal: abort.signal
    })
  } catch {
    clearTimeout(timer)
    return timedOut ? fail(504, 'timeout', 'Gemini did not answer in time.', headers) : fail(502, 'upstream', 'Could not reach Gemini.', headers)
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timer)
    let data: UpstreamError | null = null
    try {
      data = await upstream.json()
    } catch {
      // not JSON
    }
    console.error(`[chat] upstream ${upstream.status} for ${checked.model}`)
    return upstreamFailure(upstream.status, data, headers)
  }

  // Pass SSE through; on a break or the deadline, end with a final budbuddy event.
  const reader = upstream.body.getReader()
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          clearTimeout(timer)
          controller.close()
        } else {
          controller.enqueue(value)
        }
      } catch {
        clearTimeout(timer)
        const reason: ErrorReason = timedOut ? 'timeout' : 'upstream'
        controller.enqueue(encoder.encode(`\n\ndata: ${JSON.stringify({ budbuddy: { error: reason } })}\n\n`))
        controller.close()
      }
    },
    cancel() {
      clearTimeout(timer)
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
