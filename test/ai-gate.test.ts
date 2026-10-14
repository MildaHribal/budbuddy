import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createChatHandler, validateChatRequest } from '../netlify/functions/chat.mts'
import { createReportHandler } from '../netlify/functions/report-ai.mts'
import { identify } from '../supabase/functions/_shared/auth'
import { clientIp, createLimiter, limited } from '../supabase/functions/_shared/limit'
import { createChatGate } from '../supabase/functions/chat/gate'
import { createDeletionHandler, parseDeletionRequest } from '../supabase/functions/deletion-request/handler'

const UID = '0b6c3c7e-6f0d-4a3c-9a55-8d7d0f0a1b2c'
const CHAT = 'https://x.supabase.co/functions/v1/chat'
const body = { model: 'gemini-3.5-flash', systemInstruction: { parts: [{ text: 'sys' }] }, contents: [{ role: 'user', parts: [{ text: 'Ahoj' }] }] }

const req = (url: string, init: { body?: unknown, headers?: Record<string, string>, method?: string } = {}) => new Request(url, {
  method: init.method ?? 'POST',
  headers: { 'Content-Type': 'application/json', 'Origin': 'https://localhost', ...init.headers },
  body: init.method === 'OPTIONS' || init.method === 'GET' ? undefined : JSON.stringify(init.body ?? body)
})

describe('per-IP limiter', () => {
  it('keys on the Cloudflare header, else the last forwarded hop', () => {
    const r = (h: Record<string, string>) => new Request('https://x', { headers: h })
    expect(clientIp(r({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '6.6.6.6, 2.2.2.2' }))).toBe('1.1.1.1')
    expect(clientIp(r({ 'x-forwarded-for': '6.6.6.6, 2.2.2.2' }))).toBe('2.2.2.2')
    expect(clientIp(r({}))).toBe('unknown')
  })

  it('counts a sliding minute and evicts the oldest keys instead of wiping all', () => {
    const take = createLimiter(2, 3)
    expect([take('a', 0), take('a', 1), take('a', 2)]).toEqual([true, true, false])
    expect(take('a', 60_001)).toBe(true)
    take('b', 60_002)
    take('c', 60_003)
    take('d', 60_004)
    // 'a' was used least recently and got evicted, 'b'..'d' keep their history
    expect(take('a', 60_005)).toBe(true)
    expect(take('d', 60_006)).toBe(true)
    expect(take('d', 60_007)).toBe(false)
  })

  it('answers 429 over the limit', async () => {
    const handler = limited(async () => new Response('ok'), 1)
    const r = () => new Request('https://x', { method: 'POST', headers: { 'cf-connecting-ip': '9.9.9.9' } })
    expect((await handler(r())).status).toBe(200)
    expect((await handler(r())).status).toBe(429)
  })
})

describe('request caps', () => {
  it('caps the system instruction and the total text', () => {
    expect(validateChatRequest({ ...body, systemInstruction: { parts: [{ text: 'x'.repeat(12_001) }] } })).toEqual({ error: 'systemInstruction too long.' })
    const many = { ...body, contents: [{ role: 'user', parts: [{ text: 'x'.repeat(50_000) }, { text: 'x'.repeat(50_000) }] }] }
    expect(validateChatRequest(many)).toEqual({ error: 'Too much text.' })
    const image = { inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } }
    expect(validateChatRequest({ ...body, contents: [{ role: 'user', parts: [image, image] }, { role: 'model', parts: [{ text: 'a' }] }, { role: 'user', parts: [image, image] }] })).toEqual({ error: 'Too many images.' })
  })
})

