<script setup lang="ts">
import { ref, computed } from 'vue'

// jednoduchá lokální data (budeš to později ukládat do DB nebo Pinia)
const plants = ref([
  { id: 1, name: 'Plant A', strain: 'OG Kush', stage: 'Vegetative', indoor: true },
  { id: 2, name: 'Plant B', strain: 'Blue Dream', stage: 'Seedling', indoor: false }
])

const selectedPlant = ref(null as null | any)

function openPlant(p: any) {
  selectedPlant.value = p
}

function closeDetail() { selectedPlant.value = null }

function addPlant() {
  const id = Date.now()
  plants.value.push({ id, name: `Plant ${plants.value.length + 1}`, strain: 'Unknown', stage: 'Seedling', indoor: true })
}

const selectedDayIndex = ref(new Date().getDay())
const newNotes = ref<string[]>(Array(7).fill(''))

// week days for the mini calendar
const weekDays = computed(() => {
  const start = new Date()
  const days: Array<{date: Date; notes: any[]}> = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() - start.getDay() + i)
    days.push({ date: d, notes: [] as any[] })
  }
  return days
})

function addNoteToDay(day: any, text: string, dayIdx: number) {
  if (!text) return
  day.notes.push({ id: Date.now(), text, createdAt: new Date() })
  newNotes.value[dayIdx] = ''
}
</script>

<template>
  <div class="min-h-screen bg-neutral-900 text-gray-100">
    <div class="max-w-md mx-auto p-4">
      <h1 class="text-2xl font-bold mb-6 text-center tracking-tight">Grow Diary</h1>

      <div class="grid grid-cols-1 gap-4">
        <div v-for="p in plants" :key="p.id" class="bg-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div class="font-semibold text-lg">{{ p.name }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ p.strain }} • {{ p.stage }} • {{ p.indoor ? 'Indoor' : 'Outdoor' }}</div>
          </div>
          <div>
            <button @click="openPlant(p)" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium shadow">Otevřít</button>
          </div>
        </div>
      </div>

      <!-- fullscreen detail overlay -->
      <transition name="fade">
        <div v-if="selectedPlant" class="fixed inset-0 z-50 bg-neutral-900/95 flex flex-col">
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <div>
              <h2 class="text-xl font-bold">{{ selectedPlant.name }}</h2>
              <div class="text-xs text-gray-400 mt-1">{{ selectedPlant.strain }} • {{ selectedPlant.stage }}</div>
            </div>
            <button @click="closeDetail" class="ml-2 text-gray-300 hover:text-green-400 text-3xl font-bold leading-none focus:outline-none" aria-label="Zavřít detail">×</button>
          </div>
          <div class="flex-1 overflow-y-auto px-2 pb-6">
            <h3 class="text-sm text-gray-300 mb-3 mt-2 font-semibold">Týdenní přehled</h3>
            <div class="flex gap-1 justify-between mb-4">
              <button
                v-for="(day, i) in weekDays"
                :key="day.date.toDateString()"
                @click="selectedDayIndex = i"
                :class="[
                  'flex-1 rounded-lg py-2 px-1 text-xs font-medium transition',
                  i === selectedDayIndex ? 'bg-green-600 text-white shadow' : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700',
                  'flex flex-col items-center'
                ]"
              >
                <span>{{ day.date.toLocaleDateString('cs-CZ', { weekday: 'short' }) }}</span>
                <span class="text-[10px] mt-1">{{ day.date.getDate() }}.{{ day.date.getMonth()+1 }}</span>
              </button>
            </div>
            <div v-if="weekDays[selectedDayIndex]" class="bg-neutral-800 rounded-xl p-4 shadow">
              <div class="text-xs text-gray-300 mb-2 flex items-center gap-2">
                <span class="font-semibold text-green-400">{{ weekDays[selectedDayIndex]?.date?.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' }) }}</span>
                <span>•</span>
                <span>{{ weekDays[selectedDayIndex]?.notes?.length }} poznámek</span>
              </div>
              <!-- Rychlé akce -->
              <div class="flex gap-3 mb-4 justify-center">
                <button class="px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold shadow">Water</button>
                <button class="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow">Nutriens</button>
                <button class="px-3 py-1 rounded-lg bg-lime-700 hover:bg-lime-600 text-white font-semibold shadow">Trim</button>
              </div>
              <textarea v-model="newNotes[selectedDayIndex]" placeholder="Poznámka k tomuto dni" class="w-full p-2 rounded bg-neutral-900 text-sm text-gray-100 border border-neutral-700 focus:border-green-500 outline-none transition"></textarea>
              <div class="flex gap-2 mt-2 flex-wrap">
                <button @click="addNoteToDay(weekDays[selectedDayIndex], newNotes[selectedDayIndex] || '', selectedDayIndex)" class="px-3 py-1 bg-green-600 rounded text-sm text-white font-medium shadow">Uložit poznámku</button>
                <button class="px-3 py-1 bg-neutral-700 rounded text-sm text-gray-200">Přidat fotku</button>
              </div>
              <div v-if="weekDays[selectedDayIndex]?.notes?.length" class="mt-4 text-xs text-gray-300 space-y-2">
                <div v-for="n in weekDays[selectedDayIndex]?.notes" :key="n.id" class="border-t border-neutral-700 pt-2">{{ n.text }}</div>
              </div>
            </div>
          </div>
        </div>
      </transition>

    </div>

    <!-- floating add button -->
    <button @click="addPlant" class="fixed right-4 bottom-24 bg-green-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-3xl font-bold">+
    </button>
  </div>
</template>

<style scoped>
textarea { min-height: 64px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
