// Knowledge search for apps without the on-device pack: embeds the query (gte-small) and calls
// public.kb_search with the service role (SUPABASE_SERVICE_ROLE_KEY, injected by Supabase).
import { isAllowedOrigin, type Rejection } from '../../../netlify/functions/chat.mts'
import { env } from '../../../shared/env.ts'

export const MAX_QUERY = 600
export const MAX_K = 20
const DEFAULT_K = 12
const MAX_BODY_BYTES = 4_000
const DEFAULT_SUPABASE_URL = 'https://mlvpmiwvuxgwjssrtxsq.supabase.co'

export type Embed = (text: string) => Promise<number[]>
/** sign-in check; null admits the request */
export type KbGate = (req: Request) => Promise<Rejection | null>

export interface KbPassage {
  id: string
  kind: 'knowledge' | 'corpus'
  title: string
  text: string
  url?: string
  source?: string
  license?: string
  lang: string
  score: number
}

interface Row { id: string, title: string, text: string, source: string | null, url: string | null, license: string | null, lang: string | null, score: number }

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && isAllowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-BudBuddy-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

const fail = (status: number, reason: string, headers: Record<string, string>) =>
  Response.json({ error: { reason } }, { status, headers })

export function parseKbRequest(raw: unknown): { query: string, k: number } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Invalid body.' }
  const { query, k } = raw as { query?: unknown, k?: unknown }
  if (typeof query !== 'string' || !query.trim()) return { error: 'Missing query.' }
  const q = query.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY)
  const n = typeof k === 'number' && Number.isFinite(k) ? Math.min(MAX_K, Math.max(1, Math.round(k))) : DEFAULT_K
  return { query: q, k: n }
}

/** Own texts count as curated knowledge; links only when they point to the web. Chunks of one document are collapsed. */
export function toPassages(rows: readonly Row[], k: number): KbPassage[] {
  const docs = new Set<string>()
  const out: KbPassage[] = []
  for (const r of rows) {
    const doc = r.id.replace(/#\d+$/, '')
    if (docs.has(doc)) continue
    docs.add(doc)
    out.push({
      id: r.id,
      kind: r.source === 'BudBuddy' ? 'knowledge' : 'corpus',
      title: r.title,
      text: r.text,
      ...(r.url && /^https?:\/\//.test(r.url) ? { url: r.url } : {}),
      ...(r.source ? { source: r.source } : {}),
      ...(r.license ? { license: r.license } : {}),
      lang: r.lang ?? 'en',
      score: r.score
    })
    if (out.length >= k) break
  }
  return out
}

export function createKbSearchHandler(embed: Embed, gate?: KbGate) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin')
    const headers = cors(origin)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (req.method !== 'POST') return fail(405, 'bad_request', headers)
    if (!isAllowedOrigin(origin)) return fail(403, 'forbidden_origin', headers)
    const token = env('BUDBUDDY_APP_TOKEN')
    if (token && req.headers.get('x-budbuddy-token') !== token) return fail(401, 'unauthorized', headers)

    const key = env('SUPABASE_SERVICE_ROLE_KEY')
    if (!key) return fail(503, 'not_configured', headers)

    const refused = gate ? await gate(req) : null
    if (refused) return fail(refused.status, refused.reason, headers)

    if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail(413, 'too_large', headers)
    const text = await req.text()
    if (text.length > MAX_BODY_BYTES) return fail(413, 'too_large', headers)
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return fail(400, 'bad_request', headers)
    }
    const parsed = parseKbRequest(raw)
    if ('error' in parsed) return fail(400, 'bad_request', headers)

    let embedding: number[]
    try {
      embedding = await embed(parsed.query)
    } catch (e) {
      console.error('[kb-search] embedding failed', e)
      return fail(502, 'embedding', headers)
    }

    const url = env('SUPABASE_URL') || DEFAULT_SUPABASE_URL
    const res = await fetch(`${url}/rest/v1/rpc/kb_search`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      // extra rows so that collapsing chunks of one document still leaves k
      body: JSON.stringify({ query_embedding: JSON.stringify(embedding), query_text: parsed.query, k: parsed.k * 2 })
    }).catch(() => null)
    if (!res?.ok) {
      console.error(`[kb-search] rpc failed ${res?.status ?? 'network'}`)
      return fail(502, 'upstream', headers)
    }
    const rows = await res.json() as Row[]
    return Response.json({ passages: toPassages(rows, parsed.k) }, { headers })
  }
}
