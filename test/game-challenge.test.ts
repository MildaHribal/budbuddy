import { describe, expect, it, vi } from 'vitest'
import { challengeForWeek, hashSeed, isoWeek } from '../supabase/functions/game-submit/challenge'
import {
  cleanAction, createGameSubmitHandler, currentChallengeRow, MAX_ACTIONS, parseSubmission, withinRealTime,
  type ChallengeRow, type GameSubmitDeps
} from '../supabase/functions/game-submit/handler'
import { REAL_MS_PER_GAME_HOUR, type LoggedAction } from '../shared/game/types'
import { CHALLENGE_REWARD, rewardDue } from '../app/components/game/challenge/rewards'

const NOW = Date.UTC(2026, 9, 15, 12) // Thursday of 2026-W42
const water = (atH: number): LoggedAction => ({ atH, action: { t: 'water', plantId: 'p1', liters: 1.5, ph: 6.3, feed: [{ productId: 'base-a', mlPerL: 2 }] } })

describe('weeks', () => {
  it('computes ISO weeks in UTC', () => {
    const w = isoWeek(NOW)
    expect(w.id).toBe('2026-W42')
    expect(new Date(w.startsAt).toISOString()).toBe('2026-10-12T00:00:00.000Z')
    expect(w.endsAt - w.startsAt).toBe(7 * 86_400_000)
    expect(isoWeek(Date.UTC(2027, 0, 1)).id).toBe('2026-W53')
    expect(isoWeek(Date.UTC(2026, 0, 1)).id).toBe('2026-W01')
  })

  it('derives the same challenge from the week id', () => {
    expect(challengeForWeek('2026-W42')).toEqual(challengeForWeek('2026-W42'))
    expect(challengeForWeek('2026-W42').seed).not.toBe(challengeForWeek('2026-W43').seed)
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
    expect(currentChallengeRow(NOW).id).toBe('2026-W42')
  })
})

describe('payload validation', () => {
  it('keeps known fields only and rejects unknown shapes', () => {
    expect(cleanAction({ t: 'flip', tentId: 't1' })).toEqual({ t: 'flip', tentId: 't1' })
    expect(cleanAction({ t: 'flip', tentId: 't1', extra: 1 })).toBeNull()
    expect(cleanAction({ t: 'breed', motherId: 'a', fatherId: 'b', name: 'x' })).toBeNull()
    expect(cleanAction({ t: 'buy', itemId: 'x', qty: 1.5 })).toBeNull()
    expect(cleanAction({ t: 'water', plantId: 'p', liters: 1, ph: 99, feed: [] })).toBeNull()
    expect(cleanAction({ t: 'water', plantId: 'p 1;drop', liters: 1, ph: 6, feed: [] })).toBeNull()
    expect(cleanAction({ t: 'train', plantId: 'p', kind: 'hack' })).toBeNull()
    expect(cleanAction({ t: 'toString' })).toBeNull()
  })

  it('requires ordered times and caps the count', () => {
    expect(parseSubmission({ challengeId: '2026-W42', actions: [water(1), water(2)] })).toMatchObject({ challengeId: '2026-W42' })
    expect(parseSubmission({ challengeId: '2026-W42', actions: [water(5), water(2)] })).toEqual({ error: 'time' })
    expect(parseSubmission({ challengeId: '2026-W42', actions: [{ ...water(1), more: 1 }] })).toEqual({ error: 'actions' })
    expect(parseSubmission({ challengeId: 'x', actions: [water(1)] })).toEqual({ error: 'challenge' })
    expect(parseSubmission({ challengeId: '2026-W42', actions: [] })).toEqual({ error: 'actions' })
    const many = Array.from({ length: MAX_ACTIONS + 1 }, (_, i) => water(i))
    expect(parseSubmission({ challengeId: '2026-W42', actions: many })).toEqual({ error: 'too_many' })
  })

  it('rejects runs with more game time than real time since the week began', () => {
    const start = NOW - 10 * 3_600_000
    const realH = 10 * 3_600_000 / REAL_MS_PER_GAME_HOUR
    expect(withinRealTime([water(realH)], start, NOW)).toBe(true)
    expect(withinRealTime([water(realH + 100)], start, NOW)).toBe(false)
  })
})