describe('sign-in gate', () => {
  const fetchMock = vi.fn()
  let quota = 'ok'
  const calls = (part: string) => fetchMock.mock.calls.filter(([u]) => String(u).includes(part))

  beforeEach(() => {
    quota = 'ok'
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('GEMINI_API_KEY', 'g')
    vi.stubEnv('BUDBUDDY_APP_TOKEN', '')
    vi.stubEnv('SUPABASE_URL', 'https://db.example')
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
    vi.stubEnv('AI_ALLOW_ANON', '')
    vi.stubEnv('AI_DAILY_LIMIT', '')
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u.endsWith('/auth/v1/user')) {
        const auth = (init?.headers as Record<string, string>).Authorization
        if (auth === 'Bearer a.b.down') return new Response('x', { status: 500 })
        return auth === 'Bearer a.b.good' ? Response.json({ id: UID }) : Response.json({ msg: 'bad jwt' }, { status: 401 })
      }
      if (u.endsWith('/rpc/ai_quota_take')) return Response.json(quota)
      if (u.endsWith('/rpc/ai_anon_quota_take')) return Response.json(true)
      return new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })}\n\n`)
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    fetchMock.mockReset()
  })

  const handler = () => createChatHandler(createChatGate())
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

  it('requires a valid session', async () => {
    const none = await handler()(req(CHAT))
    expect(none.status).toBe(401)
    expect((await none.json()).error.reason).toBe('auth_required')
    expect((await handler()(req(CHAT, { headers: auth('a.b.bad') }))).status).toBe(401)
    expect((await handler()(req(CHAT, { headers: auth('not-a-jwt') }))).status).toBe(401)
    expect((await handler()(req(CHAT, { headers: auth('a.b.down') }))).status).toBe(503)
    expect(calls('generativelanguage')).toHaveLength(0)
  })

  it('takes one from the daily quota and answers', async () => {
    vi.stubEnv('AI_DAILY_LIMIT', '7')
    const res = await handler()(req(CHAT, { headers: auth('a.b.good') }))
    expect(res.status).toBe(200)
    expect(JSON.parse(String(calls('ai_quota_take')[0]![1].body))).toEqual({ uid: UID, lim: 7 })
    expect(calls('ai_quota_take')[0]![1].headers).toMatchObject({ Authorization: 'Bearer service' })
    expect(await res.text()).toContain('ok')
  })

  it('refuses over the daily limit and banned accounts', async () => {
    quota = 'limit'
    const limit = await handler()(req(CHAT, { headers: auth('a.b.good') }))
    expect(limit.status).toBe(429)
    expect((await limit.json()).error).toMatchObject({ reason: 'daily_limit', daily: true, limit: 40 })
    quota = 'banned'
    expect((await handler()(req(CHAT, { headers: auth('a.b.good') }))).status).toBe(403)
    expect(calls('generativelanguage')).toHaveLength(0)
  })

  it('does not charge invalid requests', async () => {
    const res = await handler()(req(CHAT, { headers: auth('a.b.good'), body: { ...body, model: 'other' } }))
    expect(res.status).toBe(400)
    expect(calls('ai_quota_take')).toHaveLength(0)
  })

  it('lets tokenless requests through only in the transition mode, strictly limited', async () => {
    vi.stubEnv('AI_ALLOW_ANON', '1')
    vi.stubEnv('AI_ANON_PER_MINUTE', '1')
    const h = handler()
    const anon = () => req(CHAT, { headers: { 'cf-connecting-ip': '5.5.5.5' } })
    expect((await h(anon())).status).toBe(200)
    expect(calls('ai_anon_quota_take')).toHaveLength(1)
    expect((await h(anon())).status).toBe(429)
    // a token that is present but invalid still fails
    expect((await h(req(CHAT, { headers: auth('a.b.bad') }))).status).toBe(401)
  })

  it('identifies callers', async () => {
    expect(await identify(req(CHAT, { headers: auth('a.b.good') }))).toEqual({ kind: 'user', id: UID })
    vi.stubEnv('AI_ALLOW_ANON', '1')
    expect(await identify(req(CHAT))).toEqual({ kind: 'anon' })
  })

  it('records the reporter of an AI report', async () => {
    fetchMock.mockImplementation(async (url: string) => String(url).endsWith('/auth/v1/user') ? Response.json({ id: UID }) : new Response(null, { status: 201 }))
    const handler = createReportHandler(async (r) => {
      const c = await identify(r)
      return 'status' in c ? c : { reporterId: c.kind === 'user' ? c.id : null }
    })
    const report = { messageId: UID, reason: 'wrong', answer: 'x', question: 'q' }
    expect((await handler(req('https://x/report-ai', { body: report }))).status).toBe(401)
    expect((await handler(req('https://x/report-ai', { body: report, headers: auth('a.b.good') }))).status).toBe(204)
    const insert = calls('/rest/v1/reports')[0]!
    expect(JSON.parse(String(insert[1].body))).toMatchObject({ reporter_id: UID, target_type: 'ai' })
  })
})

describe('deletion-request function', () => {
  const URL = 'https://x.supabase.co/functions/v1/deletion-request'
  const site = { Origin: 'https://budbuddy.hribal.site' }

  it('validates the form', () => {
    expect(parseDeletionRequest({ contact: 'a@b.cz', note: '  please  ' })).toEqual({ contact: 'a@b.cz', username: null, note: 'please' })
    expect(parseDeletionRequest({ username: '@Grower_1' })).toEqual({ contact: null, username: 'grower_1', note: null })
    expect(parseDeletionRequest({ email: 'a@b.cz', reason: 'x' })).toMatchObject({ contact: 'a@b.cz', note: 'x' })
    expect(parseDeletionRequest({})).toEqual({ field: 'contact' })
    expect(parseDeletionRequest({ contact: 'telegram  @someone' })).toEqual({ contact: 'telegram @someone', username: null, note: null })
    expect(parseDeletionRequest({ contact: 'x'.repeat(255) })).toEqual({ field: 'contact' })
    expect(parseDeletionRequest({ username: 'x'.repeat(61) })).toEqual({ field: 'username' })
    expect(parseDeletionRequest({ contact: 'a@b.cz', note: 'x'.repeat(1001) })).toEqual({ field: 'note' })
    expect(parseDeletionRequest({ contact: 'a@b.cz', website: 'spam.example' })).toBe('honeypot')
  })

  it('stores valid requests and answers the site with CORS', async () => {
    const submit = vi.fn(async () => 'ok' as const)
    const handler = createDeletionHandler(submit)
    const pre = await handler(req(URL, { method: 'OPTIONS', headers: site }))
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-origin')).toBe('https://budbuddy.hribal.site')
    const res = await handler(req(URL, { headers: site, body: { contact: 'a@b.cz', username: 'grower', note: 'bye' } }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(submit).toHaveBeenCalledWith({ contact: 'a@b.cz', username: 'grower', note: 'bye' })
  })

  it('accepts a plain form post', async () => {
    const submit = vi.fn(async () => 'duplicate' as const)
    const res = await createDeletionHandler(submit)(new Request(URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=grower&note=x' }))
    expect(res.status).toBe(200)
    expect(submit).toHaveBeenCalledWith({ contact: null, username: 'grower', note: 'x' })
  })

  it('rejects bots, foreign origins, bad and big bodies, and reports storage failures', async () => {
    const submit = vi.fn(async () => null)
    const handler = createDeletionHandler(submit)
    expect((await handler(req(URL, { headers: site, body: { contact: 'a@b.cz', website: 'x' } }))).status).toBe(200)
    expect(submit).not.toHaveBeenCalled()
    expect((await handler(req(URL, { headers: { Origin: 'https://evil.example' }, body: { contact: 'a@b.cz' } }))).status).toBe(403)
    const bad = await handler(req(URL, { headers: site, body: { contact: ' ' } }))
    expect(bad.status).toBe(400)
    expect(await bad.json()).toEqual({ ok: false, error: { reason: 'invalid', field: 'contact' } })
    expect((await handler(req(URL, { headers: site, body: { contact: 'a@b.cz', note: 'x'.repeat(5000) } }))).status).toBe(413)
    expect((await handler(req(URL, { headers: site, body: { contact: 'a@b.cz' } }))).status).toBe(503)
    expect((await handler(req(URL, { method: 'GET', headers: site }))).status).toBe(405)
  })
})
