import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PROBLEMS, getProblem, type Problem } from '../app/utils/problems'
import { CATEGORIES, CHECK_AREAS, TREATMENT_FOR, matchProblems, searchProblems } from '../app/utils/problems/atlas'
import { PROBLEM_PHOTOS } from '../app/utils/problems/photos'
import { isIssueId } from '../app/utils/treatment'

const assets = new URL('../app/assets/', import.meta.url).pathname

// diag (v2 groups) + unsupported classes of public/ai/classifier/meta.json; the model is not in git
const CLASSIFIER = [
  'aphids', 'spider_mites', 'russet_broad_mites', 'thrips', 'whiteflies', 'caterpillars', 'leaf_miners',
  'fungus_gnats', 'mealybugs', 'sooty_mold', 'powdery_mildew', 'botrytis', 'leaf_spot', 'fusarium_wilt', 'root_rot',
  'healthy_roots', 'root_bound', 'male_plant', 'hermaphrodite', 'female_preflower', 'foxtailing', 'trichomes_clear',
  'trichomes_cloudy', 'trichomes_amber', 'dried_buds', 'healthy', 'senescence', 'n_def', 'interveinal_chlorosis',
  'new_leaf_chlorosis', 'tip_burn', 'n_toxicity', 'leaf_necrosis', 'deformed_growth', 'drooping', 'light_heat',
  'cold_stress', 'high_humidity', 'hlvd', 'low_humidity', 'mo_def', 'ph_lockout', 'wind_burn'
]

function guideCredits(): Map<string, { author: string, license: string, sourceUrl: string }> {
  const out = new Map()
  for (const f of ['credits.json', 'credits-photos-a.json', 'credits-photos-b.json', 'credits-photos-c.json']) {
    const path = `${assets}guide/${f}`
    if (!existsSync(path)) continue
    for (const c of JSON.parse(readFileSync(path, 'utf8'))) out.set(c.file, c)
  }
  return out
}

const fake = (id: string, over: Partial<Problem> = {}): Problem => ({
  id, category: 'nutrient', name: id, summary: '', areas: [], symptoms: [], confirm: [], lookalikes: [],
  causes: [], fix: [], prevent: [], severity: 'medium', stages: [], ...over
})

describe('problem atlas content', () => {
  it('ids are unique slugs', () => {
    const ids = PROBLEMS.map(p => p.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9_-]*$/)
  })

  it('every lookalike points at another existing problem', () => {
    const bad = PROBLEMS.flatMap(p => p.lookalikes.filter(l => l.id === p.id || !getProblem(l.id)).map(l => `${p.id} → ${l.id}`))
    expect(bad).toEqual([])
  })

  it('classifier ids exist in the classifier class list', () => {
    const bad = PROBLEMS.filter(p => p.classifier && !CLASSIFIER.includes(p.classifier)).map(p => `${p.id}: ${p.classifier}`)
    expect(bad).toEqual([])
  })

  it('the class list matches the local model when it is present', () => {
    const path = new URL('../public/ai/classifier/meta.json', import.meta.url).pathname
    if (!existsSync(path)) return
    const meta = JSON.parse(readFileSync(path, 'utf8')) as { diag: { cls: string, atlas?: string[] }[], unsupported: { cls: string }[] }
    expect([...meta.diag, ...meta.unsupported].map(c => c.cls).sort()).toEqual([...CLASSIFIER].sort())
    expect(meta.diag.flatMap(d => (d.atlas ?? []).filter(id => !getProblem(id)).map(id => `${d.cls} → ${id}`))).toEqual([])
    expect(meta.unsupported.filter(u => !getProblem(u.cls)).map(u => u.cls)).toEqual([])
  })

  it('every problem has the fields the pages show', () => {
    for (const p of PROBLEMS) {
      expect(CATEGORIES, p.id).toContain(p.category)
      expect(p.name.trim(), p.id).not.toBe('')
      expect(p.summary.trim(), p.id).not.toBe('')
      expect(p.areas.length, `${p.id} areas`).toBeGreaterThan(0)
      expect(p.fix.length, `${p.id} fix`).toBeGreaterThan(0)
    }
  })

  it('the checker can reach every problem', () => {
    const covered = new Set(CHECK_AREAS.flatMap(a => a.areas))
    expect(PROBLEMS.filter(p => !p.areas.some(a => covered.has(a))).map(p => p.id)).toEqual([])
  })

  it('treatment templates map to real issue ids', () => {
    for (const issue of Object.values(TREATMENT_FOR)) expect(isIssueId(issue), issue).toBe(true)
    if (PROBLEMS.length) expect(Object.keys(TREATMENT_FOR).filter(id => !getProblem(id))).toEqual([])
  })
})

