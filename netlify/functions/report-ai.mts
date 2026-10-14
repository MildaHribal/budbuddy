// AI answer reports: validated, size-capped, rate-limited, then written to public.reports
// with the service role (SUPABASE_SERVICE_ROLE_KEY env var, never in the app).
// The Supabase deployment passes a gate that requires sign-in and records the reporter.
import { normalizeAiReport } from '../../shared/aiReport.ts'
import { env } from '../../shared/env.ts'
import { isAllowedOrigin, type Rejection } from './chat.mts'

/** Who reports: a user id, null for anonymous, or a refusal. */
export type ReportGate = (req: Request) => Promise<Rejection | { reporterId: string | null }>

const MAX_BODY_BYTES = 16_000
const DEFAULT_SUPABASE_URL = 'https://mlvpmiwvuxgwjssrtxsq.supabase.co'

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

export const createReportHandler = (gate?: ReportGate) => async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin')
  const headers = cors(origin)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return fail(405, 'bad_request', headers)
  if (!isAllowedOrigin(origin)) return fail(403, 'forbidden_origin', headers)
  const token = env('BUDBUDDY_APP_TOKEN')
  if (token && req.headers.get('x-budbuddy-token') !== token) return fail(401, 'unauthorized', headers)

  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!key) return fail(503, 'not_configured', headers)

  const who = gate ? await gate(req) : { reporterId: null }
  if ('status' in who) return fail(who.status, who.reason, headers)

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail(413, 'too_large', headers)
  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) return fail(413, 'too_large', headers)
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return fail(400, 'bad_request', headers)
  }
  const report = normalizeAiReport(raw)
  if ('error' in report) return fail(400, 'bad_request', headers)

  const url = env('SUPABASE_URL') || DEFAULT_SUPABASE_URL
  const res = await fetch(`${url}/rest/v1/reports`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ reporter_id: who.reporterId, target_type: 'ai', target_id: report.targetId, reason: report.reason, details: report.details, meta: report.meta })
  }).catch(() => null)
  if (!res) return fail(502, 'upstream', headers)
  if (res.status === 409) return fail(409, 'already', headers)
  if (!res.ok) {
    console.error(`[report-ai] insert failed ${res.status}`)
    return fail(502, 'upstream', headers)
  }
  return new Response(null, { status: 204, headers })
}

export default createReportHandler()

export const config = {
  path: '/api/report-ai',
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ['ip', 'domain'] }
}
