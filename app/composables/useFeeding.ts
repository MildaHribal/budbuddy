import type { Plant } from '~/types/grow'
import type { FeedLine, FeedPlan, FeedSchedule } from '~/types/kit'
import { todayISO } from '~/utils/date'
import { BUNDLED_SCHEDULES } from '~/utils/feedSchedules'
import { linesFromDoses, matchStock, planFor, scheduleWeekFor, weekDoses, type Dose, type ScheduleWeek } from '~/utils/feeding'
import { createId } from '~/utils/id'
import { emptyFeeding, emptyInventory, normalizeSchedule } from '~/utils/kitSchema'
import { growStateForKit } from './useGrow'

export interface PlantFeeding {
  plan: FeedPlan
  schedule: FeedSchedule
  current: ScheduleWeek | null
  doses: Dose[]
}

export function useFeeding() {
  const state = growStateForKit()
  const data = () => (state.feeding ??= emptyFeeding())

  const custom = computed(() => state.feeding?.custom ?? [])
  const plans = computed(() => state.feeding?.plans ?? [])
  const schedules = computed<FeedSchedule[]>(() => [...BUNDLED_SCHEDULES, ...custom.value])

  const getSchedule = (id: string) => schedules.value.find(s => s.id === id)

  function planOf(plantId: string): FeedPlan | undefined {
    return planFor(plans.value, plantId)
  }

  function setPlan(plantId: string, patch: Pick<FeedPlan, 'scheduleId' | 'strength' | 'waterL'>) {
    const d = data()
    const existing = d.plans.find(p => p.plantId === plantId)
    if (existing) Object.assign(existing, patch)
    else d.plans.push({ id: createId(), plantId, createdAt: new Date().toISOString(), ...patch })
  }

  function removePlan(plantId: string) {
    if (state.feeding) state.feeding.plans = state.feeding.plans.filter(p => p.plantId !== plantId)
  }

  function saveCustom(raw: FeedSchedule): FeedSchedule {
    const s = normalizeSchedule(JSON.parse(JSON.stringify(raw)))
    const d = data()
    const i = d.custom.findIndex(c => c.id === s.id)
    if (i >= 0) d.custom[i] = s
    else d.custom.push(s)
    return s
  }

  function deleteCustom(id: string) {
    const d = data()
    d.custom = d.custom.filter(c => c.id !== id)
    d.plans = d.plans.filter(p => p.scheduleId !== id)
  }

  /** Editable copy of any schedule (bundled ones stay read-only). */
  function draftFrom(s: FeedSchedule | null, copySuffix: string): FeedSchedule {
    if (!s) return { id: createId(), brand: '', line: '', media: [], products: [], weeks: [], custom: true }
    if (s.custom) return JSON.parse(JSON.stringify(s))
    const ids = new Map(s.products.map(p => [p.id, createId()]))
    return {
      id: createId(),
      brand: s.brand,
      line: [s.line, copySuffix].filter(Boolean).join(' '),
      media: [...s.media],
      products: s.products.map(p => ({ ...p, id: ids.get(p.id)! })),
      weeks: s.weeks.map(w => ({ ...w, doses: Object.fromEntries(Object.entries(w.doses).map(([k, v]) => [ids.get(k) ?? k, v])) })),
      custom: true
    }
  }

  function feedingFor(plant: Plant, today = todayISO()): PlantFeeding | null {
    const plan = planOf(plant.id)
    const schedule = plan && getSchedule(plan.scheduleId)
    if (!plan || !schedule) return null
    const current = scheduleWeekFor(plant, schedule, today)
    return { plan, schedule, current, doses: current ? weekDoses(schedule, current.week, plan.strength, plan.waterL) : [] }
  }

  /** Products of this week's dose, linked to bottles in the inventory by name. */
  function planLines(plant: Plant, today = todayISO()): FeedLine[] {
    const f = feedingFor(plant, today)
    if (!f?.current) return []
    const stock = (state.inventory ?? emptyInventory()).nutrients
    return linesFromDoses(f.doses).map(l => ({ ...l, stockId: matchStock(l.name, stock)?.id ?? null }))
  }

  return { schedules, custom, plans, getSchedule, planOf, setPlan, removePlan, saveCustom, deleteCustom, draftFrom, feedingFor, planLines }
}
