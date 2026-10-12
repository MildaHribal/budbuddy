import { describe, expect, it } from 'vitest'
import { toCzechQuery } from '../app/ai/glossary'
import { pickGuideLinks, guideLessonIds } from '../app/ai/guideLinks'
import type { KbHit } from '../app/ai/kb'
import { mergeHits, retrievePassages } from '../app/ai/retrieve'
import { offlineCards } from '../app/composables/useAssistant'
import { getLesson } from '../app/guide'

const hit = (id: string, kind: KbHit['kind'], title = id): KbHit => ({ id, kind, title, text: `${title} text`, lang: kind === 'corpus' ? 'en' : 'cs', score: 1 })

describe('toCzechQuery', () => {
  it('translates grow terms and phrases', () => {
    const q = toCzechQuery('My fan leaves have yellow between the veins, older leaves, coco')
    expect(q).toContain('vějířové listy')
    expect(q).toContain('mezižilková chloróza')
    expect(q).toContain('kokos')
    expect(toCzechQuery('Small black flies around my pots')).toContain('smutnice')
  })

  it('returns nothing for fewer than two terms', () => {
    expect(toCzechQuery('What is wrong with this leaf?')).toBe('')
    expect(toCzechQuery('hello there')).toBe('')
  })
})

describe('mergeHits / retrievePassages', () => {
  it('puts curated Czech hits first and drops glossary cards and duplicates', () => {
    const out = mergeHits([hit('c1', 'corpus'), hit('k1', 'knowledge')], [hit('k2', 'knowledge'), hit('g', 'knowledge', 'Slovník: palice = cola'), hit('c9', 'corpus'), hit('k1', 'knowledge')])
    expect(out.map(h => h.id)).toEqual(['k2', 'k1', 'c1'])
  })

  it('runs a second, Czech search only for English questions', async () => {
    const queries: string[] = []
    const kb = {
      queryLang: (q: string) => (/[áčěířšžý]/.test(q) ? 'cs' as const : 'en' as const),
      searchKb: async (q: string) => {
        queries.push(q)
        return /[áčěířšžý]/.test(q) ? [hit('k1', 'knowledge')] : [hit('c1', 'corpus'), hit('c2', 'corpus'), hit('c3', 'corpus')]
      }
    }
    const en = await retrievePassages(kb, 'yellow older leaves in coco')
    expect(queries).toHaveLength(2)
    expect(en.map(h => h.id)).toEqual(['k1', 'c1', 'c2'])
    queries.length = 0
    await retrievePassages(kb, 'žloutnou spodní listy')
    expect(queries).toHaveLength(1)
  })
})

describe('pickGuideLinks', () => {
  it('maps questions to guide lessons that exist', () => {
    for (const { lesson, chapter } of guideLessonIds()) expect(getLesson(lesson)?.chapter.id, lesson).toBe(chapter)
    expect(pickGuideLinks('Na rubu listů mám pavučinky').map(g => g.lesson)).toEqual(['problems-pests'])
    expect(pickGuideLinks('How do I know when to harvest using trichomes?')[0]?.lesson).toBe('flowering-when-to-harvest')
    expect(pickGuideLinks('Jak a kdy udělat topping?').map(g => g.lesson)).toContain('training-topping')
  })

  it('uses passage titles only when the question matched nothing', () => {
    expect(pickGuideLinks('Co s tím?', ['Šedá plíseň v palici'])[0]?.lesson).toBe('problems-mould')
    expect(pickGuideLinks('Jak a kdy udělat topping?', ['Šedá plíseň v palici']).map(g => g.lesson)).not.toContain('problems-mould')
    expect(pickGuideLinks('ahoj')).toEqual([])
  })
})

describe('offlineCards', () => {
  it('keeps up to three curated passages without the card prefixes', () => {
    const cards = offlineCards([hit('c1', 'corpus'), { ...hit('k1', 'knowledge'), text: 'Tip: Dusík\nRada: Přidej hnojivo.' }, hit('k2', 'knowledge'), hit('f1', 'feeding_chart'), hit('k3', 'knowledge')])
    expect(cards).toHaveLength(3)
    expect(cards[0]).toEqual({ title: 'k1', text: 'Dusík\nPřidej hnojivo.', lang: 'cs' })
  })
})
