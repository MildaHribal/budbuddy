// Signed-in callers for the AI endpoints: the app sends the user's Supabase access token.
// AI_ALLOW_ANON=1 lets tokenless requests from older app builds through (callers add strict limits).
import { env } from '../../../shared/env.ts'

export const DEFAULT_SUPABASE_URL = 'https://mlvpmiwvuxgwjssrtxsq.supabase.co'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type Caller = { kind: 'user', id: string } | { kind: 'anon' }
export interface Denied { status: number, reason: string, message: string, extra?: Record<string, unknown> }

export const supabaseUrl = () => env('SUPABASE_URL') || DEFAULT_SUPABASE_URL
export const allowAnon = () => env('AI_ALLOW_ANON') === '1'

export const isDenied = (x: unknown): x is Denied => !!x && typeof (x as Denied).status === 'number'

export function bearer(req: Request): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')
  return m?.[1] ?? null
}

/** Verifies the access token with Supabase Auth (also rejects signed-out / deleted users). */
export async function identify(req: Request): Promise<Caller | Denied> {
  const token = bearer(req)
  if (!token) {
    return allowAnon() ? { kind: 'anon' } : { status: 401, reason: 'auth_required', message: 'Sign in to use the assistant.' }
  }
  const expired: Denied = { status: 401, reason: 'auth_required', message: 'The session expired, sign in again.' }
  if (token.length > 8192 || token.split('.').length !== 3) return expired
  const key = env('SUPABASE_ANON_KEY') || env('SUPABASE_SERVICE_ROLE_KEY')
  if (!key) return { status: 503, reason: 'not_configured', message: 'Auth is not configured on the server.' }
  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000)
  }).catch(() => null)
  if (!res || res.status >= 500) return { status: 503, reason: 'upstream', message: 'Sign-in check failed, try again.' }
  if (!res.ok) return expired
  const user = await res.json().catch(() => null) as { id?: unknown } | null
  return typeof user?.id === 'string' && UUID.test(user.id) ? { kind: 'user', id: user.id } : expired
}

/** Calls a service-role RPC; null on any failure. */
export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!key) return null
  const res = await fetch(`${supabaseUrl()}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(5000)
  }).catch(() => null)
  if (!res?.ok) {
    console.error(`[auth] rpc ${name} failed ${res?.status ?? 'network'}`)
    return null
  }
  return await res.json().catch(() => null) as T | null
}

export function intEnv(name: string, fallback: number): number {
  const n = Number(env(name))
  return Number.isInteger(n) && n > 0 ? n : fallback
}
