// Shadow Challenge: GET the current week's challenge, POST a run's action log for server replay.
// The score stored on the leaderboard is always the one computed here, never the client's.
import { isAllowedOrigin } from '../../../netlify/functions/chat.mts'
import { env } from '../../../shared/env.ts'
import type { ChallengeDef, ChallengeScore, GameAction, LoggedAction } from '../../../shared/game/types.ts'
import { REAL_MS_PER_GAME_HOUR } from '../../../shared/game/types.ts'
import { CHALLENGE_MAX_ACTIONS, CHALLENGE_MAX_H } from '../../../shared/game/sim/challenge.ts'
import type { Caller, Denied } from '../_shared/auth.ts'
import { challengeForWeek, isoWeek, WEEK_ID } from './challenge.ts'

export const MAX_ACTIONS = CHALLENGE_MAX_ACTIONS
export const MAX_BODY_BYTES = 220_000
export const MAX_GAME_H = CHALLENGE_MAX_H
/** clock drift and request latency, in game hours */
export const SLACK_H = 24

export interface ChallengeRow { id: string, starts_at: string, ends_at: string, def: ChallengeDef }
export interface SubmitResult { status: 'ok' | 'banned' | 'closed' | 'rate', improved?: boolean, best?: number, quality?: number, dryG?: number, rank?: number }

export interface GameSubmitDeps {
  identify: (req: Request) => Promise<Caller | Denied>
  replay: (def: ChallengeDef, actions: LoggedAction[]) => ChallengeScore
  /** returns the stored row, creating it when missing; null on a database failure */
  ensureChallenge: (row: ChallengeRow) => Promise<ChallengeRow | null>
  getChallenge: (id: string) => Promise<ChallengeRow | null | 'error'>
  submit: (args: { uid: string, cid: string, acts: LoggedAction[], client: ChallengeScore | null, score: ChallengeScore }) => Promise<SubmitResult | null>
  now?: () => number
}

// ── payload validation ──

type Check = 'id' | 'num' | 'int' | 'feed' | readonly string[]
const ID = /^[A-Za-z0-9:_.@-]{1,64}$/
const RANGES: Record<string, [number, number]> = {
  potL: [1, 200], liters: [0, 100], ph: [0, 14], tempC: [-20, 60], rh: [0, 100],
  lightHours: [0, 24], dim: [0, 1], qty: [1, 1000], mlPerL: [0, 50]
}

