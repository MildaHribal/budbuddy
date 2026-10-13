import { zipSync, strToU8, type Zippable } from 'fflate'
import type { JournalEntry, Plant } from '../../types/grow'
import { daysBetween } from '../date'

const CSV_COLUMNS = ['date', 'day', 'type', 'note', 'amount_ml', 'nutrients', 'ph', 'ec', 'method', 'product', 'height_cm', 'temp_c', 'humidity', 'stage', 'photos'] as const

function csvCell(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Journal as CSV (oldest first), with photo file names matching the ZIP. */
export function journalCsv(plant: Pick<Plant, 'startDate'>, entries: readonly JournalEntry[], photoNames: ReadonlyMap<string, string> = new Map()): string {
  const rows = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)).map(e => [
    e.date,
    Math.max(0, daysBetween(plant.startDate, e.date)),
    e.type,
    e.note,
    e.amountMl,
    e.nutrients,
    e.ph,
    e.ec,
    e.method,
    e.product,
    e.heightCm,
    e.tempC,
    e.humidity,
    e.stage,
    e.photoIds.map(id => photoNames.get(id) ?? id).join(' ')
  ].map(csvCell).join(','))
  // BOM so spreadsheet apps read UTF-8 (diacritics)
  return `\uFEFF${[CSV_COLUMNS.join(','), ...rows].join('\r\n')}\r\n`
}

export interface ArchivePhoto {
  photoId: string
  date: string
  day: number
  /** 'jpg', 'png', … */
  ext: string
}

/** "photos/day-012_2026-05-03_1.jpg" – sorts chronologically in any file manager. */
export function photoFileNames(photos: readonly ArchivePhoto[]): Map<string, string> {
  const names = new Map<string, string>()
  const perDay = new Map<string, number>()
  for (const p of photos) {
    if (names.has(p.photoId)) continue
    const n = (perDay.get(p.date) ?? 0) + 1
    perDay.set(p.date, n)
    names.set(p.photoId, `photos/day-${String(p.day).padStart(3, '0')}_${p.date}_${n}.${p.ext}`)
  }
  return names
}

export function extFromType(type: string): string {
  if (/png/.test(type)) return 'png'
  if (/webp/.test(type)) return 'webp'
  if (/gif/.test(type)) return 'gif'
  return 'jpg'
}

export interface ArchiveInput {
  /** JSON-able snapshot of the plant and its journal */
  data: unknown
  csv: string
  readme: string
  photos: { name: string, bytes: Uint8Array }[]
  extra?: { name: string, bytes: Uint8Array }[]
}

/** Builds the ZIP; photos are stored (already compressed), text is deflated. */
export function buildArchive(input: ArchiveInput, root: string): Uint8Array {
  const files: Zippable = {
    [`${root}/README.txt`]: [strToU8(input.readme), { level: 6 }],
    [`${root}/plant.json`]: [strToU8(JSON.stringify(input.data, null, 2)), { level: 6 }],
    [`${root}/journal.csv`]: [strToU8(input.csv), { level: 6 }]
  }
  for (const p of input.photos) files[`${root}/${p.name}`] = [p.bytes, { level: 0 }]
  for (const x of input.extra ?? []) files[`${root}/${x.name}`] = [x.bytes, { level: 0 }]
  return zipSync(files, { mtime: new Date() })
}
