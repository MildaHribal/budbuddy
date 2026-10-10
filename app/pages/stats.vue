<script setup lang="ts">
import type { EntryType } from '~/types/grow'

useHead({ title: 'Statistics' })

const { state } = useGrow()
const today = todayISO()

const photoCount = computed(() => state.entries.reduce((n, e) => n + e.photoIds.length, 0) + state.plants.filter(p => p.photoId).length)
const waterLitres = computed(() => state.entries
  .filter(e => e.type === 'water' || e.type === 'feed')
  .reduce((s, e) => s + (e.amountMl ?? 0), 0) / 1000)

// ── Activity chart ────────────────────────────────────────────────
type Range = 'week' | 'weeks'
const range = ref<Range>('week')

const bars = computed(() => {
  if (range.value === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6)
      const value = state.entries.filter(e => e.date === d).length
      return { label: weekdayShort(d).slice(0, 2), value, hint: formatDate(d, { day: 'numeric', month: 'short' }), highlight: d === today }
    })
  }
  const thisMonday = weekOf(today)[0]!
  return Array.from({ length: 8 }, (_, i) => {
    const start = addDays(thisMonday, (i - 7) * 7)
    const end = addDays(start, 6)
    const value = state.entries.filter(e => e.date >= start && e.date <= end).length
    return { label: formatDate(start, { day: 'numeric', month: 'numeric' }), value, hint: `Week of ${formatDate(start, { day: 'numeric', month: 'short' })}`, highlight: i === 7 }
  })
})
const rangeTotal = computed(() => bars.value.reduce((s, b) => s + b.value, 0))

// ── By type ───────────────────────────────────────────────────────
const byType = computed(() => {
  const counts = new Map<EntryType, number>()
  for (const e of state.entries) counts.set(e.type, (counts.get(e.type) ?? 0) + 1)
  const max = Math.max(1, ...counts.values())
  return ENTRY_TYPES
    .filter(t => counts.get(t.type))
    .map(t => ({ ...t, count: counts.get(t.type)!, pct: (counts.get(t.type)! / max) * 100 }))
    .sort((a, b) => b.count - a.count)
})

// ── Streak ────────────────────────────────────────────────────────
const streak = computed(() => {
  const days = new Set(state.entries.map(e => e.date))
  let d = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
})

// ── Harvests ──────────────────────────────────────────────────────
const harvests = computed(() => state.plants
  .filter(p => p.harvest)
  .map(p => ({
    plant: p,
    harvest: p.harvest!,
    days: daysBetween(p.startDate, p.harvest!.date)
  }))
  .sort((a, b) => b.harvest.date.localeCompare(a.harvest.date)))

const dryTotal = computed(() => harvests.value.reduce((s, h) => s + (h.harvest.dryWeight ?? 0), 0))
const withDry = computed(() => harvests.value.filter(h => h.harvest.dryWeight))
const avgDry = computed(() => (withDry.value.length ? dryTotal.value / withDry.value.length : 0))
const avgDays = computed(() => (harvests.value.length ? harvests.value.reduce((s, h) => s + h.days, 0) / harvests.value.length : 0))
const maxDry = computed(() => Math.max(1, ...withDry.value.map(h => h.harvest.dryWeight!)))

// ── Strains ───────────────────────────────────────────────────────
const strains = computed(() => {
  const map = new Map<string, { name: string, plants: number, dry: number }>()
  for (const p of state.plants) {
    const key = (p.strain || 'Unknown').trim()
    const s = map.get(key.toLowerCase()) ?? { name: key, plants: 0, dry: 0 }
    s.plants++
    s.dry += p.harvest?.dryWeight ?? 0
    map.set(key.toLowerCase(), s)
  }
  return [...map.values()].sort((a, b) => b.dry - a.dry || b.plants - a.plants)
})

