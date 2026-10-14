import { replayChallenge } from '../../../shared/game/sim/index.ts'
import { env } from '../../../shared/env.ts'
import { identify, rpc, supabaseUrl } from '../_shared/auth.ts'
import { clientIp, createLimiter, limited } from '../_shared/limit.ts'
import { createGameSubmitHandler, type ChallengeRow, type SubmitResult } from './handler.ts'

async function getChallenge(id: string): Promise<ChallengeRow | null | 'error'> {
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!key) return 'error'
  const res = await fetch(`${supabaseUrl()}/rest/v1/game_challenges?id=eq.${encodeURIComponent(id)}&select=id,starts_at,ends_at,def`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(5000)
  }).catch(() => null)
  if (!res?.ok) return 'error'
  const rows = await res.json().catch(() => null) as ChallengeRow[] | null
  return Array.isArray(rows) ? rows[0] ?? null : 'error'
}

const handler = createGameSubmitHandler({
  identify,
  replay: replayChallenge,
  getChallenge,
  ensureChallenge: row => rpc<ChallengeRow>('game_ensure_challenge', { cid: row.id, starts: row.starts_at, ends: row.ends_at, d: row.def }),
  submit: ({ uid, cid, acts, client, score }) => rpc<SubmitResult>('game_submit_run', {
    uid, cid, acts, client, s: score.score, q: score.quality, g: score.dryG
  })
})

// POSTs are limited by `limited`; reads get their own looser per-IP window
const reads = createLimiter(30)
const posts = limited(handler, 6)

Deno.serve((req) => {
  if (req.method === 'GET' && !reads(clientIp(req))) {
    return Response.json({ error: { reason: 'quota' } }, { status: 429, headers: { 'Access-Control-Allow-Origin': req.headers.get('origin') ?? 'null', 'Retry-After': '60' } })
  }
  return posts(req)
})
