import { describe, expect, it } from 'vitest'
import type { StrainPhoto } from '../app/utils/strains'
import { isGrowerPhoto, mediaPathOf, orderStrainPhotos, photoDraftIssue, photoErrorKey, photoReviewState } from '../app/utils/strainPhotos'

const photo = (id: string, extra: Partial<StrainPhoto> = {}): StrainPhoto => ({
  id, kind: 'plant', url: `https://x/${id}.jpg`, thumb_url: null, author: 'A', license: 'CC BY', source_url: 'https://x', ...extra
})

describe('photoDraftIssue', () => {
  const blob = new Blob(['x'])
  it('asks for photo, kind and display consent in that order', () => {
    expect(photoDraftIssue({ photo: null, kind: 'bud', consentDisplay: true })).toBe('photo')
    expect(photoDraftIssue({ photo: blob, kind: null, consentDisplay: true })).toBe('kind')
    expect(photoDraftIssue({ photo: blob, kind: 'plant', consentDisplay: false })).toBe('consent')
    expect(photoDraftIssue({ photo: blob, kind: 'bud', consentDisplay: true })).toBeNull()
  })
  it('rejects unknown kinds', () => {
    expect(photoDraftIssue({ photo: blob, kind: 'leaf' as never, consentDisplay: true })).toBe('kind')
  })
})

describe('orderStrainPhotos', () => {
  it('puts curated photos first by sort, then user photos oldest first', () => {
    const rows = [
      photo('u2', { user_id: 'a', created_at: '2026-10-14T10:00:00Z' }),
      photo('c2', { sort: 2 }),
      photo('u1', { user_id: 'b', created_at: '2026-10-12T10:00:00Z' }),
      photo('c1', { sort: 1 })
    ]
    expect(orderStrainPhotos(rows).map(p => p.id)).toEqual(['c1', 'c2', 'u1', 'u2'])
  })
  it('does not mutate the input', () => {
    const rows = [photo('b', { sort: 2 }), photo('a', { sort: 1 })]
    orderStrainPhotos(rows)
    expect(rows.map(p => p.id)).toEqual(['b', 'a'])
  })
})

describe('grower photo labels', () => {
  it('treats uploads and shared plant covers as grower photos, catalogue photos not', () => {
    expect(isGrowerPhoto(photo('u', { user_id: 'x' }))).toBe(true)
    expect(isGrowerPhoto(photo('p', { grower: true }))).toBe(true)
    expect(isGrowerPhoto(photo('c'))).toBe(false)
  })
  it('shows a review state only on user photos that are not approved', () => {
    expect(photoReviewState(photo('a', { user_id: 'x', status: 'pending' }))).toBe('pending')
    expect(photoReviewState(photo('b', { user_id: 'x', status: 'rejected' }))).toBe('rejected')
    expect(photoReviewState(photo('c', { user_id: 'x', status: 'approved' }))).toBeNull()
    expect(photoReviewState(photo('d', { status: 'rejected' }))).toBeNull()
  })
})

describe('photoErrorKey', () => {
  it('maps server errors to messages', () => {
    expect(photoErrorKey({ code: 'P0001', message: 'rate limit: daily photo limit' })).toBe('rateLimited')
    expect(photoErrorKey({ code: '42501', message: 'new row violates row-level security policy' })).toBe('notAllowed')
    expect(photoErrorKey({ message: 'Failed to fetch' })).toBe('failed')
    expect(photoErrorKey(null)).toBe('failed')
  })
})

describe('mediaPathOf', () => {
  it('extracts the media bucket path', () => {
    expect(mediaPathOf('https://p.supabase.co/storage/v1/object/public/media/u1/strain-photos/a.jpg')).toBe('u1/strain-photos/a.jpg')
    expect(mediaPathOf('https://upload.wikimedia.org/a.jpg')).toBeNull()
    expect(mediaPathOf(null)).toBeNull()
  })
})