// ── Achievements ──────────────────────────────────────────────────
const achievements = computed(() => {
  const count = (t: EntryType) => state.entries.filter(e => e.type === t).length
  return [
    { icon: 'i-tabler-seeding', title: 'First seed', text: 'Add a plant', done: state.plants.length >= 1 },
    { icon: 'i-tabler-flame', title: 'On fire', text: '7-day logging streak', done: streak.value >= 7 },
    { icon: 'i-tabler-notebook', title: 'Diarist', text: '50 journal entries', done: state.entries.length >= 50 },
    { icon: 'i-tabler-camera', title: 'Photographer', text: '10 photos', done: photoCount.value >= 10 },
    { icon: 'i-tabler-scissors', title: 'Trainer', text: '5 training sessions', done: count('train') >= 5 },
    { icon: 'i-tabler-plant-2', title: 'Gardener', text: '5 plants', done: state.plants.length >= 5 },
    { icon: 'i-tabler-basket', title: 'First harvest', text: 'Harvest a plant', done: harvests.value.length >= 1 },
    { icon: 'i-tabler-trophy', title: 'Heavy hitter', text: '100 g dry in total', done: dryTotal.value >= 100 }
  ]
})
const unlocked = computed(() => achievements.value.filter(a => a.done).length)
</script>

