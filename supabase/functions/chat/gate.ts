// Sign-in, bans and the per-user daily quota in front of the AI proxy.
import type { ChatGate, Rejection } from '../../../netlify/functions/chat.mts'
import { identify, intEnv, isDenied, rpc } from '../_shared/auth.ts'
import { clientIp, createLimiter } from '../_shared/limit.ts'

export const DEFAULT_DAILY_LIMIT = 40
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
    return async () => {
      const limit = intEnv('AI_DAILY_LIMIT', DEFAULT_DAILY_LIMIT)
      const status = await rpc<string>('ai_quota_take', { uid: caller.id, lim: limit })
      if (status === 'ok') return null
      if (status === 'limit') return { status: 429, reason: 'daily_limit', message: 'Daily AI limit reached.', extra: { daily: true, limit } }
      if (status === 'banned') return { status: 403, reason: 'banned', message: 'This account cannot use the assistant.' }
      return unavailable
    }
  }
}
