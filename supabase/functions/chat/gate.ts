// Sign-in, bans and the per-user daily quota in front of the AI proxy.
import type { ChatGate, Rejection } from '../../../netlify/functions/chat.mts'
import { identify, intEnv, isDenied, rpc } from '../_shared/auth.ts'
import { clientIp, createLimiter } from '../_shared/limit.ts'

/** Daily requests per tier; unlimited and admin keep a cap so a leaked session cannot burn the budget. */
export const DAILY_LIMITS = {
  free: { text: 5, photo: 3 },
  unlimited: { text: 200, photo: 50 },
  admin: { text: 500, photo: 200 }
} as const
type Tier = keyof typeof DAILY_LIMITS

export function dailyLimits(): Record<Tier, { text: number, photo: number }> {
  const out = {} as Record<Tier, { text: number, photo: number }>
  for (const tier of Object.keys(DAILY_LIMITS) as Tier[]) {
    const env = tier.toUpperCase()
    out[tier] = {
      text: intEnv(`AI_${env}_TEXT_LIMIT`, DAILY_LIMITS[tier].text),
      photo: intEnv(`AI_${env}_PHOTO_LIMIT`, DAILY_LIMITS[tier].photo)
    }
  }
  return out
}
const ANON_DAILY_LIMIT = 300
const ANON_PER_MINUTE = 3

const unavailable: Rejection = { status: 503, reason: 'upstream', message: 'Quota check failed, try again.' }

export function createChatGate(): ChatGate {
  const anonLimiter = createLimiter(intEnv('AI_ANON_PER_MINUTE', ANON_PER_MINUTE))
  return async (req) => {
    const caller = await identify(req)
    if (isDenied(caller)) return caller
    if (caller.kind === 'anon') {
      if (!anonLimiter(clientIp(req))) {
        return { status: 429, reason: 'quota', message: 'Too many requests, try again in a minute.', extra: { retryAfterSec: 60 } }
      }
      return async () => {
        const ok = await rpc<boolean>('ai_anon_quota_take', { lim: intEnv('AI_ANON_DAILY_LIMIT', ANON_DAILY_LIMIT) })
        if (ok === null) return unavailable
        return ok ? null : { status: 401, reason: 'auth_required', message: 'Sign in to use the assistant.' }
      }
    }
    return async (kind) => {
      const res = await rpc<{ status: string, tier?: Tier, limit?: number }>('ai_quota_take2', { uid: caller.id, kind, lims: dailyLimits() })
      if (res?.status === 'ok') return null
      if (res?.status === 'limit') {
        return { status: 429, reason: 'daily_limit', message: 'Daily AI limit reached.', extra: { daily: true, limit: res.limit, kind, tier: res.tier } }
      }
      if (res?.status === 'banned') return { status: 403, reason: 'banned', message: 'This account cannot use the assistant.' }
      return unavailable
    }
  }
}
