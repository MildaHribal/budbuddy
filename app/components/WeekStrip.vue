<script setup lang="ts">
const selected = defineModel<string>({ required: true })
const props = defineProps<{
  /** dates (YYYY-MM-DD) that have at least one entry */
  marked?: Set<string>
}>()

const { t } = useI18n()
const today = todayISO()
const days = computed(() => weekOf(selected.value))
const monthLabel = computed(() => {
  const first = days.value[0]!
  const last = days.value[6]!
  const a = formatDate(first, { month: 'short' })
  const b = formatDate(last, { month: 'short', year: 'numeric' })
  return a === formatDate(last, { month: 'short' }) ? b : `${a} – ${b}`
})

function shift(weeks: number) {
  selected.value = addDays(selected.value, weeks * 7)
}

function dayLabel(d: string) {
  const base = formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' })
  const parts = [base]
  if (d === today) parts.push(t('plant.week.today'))
  if (props.marked?.has(d)) parts.push(t('plant.week.hasEntries'))
  return parts.join(', ')
}
</script>

<template>
  <div class="week">
    <div class="week-head">
      <button
        type="button"
        class="nav-btn"
        :aria-label="t('plant.week.prev')"
        @click="shift(-1)"
      >
        <UIcon
          name="i-tabler-chevron-left"
          class="size-5"
        />
      </button>
      <span class="week-label">{{ monthLabel }}</span>
      <button
        v-if="selected !== today"
        type="button"
        class="today-btn"
        @click="selected = today"
      >
        {{ t('common.today') }}
      </button>
      <button
        type="button"
        class="nav-btn"
        :aria-label="t('plant.week.next')"
        @click="shift(1)"
      >
        <UIcon
          name="i-tabler-chevron-right"
          class="size-5"
        />
      </button>
    </div>
    <div
      class="week-days"
      role="group"
      :aria-label="t('plant.week.pick')"
    >
      <button
        v-for="d in days"
        :key="d"
        type="button"
        class="day"
        :class="{ active: d === selected, today: d === today, future: d > today, marked: props.marked?.has(d) }"
        :aria-pressed="d === selected"
        :aria-label="dayLabel(d)"
        @click="selected = d"
      >
        <span class="day-name">{{ weekdayShort(d).slice(0, 2) }}</span>
        <span class="day-num num">{{ Number(d.slice(8)) }}</span>
        <span
          class="dot"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.week {
  padding: 6px 8px 10px;
}

.week-head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.nav-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-2);
  transition: transform var(--dur-fast) var(--ease-out), color var(--dur) ease;
}

.nav-btn:active {
  transform: scale(0.9);
  color: var(--text);
}

.week-label {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.today-btn {
  min-height: 44px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: var(--green);
  font-size: 13px;
  font-weight: 600;
}

.week-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 60px;
  padding: 8px 0 6px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-3);
  transition: background var(--dur) ease, color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.day:active {
  transform: scale(0.94);
}

.day-name {
  font-size: 11px;
  font-weight: 500;
}

.day-num {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-2);
}

.day.future .day-num {
  color: var(--text-3);
}

.day.marked .day-num {
  color: var(--text);
}

/* a dot under days that have entries */
.dot {
  width: 5px;
  height: 5px;
  margin-top: 2px;
  border-radius: 50%;
  background: var(--green);
  opacity: 0;
}

.day.marked .dot {
  opacity: 1;
}

.day.today .day-name {
  color: var(--green);
  font-weight: 600;
}

.day.active {
  background: var(--surface-3);
}

.day.active .day-num {
  color: var(--text);
}

.day.active .day-name {
  color: var(--text-2);
}

.day.active.today .day-name {
  color: var(--green);
}
</style>
