import { identify, intEnv, isDenied } from '../_shared/auth.ts'
import { clientIp, createLimiter, limited } from '../_shared/limit.ts'
import { createKbSearchHandler, type KbGate } from './handler.ts'

declare const Supabase: { ai: { Session: new (model: string) => { run(input: string, opts: { mean_pool: boolean, normalize: boolean }): Promise<number[]> } } }

const session = new Supabase.ai.Session('gte-small')
const anonLimiter = createLimiter(intEnv('AI_ANON_PER_MINUTE', 3) * 3)

const gate: KbGate = async (req) => {
  const caller = await identify(req)
  if (isDenied(caller)) return caller
  if (caller.kind === 'anon' && !anonLimiter(clientIp(req))) return { status: 429, reason: 'quota', message: 'Too many requests.' }
  return null
}

Deno.serve(limited(createKbSearchHandler(text => session.run(text, { mean_pool: true, normalize: true }), gate), 30))
