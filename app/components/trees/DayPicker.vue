<template>
  <div>
    <section class="mb-4">
      <div class="topbar-ionic">
        <div class="row overflow-x-auto -mx-2 touch-pan-x">
          <div
            v-for="(d, i) in weekDays"
            :key="i"
            class="flex-none w-12 text-center px-1"
          >
            <button
              @click="selectDay(i)"
              :aria-pressed="selectedIndex === i"
              class="w-full flex flex-col items-center gap-1 p-2 rounded-lg"
            >
              <span class="text-xs text-gray-400">{{ d.weekday }}</span>
              <span
                :class="[
                   'w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium',
                   selectedIndex === i ? 'bg-[color:var(--accent)] text-white shadow' : 'bg-transparent text-white/80 border border-white/5'
                 ]"
              >
                 {{ d.date }}
               </span>
            </button>
          </div>
        </div>
      </div>
    </section>


  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits(['update:date'])

const selectedIndex = ref(0)

function startOfWeek(date: Date) {
  // Week starting on Monday
  const d = new Date(date)
  const day = d.getDay() || 7
  const diff = d.getDate() - day + 1
  return new Date(d.setDate(diff))
}

function makeWeekDates(base = new Date()) {
  const monday = startOfWeek(base)
  const arr = [] as { date: number; weekday: string; iso: string }[]
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    const weekday = dt.toLocaleDateString('cs-CZ', { weekday: 'short' })
    arr.push({ date: dt.getDate(), weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), iso: dt.toISOString().slice(0, 10) })
  }
  return arr
}

const weekDays = computed(() => makeWeekDates(new Date()))

// set selectedIndex to today's position in week
const todayIso = new Date().toISOString().slice(0, 10)
const idx = weekDays.value.findIndex(w => w.iso === todayIso)
if (idx >= 0) selectedIndex.value = idx

function selectDay(i: number) {
  const day = weekDays.value[i]
  if (!day) return
  selectedIndex.value = i
  emit('update:date', day.iso)
}
</script>

<style scoped>
.topbar-ionic {
  background-color: #202123;
  color: var(--accent, #7bc74d);
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: calc(6px + var(--ion-safe-area-top)) 12px 8px 12px;
}

.topbar-ionic .text-xs { color: #d1d5db; }

@media (min-width: 768px) {
  .topbar-ionic { display: none; }
  .topbar-spacer { display: none; }
}
</style>
