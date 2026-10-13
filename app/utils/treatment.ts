// Treatment plans after a diagnosis: templates for common problems and plan bookkeeping (pure logic).
// Step texts live in app/locales/care.ts under care.treat.steps.<key>.
import type { GlyphName } from './glyphs'
import type { TreatmentPlan, TreatmentStep } from '../types/grow'
import { addDays, daysBetween, isValidISODate, todayISO } from './date'
import { createId } from './id'

export type IssueId
  = | 'nitrogen' | 'calcium' | 'magnesium'
    | 'overwatering' | 'lightBurn' | 'nutrientBurn'
    | 'spiderMites' | 'fungusGnats' | 'powderyMildew' | 'budRot'

export type IssueGroup = 'nutrition' | 'environment' | 'pests' | 'mould'

export interface StepDef {
  key: string
  /** day after the start the step is due (0 = right away) */
  day: number
  /** also creates a dated task (and so a reminder) */
  task?: boolean
}

export interface IssueTemplate {
  id: IssueId
  group: IssueGroup
  glyph: GlyphName
  /** guide lesson with the background */
  lesson: { chapter: string, lesson: string }
  steps: StepDef[]
  /** day of the follow-up photo check */
  checkDay: number
}

const s = (key: string, day = 0, task = false): StepDef => ({ key, day, task })

export const ISSUES: IssueTemplate[] = [
  {
    id: 'nitrogen', group: 'nutrition', glyph: 'feed',
    lesson: { chapter: 'problems', lesson: 'problems-deficiencies' },
    steps: [s('checkPhEc'), s('nitrogenLateFlower'), s('nitrogenFeed'), s('removeNothing')],
    checkDay: 3
  },
  {
    id: 'calcium', group: 'nutrition', glyph: 'feed',
    lesson: { chapter: 'problems', lesson: 'problems-deficiencies' },
    steps: [s('checkPhEc'), s('calciumWater'), s('calmagDose'), s('removeNothing')],
    checkDay: 3
  },
  {
    id: 'magnesium', group: 'nutrition', glyph: 'feed',
    lesson: { chapter: 'problems', lesson: 'problems-deficiencies' },
    steps: [s('checkPhEc'), s('magnesiumDose'), s('noStacking'), s('removeNothing')],
    checkDay: 3
  },
  {
    id: 'overwatering', group: 'environment', glyph: 'water',
    lesson: { chapter: 'problems', lesson: 'problems-burn-lockout' },
    steps: [s('stopWatering'), s('drainage'), s('liftTest'), s('waterSmaller', 2), s('rootAir')],
    checkDay: 3
  },
  {
    id: 'lightBurn', group: 'environment', glyph: 'lamp',
    lesson: { chapter: 'problems', lesson: 'problems-burn-lockout' },
    steps: [s('raiseLight'), s('checkPpfd'), s('canopyTemp'), s('removeNothing')],
    checkDay: 3
  },
  {
    id: 'nutrientBurn', group: 'nutrition', glyph: 'feed',
    lesson: { chapter: 'nutrition', lesson: 'nutrition-overfeeding' },
    steps: [s('checkRunoffEc'), s('lowerFeed'), s('plainWater'), s('noHardFlush'), s('removeNothing')],
    checkDay: 3
  },
  {
    id: 'spiderMites', group: 'pests', glyph: 'pest',
    lesson: { chapter: 'problems', lesson: 'problems-pests' },
    steps: [s('isolate'), s('inspectUndersides'), s('rinseLeaves'), s('removeWorst'), s('labelledProduct'), s('repeatTreatment', 4, true), s('repeatTreatment2', 8, true), s('noSprayBuds')],
    checkDay: 3
  },
  {
    id: 'fungusGnats', group: 'pests', glyph: 'pest',
    lesson: { chapter: 'problems', lesson: 'problems-pests' },
    steps: [s('dryTopLayer'), s('stickyTraps'), s('emptySaucers'), s('btiDrench'), s('countTraps', 7, true)],
    checkDay: 3
  },
  {
    id: 'powderyMildew', group: 'mould', glyph: 'pest',
    lesson: { chapter: 'problems', lesson: 'problems-mould' },
    steps: [s('bagLeaves'), s('lowerHumidity'), s('airflow'), s('labelledFungicide'), s('noSprayBuds'), s('cleanTent')],
    checkDay: 3
  },
  {
    id: 'budRot', group: 'mould', glyph: 'pest',
    lesson: { chapter: 'problems', lesson: 'problems-mould' },
    steps: [s('cutRot'), s('cleanScissors'), s('lowerHumidityFlower'), s('checkNeighbours', 1, true), s('considerHarvest'), s('neverSmokeMould')],
    checkDay: 2
  }
]

const BY_ID = new Map(ISSUES.map(i => [i.id, i]))

export function issueTemplate(id: string): IssueTemplate | undefined {
  return BY_ID.get(id as IssueId)
}

