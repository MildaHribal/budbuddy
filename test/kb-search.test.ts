import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KbHit } from '../app/ai/kb'
import { findPassages, kbSearchEndpoint, searchRemoteKb } from '../app/ai/remoteKb'
import { createKbSearchHandler, parseKbRequest, toPassages, MAX_K, MAX_QUERY } from '../supabase/functions/kb-search/handler'
// @ts-expect-error plain JS script
import { chunkText, toChunks, upsertSql, vectorLiteral } from '../scripts/kb-ingest.mjs'

const hit = (id: string, kind: KbHit['kind'] = 'knowledge'): KbHit => ({ id, kind, title: id, text: `${id} text`, lang: 'en', score: 1 })
const CHAT = 'https://x.supabase.co/functions/v1/chat'

describe('kbSearchEndpoint', () => {
  it('derives kb-search from the chat URL', () => {
    expect(kbSearchEndpoint(CHAT)).toBe('https://x.supabase.co/functions/v1/kb-search')
    expect(kbSearchEndpoint('https://x.netlify.app/api/chat/')).toBe('https://x.netlify.app/api/kb-search')
    expect(kbSearchEndpoint('https://example.com/other')).toBeNull()
  })
})

describe('searchRemoteKb', () => {
  it('posts the query with the token and maps passages', async () => {
    const fetch = vi.fn(async () => Response.json({ passages: [{ id: 'a', kind: 'knowledge', title: 'A', text: 't', url: 'https://e.org', lang: 'en', score: 0.03, source: 'x' }, { id: 'b', kind: 'weird', title: 'B', text: 'u' }, { bad: 1 }] }))
    const hits = await searchRemoteKb('taco leaves', { chatUrl: CHAT, token: 'tok', fetch })
    expect(hits).toEqual([
      { id: 'a', kind: 'knowledge', title: 'A', text: 't', url: 'https://e.org', lang: 'en', score: 0.03 },
      { id: 'b', kind: 'corpus', title: 'B', text: 'u', lang: 'en', score: 0 }
    ])
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://x.supabase.co/functions/v1/kb-search')
    expect(JSON.parse(String(init.body))).toEqual({ query: 'taco leaves', k: 12 })
    expect((init.headers as Record<string, string>)['X-BudBuddy-Token']).toBe('tok')
  })

  it('gives up after the timeout and on HTTP errors', async () => {
    const hang: typeof fetch = (_u, init) => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
    await expect(searchRemoteKb('q', { chatUrl: CHAT, fetch: hang, timeoutMs: 20 })).rejects.toThrow('aborted')
    await expect(searchRemoteKb('q', { chatUrl: CHAT, fetch: async () => new Response('x', { status: 500 }) })).rejects.toThrow('500')
  })
})

describe('findPassages', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  const local = (fail = false) => ({ queryLang: () => 'cs' as const, searchKb: vi.fn(async () => {
    if (fail) throw new Error('ort')
    return [hit('local')]
  }) })

  it('prefers the on-device pack', async () => {
    const remote = vi.fn(async () => [hit('remote')])
    expect(await findPassages('q', local(), remote)).toEqual({ passages: [hit('local')], via: 'local' })
    expect(remote).not.toHaveBeenCalled()
  })

  it('falls back to the server without a pack or when the pack fails', async () => {
    const remote = vi.fn(async () => [hit('r1'), hit('c1', 'corpus'), hit('c2', 'corpus'), hit('c3', 'corpus')])
    expect((await findPassages('q', null, remote)).passages.map(h => h.id)).toEqual(['r1', 'c1', 'c2'])
    expect((await findPassages('q', local(true), remote)).via).toBe('remote')
  })

  it('returns nothing when both fail', async () => {
    expect(await findPassages('q', local(true), async () => {
      throw new Error('offline')
    })).toEqual({ passages: [], via: null })
    expect(await findPassages('q', null, null)).toEqual({ passages: [], via: null })
  })
})

