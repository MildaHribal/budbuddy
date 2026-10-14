// Server-side knowledge search (Supabase edge function kb-search) for apps without the on-device pack.
import type { KbHit } from './kb'
import { retrievePassages, type KbSearch } from './retrieve'
import { selectPassages } from './prompt'
import { aiAccessToken, authHeader } from './session'

export const REMOTE_KB_TIMEOUT_MS = 4000

/** kb-search next to the chat proxy; null when the chat URL has an unknown shape. */
export function kbSearchEndpoint(chatUrl: string): string | null {
  const url = chatUrl.replace(/\/(api|functions\/v1)\/chat\/?$/, '/$1/kb-search')
  return url === chatUrl ? null : url
}

export interface RemoteKbOptions {
  chatUrl: string
  token?: string
  /** signed-in user's token; looked up when omitted */
  accessToken?: string | null
  k?: number
  timeoutMs?: number
  signal?: AbortSignal
  fetch?: typeof fetch
}

export async function searchRemoteKb(query: string, o: RemoteKbOptions): Promise<KbHit[]> {
  const url = kbSearchEndpoint(o.chatUrl)
  if (!url || !query.trim()) return []
  const access = o.accessToken !== undefined ? o.accessToken : await aiAccessToken()
  // the server only answers signed-in users
  if (!access) return []
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? REMOTE_KB_TIMEOUT_MS)
  const stop = () => ctrl.abort()
  o.signal?.addEventListener('abort', stop)
  try {
    const res = await (o.fetch ?? globalThis.fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(access), ...(o.token ? { 'X-BudBuddy-Token': o.token } : {}) },
      body: JSON.stringify({ query, k: o.k ?? 12 }),
      signal: ctrl.signal
    })
    if (!res.ok) throw new Error(`kb-search HTTP ${res.status}`)
    const { passages } = await res.json() as { passages?: Partial<KbHit>[] }
    return (passages ?? [])
      .filter(p => typeof p.id === 'string' && typeof p.title === 'string' && typeof p.text === 'string')
      .map(p => ({
        id: p.id!,
        kind: p.kind === 'knowledge' ? 'knowledge' : 'corpus',
        title: p.title!,
        text: p.text!,
        ...(typeof p.url === 'string' ? { url: p.url } : {}),
        lang: typeof p.lang === 'string' ? p.lang : 'en',
        score: typeof p.score === 'number' ? p.score : 0
      }))
  } finally {
    clearTimeout(timer)
    o.signal?.removeEventListener('abort', stop)
  }
}

export interface FoundPassages {
  passages: KbHit[]
  /** which search answered; null = both failed or none was available */
  via: 'local' | 'remote' | null
}

/** On-device search first (works offline), the server when there is no pack or it fails. Never throws. */
export async function findPassages(query: string, local: KbSearch | null, remote: ((q: string) => Promise<KbHit[]>) | null): Promise<FoundPassages> {
  if (local) {
    try {
      return { passages: await retrievePassages(local, query, 12), via: 'local' }
    } catch (e) {
      console.warn('[BudBuddy] knowledge search failed', e)
    }
  }
  if (remote) {
    try {
      return { passages: selectPassages(await remote(query)), via: 'remote' }
    } catch (e) {
      console.warn('[BudBuddy] server knowledge search failed', e)
    }
  }
  return { passages: [], via: null }
}
