// Drying checks, curing jars and treatment plans stored in GrowData.cure / GrowData.treatments.
import type { CureData, CureJar, DryCheck, Plant, TreatmentPlan } from '~/types/grow'
import { emptyCure } from '~/utils/curing'
import { todayISO } from '~/utils/date'
import { createId } from '~/utils/id'
import { createPlan, issueTemplate, plannedTasks, type IssueId } from '~/utils/treatment'

export function useCare() {
  const grow = useGrow()
  const { state } = grow
  const { t } = useI18n()

  const cure = (): CureData => grow.mutate(s => (s.cure ??= emptyCure()))
  const plans = (): TreatmentPlan[] => grow.mutate(s => (s.treatments ??= []))

  // ── Drying ──────────────────────────────────────────────────────
  function checksFor(plantId: string): DryCheck[] {
    return (state.cure?.checks ?? []).filter(c => c.plantId === plantId).sort((a, b) => b.date.localeCompare(a.date))
  }

  function saveCheck(input: Omit<DryCheck, 'id'> & { id?: string }): DryCheck {
    const list = cure().checks
    const existing = input.id ? list.find(c => c.id === input.id) : list.find(c => c.plantId === input.plantId && c.date === input.date)
    if (existing) {
      Object.assign(existing, { ...input, id: existing.id })
      return existing
    }
    const check: DryCheck = { ...input, id: createId() }
    list.push(check)
    return check
  }

  function deleteCheck(id: string) {
    const c = cure()
    c.checks = c.checks.filter(x => x.id !== id)
  }

  // ── Jars ────────────────────────────────────────────────────────
  function jarsFor(plantId: string): CureJar[] {
    return (state.cure?.jars ?? []).filter(j => j.plantId === plantId).sort((a, b) => a.startDate.localeCompare(b.startDate) || a.label.localeCompare(b.label))
  }

  function addJar(input: Pick<CureJar, 'plantId' | 'label' | 'weightG' | 'startDate'>): CureJar {
    const jar: CureJar = { ...input, id: createId(), readings: [], burps: [], doneDate: null }
    cure().jars.push(jar)
    return jar
  }

  const jar = (id: string) => cure().jars.find(j => j.id === id)

  function updateJar(id: string, patch: Partial<Pick<CureJar, 'label' | 'weightG' | 'startDate' | 'doneDate'>>) {
    const j = jar(id)
    if (j) Object.assign(j, patch)
  }

  function deleteJar(id: string) {
    const c = cure()
    c.jars = c.jars.filter(j => j.id !== id)
  }

  function burp(id: string, at = new Date()) {
    jar(id)?.burps.push(at.toISOString())
  }

  function addReading(id: string, humidity: number, at = new Date()) {
    jar(id)?.readings.push({ at: at.toISOString(), humidity })
  }

  // ── Treatment plans ─────────────────────────────────────────────
  function plansFor(plantId: string): TreatmentPlan[] {
    return (state.treatments ?? []).filter(p => p.plantId === plantId).sort((a, b) => b.startDate.localeCompare(a.startDate))
  }

  const issueName = (issue: string) => t(`care.treat.issues.${issue}.name`)

  /** Starts a plan and adds dated tasks (follow-up photo, repeat treatments) so reminders pick them up. */
  function startPlan(plant: Plant, issueId: IssueId, opts: { beforeEntryId?: string | null, sourceEntryId?: string | null, start?: string } = {}): TreatmentPlan {
    const issue = issueTemplate(issueId)!
    const start = opts.start ?? todayISO()
    const plan = createPlan(issue, plant.id, start, { beforeEntryId: opts.beforeEntryId, sourceEntryId: opts.sourceEntryId })
    for (const task of plannedTasks(issue, start)) {
      const title = t(`care.treat.taskTitles.${task.key}`, { issue: issueName(issueId).toLowerCase(), plant: plant.name })
      plan.taskIds.push(grow.addTask(title, task.date, plant.id).id)
    }
    plans().push(plan)
    return plan
  }

  const plan = (id: string) => plans().find(p => p.id === id)

  function toggleStep(planId: string, key: string) {
    const step = plan(planId)?.steps.find(s => s.key === key)
    if (step) step.done = !step.done
  }

  function addCheckEntry(planId: string, entryId: string) {
    const p = plan(planId)
    if (!p) return
    p.checkEntryIds.push(entryId)
    // the photo is the follow-up check, so tick its task
    const check = state.tasks.find(x => p.taskIds.includes(x.id) && !x.done && x.date <= todayISO())
    if (check) grow.updateTask(check.id, { done: true })
  }

  function setBefore(planId: string, entryId: string) {
    const p = plan(planId)
    if (p) p.beforeEntryId = entryId
  }

  function dropOpenTasks(p: TreatmentPlan) {
    for (const id of p.taskIds) {
      const task = state.tasks.find(x => x.id === id)
      if (task && !task.done) grow.deleteTask(id)
    }
  }

  function closePlan(planId: string, status: 'resolved' | 'stopped') {
    const p = plan(planId)
    if (!p) return
    p.status = status
    p.closedDate = todayISO()
    dropOpenTasks(p)
  }

  function reopenPlan(planId: string) {
    const p = plan(planId)
    if (!p) return
    p.status = 'active'
    p.closedDate = null
  }

  function deletePlan(planId: string) {
    const p = plan(planId)
    if (p) dropOpenTasks(p)
    grow.mutate((s) => {
      s.treatments = (s.treatments ?? []).filter(x => x.id !== planId)
    })
  }

  return {
    checksFor, saveCheck, deleteCheck,
    jarsFor, addJar, updateJar, deleteJar, burp, addReading,
    plansFor, startPlan, toggleStep, addCheckEntry, setBefore, closePlan, reopenPlan, deletePlan, issueName
  }
}