describe('kb-search edge function', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  const post = (body: unknown, origin = 'https://localhost') => new Request('https://x.supabase.co/functions/v1/kb-search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': origin }, body: JSON.stringify(body) })
  const row = (id: string, source = 'BudBuddy', url: string | null = null) => ({ id, title: id, text: 't', source, url, license: 'L', lang: 'en', score: 0.03 })

  it('caps query length and k', () => {
    const r = parseKbRequest({ query: `  ${'a '.repeat(500)}`, k: 999 })
    expect('error' in r ? null : [r.query.length, r.k]).toEqual([MAX_QUERY, MAX_K])
    expect(parseKbRequest({ query: ' ' })).toEqual({ error: 'Missing query.' })
    expect(parseKbRequest({ query: 'x', k: 'many' })).toEqual({ query: 'x', k: 12 })
  })

  it('collapses chunks of one document and keeps only web links', () => {
    const out = toPassages([row('a#0'), row('a#1'), row('b', 'Wiki', 'https://w.org/b'), row('c', 'BudBuddy', '/guide/x')], 5)
    expect(out.map(p => [p.id, p.kind, p.url])).toEqual([['a#0', 'knowledge', undefined], ['b', 'corpus', 'https://w.org/b'], ['c', 'knowledge', undefined]])
  })

  it('embeds the query and calls kb_search with the service role', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
    vi.stubEnv('BUDBUDDY_APP_TOKEN', '')
    const fetch = vi.fn(async () => Response.json([row('a')]))
    vi.stubGlobal('fetch', fetch)
    const embed = vi.fn(async () => [0.5, 0.25])
    const res = await createKbSearchHandler(embed)(post({ query: 'cure', k: 3 }))
    expect(res.status).toBe(200)
    expect((await res.json()).passages[0].id).toBe('a')
    expect(embed).toHaveBeenCalledWith('cure')
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/rest\/v1\/rpc\/kb_search$/)
    expect(JSON.parse(String(init.body))).toEqual({ query_embedding: '[0.5,0.25]', query_text: 'cure', k: 6 })
  })

  it('rejects foreign origins and bad bodies', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
    vi.stubEnv('BUDBUDDY_APP_TOKEN', '')
    const handler = createKbSearchHandler(async () => [0])
    expect((await handler(post({ query: 'x' }, 'https://evil.example'))).status).toBe(403)
    expect((await handler(post({ k: 3 }))).status).toBe(400)
  })
})

describe('kb-ingest chunker', () => {
  const sentence = (i: number) => `Sentence ${i} has exactly seven words here.`

  it('keeps short texts whole with the doc id', () => {
    expect(toChunks({ id: 'd', title: 'T', text: 'Short text.' })).toEqual([{ id: 'd', title: 'T', text: 'Short text.', topic: null, source: null, license: null, url: null, lang: 'en' }])
    expect(toChunks({ id: 'd', text: ' ' })).toEqual([])
  })

  it('splits long texts into ~250–350 word chunks with overlap and stable ids', () => {
    const text = Array.from({ length: 150 }, (_, i) => sentence(i)).join(' ')
    const chunks = toChunks({ id: 'doc', title: 'T', text })
    expect(chunks.map((c: { id: string }) => c.id)).toEqual(['doc#0', 'doc#1', 'doc#2', 'doc#3'])
    for (const c of chunks.slice(0, -1)) expect(c.text.split(' ').length).toBeGreaterThanOrEqual(250)
    for (const c of chunks) expect(c.text.split(' ').length).toBeLessThanOrEqual(360)
    expect(chunks[1].text.startsWith(chunks[0].text.split(' ').slice(-50).join(' '))).toBe(true)
    expect(toChunks({ id: 'doc', title: 'T', text })).toEqual(chunks)
  })

  it('cuts one over-long sentence by words', () => {
    expect(chunkText('word '.repeat(800)).length).toBeGreaterThan(2)
  })

  it('writes an idempotent upsert with escaped literals', () => {
    const sql = upsertSql([{ id: 'it\'s', title: 'T', text: 'a\'b', topic: null, source: 'BudBuddy', license: null, url: null, lang: 'en', embedding: [0.1234567, -1] }])
    expect(sql).toContain('(\'it\'\'s\', \'T\', \'a\'\'b\', null, \'BudBuddy\', null, null, \'en\', \'[0.123457,-1]\'::extensions.vector)')
    expect(sql).toContain('on conflict (id) do update set')
    expect(vectorLiteral(new Float32Array([0.5]))).toBe('[0.5]')
  })
})
