import { limited } from '../_shared/limit.ts'
import { createKbSearchHandler } from './handler.ts'

declare const Supabase: { ai: { Session: new (model: string) => { run(input: string, opts: { mean_pool: boolean, normalize: boolean }): Promise<number[]> } } }

const session = new Supabase.ai.Session('gte-small')

Deno.serve(limited(createKbSearchHandler(text => session.run(text, { mean_pool: true, normalize: true })), 30))
