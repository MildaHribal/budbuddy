// Best-effort per-IP limit (per isolate); Netlify had this built in.
const MAX_KEYS = 5000

/** Client IP: Cloudflare's header (set by the edge, not the client), else the last forwarded hop. */
export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const hops = (req.headers.get('x-forwarded-for') ?? '').split(',').map(h => h.trim()).filter(Boolean)
  return hops[hops.length - 1] ?? 'unknown'
}

/** Sliding one-minute window per key; the oldest keys are evicted beyond MAX_KEYS. */
export function createLimiter(perMinute: number, maxKeys = MAX_KEYS) {
  const hits = new Map<string, number[]>()
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter(t => now - t < 60_000)
    if (recent.length >= perMinute) return false
    recent.push(now)
    // re-insert so the map stays ordered by last use
    hits.delete(key)
    hits.set(key, recent)
    while (hits.size > maxKeys) hits.delete(hits.keys().next().value!)
    return true
  }
}

export function limited(handler: (req: Request) => Promise<Response>, perMinute: number) {
  const take = createLimiter(perMinute)
  return (req: Request): Promise<Response> | Response => {
    if (req.method === 'POST' && !take(clientIp(req))) {
      return Response.json({ error: { reason: 'quota', message: 'Too many requests, try again in a minute.', retryAfterSec: 60 } }, {
        status: 429,
        headers: { 'Access-Control-Allow-Origin': req.headers.get('origin') ?? 'null', 'Retry-After': '60' }
      })
    }
    return handler(req)
  }
}
