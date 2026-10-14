import type { StrainPhoto } from './strains'

export type PhotoKind = 'plant' | 'bud'
export const DAILY_PHOTO_LIMIT = 10
export const REJECT_REASON_MAX = 200

export interface PhotoDraft {
  photo: Blob | null
  kind: PhotoKind | null
  consentDisplay: boolean
}

/** First thing still missing before a strain photo can be sent, or null. */
export function photoDraftIssue(d: PhotoDraft): 'photo' | 'kind' | 'consent' | null {
  if (!d.photo) return 'photo'
  if (d.kind !== 'plant' && d.kind !== 'bud') return 'kind'
  if (!d.consentDisplay) return 'consent'
  return null
}

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) || 0 : 0)

/** Curated catalogue photos first (by sort), then user photos oldest first. */
export function orderStrainPhotos(rows: StrainPhoto[]): StrainPhoto[] {
  const curated = rows.filter(p => !p.user_id).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || time(a.created_at) - time(b.created_at))
  const users = rows.filter(p => !!p.user_id).sort((a, b) => time(a.created_at) - time(b.created_at))
  return [...curated, ...users]
}

/** Taken by a BudBuddy grower (uploaded photo or a shared plant cover), not by the catalogue source. */
export function isGrowerPhoto(p: StrainPhoto): boolean {
  return !!p.user_id || !!p.grower
}

/** Review state worth showing: only the uploader ever receives pending or rejected rows. */
export function photoReviewState(p: StrainPhoto): 'pending' | 'rejected' | null {
  return p.user_id && (p.status === 'pending' || p.status === 'rejected') ? p.status : null
}

/** Message key for a failed photo submission. */
export function photoErrorKey(err: { code?: string, message?: string } | null | undefined): 'rateLimited' | 'notAllowed' | 'failed' {
  if (!err) return 'failed'
  if (err.code === 'P0001' || /rate limit/i.test(err.message ?? '')) return 'rateLimited'
  if (err.code === '42501' || /row-level security|consent required/i.test(err.message ?? '')) return 'notAllowed'
  return 'failed'
}

/** Storage path inside the media bucket for a public media URL. */
export function mediaPathOf(url: string | null | undefined): string | null {
  const m = url?.match(/\/storage\/v1\/object\/public\/media\/([^?#]+)$/)
  return m?.[1] ? decodeURIComponent(m[1]) : null
}
