import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler, { validateChatRequest } from '../netlify/functions/chat.mts'

const URL = 'https://example.netlify.app/api/chat'
const valid = {
  model: 'gemini-flash-latest',
  systemInstruction: { parts: [{ text: 'sys' }] },
  contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } }, { text: 'Ahoj' }] }],
  generationConfig: { maxOutputTokens: 999_999, temperature: 0.5 }
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  handler(new Request(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'https://localhost', ...headers }, body: JSON.stringify(body) }))

const sse = (...events: unknown[]) => new Response(events.map(e => `data: ${JSON.stringify(e)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } })

describe('validateChatRequest', () => {
  it('rebuilds the body from allowed fields and caps tokens', () => {
    const r = validateChatRequest({ ...valid, tools: [{ googleSearch: {} }] })
    expect('error' in r).toBe(false)
    if ('error' in r) return
    expect(r.body.generationConfig).toEqual({ maxOutputTokens: 4096, temperature: 0.5, thinkingConfig: { thinkingBudget: 1024 } })
    expect(r.body).not.toHaveProperty('tools')
  })

  it('rejects unknown models and malformed contents', () => {
    expect(validateChatRequest({ ...valid, model: 'gemini-3.1-pro-preview' })).toEqual({ error: 'Model is not allowed.' })
    expect(validateChatRequest({ ...valid, contents: [] })).toHaveProperty('error')
    expect(validateChatRequest({ ...valid, contents: [{ role: 'system', parts: [{ text: 'x' }] }] })).toHaveProperty('error')
    expect(validateChatRequest({ ...valid, contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'text/html', data: 'AAAA' } }] }] })).toHaveProperty('error')
    expect(validateChatRequest({ ...valid, contents: [{ role: 'user', parts: [{ fileData: { fileUri: 'gs://x' } }] }] })).toHaveProperty('error')
  })
})

describe('chat function', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    vi.stubEnv('BUDBUDDY_APP_TOKEN', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    fetchMock.mockReset()
  })

  it('answers CORS preflight for the app origins only', async () => {
    const pre = await handler(new Request(URL, { method: 'OPTIONS', headers: { Origin: 'https://localhost' } }))
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-origin')).toBe('https://localhost')
    expect((await post(valid, { Origin: 'https://evil.example' })).status).toBe(403)
  })

  it('reports a missing server key as 503', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    const res = await post(valid)
    expect(res.status).toBe(503)
    expect((await res.json()).error.reason).toBe('not_configured')
  })

  it('requires the app token when one is configured', async () => {
    vi.stubEnv('BUDBUDDY_APP_TOKEN', 'secret')
    expect((await post(valid)).status).toBe(401)
    fetchMock.mockResolvedValue(sse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }))
    expect((await post(valid, { 'X-BudBuddy-Token': 'secret' })).status).toBe(200)
  })

  it('rejects oversized bodies', async () => {
    const big = { ...valid, contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'A'.repeat(6_100_000) } }] }] }
    expect((await post(big)).status).toBe(413)
  })

  it('streams Gemini SSE through with the key in a header', async () => {
    fetchMock.mockResolvedValue(sse({ candidates: [{ content: { parts: [{ text: 'Ahoj' }] } }] }))
    const res = await post(valid)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    expect(await res.text()).toContain('"Ahoj"')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse')
    expect(init.headers['x-goog-api-key']).toBe('test-key')
    expect(url).not.toContain('test-key')
  })

  it('maps upstream quota errors', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { status: 'RESOURCE_EXHAUSTED', details: [{ retryDelay: '12.5s' }] } }, { status: 429 }))
    const res = await post(valid)
    expect(res.status).toBe(429)
    expect((await res.json()).error).toEqual({ reason: 'quota', message: 'Gemini quota exceeded.', retryAfterSec: 13 })
  })

  it('ends a broken stream with a final event', async () => {
    const enc = new TextEncoder()
    const body = new ReadableStream({
      start(c) {
        c.enqueue(enc.encode('data: {"candidates":[{"content":{"parts":[{"text":"Čá'))
        c.error(new Error('reset'))
      }
    })
    fetchMock.mockResolvedValue(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }))
    const text = await (await post(valid)).text()
    expect(text).toMatch(/\n\ndata: \{"budbuddy":\{"error":"upstream"\}\}\n\n$/)
  })
})
