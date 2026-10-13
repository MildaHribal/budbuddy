import { describe, expect, it } from 'vitest'
import en from '../app/locales/care'
import { createPlan, guessIssue, ISSUES, issuesForLesson, issueTemplate, normalizeTreatments, plannedTasks, planProgress } from '../app/utils/treatment'
import { getLesson } from '../app/guide'

describe('treatment templates', () => {
  it('cover the common problems', () => {
    expect(ISSUES.map(i => i.id).sort()).toEqual(['budRot', 'calcium', 'fungusGnats', 'lightBurn', 'magnesium', 'nitrogen', 'nutrientBurn', 'overwatering', 'powderyMildew', 'spiderMites'].sort())
  })

  it('link to guide lessons that exist', () => {
    for (const i of ISSUES) expect(getLesson(i.lesson.lesson)?.chapter.id, i.id).toBe(i.lesson.chapter)
  })

  it('have texts for every issue and step in both languages', () => {
    for (const lang of ['en', 'cs'] as const) {
      const d = en[lang] as unknown as { treat: { issues: Record<string, { name: string, signs: string, better: string }>, steps: Record<string, string> } }
      for (const i of ISSUES) {
        expect(d.treat.issues[i.id]?.name, `${lang} ${i.id}`).toBeTruthy()
        expect(d.treat.issues[i.id]?.signs, `${lang} ${i.id}`).toBeTruthy()
        expect(d.treat.issues[i.id]?.better, `${lang} ${i.id}`).toBeTruthy()
        for (const s of i.steps) expect(d.treat.steps[s.key], `${lang} ${s.key}`).toBeTruthy()
      }
    }
  })

  it('maps lessons to plans', () => {
    expect(issuesForLesson('problems-pests')).toEqual(['spiderMites', 'fungusGnats'])
    expect(issuesForLesson('problems-mould')).toEqual(['powderyMildew', 'budRot'])
    expect(issuesForLesson('start-gear')).toEqual([])
  })

  it('guesses the issue from entry text', () => {
    expect(guessIssue('Postřik proti sviluškám')).toBe('spiderMites')
    expect(guessIssue('smutnice v substrátu')).toBe('fungusGnats')
    expect(guessIssue('powdery mildew on fan leaves')).toBe('powderyMildew')
    expect(guessIssue('botrytis in the top cola')).toBe('budRot')
    expect(guessIssue('Spruzit')).toBeNull()
  })
})

describe('plans', () => {
  const mites = issueTemplate('spiderMites')!

  it('schedules the photo check and repeat treatments', () => {
    expect(plannedTasks(mites, '2026-10-01')).toEqual([
      { key: 'check', date: '2026-10-04' },
      { key: 'repeatTreatment', date: '2026-10-05' },
      { key: 'repeatTreatment2', date: '2026-10-09' }
    ])
    expect(plannedTasks(issueTemplate('nitrogen')!, '2026-10-01')).toEqual([{ key: 'check', date: '2026-10-04' }])
  })

  it('tracks progress and the follow-up check', () => {
    const plan = createPlan(mites, 'p', '2026-10-01')
    expect(planProgress(plan, '2026-10-02')).toMatchObject({ day: 2, done: 0, total: mites.steps.length, checkDue: false })
    expect(planProgress(plan, '2026-10-04').checkDue).toBe(true)
    plan.checkEntryIds.push('e')
    expect(planProgress(plan, '2026-10-05').checkDue).toBe(false)
  })

  it('normalises saved plans and keeps ticks by step key', () => {
    const [plan] = normalizeTreatments([
      { id: 'x', plantId: 'p', issue: 'nitrogen', startDate: '2026-10-01', steps: [{ key: 'checkPhEc', done: true }, { key: 'gone', done: true }], status: 'resolved', closedDate: '2026-10-05' },
      { plantId: 'p', issue: 'unknown' },
      { plantId: 'other', issue: 'nitrogen' }
    ], new Set(['p']))
    expect(plan).toMatchObject({ id: 'x', status: 'resolved', closedDate: '2026-10-05', beforeEntryId: null })
    expect(plan!.steps.find(s => s.key === 'checkPhEc')!.done).toBe(true)
    expect(plan!.steps.map(s => s.key)).toEqual(issueTemplate('nitrogen')!.steps.map(s => s.key))
    expect(normalizeTreatments(undefined, new Set())).toEqual([])
  })
})
