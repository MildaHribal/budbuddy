import { describe, expect, it } from 'vitest'
import { canVote, challengePhase, defaultChallengeDates, phaseDeadline, rankEntries, slugify, splitDuration } from '../app/utils/challenge'

const c = { starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-25T23:59:59Z', voting_ends_at: '2026-10-31T23:59:59Z' }

describe('challenge phases', () => {
  it('walks upcoming → entries → voting → finished', () => {
    expect(challengePhase(c, Date.parse('2026-09-30T12:00:00Z'))).toBe('upcoming')
    expect(challengePhase(c, Date.parse('2026-10-10T12:00:00Z'))).toBe('entries')
    expect(challengePhase(c, Date.parse('2026-10-28T12:00:00Z'))).toBe('voting')
    expect(challengePhase(c, Date.parse('2026-11-01T00:00:00Z'))).toBe('finished')
  })

  it('counts down to the end of the current phase', () => {
    expect(phaseDeadline(c, Date.parse('2026-10-10T00:00:00Z'))).toBe(c.ends_at)
    expect(phaseDeadline(c, Date.parse('2026-10-28T00:00:00Z'))).toBe(c.voting_ends_at)
    expect(phaseDeadline(c, Date.parse('2026-12-01T00:00:00Z'))).toBeNull()
  })

  it('allows votes from start until voting ends', () => {
    expect(canVote(c, Date.parse('2026-10-05T00:00:00Z'))).toBe(true)
    expect(canVote(c, Date.parse('2026-10-30T00:00:00Z'))).toBe(true)
    expect(canVote(c, Date.parse('2026-11-02T00:00:00Z'))).toBe(false)
  })

  it('splits durations', () => {
    expect(splitDuration(((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000)).toEqual({ d: 2, h: 3, m: 4, s: 5 })
    expect(splitDuration(-5)).toEqual({ d: 0, h: 0, m: 0, s: 0 })
  })
})

describe('challenge helpers', () => {
  it('ranks by votes, earlier entry wins ties', () => {
    const ranked = rankEntries([
      { id: 'a', votes_count: 3, created_at: '2026-10-03' },
      { id: 'b', votes_count: 5, created_at: '2026-10-05' },
      { id: 'c', votes_count: 3, created_at: '2026-10-01' }
    ])
    expect(ranked.map(e => e.id)).toEqual(['b', 'c', 'a'])
  })

  it('defaults to 1st–25th and the last day of the month', () => {
    expect(defaultChallengeDates(new Date(2026, 9, 11))).toEqual({ month: '2026-10', starts: '2026-10-01', ends: '2026-10-25', votingEnds: '2026-10-31' })
    expect(defaultChallengeDates(new Date(2026, 1, 3)).votingEnds).toBe('2026-02-28')
    expect(defaultChallengeDates(new Date(2026, 11, 22)).month).toBe('2027-01')
  })

  it('slugifies titles', () => {
    expect(slugify('Můj první grow!')).toBe('muj-prvni-grow')
  })
})
