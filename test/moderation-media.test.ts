import { describe, expect, it } from 'vitest'
import { mediaPaths } from '../app/composables/useModeration'

const U = 'https://x.supabase.co/storage/v1/object/public/media/'

describe('mediaPaths', () => {
  it('collects storage paths from post, plant and entry rows', () => {
    expect(mediaPaths({ images: [`${U}u1/posts/a.jpg`, `${U}u1/posts/b.jpg`] })).toEqual(['u1/posts/a.jpg', 'u1/posts/b.jpg'])
    expect(mediaPaths({ cover_url: `${U}u1/plants/p/c.jpg?v=2`, timeline: [{ photoUrl: `${U}u1/plants/p/d.jpg` }, { note: 'x' }] }))
      .toEqual(['u1/plants/p/c.jpg', 'u1/plants/p/d.jpg'])
    expect(mediaPaths({ image_url: `${U}u%201/challenges/e.jpg` })).toEqual(['u 1/challenges/e.jpg'])
  })
  it('ignores external URLs and empty rows', () => {
    expect(mediaPaths({ image_url: 'https://upload.wikimedia.org/a.jpg', cover: null })).toEqual([])
    expect(mediaPaths(null)).toEqual([])
  })
})
