// Network side of the Shadow Challenge: the game-submit edge function and the leaderboard view.
import { aiAccessToken, authHeader } from '~/ai/session'
import type { ChallengeDef, ChallengeScore, LoggedAction } from '~~/shared/game/types'

export interface CurrentChallenge { id: string, startsAt: string, endsAt: string, def: ChallengeDef }
export interface SubmitReply { verified: true, score: ChallengeScore, best: ChallengeScore, improved: boolean, rank: number }
export interface BoardRow {
  rank: number
  user_id: string
  username: string
  display_name: string | null
  score: number
  quality: number
  dry_g: number
}

/** reason from the function (auth_required, closed, too_fast, unfinished, replay_failed, quota, banned, ...) or 'network' */
export class ChallengeError extends Error {
  constructor(public reason: string) {
    super(reason)
  }
}

function endpoint(): string {
  return `${String(useRuntimeConfig().public.supabaseUrl).replace(/\/$/, '')}/functions/v1/game-submit`
}

function appTokenHeader(): Record<string, string> {
  const token = useRuntimeConfig().public.aiAppToken
  return token ? { 'X-BudBuddy-Token': String(token) } : {}
}

async function reasonOf(res: Response): Promise<string> {
  const body = await res.json().catch(() => null) as { error?: { reason?: unknown } } | null
  return typeof body?.error?.reason === 'string' ? body.error.reason : `http_${res.status}`
}

export async function fetchCurrentChallenge(): Promise<CurrentChallenge> {
  const res = await fetch(endpoint(), { signal: AbortSignal.timeout(10_000) }).catch(() => null)
  if (!res) throw new ChallengeError('network')
  if (!res.ok) throw new ChallengeError(await reasonOf(res))
  const body = await res.json() as { challenge?: CurrentChallenge }
  if (!body.challenge?.def) throw new ChallengeError('bad_reply')
  return body.challenge
}

export async function submitRun(challengeId: string, actions: LoggedAction[], clientScore: ChallengeScore | null): Promise<SubmitReply> {
  const token = await aiAccessToken()
  if (!token) throw new ChallengeError('auth_required')
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token), ...appTokenHeader() },
    body: JSON.stringify({ challengeId, actions, clientScore }),
    signal: AbortSignal.timeout(30_000)
  }).catch(() => null)
  if (!res) throw new ChallengeError('network')
  if (!res.ok) throw new ChallengeError(await reasonOf(res))
  return await res.json() as SubmitReply
}

const BOARD_COLUMNS = 'rank, user_id, username, display_name, score, quality, dry_g'

/** Top 50 plus the signed-in user's own row when it sits below them. */
export async function fetchLeaderboard(challengeId: string, uid: string | null): Promise<{ top: BoardRow[], mine: BoardRow | null }> {
  const sb = useSupabase()
  const { data, error } = await sb.from('game_leaderboard').select(BOARD_COLUMNS)
    .eq('challenge_id', challengeId).order('rank').limit(50)
  if (error) throw new ChallengeError('board')
  const top = (data ?? []) as BoardRow[]
  let mine = uid ? top.find(r => r.user_id === uid) ?? null : null
  if (uid && !mine) {
    const own = await sb.from('game_leaderboard').select(BOARD_COLUMNS).eq('challenge_id', challengeId).eq('user_id', uid).maybeSingle()
    if (own.error) throw new ChallengeError('board')
    mine = (own.data as BoardRow | null) ?? null
  }
  return { top, mine }
}