describe('problem photos', () => {
  const credits = guideCredits()
  const all = Object.entries(PROBLEM_PHOTOS).flatMap(([id, list]) => list.map(p => ({ id, ...p })))

  it('every photo file exists', () => {
    const missing = all.filter(p => !existsSync(p.file.includes('/') ? `${assets}${p.file}` : `${assets}problems/${p.file}`))
    expect(missing.map(p => `${p.id}: ${p.file}`)).toEqual([])
  })

  it('every photo has a caption and a credit', () => {
    for (const p of all) {
      expect(p.caption.trim(), p.file).not.toBe('')
      expect(p.author.trim(), p.file).not.toBe('')
      expect(p.license.trim(), p.file).not.toBe('')
      expect(p.sourceUrl, p.file).toMatch(/^https:\/\//)
      if (p.licenseUrl) expect(p.licenseUrl, p.file).toMatch(/^https:\/\//)
    }
  })

  it('photos shared with the guide keep the guide credit', () => {
    for (const p of all.filter(x => x.file.startsWith('guide/'))) {
      const c = credits.get(p.file.slice('guide/'.length))
      expect(c, p.file).toBeTruthy()
      expect({ author: p.author, license: p.license, sourceUrl: p.sourceUrl }, p.file).toEqual({ author: c!.author, license: c!.license, sourceUrl: c!.sourceUrl })
    }
  })

  it('photos belong to existing problems', () => {
    if (PROBLEMS.length) expect(Object.keys(PROBLEM_PHOTOS).filter(id => !getProblem(id))).toEqual([])
  })

  it('a file is used once per problem', () => {
    for (const [id, list] of Object.entries(PROBLEM_PHOTOS)) expect(new Set(list.map(p => p.file)).size, id).toBe(list.length)
  })
})

describe('symptom checker', () => {
  const list = [
    fake('a', { areas: ['old-leaves'], stages: ['vegetative'], severity: 'low' }),
    fake('b', { areas: ['whole-plant', 'old-leaves'], stages: [] }),
    fake('c', { areas: ['old-leaves'], stages: ['flowering'], severity: 'high' }),
    fake('d', { areas: ['buds'], stages: ['flowering'] }),
    fake('e', { areas: ['roots'], stages: [] })
  ]

  it('filters by area and stage; no stages means any stage', () => {
    expect(matchProblems(list, ['old-leaves'], 'vegetative').map(p => p.id)).toEqual(['a', 'b'])
    expect(matchProblems(list, ['buds'], 'vegetative')).toEqual([])
    expect(matchProblems(list, ['soil', 'roots'], 'seedling').map(p => p.id)).toEqual(['e'])
  })

  it('ranks the first listed area and a named stage higher', () => {
    expect(matchProblems(list, ['old-leaves'], 'flowering').map(p => p.id)).toEqual(['c', 'b'])
    expect(matchProblems(list, ['old-leaves'], null).map(p => p.id)).toEqual(['c', 'a', 'b'])
  })

  it('returns only real problems for every area on the real content', () => {
    for (const a of CHECK_AREAS) {
      for (const p of matchProblems(PROBLEMS, a.areas, null)) expect(p.areas.some(x => a.areas.includes(x))).toBe(true)
    }
  })
})

describe('search', () => {
  it('matches name, other names and symptoms, ignoring case and accents', () => {
    const list = [fake('x', { name: 'Spider mites', aka: ['Two-spotted mite'] }), fake('y', { name: 'Thrips', symptoms: ['Silvery streaks'] })]
    expect(searchProblems(list, 'SPIDER').map(p => p.id)).toEqual(['x'])
    expect(searchProblems(list, 'two spotted').map(p => p.id)).toEqual(['x'])
    expect(searchProblems(list, 'silvéry').map(p => p.id)).toEqual(['y'])
    expect(searchProblems(list, '  ')).toHaveLength(2)
  })
})
