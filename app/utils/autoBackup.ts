// Automatic backup bookkeeping: file names, due checks, rotation (pure logic).

export type BackupInterval = 'daily' | 'weekly'

export type BackupTarget
  = | { kind: 'saf', uri: string, name: string }
    | { kind: 'fsa', name: string }

export interface AutoBackupConfig {
  enabled: boolean
  interval: BackupInterval
  /** how many automatic backups to keep */
  keep: number
  photos: boolean
  target: BackupTarget | null
  /** ISO datetime of the last successful automatic backup */
  lastAt: string | null
  /** ISO datetime of the last manual export (Settings → Back up) */
  lastManualAt: string | null
  lastError: string | null
  lastName: string | null
}

export const KEEP_OPTIONS = [3, 5, 10] as const

export function defaultConfig(): AutoBackupConfig {
  return { enabled: false, interval: 'weekly', keep: 5, photos: true, target: null, lastAt: null, lastManualAt: null, lastError: null, lastName: null }
}

const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(new Date(v).getTime())

export function normalizeConfig(raw: unknown): AutoBackupConfig {
  const c = defaultConfig()
  if (!raw || typeof raw !== 'object') return c
  const r = raw as Record<string, unknown>
  c.enabled = r.enabled === true
  c.interval = r.interval === 'daily' ? 'daily' : 'weekly'
  c.keep = KEEP_OPTIONS.includes(r.keep as 3) ? (r.keep as number) : 5
  c.photos = r.photos !== false
  const t = r.target as Record<string, unknown> | null | undefined
  if (t?.kind === 'saf' && typeof t.uri === 'string' && t.uri) c.target = { kind: 'saf', uri: t.uri, name: typeof t.name === 'string' ? t.name : '' }
  else if (t?.kind === 'fsa') c.target = { kind: 'fsa', name: typeof t.name === 'string' ? t.name : '' }
  c.lastAt = isIso(r.lastAt) ? r.lastAt : null
  c.lastManualAt = isIso(r.lastManualAt) ? r.lastManualAt : null
  c.lastError = typeof r.lastError === 'string' ? r.lastError : null
  c.lastName = typeof r.lastName === 'string' ? r.lastName : null
  return c
}

const pad = (n: number) => String(n).padStart(2, '0')

/** budbuddy-auto-2026-10-13-1530.json (local time, sorts by name). */
export function backupFileName(d: Date): string {
  return `budbuddy-auto-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`
}

const NAME_RE = /^budbuddy-auto-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(?: \(\d+\))?\.json$/

export function isAutoBackupName(name: string): boolean {
  return NAME_RE.test(name)
}

/** Date encoded in an automatic backup's name; any BudBuddy backup is accepted for restore. */
export function backupDate(name: string, modified?: number): Date | null {
  const m = name.match(NAME_RE)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
  const manual = name.match(/^budbuddy-backup-(\d{4})-(\d{2})-(\d{2})/)
  if (manual) return new Date(Number(manual[1]), Number(manual[2]) - 1, Number(manual[3]), 12)
  return modified ? new Date(modified) : null
}

export const isBackupFile = (name: string) => /^budbuddy-.*\.json$/i.test(name)

export const intervalMs = (i: BackupInterval) => (i === 'daily' ? 1 : 7) * 86_400_000

/** A backup is due once the interval has passed since the last automatic one. */
export function isDue(cfg: Pick<AutoBackupConfig, 'enabled' | 'interval' | 'lastAt' | 'target'>, now = new Date()): boolean {
  if (!cfg.enabled || !cfg.target) return false
  if (!cfg.lastAt) return true
  // a little slack so a daily backup does not slide later every day
  return now.getTime() - new Date(cfg.lastAt).getTime() >= intervalMs(cfg.interval) - 60 * 60 * 1000
}

/** Automatic backups beyond the newest `keep` (manual exports are never touched). */
export function filesToPrune<T extends { name: string }>(files: T[], keep: number): T[] {
  return files
    .filter(f => isAutoBackupName(f.name))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(Math.max(1, keep))
}

export type BackupHealth = 'ok' | 'stale' | 'never'

/** Newest backup of either kind; stale after two missed intervals (or 14 days without auto backup). */
export function backupHealth(cfg: Pick<AutoBackupConfig, 'enabled' | 'interval' | 'lastAt' | 'lastManualAt'>, now = new Date()): { health: BackupHealth, last: Date | null } {
  const times = [cfg.lastAt, cfg.lastManualAt].filter((x): x is string => !!x).map(x => new Date(x))
  const last = times.length ? new Date(Math.max(...times.map(d => d.getTime()))) : null
  if (!last) return { health: 'never', last: null }
  const limit = cfg.enabled ? intervalMs(cfg.interval) * 2 + 86_400_000 : 14 * 86_400_000
  return { health: now.getTime() - last.getTime() > limit ? 'stale' : 'ok', last }
}
