import { describe, expect, it } from 'vitest'
import { contentIssue } from '../app/utils/feed/content'

describe('contentIssue', () => {
  it('passes normal grow talk', () => {
    for (const s of [
      'I buy coco from the store',
      'What is the price of a decent LED?',
      'Fed 1.6 EC on 2026-10-09 at 18:30, runoff 2.1',
      'Seeds popped after 3 days in a wet paper towel',
      'Yellow tips in week 3 of flower – nute burn?'
    ]) expect(contentIssue(s), s).toBeNull()
  })
  it('flags contact details', () => {
    expect(contentIssue('text me on telegram')).toBe('contact')
    expect(contentIssue('call +420 777 123 456')).toBe('contact')
    expect(contentIssue('mail me at grower@example.com')).toBe('contact')
  })
  it('flags sale intent near product words', () => {
    expect(contentIssue('selling clones, cheap')).toBe('sale')
    expect(contentIssue('prodám semínka')).toBe('sale')
    expect(contentIssue('10 € per gram')).toBe('sale')
  })
  it('flags trading and giving away, not swapping gear', () => {
    expect(contentIssue('happy to swap clones')).toBe('sale')
    expect(contentIssue('trade you some clones for seeds')).toBe('sale')
    expect(contentIssue('free seeds to whoever wants them')).toBe('sale')
    expect(contentIssue('vyměním řízky za semínka')).toBe('sale')
    expect(contentIssue('Trading my HPS for LED made the buds frostier')).toBeNull()
    expect(contentIssue('Výměna substrátu, semínka vyklíčila')).toBeNull()
  })
})