export const isIssueId = (v: unknown): v is IssueId => typeof v === 'string' && BY_ID.has(v as IssueId)

/** Plan templates that fit a guide lesson (for the "make a plan" link under a lesson). */
export function issuesForLesson(lessonId: string): IssueId[] {
  return ISSUES.filter(i => i.lesson.lesson === lessonId).map(i => i.id)
}

const fold = (v: string) => v.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

const GUESS: [IssueId, RegExp][] = [
  ['spiderMites', /svilus|roztoc|\bmites?\b|pavucin|webbing/],
  ['fungusGnats', /smutnic|\bgnats?\b|muszk|music/],
  ['budRot', /botryt|bud ?rot|hniloba|sediva plisen|grey mou?ld|gray mou?ld/],
  ['powderyMildew', /padli|mildew|mucnat|moucnat|bily povlak|white powder/],
  ['nutrientBurn', /nutrient burn|spalen.{0,12}(hnoj|zivin)|preh?noj|overfe|spalene spicky|burnt tips/],
  ['lightBurn', /light burn|spalen.{0,12}svetl|bleach|vybel/],
  ['overwatering', /overwater|prelit|prelev|premokr|svesl|droop/],
  ['nitrogen', /dusik|nitrogen/],
  ['calcium', /vapnik|calcium/],
  ['magnesium', /horcik|magnes/]
]

/** Best-effort guess of the issue from a journal entry's text (pest product, note). */
export function guessIssue(text: string): IssueId | null {
  const f = fold(text)
  for (const [id, re] of GUESS) if (re.test(f)) return id
  return null
}

export interface PlannedTask {
  /** "check" for the follow-up photo, else the step key */
  key: string
  date: string
}

export function plannedTasks(issue: IssueTemplate, start: string): PlannedTask[] {
  const out: PlannedTask[] = [{ key: 'check', date: addDays(start, issue.checkDay) }]
  for (const st of issue.steps) if (st.task && st.day > 0) out.push({ key: st.key, date: addDays(start, st.day) })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export function createPlan(issue: IssueTemplate, plantId: string, start = todayISO(), extra: Partial<Pick<TreatmentPlan, 'beforeEntryId' | 'sourceEntryId' | 'note'>> = {}): TreatmentPlan {
  return {
    id: createId(),
    plantId,
    issue: issue.id,
    startDate: start,
    steps: issue.steps.map(st => ({ key: st.key, done: false })),
    beforeEntryId: extra.beforeEntryId ?? null,
    checkEntryIds: [],
    taskIds: [],
    sourceEntryId: extra.sourceEntryId ?? null,
    status: 'active',
    closedDate: null,
    note: extra.note ?? ''
  }
}

export interface PlanProgress {
  /** 1-based day of the plan */
  day: number
  done: number
  total: number
  checkDate: string
  /** the follow-up photo is due (and not taken yet) */
  checkDue: boolean
}

export function planProgress(plan: TreatmentPlan, today = todayISO()): PlanProgress {
  const issue = issueTemplate(plan.issue)
  const checkDate = addDays(plan.startDate, issue?.checkDay ?? 3)
  return {
    day: Math.max(1, daysBetween(plan.startDate, today) + 1),
    done: plan.steps.filter(x => x.done).length,
    total: plan.steps.length,
    checkDate,
    checkDue: plan.status === 'active' && today >= checkDate && !plan.checkEntryIds.length
  }
}

/** Day a step is due, as a date. */
export function stepDate(plan: Pick<TreatmentPlan, 'startDate' | 'issue'>, key: string): string {
  const def = issueTemplate(plan.issue)?.steps.find(x => x.key === key)
  return addDays(plan.startDate, def?.day ?? 0)
}

// ── Normalisation ─────────────────────────────────────────────────

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function normalizeTreatments(raw: unknown, plantIds: Set<string>): TreatmentPlan[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .filter(r => plantIds.has(String(r.plantId ?? '')) && isIssueId(r.issue))
    .map((r) => {
      const issue = issueTemplate(str(r.issue))!
      const saved = new Map((Array.isArray(r.steps) ? r.steps : [])
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map(x => [str(x.key), x.done === true]))
      // steps follow the current template; ticks carry over by key
      const steps: TreatmentStep[] = issue.steps.map(st => ({ key: st.key, done: saved.get(st.key) ?? false }))
      const status = r.status === 'resolved' || r.status === 'stopped' ? r.status : 'active'
      return {
        id: str(r.id) || createId(),
        plantId: String(r.plantId),
        issue: issue.id,
        startDate: isValidISODate(r.startDate) ? r.startDate : todayISO(),
        steps,
        beforeEntryId: str(r.beforeEntryId) || null,
        checkEntryIds: ids(r.checkEntryIds),
        taskIds: ids(r.taskIds),
        sourceEntryId: str(r.sourceEntryId) || null,
        status,
        closedDate: status !== 'active' && isValidISODate(r.closedDate) ? r.closedDate : null,
        note: str(r.note)
      }
    })
}
