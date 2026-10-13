import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler, { providerChain, toOllamaMessages, toOpenAiMessages, validateChatRequest } from '../netlify/functions/chat.mts'

const URL = 'https://example.netlify.app/api/chat'
const valid = {
  model: 'gemini-3.5-flash',
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
    expect(r.body.generationConfig).toEqual({ maxOutputTokens: 2048, temperature: 0.5, thinkingConfig: { thinkingBudget: 0 }, mediaResolution: 'MEDIA_RESOLUTION_MEDIUM' })
    const text = validateChatRequest({ ...valid, contents: [{ role: 'user', parts: [{ text: 'ahoj' }] }], generationConfig: undefined })
    expect('error' in text ? null : text.body.generationConfig).toEqual({ maxOutputTokens: 900, thinkingConfig: { thinkingBudget: 0 } })
    expect(r.body).not.toHaveProperty('tools')
  })

  it('rejects unknown models and malformed contents', () => {
    expect(validateChatRequest({ ...valid, model: 'gemini-flash-latest' })).toEqual({ error: 'Model is not allowed.' })
    const thinking = validateChatRequest({ ...valid, generationConfig: { thinkingConfig: { thinkingBudget: 2048 } } })
    expect('error' in thinking ? null : thinking.body.generationConfig).toEqual({ maxOutputTokens: 900, thinkingConfig: { thinkingBudget: 0 }, mediaResolution: 'MEDIA_RESOLUTION_MEDIUM' })
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
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse')
    expect(init.headers['x-goog-api-key']).toBe('test-key')
    expect(url).not.toContain('test-key')
  })

  it('reports upstream quota errors as a final stream event', async () => {
    const lastEvent = async (res: Response) => JSON.parse((await res.text()).trim().split('\n').pop()!.replace(/^data: /, '')).budbuddy.error
    fetchMock.mockResolvedValue(Response.json({ error: { status: 'RESOURCE_EXHAUSTED', details: [{ retryDelay: '12.5s' }] } }, { status: 429 }))
    const res = await post(valid)
    expect(res.status).toBe(200)
    expect(await lastEvent(res)).toEqual({ reason: 'quota', message: 'Gemini quota exceeded.', retryAfterSec: 13 })

    fetchMock.mockResolvedValue(Response.json({ error: { status: 'RESOURCE_EXHAUSTED', details: [
      { violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20' }] },
      { retryDelay: '41s' }
    ] } }, { status: 429 }))
    expect(await lastEvent(await post(valid))).toEqual({ reason: 'quota', message: 'Gemini quota exceeded.', retryAfterSec: 41, daily: true, limit: 20 })
  })

  it('streams Gemini chunks through after the upstream responds', async () => {
    fetchMock.mockResolvedValue(sse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }))
    const res = await post(valid)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    expect(await res.text()).toContain('"ok"')
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

describe('provider chain', () => {
  const fetchMock = vi.fn()
  const events = async (res: Response) => (await res.text()).split('\n\n').map(e => e.trim()).filter(Boolean).map(e => JSON.parse(e.replace(/^data: /, '')))
  const ndjson = (...lines: unknown[]) => new Response(lines.map(l => `${JSON.stringify(l)}\n`).join(''), { headers: { 'Content-Type': 'application/x-ndjson' } })
  const openAi = (...chunks: unknown[]) => new Response([...chunks.map(c => `data: ${JSON.stringify(c)}\n\n`), 'data: [DONE]\n\n'].join(''), { headers: { 'Content-Type': 'text/event-stream' } })
  const urls = () => fetchMock.mock.calls.map(([u]) => String(u).split('/')[2])

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('BUDBUDDY_APP_TOKEN', '')
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    vi.stubEnv('LOCAL_AI_URL', 'https://ai.example/chat')
    vi.stubEnv('LOCAL_AI_TOKEN', 'local-secret')
    vi.stubEnv('LOCAL_AI_MODEL', 'gemma4:e4b')
    vi.stubEnv('CF_AI_TOKEN', 'cf-secret')
    vi.stubEnv('CF_ACCOUNT_ID', '')
    vi.stubEnv('CF_AI_MODEL', '')
    vi.stubEnv('AI_PROVIDERS', '')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    fetchMock.mockReset()
  })

  it('defaults to gemini and skips unconfigured providers', () => {
    expect(providerChain()).toEqual(['gemini'])
    vi.stubEnv('AI_PROVIDERS', ' local , nope, gemini,local')
    expect(providerChain()).toEqual(['local', 'gemini'])
    vi.stubEnv('AI_PROVIDERS', 'gemini,cloudflare,local')
    vi.stubEnv('CF_AI_TOKEN', '')
    vi.stubEnv('GEMINI_API_KEY', '')
    expect(providerChain()).toEqual(['local'])
  })

  it('translates the Gemini body to Ollama and OpenAI messages', () => {
    const r = validateChatRequest({ ...valid, contents: [{ role: 'user', parts: [{ text: 'q1' }] }, { role: 'model', parts: [{ text: 'a1' }] }, ...valid.contents] })
    if ('error' in r) throw new Error(r.error)
    expect(toOllamaMessages(r.body)).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'Ahoj', images: ['AAAA'] }
    ])
    expect(toOpenAiMessages(r.body).at(-1)).toEqual({ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } }, { type: 'text', text: 'Ahoj' }] })
  })

  it('streams the local model as Gemini SSE with usage', async () => {
    vi.stubEnv('AI_PROVIDERS', 'local,gemini')
    fetchMock.mockResolvedValue(ndjson(
      { model: 'gemma4:e4b', message: { content: 'Ahoj' }, done: false },
      { model: 'gemma4:e4b', message: { content: ' světe' }, done: false },
      { model: 'gemma4:e4b', message: { content: '' }, done: true, done_reason: 'length', prompt_eval_count: 12, eval_count: 2 }
    ))
    const res = await post(valid)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const out = await events(res)
    expect(out.map(e => e.candidates[0].content.parts[0].text).join('')).toBe('Ahoj světe')
    expect(out.at(-1)).toMatchObject({ modelVersion: 'local/gemma4:e4b', candidates: [{ finishReason: 'MAX_TOKENS' }], usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 2, totalTokenCount: 14 } })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://ai.example/chat')
    expect(init.headers.Authorization).toBe('Bearer local-secret')
    expect(JSON.parse(init.body)).toMatchObject({ model: 'gemma4:e4b', options: { num_predict: 2048, temperature: 0.5 } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('streams Workers AI as Gemini SSE without thinking', async () => {
    vi.stubEnv('AI_PROVIDERS', 'cloudflare')
    fetchMock.mockResolvedValue(openAi(
      { choices: [{ delta: { role: 'assistant', content: '' } }] },
      { choices: [{ delta: { content: 'pH 6,5' } }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 30, completion_tokens: 4 } }
    ))
    const out = await events(await post(valid))
    expect(out.map(e => e.candidates[0].content.parts[0].text).join('')).toBe('pH 6,5')
    expect(out.at(-1)).toMatchObject({ modelVersion: '@cf/google/gemma-4-26b-a4b-it', candidates: [{ finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 4 } })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/a77f82ef009ae83b18d338ffa77e3699/ai/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer cf-secret')
    expect(JSON.parse(init.body)).toMatchObject({ model: '@cf/google/gemma-4-26b-a4b-it', stream: true, max_tokens: 2048, chat_template_kwargs: { enable_thinking: false } })
  })

  it('falls through on quota, server errors and refused connections', async () => {
    vi.stubEnv('AI_PROVIDERS', 'gemini,cloudflare,local')
    fetchMock
      .mockResolvedValueOnce(Response.json({ error: { status: 'RESOURCE_EXHAUSTED' } }, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ errors: [{ code: 4006, message: 'daily free allocation used' }] }, { status: 429 }))
      .mockResolvedValueOnce(ndjson({ message: { content: 'z PC' }, done: false }, { done: true, done_reason: 'stop' }))
    expect(await (await post(valid)).text()).toContain('"z PC"')
    expect(urls()).toEqual(['generativelanguage.googleapis.com', 'api.cloudflare.com', 'ai.example'])

    fetchMock.mockReset()
    vi.stubEnv('AI_PROVIDERS', 'local,gemini')
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(sse({ candidates: [{ content: { parts: [{ text: 'z Gemini' }] } }] }))
    expect(await (await post(valid)).text()).toContain('"z Gemini"')

    fetchMock.mockReset()
    fetchMock
      .mockResolvedValueOnce(Response.json({ error: { reason: 'busy' } }, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ error: { message: 'Internal' } }, { status: 503 }))
    const last = (await events(await post(valid))).at(-1)
    expect(last.budbuddy.error).toMatchObject({ reason: 'upstream' })
  })

  it('falls through when the local model reports an error before any text', async () => {
    vi.stubEnv('AI_PROVIDERS', 'local,gemini')
    fetchMock
      .mockResolvedValueOnce(ndjson({ error: 'model failed to load' }))
      .mockResolvedValueOnce(sse({ candidates: [{ content: { parts: [{ text: 'záloha' }] } }] }))
    expect(await (await post(valid)).text()).toContain('"záloha"')
  })

  it('does not fall through on a Gemini bad request', async () => {
    vi.stubEnv('AI_PROVIDERS', 'gemini,local')
    fetchMock.mockResolvedValue(Response.json({ error: { message: 'bad image' } }, { status: 400 }))
    const last = (await events(await post(valid))).at(-1)
    expect(last.budbuddy.error).toEqual({ reason: 'bad_request', message: 'bad image' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('skips a provider that sends nothing within 8 s', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.stubEnv('AI_PROVIDERS', 'local,gemini')
    fetchMock
      .mockImplementationOnce((_url: string, init: RequestInit) => new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted')))))
      .mockResolvedValueOnce(sse({ candidates: [{ content: { parts: [{ text: 'po timeoutu' }] } }] }))
    const pending = post(valid)
    await vi.advanceTimersByTimeAsync(8_100)
    expect(await (await pending).text()).toContain('"po timeoutu"')
  })
})
