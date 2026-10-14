import { describe, expect, it, vi } from 'vitest'
import { isDemoPost } from '../app/utils/feed/feed'

vi.stubGlobal('location', { origin: 'https://budbuddy.hribal.site' })

describe('demo community feed', () => {
  it('builds sample posts that are recognisable and consistent', async () => {
    const { demoFeed } = await import('../app/utils/feed/demoFeed')
    const { posts, comments } = demoFeed(Date.parse('2026-10-15T12:00:00Z'))
    expect(posts.length).toBeGreaterThanOrEqual(6)
    for (const p of posts) {
      expect(isDemoPost(p.id)).toBe(true)
      expect(p.id).toMatch(/^[0-9a-f-]{36}$/)
      const list = comments.get(p.id)!
      expect(p.comments_count).toBe(list.length)
      if (p.accepted_comment_id) expect(list.some(c => c.id === p.accepted_comment_id)).toBe(true)
      for (const c of list) if (c.parent_id) expect(list.some(x => x.id === c.parent_id)).toBe(true)
      expect(`${p.title} ${p.body} ${list.map(c => c.body).join(' ')}`).not.toMatch(/[—–]/)
    }
    expect(posts.some(p => p.images.length)).toBe(true)
    expect(posts.some(p => p.category === 'question' && !p.comments_count)).toBe(true)
    expect(isDemoPost('5f0c2a0e-1b2c-4d3e-8f40-123456789abc')).toBe(false)
  })
})