/** Exact field set per action; 'breed' is not part of challenges (it carries free text). */
const SHAPES: Record<Exclude<GameAction['t'], 'breed'>, Record<string, Check>> = {
  sow: { strainId: 'id', tentId: 'id', medium: ['soil', 'coco', 'hydro'], potL: 'num' },
  water: { plantId: 'id', liters: 'num', ph: 'num', feed: 'feed' },
  flush: { plantId: 'id' },
  treat: { plantId: 'id', treatmentId: 'id' },
  train: { plantId: 'id', kind: ['top', 'lst', 'defoliate'] },
  transplant: { plantId: 'id', potL: 'num' },
  flip: { tentId: 'id' },
  climate: { tentId: 'id', tempC: 'num', rh: 'num' },
  light: { tentId: 'id', lightHours: 'num', dim: 'num' },
  harvest: { plantId: 'id' },
  cull: { plantId: 'id' },
  diagnose: { plantId: 'id', problemId: 'id' },
  scan: { plantId: 'id' },
  buy: { itemId: 'id', qty: 'int' },
  install: { tentId: 'id', itemId: 'id' },
  dry: { batchId: 'id', tempC: 'num', rh: 'num' },
  jar: { batchId: 'id' },
  burp: { jarId: 'id' },
  finishCure: { jarId: 'id' }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const inRange = (key: string, v: unknown): v is number => {
  const r = RANGES[key]
  return typeof v === 'number' && Number.isFinite(v) && (!r || (v >= r[0] && v <= r[1]))
}

function checkField(key: string, check: Check, v: unknown): unknown {
  if (check === 'id') return typeof v === 'string' && ID.test(v) ? v : undefined
  if (check === 'num') return inRange(key, v) ? v : undefined
  if (check === 'int') return inRange(key, v) && Number.isInteger(v) ? v : undefined
  if (check === 'feed') {
    if (!Array.isArray(v) || v.length > 8) return undefined
    const out = []
    for (const d of v) {
      if (!isObj(d) || Object.keys(d).length !== 2 || typeof d.productId !== 'string' || !ID.test(d.productId) || !inRange('mlPerL', d.mlPerL)) return undefined
      out.push({ productId: d.productId, mlPerL: d.mlPerL })
    }
    return out
  }
  return typeof v === 'string' && check.includes(v) ? v : undefined
}

/** A clean copy of one action (known keys only), or null. */
export function cleanAction(raw: unknown): GameAction | null {
  if (!isObj(raw) || typeof raw.t !== 'string' || !Object.hasOwn(SHAPES, raw.t)) return null
  const shape = SHAPES[raw.t as keyof typeof SHAPES]
  const keys = Object.keys(raw)
  if (keys.length !== Object.keys(shape).length + 1) return null
  const out: Record<string, unknown> = { t: raw.t }
  for (const [key, check] of Object.entries(shape)) {
    const v = checkField(key, check, raw[key])
    if (v === undefined) return null
    out[key] = v
  }
  return out as GameAction
}

function cleanScore(raw: unknown): ChallengeScore | null {
  if (!isObj(raw)) return null
  const { quality, dryG, score } = raw
  return [quality, dryG, score].every(n => typeof n === 'number' && Number.isFinite(n))
    ? { quality: quality as number, dryG: dryG as number, score: score as number }
    : null
}

export type ParsedSubmission = { challengeId: string, actions: LoggedAction[], clientScore: ChallengeScore | null }

export function parseSubmission(raw: unknown): ParsedSubmission | { error: string } {
  if (!isObj(raw)) return { error: 'body' }
  const { challengeId, actions, clientScore } = raw
  if (typeof challengeId !== 'string' || !WEEK_ID.test(challengeId)) return { error: 'challenge' }
  if (!Array.isArray(actions) || actions.length === 0) return { error: 'actions' }
  if (actions.length > MAX_ACTIONS) return { error: 'too_many' }
  const out: LoggedAction[] = []
  let last = 0
  for (const entry of actions) {
    if (!isObj(entry) || Object.keys(entry).length !== 2) return { error: 'actions' }
    const { atH } = entry
    if (typeof atH !== 'number' || !Number.isFinite(atH) || atH < last || atH > MAX_GAME_H) return { error: 'time' }
    const action = cleanAction(entry.action)
    if (!action) return { error: 'actions' }
    out.push({ atH, action })
    last = atH
  }
  return { challengeId, actions: out, clientScore: cleanScore(clientScore) }
}

/** A run can't hold more game time than real time has passed since the week started. */
export function withinRealTime(actions: readonly LoggedAction[], startsAtMs: number, nowMs: number): boolean {
  const lastH = actions[actions.length - 1]?.atH ?? 0
  return lastH <= (nowMs - startsAtMs) / REAL_MS_PER_GAME_HOUR + SLACK_H
}

export function currentChallengeRow(nowMs: number): ChallengeRow {
  const w = isoWeek(nowMs)
  return { id: w.id, starts_at: new Date(w.startsAt).toISOString(), ends_at: new Date(w.endsAt).toISOString(), def: challengeForWeek(w.id) }
}

// ── HTTP ──

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && isAllowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-BudBuddy-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

const fail = (status: number, reason: string, headers: Record<string, string>) =>
  Response.json({ error: { reason } }, { status, headers })

const publicRow = (r: ChallengeRow) => ({ id: r.id, startsAt: r.starts_at, endsAt: r.ends_at, def: r.def })

export function createGameSubmitHandler(deps: GameSubmitDeps) {
  const now = deps.now ?? Date.now
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin')
    const headers = cors(origin)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (!isAllowedOrigin(origin)) return fail(403, 'forbidden_origin', headers)

    if (req.method === 'GET') {
      const row = await deps.ensureChallenge(currentChallengeRow(now()))
      if (!row) return fail(502, 'upstream', headers)
      return Response.json({ challenge: publicRow(row) }, { headers: { ...headers, 'Cache-Control': 'max-age=300' } })
    }
    if (req.method !== 'POST') return fail(405, 'bad_request', headers)
    const token = env('BUDBUDDY_APP_TOKEN')
    if (token && req.headers.get('x-budbuddy-token') !== token) return fail(401, 'unauthorized', headers)

    const caller = await deps.identify(req)
    if ('status' in caller) return fail(caller.status, caller.reason, headers)
    if (caller.kind !== 'user') return fail(401, 'auth_required', headers)

    if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail(413, 'too_large', headers)
    const text = await req.text()
    if (text.length > MAX_BODY_BYTES) return fail(413, 'too_large', headers)
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return fail(400, 'bad_request', headers)
    }
    const parsed = parseSubmission(raw)
    if ('error' in parsed) return fail(400, parsed.error === 'too_many' ? 'too_large' : 'bad_request', headers)

    const row = await deps.getChallenge(parsed.challengeId)
    if (row === 'error') return fail(502, 'upstream', headers)
    if (!row) return fail(404, 'not_found', headers)
    const t = now()
    if (t < Date.parse(row.starts_at) || t > Date.parse(row.ends_at)) return fail(409, 'closed', headers)
    if (!withinRealTime(parsed.actions, Date.parse(row.starts_at), t)) return fail(422, 'too_fast', headers)

    let score: ChallengeScore
    try {
      score = deps.replay(row.def, parsed.actions)
    } catch (e) {
      console.error('[game-submit] replay failed', e instanceof Error ? e.message : e)
      return fail(422, 'replay_failed', headers)
    }
    if (![score.score, score.quality, score.dryG].every(n => Number.isFinite(n) && n >= 0) || score.quality > 100) {
      return fail(422, 'replay_failed', headers)
    }
    if (score.dryG <= 0) return fail(422, 'unfinished', headers)

    const result = await deps.submit({ uid: caller.id, cid: row.id, acts: parsed.actions, client: parsed.clientScore, score })
    if (!result) return fail(502, 'upstream', headers)
    if (result.status === 'banned') return fail(403, 'banned', headers)
    if (result.status === 'closed') return fail(409, 'closed', headers)
    if (result.status === 'rate') return fail(429, 'quota', headers)
    return Response.json({
      verified: true,
      score,
      best: { score: result.best, quality: result.quality, dryG: result.dryG },
      improved: result.improved,
      rank: result.rank
    }, { headers })
  }
}
