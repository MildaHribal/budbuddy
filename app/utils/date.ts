// All dates in the app are stored as local calendar days ("YYYY-MM-DD").
// Never use toISOString() for these – it converts to UTC and shifts the day
// for anyone east or west of Greenwich around midnight.

const DAY_MS = 86_400_000

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Parses "YYYY-MM-DD" as a local date at noon (DST-safe for day math). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12)
}

export function isValidISODate(iso: unknown): iso is string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return toISODate(parseISODate(iso)) === iso
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY_MS)
}

export function daysSince(iso: string, today = todayISO()): number {
  return Math.max(0, daysBetween(iso, today))
}

/** Monday-based week containing `iso`. */
export function weekOf(iso: string): string[] {
  const d = parseISODate(iso)
  const dow = (d.getDay() + 6) % 7
  const monday = addDays(iso, -dow)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

const LOCALE = 'en-GB'

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!isValidISODate(iso)) return ''
  return parseISODate(iso).toLocaleDateString(LOCALE, opts)
}

export function formatRelativeDay(iso: string, today = todayISO()): string {
  const diff = daysBetween(today, iso)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0 && diff > -7) return `${-diff} days ago`
  return formatDate(iso)
}

export function formatTime(isoDateTime: string): string {
  const d = new Date(isoDateTime)
  if (Number.isNaN(d.getTime())) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function weekdayShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString(LOCALE, { weekday: 'short' })
}
