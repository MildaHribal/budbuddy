<script setup lang="ts">
const selected = defineModel<string>({ required: true })
const props = defineProps<{
  /** dates (YYYY-MM-DD) that have at least one entry */
  marked?: Set<string>
}>()

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
</script>

<template>
  <div class="week">
    <div class="week-head">
      <button
        type="button"
        class="icon-btn"
        aria-label="Previous week"
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
        Today
      </button>
      <button
        type="button"
        class="icon-btn"
        aria-label="Next week"
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
      aria-label="Pick a day"
    >
      <button
        v-for="d in days"
        :key="d"
        type="button"
        class="day"
        :class="{ active: d === selected, today: d === today, future: d > today }"
        :aria-pressed="d === selected"
        :aria-label="formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' })"
        @click="selected = d"
      >
        <span class="day-name">{{ weekdayShort(d).slice(0, 2) }}</span>
        <span class="day-num">{{ Number(d.slice(8)) }}</span>
        <span
          class="dot"
          :class="{ on: props.marked?.has(d) }"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.week {
  padding: 12px;
}

.week-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.week-head .icon-btn {
  width: 34px;
  height: 34px;
}

.week-label {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
}

.today-btn {
  border: 1px solid var(--accent-line);
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
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
  padding: 8px 0 6px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--text-2);
}

.day.future {
  opacity: 0.55;
}

.day-name {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.day-num {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
}

.day.today .day-num {
  color: var(--accent);
}

.day.active {
  background: var(--accent);
  color: var(--on-accent);
  opacity: 1;
}

.day.active .day-num {
  color: var(--on-accent);
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: transparent;
}

.dot.on {
  background: var(--accent);
}

.day.active .dot.on {
  background: var(--on-accent);
}
</style>
