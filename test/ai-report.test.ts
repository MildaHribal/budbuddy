import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../netlify/functions/report-ai.mts'
import { reportEndpoint } from '../app/ai/report'
import { normalizeAiReport } from '../shared/aiReport'

const id = '0b6c3c7e-6f0d-4a3c-9a55-8d7d0f0a1b2c'
const valid = { messageId: id, reason: 'dangerous', note: '  sprays abamectin  ', question: 'mites in flower', answer: 'Use abamectin.', model: 'gemini-3.5-flash', lang: 'en', hadPhoto: false }

const post = (body: unknown, headers: Record<string, string> = {}) =>
  handler(new Request('https://example.netlify.app/api/report-ai', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'https://localhost', ...headers }, body: JSON.stringify(body) }))

describe('normalizeAiReport', () => {
  it('clips and types the report', () => {
    const r = normalizeAiReport({ ...valid, answer: 'x'.repeat(9000), extra: 1 })
    expect('error' in r).toBe(false)
    if ('error' in r) return
    expect(r.details).toBe('sprays abamectin')
    expect(r.meta.answer).toHaveLength(4000)
    expect(r.meta).toEqual({ question: 'mites in flower', answer: 'x'.repeat(4000), model: 'gemini-3.5-flash', lang: 'en', had_photo: false, app_version: null })
  })

  it('rejects bad reasons, ids and empty answers', () => {
    expect(normalizeAiReport({ ...valid, reason: 'spam' })).toEqual({ error: 'Invalid reason.' })
    expect(normalizeAiReport({ ...valid, messageId: 'abc' })).toEqual({ error: 'Invalid messageId.' })
    expect(normalizeAiReport({ ...valid, answer: ' ' })).toEqual({ error: 'Missing answer.' })
  })

  it('derives the endpoint from the chat URL', () => {
    expect(reportEndpoint('https://x.netlify.app/api/chat')).toBe('https://x.netlify.app/api/report-ai')
  })
})

describe('report-ai function', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('needs the service role key on the server', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    expect((await post(valid)).status).toBe(503)
  })

  it('writes an anonymous AI report with the service role', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'srv')
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await post(valid)).status).toBe(204)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/rest\/v1\/reports$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer srv')
    const row = JSON.parse(String(init.body))
    expect(row).toMatchObject({ reporter_id: null, target_type: 'ai', target_id: id, reason: 'dangerous', details: 'sprays abamectin' })
    expect(row.meta.answer).toBe('Use abamectin.')
  })

  it('rejects foreign origins, invalid and oversized bodies', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'srv')
    vi.stubGlobal('fetch', vi.fn())
    expect((await post(valid, { Origin: 'https://evil.example' })).status).toBe(403)
    expect((await post({ ...valid, reason: 'nope' })).status).toBe(400)
    expect((await post({ ...valid, answer: 'x'.repeat(20_000) })).status).toBe(413)
  })
})