<template>
  <div>
    <AppHeader
      title="Statistics"
      subtitle="Your garden in numbers"
      back
    />
    <div class="page">
      <section class="tiles">
        <div class="tile card">
          <UIcon
            name="i-tabler-plant-2"
            class="size-6"
            style="color: #7bc74d"
          />
          <strong>{{ state.plants.length }}</strong>
          <span>Plants · {{ state.plants.filter(p => p.archived).length }} archived</span>
        </div>
        <div class="tile card">
          <UIcon
            name="i-tabler-notebook"
            class="size-6"
            style="color: #4fc3f7"
          />
          <strong>{{ state.entries.length }}</strong>
          <span>Journal entries</span>
        </div>
        <div class="tile card">
          <UIcon
            name="i-tabler-droplet-filled"
            class="size-6"
            style="color: #4fc3f7"
          />
          <strong>{{ round(waterLitres, 1) }} L</strong>
          <span>Water &amp; feed given</span>
        </div>
        <div class="tile card">
          <UIcon
            name="i-tabler-flame"
            class="size-6"
            style="color: #fb923c"
          />
          <strong>{{ streak }} day{{ streak === 1 ? '' : 's' }}</strong>
          <span>Logging streak</span>
        </div>
      </section>

      <section class="card block">
        <div class="section-head">
          <h2 class="section-title">
            <UIcon
              name="i-tabler-chart-bar"
              class="size-5"
            /> Activity
          </h2>
          <div class="segmented small">
            <button
              type="button"
              :aria-pressed="range === 'week'"
              @click="range = 'week'"
            >
              7 days
            </button>
            <button
              type="button"
              :aria-pressed="range === 'weeks'"
              @click="range = 'weeks'"
            >
              8 weeks
            </button>
          </div>
        </div>
        <p class="muted chart-sub">
          {{ rangeTotal }} entr{{ rangeTotal === 1 ? 'y' : 'ies' }} logged
        </p>
        <BarChart
          :bars="bars"
          :label="`Journal entries per ${range === 'week' ? 'day, last 7 days' : 'week, last 8 weeks'}: ${rangeTotal} in total`"
        />
      </section>

      <section
        v-if="byType.length"
        class="card block"
      >
        <h2 class="section-title block-title">
          <UIcon
            name="i-tabler-list-details"
            class="size-5"
          /> What you log
        </h2>
        <ul class="types">
          <li
            v-for="t in byType"
            :key="t.type"
          >
            <span class="type-name"><UIcon
              :name="t.icon"
              class="size-4"
              :style="{ color: t.color }"
            /> {{ t.label }}</span>
            <span class="type-bar"><span :style="{ width: `${t.pct}%`, background: t.color }" /></span>
            <span class="type-count">{{ t.count }}</span>
          </li>
        </ul>
      </section>

      <section class="card block">
        <h2 class="section-title block-title">
          <UIcon
            name="i-tabler-basket"
            class="size-5"
          /> Harvests
        </h2>
        <EmptyState
          v-if="!harvests.length"
          icon="i-tabler-basket-off"
          title="No harvests yet"
          text="When a flowering plant is ready, open it and tap Harvest."
        />
        <template v-else>
          <div class="harvest-sum">
            <div><strong>{{ round(dryTotal, 0) }} g</strong><span>Dry total</span></div>
            <div><strong>{{ round(avgDry, 0) }} g</strong><span>Avg / plant</span></div>
            <div><strong>{{ round(avgDays, 0) }} d</strong><span>Seed to chop</span></div>
          </div>
          <ul class="harvest-list">
            <li
              v-for="h in harvests"
              :key="h.plant.id"
            >
              <NuxtLink
                :to="`/plants/${h.plant.id}`"
                class="harvest-row"
              >
                <span class="harvest-name">
                  <strong>{{ h.plant.name }}</strong>
                  <span>{{ formatDate(h.harvest.date) }} · {{ h.days }} days</span>
                </span>
                <span class="harvest-bar"><span :style="{ width: `${((h.harvest.dryWeight ?? 0) / maxDry) * 100}%` }" /></span>
                <span class="harvest-weight">{{ h.harvest.dryWeight != null ? `${h.harvest.dryWeight} g` : 'drying' }}</span>
              </NuxtLink>
            </li>
          </ul>
        </template>
      </section>

      <section
        v-if="strains.length"
        class="card block"
      >
        <h2 class="section-title block-title">
          <UIcon
            name="i-tabler-dna"
            class="size-5"
          /> Strains
        </h2>
        <table class="strains">
          <thead>
            <tr><th>Strain</th><th>Plants</th><th>Dry yield</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="s in strains"
              :key="s.name"
            >
              <td>{{ s.name }}</td>
              <td>{{ s.plants }}</td>
              <td>{{ s.dry ? `${round(s.dry, 0)} g` : '–' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            <UIcon
              name="i-tabler-award"
              class="size-5"
            /> Achievements
          </h2>
          <span class="muted">{{ unlocked }}/{{ achievements.length }}</span>
        </div>
        <div class="achievements">
          <div
            v-for="a in achievements"
            :key="a.title"
            class="achievement card"
            :class="{ done: a.done }"
          >
            <UIcon
              :name="a.done ? a.icon : 'i-tabler-lock'"
              class="size-7"
            />
            <strong>{{ a.title }}</strong>
            <span>{{ a.text }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px;
}

.tile strong {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 800;
}

.tile span {
  font-size: 12px;
  color: var(--text-2);
}

.block {
  padding: 16px;
}

.block-title {
  margin-bottom: 12px;
}

.segmented.small {
  padding: 3px;
}

.segmented.small button {
  white-space: nowrap;
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.chart-sub {
  margin: -4px 0 14px;
  font-size: 13px;
}

.types {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.types li {
  display: grid;
  grid-template-columns: 96px 1fr 32px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.type-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.type-bar {
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.type-bar span {
  display: block;
  height: 100%;
  border-radius: 4px;
}

.type-count {
  text-align: right;
  font-weight: 700;
}

.harvest-sum {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.harvest-sum div {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 12px;
  background: rgba(250, 204, 21, 0.07);
  border: 1px solid rgba(250, 204, 21, 0.2);
}

.harvest-sum strong {
  font-size: 18px;
}

.harvest-sum span {
  font-size: 11px;
  color: var(--text-2);
}

.harvest-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.harvest-row {
  display: grid;
  grid-template-columns: 1fr 70px auto;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.harvest-name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.harvest-name strong {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.harvest-name span {
  font-size: 12px;
  color: var(--text-2);
}

.harvest-bar {
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.harvest-bar span {
  display: block;
  height: 100%;
  background: #facc15;
  border-radius: 4px;
}

.harvest-weight {
  font-weight: 700;
  font-size: 14px;
  min-width: 52px;
  text-align: right;
}

.strains {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.strains th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
  padding: 0 0 8px;
}

.strains td {
  padding: 8px 0;
  border-top: 1px solid var(--line);
}

.strains th:not(:first-child),
.strains td:not(:first-child) {
  text-align: right;
}

.achievements {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.achievement {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 10px;
  text-align: center;
  color: var(--text-3);
}

.achievement strong {
  margin-top: 4px;
  font-size: 14px;
  color: var(--text-2);
}

.achievement span {
  font-size: 12px;
}

.achievement.done {
  color: var(--accent);
  border-color: var(--accent-line);
  background: linear-gradient(135deg, var(--accent-soft), var(--surface) 70%);
}

.achievement.done strong {
  color: var(--text);
}

.achievement.done span {
  color: var(--text-2);
}
</style>
