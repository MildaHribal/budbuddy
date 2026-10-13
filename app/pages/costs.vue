<script setup lang="ts">
import type { Currency, Expense, ExpenseCategory, PowerDevice } from '~/types/kit'
import { formatKwh, formatMoney, kwh, lightWatts, monthlyKwh } from '~/utils/costs'
import { EXPENSE_CATEGORIES } from '~/utils/kitSchema'

const { t } = useI18n()
useHead({ title: () => t('manage.costs.title') })
const grow = useGrow()
const c = useCosts()
const { notify } = useNotify()
const { confirm } = useConfirm()

const costs = c.costs
const cur = computed(() => costs.value.currency)
const money = (v: number, d?: number) => formatMoney(v, cur.value, d)

const CAT_ICON: Record<ExpenseCategory, string> = {
  seeds: 'germination',
  nutrients: 'feed',
  substrate: 'i-tabler-shovel',
  gear: 'tools',
  electricity: 'lamp',
  other: 'note'
}

// ── settings ──────────────────────────────────────────────────────
const price = ref<number | ''>(costs.value.kwhPrice)
watch(price, (v) => {
  if (typeof v === 'number' && v >= 0 && v < 1000) c.updateSettings({ kwhPrice: v })
})
function setCurrency(v: Currency) {
  if (v === cur.value) return
  c.updateSettings({ currency: v })
}

// ── summary ───────────────────────────────────────────────────────
const spent = computed(() => costs.value.expenses.reduce((s, e) => s + e.amount, 0))
const runElectricity = computed(() => c.totals.value.reduce((s, r) => s + r.electricity, 0))
const month = computed(() => monthlyKwh(costs.value.devices))

// ── quick calculator ──────────────────────────────────────────────
const calcW = useLocalStorage('budbuddy:calc-watts', 240)
const calcH = useLocalStorage('budbuddy:calc-hours', 18)
const calcD = useLocalStorage('budbuddy:calc-days', 30)
const calcKwh = computed(() => kwh(Number(calcW.value) || 0, Number(calcH.value) || 0, Number(calcD.value) || 0))

// ── devices ───────────────────────────────────────────────────────
const deviceOpen = ref(false)
const device = reactive({ id: '', name: '', watts: '' as number | '', kind: 'light' as PowerDevice['kind'], hoursVeg: 18 as number | '', hoursFlower: 12 as number | '' })
const deviceSubmitted = ref(false)
const deviceValid = computed(() => !!device.name.trim() && typeof device.watts === 'number' && device.watts > 0
  && [device.hoursVeg, device.hoursFlower].every(h => typeof h === 'number' && h >= 0 && h <= 24))

