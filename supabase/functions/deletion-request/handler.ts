// Account deletion requests from the web form; stored for an admin (no e-mail is sent).
import { rpc } from '../_shared/auth.ts'

export const ALLOWED_ORIGINS = new Set(['https://budbuddy.hribal.site'])
export const LIMITS = { contact: 254, username: 60, note: 1000, body: 4000 }

export interface DeletionRequest { contact: string | null, username: string | null, note: string | null }
type Submit = (r: DeletionRequest) => Promise<'ok' | 'duplicate' | null>

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://budbuddy.hribal.site',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

const reply = (status: number, body: unknown, headers: Record<string, string>) => Response.json(body, { status, headers })
const fail = (status: number, reason: string, headers: Record<string, string>, field?: string) =>
  reply(status, { ok: false, error: { reason, ...(field ? { field } : {}) } }, headers)

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
// keeps line breaks and tabs only
const clean = (v: string) => v.replace(/\p{Cc}/gu, c => (c === '\n' || c === '\t' ? c : ''))

/** Validated request, 'honeypot' for bots, or the invalid field. */
export function parseDeletionRequest(raw: unknown): DeletionRequest | 'honeypot' | { field: string } {
  if (!raw || typeof raw !== 'object') return { field: 'body' }
  const r = raw as Record<string, unknown>
  if (str(r.website)) return 'honeypot'
  const contact = str(r.contact ?? r.email)
  const username = str(r.username)
  const note = str(r.note ?? r.reason)
  if (!contact && !username) return { field: 'contact' }
  // contact is an e-mail or any other way to reply
  if (contact.length > LIMITS.contact) return { field: 'contact' }
  if (username.length > LIMITS.username) return { field: 'username' }
  if (note.length > LIMITS.note) return { field: 'note' }
  return {
    contact: clean(contact).replace(/\s+/g, ' ') || null,
    username: clean(username).replace(/^@+/, '').replace(/\s+/g, '').toLowerCase() || null,
    note: clean(note) || null
  }
}

const defaultSubmit: Submit = r => rpc<'ok' | 'duplicate'>('submit_deletion_request', { contact: r.contact, username: r.username, note: r.note })

export function createDeletionHandler(submit: Submit = defaultSubmit) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin')
    const headers = cors(origin)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (req.method !== 'POST') return fail(405, 'method', headers)
    if (origin && !ALLOWED_ORIGINS.has(origin)) return fail(403, 'forbidden_origin', headers)

    if (Number(req.headers.get('content-length') ?? 0) > LIMITS.body) return fail(413, 'too_large', headers)
    const text = await req.text()
    if (text.length > LIMITS.body) return fail(413, 'too_large', headers)
    let raw: unknown
    try {
      raw = (req.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded')
        ? Object.fromEntries(new URLSearchParams(text))
        : JSON.parse(text)
    } catch {
      return fail(400, 'invalid', headers, 'body')
    }
    const parsed = parseDeletionRequest(raw)
    // bots get the same answer as people
    if (parsed === 'honeypot') return reply(200, { ok: true }, headers)
    if ('field' in parsed) return fail(400, 'invalid', headers, parsed.field)

    const result = await submit(parsed)
    if (!result) return fail(503, 'unavailable', headers)
    return reply(200, { ok: true }, headers)
  }
}