const row: ChallengeRow = { ...currentChallengeRow(NOW) }

function deps(over: Partial<GameSubmitDeps> = {}): GameSubmitDeps {
  return {
    identify: async () => ({ kind: 'user', id: '11111111-1111-4111-8111-111111111111' }),
    replay: vi.fn(() => ({ quality: 82, dryG: 64, score: 5248 })),
    ensureChallenge: vi.fn(async r => r),
    getChallenge: vi.fn(async () => row),
    submit: vi.fn(async ({ score }) => ({ status: 'ok' as const, improved: true, best: score.score, quality: score.quality, dryG: score.dryG, rank: 3 })),
    now: () => NOW,
    ...over
  }
}

const post = (body: unknown, headers: Record<string, string> = {}) => new Request('https://x/functions/v1/game-submit', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'origin': 'capacitor://localhost', 'authorization': 'Bearer a.b.c', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body)
})
const valid = { challengeId: '2026-W42', actions: [water(1), water(30)], clientScore: { quality: 99, dryG: 999, score: 1e9 } }

describe('game-submit handler', () => {
  it('stores the server score, never the client one', async () => {
    const d = deps()
    const res = await createGameSubmitHandler(d)(post(valid))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ verified: true, score: { score: 5248 }, rank: 3, improved: true })
    const args = (d.submit as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(args.score).toEqual({ quality: 82, dryG: 64, score: 5248 })
    expect(args.client).toEqual(valid.clientScore)
    expect(res.headers.get('access-control-allow-origin')).toBe('capacitor://localhost')
  })

  it('needs a signed-in user', async () => {
    const anon = createGameSubmitHandler(deps({ identify: async () => ({ kind: 'anon' }) }))
    expect((await anon(post(valid))).status).toBe(401)
    const denied = createGameSubmitHandler(deps({ identify: async () => ({ status: 401, reason: 'auth_required', message: '' }) }))
    expect((await denied(post(valid))).status).toBe(401)
  })

  it('rejects foreign origins, bad bodies and oversize payloads', async () => {
    const h = createGameSubmitHandler(deps())
    expect((await h(post(valid, { origin: 'https://evil.example' }))).status).toBe(403)
    expect((await h(post('{oops'))).status).toBe(400)
    expect((await h(post({ ...valid, actions: [{ atH: 1, action: { t: 'breed', motherId: 'a', fatherId: 'b', name: 'n' } }] }))).status).toBe(400)
    expect((await h(post('x'.repeat(230_000)))).status).toBe(413)
  })

  it('checks the challenge window and run length', async () => {
    const closed = createGameSubmitHandler(deps({ now: () => Date.parse(row.ends_at) + 1000 }))
    expect((await closed(post(valid))).status).toBe(409)
    const missing = createGameSubmitHandler(deps({ getChallenge: async () => null }))
    expect((await missing(post(valid))).status).toBe(404)
    // one real hour into the week allows 72 game hours (plus slack)
    const tooFast = createGameSubmitHandler(deps({ now: () => Date.parse(row.starts_at) + 3_600_000 }))
    expect((await tooFast(post({ ...valid, actions: [water(1), water(200)] }))).status).toBe(422)
  })

  it('maps replay failures and unfinished runs', async () => {
    const boom = createGameSubmitHandler(deps({
      replay: () => {
        throw new Error('bad')
      }
    }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await boom(post(valid))).status).toBe(422)
    const unfinished = createGameSubmitHandler(deps({ replay: () => ({ quality: 0, dryG: 0, score: 0 }) }))
    expect(await (await unfinished(post(valid))).json()).toEqual({ error: { reason: 'unfinished' } })
    const nan = createGameSubmitHandler(deps({ replay: () => ({ quality: Number.NaN, dryG: 1, score: 1 }) }))
    expect((await nan(post(valid))).status).toBe(422)
  })

  it('maps database outcomes', async () => {
    const as = (status: 'banned' | 'closed' | 'rate') => createGameSubmitHandler(deps({ submit: async () => ({ status }) }))
    expect((await as('banned')(post(valid))).status).toBe(403)
    expect((await as('closed')(post(valid))).status).toBe(409)
    expect((await as('rate')(post(valid))).status).toBe(429)
    const down = createGameSubmitHandler(deps({ submit: async () => null }))
    expect((await down(post(valid))).status).toBe(502)
  })

  it('serves the current challenge on GET and creates it lazily', async () => {
    const d = deps()
    const res = await createGameSubmitHandler(d)(new Request('https://x/functions/v1/game-submit', { headers: { origin: 'https://localhost' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.challenge.id).toBe('2026-W42')
    expect(body.challenge.def).toEqual(challengeForWeek('2026-W42'))
    expect(d.ensureChallenge).toHaveBeenCalledOnce()
  })
})

describe('weekly reward', () => {
  it('pays participation once and tops up placement only when the rank improves', () => {
    const first = rewardDue(undefined, 12)
    expect(first.coins).toBe(CHALLENGE_REWARD.participation + CHALLENGE_REWARD.placement(12))
    expect(rewardDue(first.ledger, 12).coins).toBe(0)
    expect(rewardDue(first.ledger, 40).coins).toBe(0)
    const better = rewardDue(first.ledger, 1)
    expect(better.coins).toBe(CHALLENGE_REWARD.placement(1) - CHALLENGE_REWARD.placement(12))
    expect(rewardDue(better.ledger, 1).coins).toBe(0)
  })
})

// Client and server both score with shared/game/sim replayChallenge: a scripted run played the way
// the client plays it (advance, then apply with logging) must replay to the same score on the server.
describe('replay parity', () => {
  it('a full scripted run replays to the same score through the handler', async () => {
    const sim = await import('../shared/game/sim/index')
    const def = challengeForWeek('2026-W42')
    const s = sim.newChallenge(def, 0)
    s.log = []
    for (let h = 1; h <= 24 * 200 && !s.history.length; h++) {
      sim.advance(s, h)
      const p = Object.values(s.plants)[0]
      if (p && !p.dead && p.stage !== 'harvested') {
        if (p.root.water < 0.4) sim.apply(s, { t: 'water', plantId: p.id, liters: p.potL * 0.35, ph: p.medium === 'soil' ? 6.4 : 5.9, feed: [] })
        if (p.genome.kind === 'photo' && p.stage === 'veg' && h > 24 * 28) sim.apply(s, { t: 'flip', tentId: p.tentId })
        if ((p.stage === 'flower' || p.stage === 'ripening') && p.ripeness >= 0.85) sim.apply(s, { t: 'harvest', plantId: p.id })
      }
      for (const b of s.drying) if (!b.done && b.moisture <= 0.15) sim.apply(s, { t: 'jar', batchId: b.id })
      for (const j of [...s.jars]) {
        if (h - j.startedAtH >= sim.MIN_CURE_H) sim.apply(s, { t: 'finishCure', jarId: j.id })
        else if (h - j.lastBurpH >= 6) sim.apply(s, { t: 'burp', jarId: j.id })
      }
    }
    const local = sim.challengeScore(s)
    expect(local.dryG).toBeGreaterThan(0)
    const actions = s.log!
    expect(sim.replayChallenge(def, actions)).toEqual(local)

    const start = Date.UTC(2026, 9, 12)
    const lastH = actions[actions.length - 1]!.atH
    const live = { ...row, def, starts_at: new Date(start).toISOString(), ends_at: new Date(start + 7 * 86_400_000).toISOString() }
    const d = deps({ replay: sim.replayChallenge, getChallenge: async () => live, now: () => start + lastH * REAL_MS_PER_GAME_HOUR + 60_000 })
    const res = await createGameSubmitHandler(d)(post(JSON.parse(JSON.stringify({ challengeId: def.id, actions, clientScore: local }))))
    expect(res.status).toBe(200)
    expect((d.submit as ReturnType<typeof vi.fn>).mock.calls[0]![0].score).toEqual(local)
  })
})
