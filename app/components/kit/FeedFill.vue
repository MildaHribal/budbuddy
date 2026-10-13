<script setup lang="ts">
import type { FeedLine } from '~/types/kit'
import { feedLinesText, scheduleTitle } from '~/utils/feeding'

const lines = defineModel<FeedLine[] | null>('lines', { required: true })
const nutrients = defineModel<string>('nutrients', { required: true })
const props = defineProps<{
  plantId: string
  date: string
  amountMl: number | null
}>()

const { t } = useI18n()
const grow = useGrow()
const feeding = useFeeding()
const inventory = useInventory()

const plant = computed(() => grow.getPlant(props.plantId))
const info = computed(() => (plant.value ? feeding.feedingFor(plant.value, props.date) : null))
const planLines = computed(() => (plant.value ? feeding.planLines(plant.value, props.date) : []))
const planText = computed(() => feedLinesText(planLines.value))
const stock = computed(() => inventory.inv.value.nutrients)
// lines only count while the text field still says the same
const active = computed(() => !!lines.value?.length && feedLinesText(lines.value) === nutrients.value.trim())
const weekText = computed(() => {
  const c = info.value?.current
  return c ? feedWeekLabel(c.week.phase, c.week.n) : ''
})

function usePlan() {
  lines.value = planLines.value.map(l => ({ ...l }))
  nutrients.value = planText.value
}

function setStock(i: number, id: string) {
  if (!lines.value) return
  lines.value = lines.value.map((l, j) => (j === i ? { ...l, stockId: id || null } : l))
}

const total = (dose: number) => (props.amountMl && props.amountMl > 0 ? Math.round(dose * props.amountMl / 100) / 10 : null)
const bottle = (id: string | null | undefined) => stock.value.find(s => s.id === id)
</script>

<template>
  <div
    v-if="info || active"
    class="feed-fill"
  >
    <div
      v-if="info"
      class="ff-plan"
    >
      <GrowIcon
        name="feed"
        class="ff-icon"
      />
      <span class="ff-text">
        <strong>{{ scheduleTitle(info.schedule) }}</strong>
        <span v-if="info.current">{{ weekText }} · {{ info.plan.strength }} %</span>
        <span v-else>{{ t('kit.fill.noWeek') }}</span>
      </span>
      <button
        v-if="planLines.length && nutrients.trim() !== planText"
        type="button"
        class="link"
        @click="usePlan"
      >
        {{ t('kit.fill.use') }}
      </button>
    </div>
    <ul
      v-if="active && lines"
      class="ff-lines"
    >
      <li
        v-for="(l, i) in lines"
        :key="l.name"
      >
        <span class="ff-name">{{ l.name }}</span>
        <span class="ff-dose num">
          {{ formatNumber(l.dose, 2) }} {{ l.unit === 'g' ? 'g' : 'ml' }}/L<template v-if="total(l.dose) !== null"> · {{ formatNumber(total(l.dose), 1) }} {{ l.unit === 'g' ? 'g' : 'ml' }}</template>
        </span>
        <select
          v-if="stock.length && l.unit !== 'g'"
          class="input ff-stock"
          :value="l.stockId ?? ''"
          :aria-label="t('kit.fill.bottleFor', { name: l.name })"
          @change="setStock(i, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">
            {{ t('kit.fill.noBottle') }}
          </option>
          <option
            v-for="s in stock"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }} ({{ formatNumber(inventory.left(s), 0) }} ml)
          </option>
        </select>
        <span
          v-else-if="bottle(l.stockId)"
          class="ff-hint"
        >{{ bottle(l.stockId)!.name }}</span>
      </li>
    </ul>
    <p
      v-if="active && stock.length && !amountMl"
      class="ff-hint"
    >
      {{ t('kit.fill.amountHint') }}
    </p>
  </div>
  <NuxtLink
    v-else-if="plant && !lines?.length"
    :to="{ path: '/feeding', query: { plant: plantId } }"
    class="link ff-assign"
  >
    {{ t('kit.fill.assign') }}
  </NuxtLink>
</template>

<style scoped>
.feed-fill {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface);
}

.ff-plan {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ff-icon {
  flex-shrink: 0;
  font-size: 20px;
  color: #b58cf5;
}

.ff-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: var(--text-2);
}

.ff-text strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.ff-lines {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.ff-lines li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 8px;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
}

.ff-lines li + li {
  border-top: 1px solid var(--line);
}

.ff-name {
  font-weight: 600;
}

.ff-dose {
  color: var(--text-2);
  text-align: right;
}

.ff-stock {
  grid-column: 1 / -1;
  min-height: 40px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.ff-hint {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.ff-assign {
  align-self: flex-start;
}
</style>
