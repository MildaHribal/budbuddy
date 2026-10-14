import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: store.get(key) ?? null }),
    set: async ({ key, value }: { key: string, value: string }) => {
      store.set(key, value)
    },
    remove: async ({ key }: { key: string }) => {
      store.delete(key)
    },
    keys: async () => ({ keys: [...store.keys()] })
  }
}))

const { initGame, resetGameForTests, useGame } = await import('../app/composables/useGame')
const { GAME_KEY } = await import('../app/utils/gameUi')
const { readGameForBackup, restoreGameFromBackup } = await import('../app/utils/gameBackup')
const { EQUIPMENT, JOURNAL_BONUS, STARTER } = await import('../shared/game/content/catalog')

beforeEach(() => {
  store.clear()
  resetGameForTests()
})

describe('useGame store', () => {
  it('starts a new game on first visit and saves it', async () => {
    await initGame()
    const g = useGame()
    expect(g.loadError.value).toBeNull()
    expect(g.state.value?.tents).toHaveLength(1)
    expect(g.state.value?.coins).toBe(STARTER.coins)
    expect(JSON.parse(store.get(GAME_KEY)!).v).toBe(1)
  })

  it('round-trips through storage after an action', async () => {
    await initGame()
    const g = useGame()
    const pot = EQUIPMENT.find(e => e.slot === 'pot' && e.stats.medium === 0 && e.stats.liters === 11)!
    expect(g.act({ t: 'buy', itemId: pot.id, qty: 1 }).ok).toBe(true)
    const r = g.act({ t: 'sow', strainId: STARTER.strainId, tentId: g.state.value!.tents[0]!.id, medium: 'soil', potL: 11 })
    expect(r.ok).toBe(true)
    const v = g.version.value
    await g.flush()
    expect(v).toBeGreaterThan(0)
    const saved = JSON.parse(store.get(GAME_KEY)!)
    expect(Object.keys(saved.plants)).toHaveLength(1)

    resetGameForTests()
    await initGame()
    expect(Object.keys(useGame().state.value!.plants)).toHaveLength(1)
  })

  it('never overwrites an unreadable save and keeps a copy when starting over', async () => {
    store.set(GAME_KEY, '{broken')
    await initGame()
    const g = useGame()
    expect(g.loadError.value).toBe('unreadable')
    expect(g.act({ t: 'flush', plantId: 'x' }).ok).toBe(false)
    expect(store.get(GAME_KEY)).toBe('{broken')
    await g.startNewGame()
    expect(g.loadError.value).toBeNull()
    expect([...store.entries()].some(([k, v]) => k.startsWith(`${GAME_KEY}.corrupt-`) && v === '{broken')).toBe(true)
    expect(JSON.parse(store.get(GAME_KEY)!).v).toBe(1)
  })

  it('grantCoins adds coins with an event and saves', async () => {
    await initGame()
    const g = useGame()
    const before = g.state.value!.coins
    expect(await g.grantCoins(120, { en: 'x', cs: 'x' }, 'challenge-w1-0')).toBe(true)
    expect(await g.grantCoins(-5, { en: 'x', cs: 'x' })).toBe(false)
    expect(JSON.parse(store.get(GAME_KEY)!).coins).toBe(before + 120)
    expect(g.state.value!.events.some(e => e.id === 'challenge-w1-0' && !e.read)).toBe(true)
  })

  it('pays the real journal bonus once', async () => {
    await initGame()
    const g = useGame()
    const before = g.state.value!.coins
    const plants = [{ id: 'real', name: 'Tent NL', harvest: { date: '2026-09-01' }, spaceId: 's' }] as never[]
    const entries = [
      { id: 'a', plantId: 'real', date: '2026-07-01', photoIds: ['1', '2', '3', '4', '5'] },
      { id: 'b', plantId: 'real', date: '2026-08-30', photoIds: [] }
    ] as never[]
    expect(g.claimJournalBonus(plants, entries)).toEqual(['Tent NL'])
    expect(g.claimJournalBonus(plants, entries)).toEqual([])
    expect(g.state.value!.coins).toBe(before + JOURNAL_BONUS.coins)
    expect(g.state.value!.rewardedReal).toEqual(['real'])
  })

  it('marks events read', async () => {
    await initGame()
    const g = useGame()
    await g.grantCoins(1, { en: 'x', cs: 'x' })
    g.markEventsRead()
    expect(g.state.value!.events.every(e => e.read)).toBe(true)
  })
})

describe('game in backups', () => {
  it('exports the saved game and restores it', async () => {
    await initGame()
    const g = useGame()
    await g.grantCoins(7, { en: 'x', cs: 'x' })
    const exported = await readGameForBackup()
    expect(exported?.coins).toBe(g.state.value!.coins)

    store.clear()
    expect(await restoreGameFromBackup(exported)).toBe(true)
    expect(JSON.parse(store.get(GAME_KEY)!).coins).toBe(exported!.coins)
  })

  it('ignores a missing or invalid game field and leaves the current save alone', async () => {
    store.set(GAME_KEY, '{"v":1,"tents":[],"plants":{}}')
    expect(await restoreGameFromBackup(undefined)).toBe(false)
    expect(await restoreGameFromBackup({ v: 2, tents: [], plants: {} })).toBe(false)
    expect(store.get(GAME_KEY)).toBe('{"v":1,"tents":[],"plants":{}}')
    store.set(GAME_KEY, 'junk')
    expect(await readGameForBackup()).toBeNull()
  })
})
