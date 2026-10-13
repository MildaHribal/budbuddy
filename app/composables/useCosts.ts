import type { CostRun, CostsData, Expense, PowerDevice } from '~/types/kit'
import { runTotals, type RunTotals } from '~/utils/costs'
import { createId } from '~/utils/id'
import { emptyCosts, normalizeDevice, normalizeExpense } from '~/utils/kitSchema'
import { locale } from '~/utils/locale'
import { growStateForKit } from './useGrow'

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>

export function useCosts() {
  const state = growStateForKit()
  const fallback = computed(() => emptyCosts(locale.value === 'cs' ? 'CZK' : 'EUR'))
  const data = () => (state.costs ??= emptyCosts(locale.value === 'cs' ? 'CZK' : 'EUR'))
  const costs = computed<CostsData>(() => state.costs ?? fallback.value)

  function updateSettings(patch: Partial<Pick<CostsData, 'currency' | 'kwhPrice'>>) {
    Object.assign(data(), patch)
  }

  function saveDevice(d: Partial<PowerDevice> & { name: string }) {
    const c = data()
    const dev = normalizeDevice({ ...d, id: d.id || createId() })
    const i = c.devices.findIndex(x => x.id === dev.id)
    if (i >= 0) c.devices[i] = dev
    else c.devices.push(dev)
  }

  function deleteDevice(id: string) {
    const c = data()
    c.devices = c.devices.filter(d => d.id !== id)
  }

  function addExpense(input: ExpenseInput): Expense {
    const e = normalizeExpense({ ...input, id: createId(), createdAt: new Date().toISOString() })
    data().expenses.push(e)
    return e
  }

  function updateExpense(id: string, patch: Partial<ExpenseInput>) {
    const e = data().expenses.find(x => x.id === id)
    if (e) Object.assign(e, normalizeExpense({ ...e, ...patch }), { id: e.id, createdAt: e.createdAt })
  }

  function deleteExpense(id: string): Expense | undefined {
    const c = data()
    const e = c.expenses.find(x => x.id === id)
    c.expenses = c.expenses.filter(x => x.id !== id)
    return e
  }

  function restoreExpense(e: Expense) {
    const c = data()
    if (!c.expenses.some(x => x.id === e.id)) c.expenses.push(e)
  }

  function saveRun(run: Pick<CostRun, 'name' | 'plantIds'> & { id?: string }): CostRun {
    const c = data()
    const existing = run.id ? c.runs.find(r => r.id === run.id) : undefined
    if (existing) {
      existing.name = run.name.trim() || existing.name
      existing.plantIds = [...new Set(run.plantIds)]
      return existing
    }
    const r: CostRun = { id: createId(), name: run.name.trim(), plantIds: [...new Set(run.plantIds)], createdAt: new Date().toISOString() }
    c.runs.unshift(r)
    return r
  }

  function deleteRun(id: string) {
    const c = data()
    c.runs = c.runs.filter(r => r.id !== id)
    // expenses stay, as general costs
    for (const e of c.expenses) if (e.runId === id) e.runId = null
  }

  const totals = computed<RunTotals[]>(() => costs.value.runs.map(r => runTotals(r, state.plants, costs.value)))

  return { costs, updateSettings, saveDevice, deleteDevice, addExpense, updateExpense, deleteExpense, restoreExpense, saveRun, deleteRun, totals }
}
