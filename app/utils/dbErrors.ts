type DbError = { code?: string, message?: string } | null | undefined

/** PostgREST "unknown column/table/function": a newer migration isn't live yet. */
export function isMissingSchema(err: DbError): boolean {
  return !!err && ['42703', '42P01', 'PGRST204', 'PGRST205', 'PGRST200', 'PGRST202'].includes(err.code ?? '')
}

/** Reason key of the server content filter ('contact' | 'sale'), or null. */
export function contentBlockedKey(err: DbError): 'contact' | 'sale' | null {
  const m = /content_blocked:\s*(\w+)/.exec(err?.message ?? '')
  if (!m) return null
  return m[1] === 'contact' ? 'contact' : 'sale'
}