function openDevice(d?: PowerDevice) {
  deviceSubmitted.value = false
  Object.assign(device, d ?? { id: '', name: '', watts: '', kind: 'light', hoursVeg: 18, hoursFlower: 12 })
  deviceOpen.value = true
}
function onKind(kind: PowerDevice['kind']) {
  device.kind = kind
  if (!device.id) {
    device.hoursVeg = kind === 'light' ? 18 : 24
    device.hoursFlower = kind === 'light' ? 12 : 24
  }
}
function saveDevice() {
  deviceSubmitted.value = true
  if (!deviceValid.value) return
  c.saveDevice({ ...device, id: device.id || undefined, watts: Number(device.watts), hoursVeg: Number(device.hoursVeg), hoursFlower: Number(device.hoursFlower) })
  deviceOpen.value = false
}
async function deleteDevice() {
  if (!device.id) return
  const ok = await confirm({ title: t('manage.costs.deleteDevice', { name: device.name }), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  c.deleteDevice(device.id)
  deviceOpen.value = false
}

// ── expenses ──────────────────────────────────────────────────────
const expenseOpen = ref(false)
const expense = reactive({ id: '', title: '', amount: '' as number | '', category: 'gear' as ExpenseCategory, date: todayISO(), runId: '' })
const expenseSubmitted = ref(false)
const expenseValid = computed(() => !!expense.title.trim() && typeof expense.amount === 'number' && expense.amount >= 0 && isValidISODate(expense.date))

function openExpense(e?: Expense, runId?: string) {
  expenseSubmitted.value = false
  Object.assign(expense, e
    ? { ...e, runId: e.runId ?? '' }
    : { id: '', title: '', amount: '', category: 'gear', date: todayISO(), runId: runId ?? costs.value.runs[0]?.id ?? '' })
  expenseOpen.value = true
}
function saveExpense() {
  expenseSubmitted.value = true
  if (!expenseValid.value) return
  const input = { title: expense.title.trim(), amount: Number(expense.amount), category: expense.category, date: expense.date, runId: expense.runId || null }
  if (expense.id) c.updateExpense(expense.id, input)
  else c.addExpense(input)
  notify(t('manage.costs.expenseSaved'))
  expenseOpen.value = false
}
function deleteExpense() {
  const removed = expense.id ? c.deleteExpense(expense.id) : undefined
  expenseOpen.value = false
  if (removed) notify(t('manage.costs.expenseDeleted'), { tone: 'info', action: { label: t('common.undo'), run: () => c.restoreExpense(removed) } })
}
const sortedExpenses = computed(() => [...costs.value.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
const showAll = ref(false)
const visibleExpenses = computed(() => (showAll.value ? sortedExpenses.value : sortedExpenses.value.slice(0, 8)))
const runName = (id: string | null) => costs.value.runs.find(r => r.id === id)?.name ?? t('manage.costs.general')

// ── runs ──────────────────────────────────────────────────────────
const runOpen = ref(false)
const run = reactive({ id: '', name: '', plantIds: [] as string[] })
const runSubmitted = ref(false)
const runPlants = computed(() => grow.state.plants)
function openRun(id?: string) {
  runSubmitted.value = false
  const r = id ? costs.value.runs.find(x => x.id === id) : undefined
  const growing = grow.state.plants.filter(isGrowing).map(p => p.id)
  Object.assign(run, r ? { id: r.id, name: r.name, plantIds: [...r.plantIds] } : { id: '', name: t('manage.costs.runDefault', { n: costs.value.runs.length + 1 }), plantIds: growing })
  runOpen.value = true
}
function toggleRunPlant(id: string) {
  run.plantIds = run.plantIds.includes(id) ? run.plantIds.filter(x => x !== id) : [...run.plantIds, id]
}
function saveRun() {
  runSubmitted.value = true
  if (!run.name.trim() || !run.plantIds.length) return
  c.saveRun({ id: run.id || undefined, name: run.name, plantIds: run.plantIds })
  runOpen.value = false
}
async function deleteRun() {
  if (!run.id) return
  const ok = await confirm({ title: t('manage.costs.deleteRun', { name: run.name }), message: t('manage.costs.deleteRunText'), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  c.deleteRun(run.id)
  runOpen.value = false
}
const watts = computed(() => lightWatts(costs.value.devices))
</script>

<template>
  <div>
    <AppHeader
      :title="t('manage.costs.title')"
      :subtitle="t('manage.costs.subtitle')"
      back
    />
    <div class="page rise">
      <!-- Summary -->
      <section class="card summary">
        <div>
          <span class="label">{{ t('manage.costs.spent') }}</span>
          <strong class="num big">{{ money(spent) }}</strong>
        </div>
        <div>
          <span class="label">{{ t('manage.costs.runPower') }}</span>
          <strong class="num big">{{ money(runElectricity) }}</strong>
        </div>
      </section>

      <!-- Runs -->
      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('manage.costs.runs') }}
          </h2>
          <button
            type="button"
            class="link"
            @click="openRun()"
          >
            {{ t('manage.costs.addRun') }}
          </button>
        </div>
        <EmptyState
          v-if="!c.totals.value.length"
          icon="harvest"
          :title="t('manage.costs.noRunsTitle')"
          :text="t('manage.costs.noRunsText')"
        >
          <button
            type="button"
            class="btn btn-soft empty-btn"
            :disabled="!grow.state.plants.length"
            @click="openRun()"
          >
            {{ t('manage.costs.addRun') }}
          </button>
        </EmptyState>
        <div
          v-else
          class="runs"
        >
          <article
            v-for="r in c.totals.value"
            :key="r.run.id"
            class="card run"
          >
            <div class="run-head">
              <div class="run-title">
                <strong>{{ r.run.name }}</strong>
                <span>{{ r.plants.map(p => p.name).join(', ') || t('manage.costs.noPlants') }}</span>
              </div>
              <button
                type="button"
                class="icon-btn"
                :aria-label="t('manage.costs.editRun', { name: r.run.name })"
                @click="openRun(r.run.id)"
              >
                <UIcon
                  name="i-tabler-pencil"
                  class="size-5"
                />
              </button>
            </div>
            <dl class="metrics">
              <div>
                <dt>{{ t('manage.costs.total') }}</dt>
                <dd class="num">
                  {{ money(r.total) }}
                </dd>
              </div>
              <div>
                <dt>{{ t('manage.costs.electricity') }}</dt>
                <dd class="num">
                  {{ money(r.electricity) }}<small>{{ formatKwh(r.kwh) }}</small>
                </dd>
              </div>
              <div>
                <dt>{{ t('manage.costs.perGram') }}</dt>
                <dd class="num lamp">
                  {{ r.costPerGram != null ? money(r.costPerGram, 2) : '–' }}<small v-if="r.dryGrams">{{ formatNumber(r.dryGrams, 0) }} g{{ r.complete ? '' : ` · ${t('manage.costs.partial')}` }}</small>
                </dd>
              </div>
              <div>
                <dt>{{ t('manage.costs.gramsPerWatt') }}</dt>
                <dd class="num">
                  {{ r.gramsPerWatt != null ? formatNumber(r.gramsPerWatt, 2) : '–' }}<small v-if="watts">{{ watts }} W</small>
                </dd>
              </div>
            </dl>
            <p
              v-if="r.period"
              class="run-meta num"
            >
              {{ t('manage.costs.period', { veg: r.period.vegDays, flower: r.period.flowerDays }) }} · {{ t('manage.costs.expensesN', { n: money(r.expenses) }) }}
            </p>
            <button
              type="button"
              class="btn btn-soft compact"
              @click="openExpense(undefined, r.run.id)"
            >
              <UIcon
                name="i-tabler-plus"
                class="size-4"
              /> {{ t('manage.costs.addExpense') }}
            </button>
          </article>
        </div>
      </section>

      <!-- Electricity -->
      <section>
        <div class="section-head">
          <h2 class="section-title">
            <GrowIcon
              name="lamp"
              class="lamp"
            /> {{ t('manage.costs.power') }}
          </h2>
        </div>
        <div class="card pad form-stack">
          <div class="form-grid">
            <div class="field">
              <span class="field-label">{{ t('manage.costs.currency') }}</span>
              <div
                class="segmented"
                role="group"
                :aria-label="t('manage.costs.currency')"
              >
                <button
                  v-for="cc in (['CZK', 'EUR'] as const)"
                  :key="cc"
                  type="button"
                  :aria-pressed="cur === cc"
                  @click="setCurrency(cc)"
                >
                  {{ cc === 'CZK' ? 'Kč' : '€' }}
                </button>
              </div>
            </div>
            <div class="field">
              <label
                class="field-label"
                for="c-price"
              >{{ t('manage.costs.price') }}</label>
              <div class="unit-field">
                <input
                  id="c-price"
                  v-model.number="price"
                  class="input num"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                >
                <span aria-hidden="true">{{ cur === 'CZK' ? 'Kč' : '€' }}</span>
              </div>
            </div>
          </div>
          <p class="field-hint">
            {{ t('manage.costs.priceHint') }}
          </p>
        </div>

        <div class="card list devices">
          <button
            v-for="d in costs.devices"
            :key="d.id"
            type="button"
            class="row"
            @click="openDevice(d)"
          >
            <span
              class="row-tile"
              :class="d.kind"
            ><GrowIcon :name="d.kind === 'light' ? 'lamp' : 'i-tabler-propeller'" /></span>
            <span class="row-text">
              <strong>{{ d.name }}</strong>
              <span class="num">{{ d.watts }} W · {{ d.hoursVeg === d.hoursFlower ? t('manage.costs.hoursSame', { h: d.hoursVeg }) : t('manage.costs.hoursBoth', { veg: d.hoursVeg, flower: d.hoursFlower }) }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 go"
            />
          </button>
          <button
            type="button"
            class="row add-row"
            @click="openDevice()"
          >
            <UIcon
              name="i-tabler-plus"
              class="size-5"
            /> {{ t('manage.costs.addDevice') }}
          </button>
        </div>
        <div
          v-if="costs.devices.length"
          class="card month"
        >
          <div>
            <span class="label">{{ t('manage.costs.monthVeg') }}</span>
            <strong class="num">{{ money(month.veg * costs.kwhPrice) }}</strong>
            <small class="num">{{ formatKwh(month.veg) }}</small>
          </div>
          <div>
            <span class="label">{{ t('manage.costs.monthFlower') }}</span>
            <strong class="num">{{ money(month.flower * costs.kwhPrice) }}</strong>
            <small class="num">{{ formatKwh(month.flower) }}</small>
          </div>
        </div>
      </section>

      <!-- Calculator -->
      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('manage.costs.calc') }}
          </h2>
        </div>
        <div class="card pad form-stack">
          <div class="calc">
            <div class="field">
              <label
                class="field-label"
                for="calc-w"
              >{{ t('manage.costs.watts') }}</label>
              <input
                id="calc-w"
                v-model.number="calcW"
                class="input num"
                type="number"
                inputmode="numeric"
                min="0"
              >
            </div>
            <div class="field">
              <label
                class="field-label"
                for="calc-h"
              >{{ t('manage.costs.hoursDay') }}</label>
              <input
                id="calc-h"
                v-model.number="calcH"
                class="input num"
                type="number"
                inputmode="decimal"
                min="0"
                max="24"
              >
            </div>
            <div class="field">
              <label
                class="field-label"
                for="calc-d"
              >{{ t('manage.costs.days') }}</label>
              <input
                id="calc-d"
                v-model.number="calcD"
                class="input num"
                type="number"
                inputmode="numeric"
                min="0"
              >
            </div>
          </div>
          <p
            class="calc-result"
            aria-live="polite"
          >
            <strong class="num">{{ money(calcKwh * costs.kwhPrice) }}</strong>
            <span class="num">{{ formatKwh(calcKwh) }} · {{ t('manage.costs.atPrice', { p: money(costs.kwhPrice, 2) }) }}</span>
          </p>
        </div>
      </section>

      <!-- Expenses -->
      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('manage.costs.expenses') }}
          </h2>
          <button
            type="button"
            class="link"
            @click="openExpense()"
          >
            {{ t('manage.costs.addExpense') }}
          </button>
        </div>
        <EmptyState
          v-if="!sortedExpenses.length"
          icon="note"
          :title="t('manage.costs.noExpensesTitle')"
          :text="t('manage.costs.noExpensesText')"
        />
        <div
          v-else
          class="card list"
        >
          <button
            v-for="e in visibleExpenses"
            :key="e.id"
            type="button"
            class="row"
            @click="openExpense(e)"
          >
            <span class="row-tile"><GrowIcon :name="CAT_ICON[e.category]" /></span>
            <span class="row-text">
              <strong>{{ e.title }}</strong>
              <span>{{ formatDate(e.date) }} · {{ runName(e.runId) }}</span>
            </span>
            <span class="amount num">{{ money(e.amount) }}</span>
          </button>
          <button
            v-if="sortedExpenses.length > 8"
            type="button"
            class="more-row"
            @click="showAll = !showAll"
          >
            {{ showAll ? t('manage.less') : t('manage.moreN', { n: sortedExpenses.length - 8 }) }}
          </button>
        </div>
      </section>
    </div>

    <!-- Device sheet -->
    <BottomSheet
      v-model:open="deviceOpen"
      :title="device.id ? t('manage.costs.editDevice') : t('manage.costs.addDevice')"
      icon-color="var(--amber)"
    >
      <template #icon>
        <GrowIcon name="lamp" />
      </template>
      <form
        class="form-stack"
        novalidate
        @submit.prevent="saveDevice"
      >
        <div
          class="segmented"
          role="group"
          :aria-label="t('manage.costs.kind')"
        >
          <button
            v-for="k in (['light', 'other'] as const)"
            :key="k"
            type="button"
            :aria-pressed="device.kind === k"
            @click="onKind(k)"
          >
            {{ t(`manage.costs.kinds.${k}`) }}
          </button>
        </div>
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="d-name"
            >{{ t('manage.costs.deviceName') }}</label>
            <input
              id="d-name"
              v-model="device.name"
              class="input"
              maxlength="60"
              :class="{ invalid: deviceSubmitted && !device.name.trim() }"
              :placeholder="device.kind === 'light' ? 'LED 240 W' : t('manage.costs.fanPlaceholder')"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="d-watts"
            >{{ t('manage.costs.watts') }}</label>
            <input
              id="d-watts"
              v-model.number="device.watts"
              class="input num"
              :class="{ invalid: deviceSubmitted && !(Number(device.watts) > 0) }"
              type="number"
              inputmode="numeric"
              min="1"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="d-hv"
            >{{ t('manage.costs.hoursVeg') }}</label>
            <input
              id="d-hv"
              v-model.number="device.hoursVeg"
              class="input num"
              type="number"
              inputmode="decimal"
              min="0"
              max="24"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="d-hf"
            >{{ t('manage.costs.hoursFlower') }}</label>
            <input
              id="d-hf"
              v-model.number="device.hoursFlower"
              class="input num"
              type="number"
              inputmode="decimal"
              min="0"
              max="24"
            >
          </div>
        </div>
        <p class="field-hint">
          {{ t('manage.costs.deviceHint') }}
        </p>
        <span
          v-if="deviceSubmitted && !deviceValid"
          class="field-error"
        >{{ t('manage.costs.deviceError') }}</span>
        <button
          v-if="device.id"
          type="button"
          class="btn btn-danger"
          @click="deleteDevice"
        >
          {{ t('common.delete') }}
        </button>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="deviceOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveDevice"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>

    <!-- Expense sheet -->
    <BottomSheet
      v-model:open="expenseOpen"
      :title="expense.id ? t('manage.costs.editExpense') : t('manage.costs.addExpense')"
    >
      <template #icon>
        <GrowIcon :name="CAT_ICON[expense.category]" />
      </template>
      <form
        class="form-stack"
        novalidate
        @submit.prevent="saveExpense"
      >
        <div class="field">
          <span class="field-label">{{ t('manage.costs.category') }}</span>
          <div class="pick-list">
            <button
              v-for="cat in EXPENSE_CATEGORIES"
              :key="cat"
              type="button"
              class="chip"
              :aria-pressed="expense.category === cat"
              @click="expense.category = cat"
            >
              {{ t(`manage.costs.cats.${cat}`) }}
            </button>
          </div>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="e-title"
          >{{ t('manage.costs.what') }}</label>
          <input
            id="e-title"
            v-model="expense.title"
            class="input"
            maxlength="80"
            :class="{ invalid: expenseSubmitted && !expense.title.trim() }"
            :placeholder="t(`manage.costs.placeholders.${expense.category}`)"
          >
        </div>
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="e-amount"
            >{{ t('manage.costs.amount') }}</label>
            <div class="unit-field">
              <input
                id="e-amount"
                v-model.number="expense.amount"
                class="input num"
                :class="{ invalid: expenseSubmitted && !(Number(expense.amount) >= 0 && expense.amount !== '') }"
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
              >
              <span aria-hidden="true">{{ cur === 'CZK' ? 'Kč' : '€' }}</span>
            </div>
          </div>
          <div class="field">
            <label
              class="field-label"
              for="e-date"
            >{{ t('manage.costs.date') }}</label>
            <input
              id="e-date"
              v-model="expense.date"
              class="input"
              type="date"
            >
          </div>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="e-run"
          >{{ t('manage.costs.run') }}</label>
          <select
            id="e-run"
            v-model="expense.runId"
            class="input"
          >
            <option value="">
              {{ t('manage.costs.general') }}
            </option>
            <option
              v-for="r in costs.runs"
              :key="r.id"
              :value="r.id"
            >
              {{ r.name }}
            </option>
          </select>
          <span class="field-hint">{{ t('manage.costs.runHint') }}</span>
        </div>
        <span
          v-if="expenseSubmitted && !expenseValid"
          class="field-error"
        >{{ t('manage.costs.expenseError') }}</span>
        <button
          v-if="expense.id"
          type="button"
          class="btn btn-danger"
          @click="deleteExpense"
        >
          {{ t('common.delete') }}
        </button>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="expenseOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveExpense"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>

    <!-- Run sheet -->
    <BottomSheet
      v-model:open="runOpen"
      :title="run.id ? t('manage.costs.editRunTitle') : t('manage.costs.addRun')"
      icon-color="var(--amber)"
    >
      <template #icon>
        <GrowIcon name="harvest" />
      </template>
      <form
        class="form-stack"
        novalidate
        @submit.prevent="saveRun"
      >
        <div class="field">
          <label
            class="field-label"
            for="r-name"
          >{{ t('manage.costs.runName') }}</label>
          <input
            id="r-name"
            v-model="run.name"
            class="input"
            maxlength="60"
            :class="{ invalid: runSubmitted && !run.name.trim() }"
          >
        </div>
        <div class="field">
          <span
            id="r-plants"
            class="field-label"
          >{{ t('manage.costs.runPlants') }}</span>
          <div
            class="pick-list"
            role="group"
            aria-labelledby="r-plants"
          >
            <button
              v-for="p in runPlants"
              :key="p.id"
              type="button"
              class="chip"
              :aria-pressed="run.plantIds.includes(p.id)"
              @click="toggleRunPlant(p.id)"
            >
              {{ p.name }}
            </button>
          </div>
          <span class="field-hint">{{ t('manage.costs.runPlantsHint') }}</span>
          <span
            v-if="runSubmitted && !run.plantIds.length"
            class="field-error"
          >{{ t('manage.costs.runPlantsError') }}</span>
        </div>
        <button
          v-if="run.id"
          type="button"
          class="btn btn-danger"
          @click="deleteRun"
        >
          {{ t('common.delete') }}
        </button>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="runOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveRun"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
.pad {
  padding: 16px;
}

.label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.summary,
.month {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.summary > div,
.month > div {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.summary > div + div,
.month > div + div {
  border-left: 1px solid var(--line);
}

.big {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.month strong {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.15;
}

.month small {
  font-size: 12px;
  color: var(--text-3);
}

.month {
  margin-top: 10px;
}

.runs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.run {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.run-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.run-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: var(--text-2);
}

.run-title strong {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.metrics {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metrics div {
  min-width: 0;
}

.metrics dt {
  font-size: 12px;
  color: var(--text-3);
}

.metrics dd {
  margin: 2px 0 0;
  display: flex;
  flex-direction: column;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.15;
}

.metrics small {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-3);
}

.lamp {
  color: var(--amber);
}

.run-meta {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.compact {
  min-height: 40px;
  font-size: 14px;
}

.empty-btn {
  margin-top: 10px;
}

.unit-field {
  position: relative;
}

.unit-field .input {
  padding-right: 40px;
}

.unit-field span {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--text-3);
  pointer-events: none;
}

.list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.devices {
  margin-top: 10px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 10px 12px 10px 14px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  width: 100%;
}

.row + .row,
.more-row {
  border-top: 1px solid var(--line);
}

.row:active {
  background: var(--surface-2);
}

.row-tile {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 22px;
}

.row-tile.light {
  background: var(--lamp-soft);
  color: var(--amber);
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: var(--text-2);
}

.row-text strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.go {
  color: var(--text-3);
}

.add-row {
  color: var(--green);
  font-size: 15px;
  font-weight: 600;
  min-height: 52px;
}

.more-row {
  min-height: 44px;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.calc {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.calc-result {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.calc-result strong {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
}

.calc-result span {
  font-size: 13px;
  color: var(--text-3);
}

.pick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
