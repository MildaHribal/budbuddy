// Best-effort per-IP limit (per isolate); Netlify had this built in.
const hits = new Map<string, number[]>()

export function limited(handler: (req: Request) => Promise<Response>, perMinute: number) {
  return (req: Request): Promise<Response> | Response => {
    if (req.method === 'POST') {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
      const now = Date.now()
      const recent = (hits.get(ip) ?? []).filter(t => now - t < 60_000)
      if (recent.length >= perMinute) {
        return Response.json({ error: { reason: 'quota', message: 'Too many requests, try again in a minute.', retryAfterSec: 60 } }, {
          status: 429,
          headers: { 'Access-Control-Allow-Origin': req.headers.get('origin') ?? 'null', 'Retry-After': '60' }
        })
      }
      recent.push(now)
      hits.set(ip, recent)
      if (hits.size > 5000) hits.clear()
    }
    return handler(req)
  }
}
