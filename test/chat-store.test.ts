import { beforeEach, describe, expect, it, vi } from 'vitest'

const prefs = new Map<string, string>()
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string, value: string }) => void prefs.set(key, value)
  }
}))

const { CHAT_KEY, chatSnapshot, pruneChats } = await import('../app/utils/chatStore')

const msg = (id: string, at: string, extra: Record<string, unknown> = {}) => ({ id, createdAt: at, role: 'user', text: id, ...extra })

describe('chat storage', () => {
  beforeEach(() => prefs.clear())

  it('keeps photo previews only on the newest messages', () => {
    const threads = {
      a: Array.from({ length: 5 }, (_, i) => msg(`a${i}`, `2026-10-0${i + 1}T00:00:00Z`, { thumb: 'data:x' })),
      b: Array.from({ length: 5 }, (_, i) => msg(`b${i}`, `2026-10-0${i + 1}T12:00:00Z`, { thumb: 'data:x' }))
    }
    const out = chatSnapshot(threads, 40, 6)
    const kept = Object.values(out).flat().filter(m => m.thumb).map(m => m.id).sort()
    expect(kept).toEqual(['a2', 'a3', 'a4', 'b2', 'b3', 'b4'])
    expect(out.a![0]).toMatchObject({ thumbDropped: true })
    expect(JSON.stringify(out.a![0])).not.toContain('thumb"')
    // the live threads keep their previews
    expect(threads.a[0]!.thumb).toBe('data:x')
  })

  it('drops pending messages, empty threads and caps the length', () => {
    const out = chatSnapshot({ a: [msg('1', 'x', { pending: true })], b: [msg('1', 'a'), msg('2', 'b'), msg('3', 'c')] }, 2)
    expect(Object.keys(out)).toEqual(['b'])
    expect(out.b!.map(m => m.id)).toEqual(['2', '3'])
  })

  it('removes threads of plants that are gone', async () => {
    prefs.set(CHAT_KEY, JSON.stringify({ threads: { general: [msg('g', 'x')], p1: [msg('1', 'x')], gone: [msg('2', 'x')] }, lastThread: 'gone' }))
    await pruneChats(['p1'])
    const saved = JSON.parse(prefs.get(CHAT_KEY)!)
    expect(Object.keys(saved.threads)).toEqual(['general', 'p1'])
    expect(saved.lastThread).toBeNull()
  })
})
