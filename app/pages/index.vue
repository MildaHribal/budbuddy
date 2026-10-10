<script setup lang="ts">
import type { EntryType, JournalEntry, Plant } from '~/types/grow'

useHead({ title: 'Dashboard' })

const grow = useGrow()
const { state } = grow
const { notify } = useNotify()

const today = useToday()

const greeting = computed(() => {
  const h = new Date().getHours()
  const part = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return state.settings.growerName ? `${part}, ${state.settings.growerName}` : part
})

const growing = computed(() => state.plants.filter(p => isGrowing(p)))
const postHarvest = computed(() => state.plants.filter(p => !p.archived && !isGrowing(p)))
const activePlants = computed(() => [...growing.value, ...postHarvest.value])

const avgHealth = computed(() => {
  const list = growing.value
  if (!list.length) return null
  return list.reduce((s, p) => s + p.health, 0) / list.length
})

const entriesThisWeek = computed(() => {
  const from = addDays(today.value, -6)
  return state.entries.filter(e => e.date >= from && e.date <= today.value).length
})

// ── Tasks ─────────────────────────────────────────────────────────
const todaysTasks = computed(() => state.tasks
  .filter(t => t.date === today.value || (t.date < today.value && !t.done))
  .sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)))
const doneCount = computed(() => todaysTasks.value.filter(t => t.done).length)
const taskPct = computed(() => (todaysTasks.value.length ? Math.round((doneCount.value / todaysTasks.value.length) * 100) : 0))

const adding = ref(false)
const newTask = ref('')
const newTaskPlant = ref<string | null>(null)
const taskInput = ref<HTMLInputElement | null>(null)

async function toggleAdding() {
  adding.value = !adding.value
  if (adding.value) {
    await nextTick()
    taskInput.value?.focus()
  }
}

function addTask() {
  const title = newTask.value.trim()
  if (!title) return
  grow.addTask(title, today.value, newTaskPlant.value)
  newTask.value = ''
  taskInput.value?.focus()
}

function removeTask(id: string) {
  const removed = grow.deleteTask(id)
  if (removed) notify('Task deleted', { tone: 'info', action: { label: 'Undo', run: () => grow.restoreTask(removed) } })
}

const plantName = (id: string | null) => (id ? grow.getPlant(id)?.name : undefined)

// ── Needs attention ───────────────────────────────────────────────
interface Attention {
  plant: Plant
  kind: 'water' | 'stage'
  title: string
  detail: string
  urgent: boolean
}

const attention = computed<Attention[]>(() => {
  const list: Attention[] = []
  for (const p of activePlants.value) {
    const w = grow.wateringStatus(p, today.value)
    if (w && w.dueIn <= 0) {
      list.push({
        plant: p,
        kind: 'water',
        title: `Water ${p.name}`,
        detail: w.dueIn === 0 ? 'Due today' : `Overdue by ${-w.dueIn} day${w.dueIn === -1 ? '' : 's'}`,
        urgent: w.dueIn < 0
      })
    }
    const prog = stageProgress(p, today.value)
    const next = nextStage(p.stage)
    if (isGrowing(p) && prog.dayInStage > prog.stageDays * 1.25 && next) {
      list.push({
        plant: p,
        kind: 'stage',
        title: `${p.name}: ready for ${p.stage === 'flowering' ? 'harvest' : stageInfo(next).label.toLowerCase()}?`,
        detail: `Day ${prog.dayInStage} of ~${prog.stageDays} in ${stageInfo(p.stage).label.toLowerCase()}`,
        urgent: false
      })
    }
  }
  return list.sort((a, b) => Number(b.urgent) - Number(a.urgent))
})

const sheetOpen = ref(false)
const sheetPlant = ref<string>('')
const sheetType = ref<EntryType>('water')

function quickLog(plant: Plant, type: EntryType) {
  sheetPlant.value = plant.id
  sheetType.value = type
  sheetOpen.value = true
}

// ── Recent activity ───────────────────────────────────────────────
const recent = computed<JournalEntry[]>(() => [...state.entries]
  .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  .slice(0, 4))

// ── Tip ───────────────────────────────────────────────────────────
const tips = computed(() => {
  const stages = new Set(activePlants.value.map(p => p.stage))
  const fromStages = STAGES.filter(s => stages.has(s.id)).flatMap(s => s.tips.map(t => ({ stage: s, text: t })))
  return fromStages.length ? fromStages : STAGES.slice(0, 4).flatMap(s => s.tips.map(t => ({ stage: s, text: t })))
})
const tipIndex = ref(Math.floor(Math.random() * 100))
const tip = computed(() => tips.value[tipIndex.value % tips.value.length]!)
</script>

<template>
  <div>
    <section class="hero">
      <div class="hero-glow" />
      <div class="hero-top">
        <p class="hero-greeting">
          <UIcon
            name="i-tabler-leaf"
            class="size-5 leaf"
          />
          {{ greeting }}
        </p>
        <NuxtLink
          to="/settings"
          class="icon-btn"
          aria-label="Settings"
        >
          <UIcon
            name="i-tabler-settings"
            class="size-5"
          />
        </NuxtLink>
      </div>
      <h1 class="hero-day">
        {{ formatDate(today, { weekday: 'long' }) }}
      </h1>
      <p class="hero-date">
        {{ formatDate(today, { day: 'numeric', month: 'long', year: 'numeric' }) }}
      </p>
      <div class="hero-badges">
        <span class="hero-badge green">
          <UIcon
            name="i-tabler-plant-2"
            class="size-4"
          />
          {{ growing.length }} growing
        </span>
        <span
          class="hero-badge"
          :class="todaysTasks.length && taskPct === 100 ? 'gold' : 'neutral'"
        >
          <UIcon
            name="i-tabler-checks"
            class="size-4"
          />
          {{ doneCount }}/{{ todaysTasks.length }} tasks
        </span>
        <span
          v-if="attention.length"
          class="hero-badge warn"
        >
          <UIcon
            name="i-tabler-bell-ringing"
            class="size-4"
          />
          {{ attention.length }} to check
        </span>
      </div>
    </section>

    <div class="page">
      <NuxtLink
        to="/stats"
        class="stats-row"
        aria-label="Open statistics"
      >
        <div class="stat">
          <span
            class="stat-icon"
            style="--c: #7bc74d"
          ><UIcon
            name="i-tabler-plant-2"
            class="size-5"
          /></span>
          <strong>{{ growing.length }}</strong>
          <span>Growing</span>
        </div>
        <div class="stat">
          <span
            class="stat-icon"
            :style="{ '--c': avgHealth ? healthInfo(avgHealth).color : '#7bc74d' }"
          >
            <UIcon
              :name="avgHealth ? healthInfo(avgHealth).icon : 'i-tabler-heart'"
              class="size-5"
            />
          </span>
          <strong>{{ avgHealth ? healthInfo(avgHealth).label : '–' }}</strong>
          <span>Avg health</span>
        </div>
        <div class="stat">
          <span
            class="stat-icon"
            style="--c: #4fc3f7"
          ><UIcon
            name="i-tabler-notebook"
            class="size-5"
          /></span>
          <strong>{{ entriesThisWeek }}</strong>
          <span>Logs · 7d</span>
        </div>
        <div class="stat">
          <span
            class="stat-icon"
            style="--c: #fbbf24"
          ><UIcon
            name="i-tabler-chart-bar"
            class="size-5"
          /></span>
          <strong>Stats</strong>
          <span>Insights</span>
        </div>
      </NuxtLink>

      <section
        v-if="attention.length"
        aria-labelledby="attention-title"
      >
        <div class="section-head">
          <h2
            id="attention-title"
            class="section-title"
          >
            <UIcon
              name="i-tabler-bell-ringing"
              class="size-5"
            /> Needs attention
          </h2>
        </div>
        <ul class="attention-list">
          <li
            v-for="a in attention"
            :key="a.plant.id + a.kind"
            class="attention card"
            :class="{ urgent: a.urgent }"
          >
            <NuxtLink
              :to="`/plants/${a.plant.id}`"
              class="attention-photo"
              :aria-label="a.plant.name"
            >
              <PlantPhoto
                :photo-id="a.plant.photoId"
                :stage="a.plant.stage"
              />
            </NuxtLink>
            <div class="attention-text">
              <p class="attention-title">
                {{ a.title }}
              </p>
              <p class="attention-detail">
                {{ a.detail }}
              </p>
            </div>
            <button
              v-if="a.kind === 'water'"
              type="button"
              class="btn btn-soft log-btn"
              @click="quickLog(a.plant, 'water')"
            >
              <UIcon
                name="i-tabler-droplet-filled"
                class="size-4"
              /> Log
            </button>
            <NuxtLink
              v-else
              :to="`/plants/${a.plant.id}`"
              class="btn btn-soft log-btn"
            >
              Open
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section aria-labelledby="tasks-title">
        <div class="section-head">
          <h2
            id="tasks-title"
            class="section-title"
          >
            <UIcon
              name="i-tabler-checklist"
              class="size-5"
            /> Today's tasks
          </h2>
          <button
            type="button"
            class="icon-btn accent"
            :aria-label="adding ? 'Close' : 'Add task'"
            :aria-expanded="adding"
            @click="toggleAdding"
          >
            <UIcon
              :name="adding ? 'i-tabler-x' : 'i-tabler-plus'"
              class="size-5"
            />
          </button>
        </div>

        <form
          v-if="adding"
          class="task-add"
          @submit.prevent="addTask"
        >
          <input
            ref="taskInput"
            v-model="newTask"
            class="input"
            placeholder="e.g. Raise the light 10 cm"
            maxlength="120"
            aria-label="Task"
          >
          <div class="task-add-row">
            <select
              v-model="newTaskPlant"
              class="input"
              aria-label="Plant (optional)"
            >
              <option :value="null">
                No plant
              </option>
              <option
                v-for="p in activePlants"
                :key="p.id"
                :value="p.id"
              >
                {{ p.name }}
              </option>
            </select>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!newTask.trim()"
            >
              Add
            </button>
          </div>
        </form>

        <div
          v-if="todaysTasks.length"
          class="progress task-progress"
        >
          <div :style="{ width: `${taskPct}%`, background: 'var(--accent)' }" />
        </div>

        <EmptyState
          v-if="!todaysTasks.length && !adding"
          icon="i-tabler-clipboard-list"
          title="Nothing planned for today"
          text="Tap + to add a task, e.g. refill the reservoir."
        />

        <ul
          v-else
          class="tasks"
        >
          <li
            v-for="t in todaysTasks"
            :key="t.id"
            class="task"
            :class="{ done: t.done }"
          >
            <button
              type="button"
              class="task-check"
              role="checkbox"
              :aria-checked="t.done"
              :aria-label="t.title"
              @click="grow.updateTask(t.id, { done: !t.done })"
            >
              <UIcon
                v-if="t.done"
                name="i-tabler-check"
                class="size-4"
              />
            </button>
            <div class="task-text">
              <span class="task-title">{{ t.title }}</span>
              <span
                v-if="plantName(t.plantId) || t.date < today"
                class="task-meta"
              >
                <template v-if="t.date < today">{{ formatRelativeDay(t.date) }}</template>
                <template v-if="plantName(t.plantId) && t.date < today"> · </template>
                <template v-if="plantName(t.plantId)">{{ plantName(t.plantId) }}</template>
              </span>
            </div>
            <button
              type="button"
              class="task-delete"
              aria-label="Delete task"
              @click="removeTask(t.id)"
            >
              <UIcon
                name="i-tabler-trash"
                class="size-4"
              />
            </button>
          </li>
        </ul>
      </section>

      <section aria-labelledby="plants-title">
        <div class="section-head">
          <h2
            id="plants-title"
            class="section-title"
          >
            <UIcon
              name="i-tabler-leaf"
              class="size-5"
            /> Your plants
          </h2>
          <NuxtLink
            to="/plants"
            class="link"
          >
            View all <UIcon
              name="i-tabler-chevron-right"
              class="size-4"
            />
          </NuxtLink>
        </div>

        <EmptyState
          v-if="!activePlants.length"
          icon="i-tabler-plant-off"
          title="No plants yet"
          text="Add your first plant to start the journal."
        >
          <NuxtLink
            to="/plants/new"
            class="btn btn-soft"
          >
            <UIcon
              name="i-tabler-plus"
              class="size-4"
            /> Add plant
          </NuxtLink>
        </EmptyState>

        <div
          v-else
          class="plants-scroll"
        >
          <NuxtLink
            v-for="p in activePlants"
            :key="p.id"
            :to="`/plants/${p.id}`"
            class="plant-card"
          >
            <div class="plant-card-img">
              <PlantPhoto
                :photo-id="p.photoId"
                :stage="p.stage"
                :alt="p.name"
              />
              <StageBadge
                :stage="p.stage"
                class="plant-card-badge"
              />
            </div>
            <div class="plant-card-body">
              <p class="plant-card-name">
                {{ p.name }}
              </p>
              <p class="plant-card-strain">
                {{ p.strain || 'Unknown strain' }}
              </p>
              <p class="plant-card-day">
                <strong>Day {{ stageProgress(p).age }}</strong>
                <span>· {{ stageProgress(p).dayInStage }}d in stage</span>
              </p>
              <div class="progress">
                <div :style="{ width: `${stageProgress(p).percent}%`, background: stageInfo(p.stage).color }" />
              </div>
            </div>
          </NuxtLink>
          <NuxtLink
            to="/plants/new"
            class="plant-card add-card"
            aria-label="Add plant"
          >
            <UIcon
              name="i-tabler-plus"
              class="size-8"
            />
            <span>Add plant</span>
          </NuxtLink>
        </div>
      </section>

      <section
        v-if="recent.length"
        aria-labelledby="recent-title"
      >
        <div class="section-head">
          <h2
            id="recent-title"
            class="section-title"
          >
            <UIcon
              name="i-tabler-history"
              class="size-5"
            /> Recent activity
          </h2>
        </div>
        <div class="recent">
          <NuxtLink
            v-for="e in recent"
            :key="e.id"
            :to="`/plants/${e.plantId}`"
            class="recent-item"
          >
            <span
              class="recent-icon"
              :style="{ '--c': entryInfo(e.type).color }"
            >
              <UIcon
                :name="entryInfo(e.type).icon"
                class="size-4"
              />
            </span>
            <span class="recent-text">
              <strong>{{ e.type === 'stage' && e.stage ? `Moved to ${stageInfo(e.stage).label}` : entryInfo(e.type).verb }}</strong>
              <span>{{ plantName(e.plantId) }}<template v-if="entrySummary(e)"> · {{ entrySummary(e) }}</template></span>
            </span>
            <span class="recent-date">{{ formatRelativeDay(e.date) }}</span>
          </NuxtLink>
        </div>
      </section>

      <button
        type="button"
        class="tip card"
        @click="tipIndex++"
      >
        <span class="tip-head">
          <span class="tip-title"><UIcon
            name="i-tabler-bulb"
            class="size-5"
          /> Grow tip</span>
          <span
            class="tip-stage"
            :style="{ color: tip.stage.color }"
          >{{ tip.stage.label }}</span>
        </span>
        <span class="tip-text">{{ tip.text }}</span>
        <span class="tip-next">Tap for another tip</span>
      </button>
    </div>

    <EntrySheet
      v-if="sheetPlant"
      v-model:open="sheetOpen"
      :plant-id="sheetPlant"
      :type="sheetType"
      :date="today"
    />
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: calc(14px + var(--safe-top)) 20px 22px;
  background: linear-gradient(135deg, #0f1d0b 0%, #0e150d 45%, var(--bg) 100%);
  border-bottom: 1px solid var(--accent-line);
}

.hero-glow {
  position: absolute;
  top: -70px;
  right: -50px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(123, 199, 77, 0.2) 0%, transparent 70%);
  pointer-events: none;
}

.hero-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-greeting {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

.leaf {
  animation: sway 3s ease-in-out infinite;
}

@keyframes sway {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(8deg);
  }
}

.hero-day {
  position: relative;
  margin: 6px 0 2px;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.hero-date {
  position: relative;
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 14px;
}

.hero-badges {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
}

.hero-badge.green {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: rgba(123, 199, 77, 0.3);
}

.hero-badge.neutral {
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--line-strong);
}

.hero-badge.gold {
  color: #ffd84d;
  background: rgba(255, 216, 77, 0.12);
  border-color: rgba(255, 216, 77, 0.3);
}

.hero-badge.warn {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.3);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-decoration: none;
  color: inherit;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--line);
  text-align: center;
  min-width: 0;
}

.stat-icon {
  width: 36px;
  height: 36px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, transparent);
}

.stat strong {
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.stat > span:last-child {
  font-size: 11px;
  color: var(--text-3);
}

.attention-list,
.tasks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attention {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
}

.attention.urgent {
  border-color: rgba(251, 191, 36, 0.4);
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.07), var(--surface) 60%);
}

.attention-photo {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
}

.attention-text {
  flex: 1;
  min-width: 0;
}

.attention-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.attention-detail {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.attention.urgent .attention-detail {
  color: #fbbf24;
}

.log-btn {
  min-height: 36px;
  padding: 0 12px;
  font-size: 13px;
}

.task-add {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.task-add-row {
  display: flex;
  gap: 8px;
}

.task-add-row select {
  flex: 1;
}

.task-progress {
  margin-bottom: 12px;
  height: 4px;
}

.task {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 10px 14px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
}

.task-check {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 2px solid rgba(123, 199, 77, 0.45);
  background: transparent;
  color: var(--on-accent);
}

.task.done .task-check {
  background: var(--accent);
  border-color: var(--accent);
}

.task-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.task.done .task-title {
  color: var(--text-3);
  text-decoration: line-through;
}

.task-meta {
  font-size: 12px;
  color: var(--text-3);
}

.task-delete {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-delete:active {
  color: var(--danger);
}

.plants-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  margin: 0 -16px;
  padding: 0 16px 4px;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}

.plants-scroll::-webkit-scrollbar {
  display: none;
}

.plant-card {
  flex: 0 0 158px;
  scroll-snap-align: start;
  border-radius: 20px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s ease;
}

.plant-card:active {
  transform: scale(0.97);
}

.plant-card-img {
  position: relative;
  height: 118px;
}

.plant-card-badge {
  position: absolute;
  top: 8px;
  left: 8px;
}

.plant-card-body {
  padding: 10px 12px 12px;
}

.plant-card-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-card-strain {
  margin: 1px 0 8px;
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-card-day {
  margin: 0 0 6px;
  font-size: 12px;
}

.plant-card-day span {
  color: var(--text-3);
}

.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-style: dashed;
  border-color: var(--accent-line);
  color: var(--accent);
  font-weight: 700;
  font-size: 13px;
  min-height: 220px;
}

.recent {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--line);
  overflow: hidden;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  color: inherit;
  text-decoration: none;
}

.recent-item + .recent-item {
  border-top: 1px solid var(--line);
}

.recent-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, transparent);
}

.recent-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 14px;
}

.recent-text span {
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-date {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.tip {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  text-align: left;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.07) 0%, var(--surface) 70%);
  border-color: rgba(251, 191, 36, 0.22);
  color: inherit;
}

.tip-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tip-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tip-title .iconify,
.tip-title span {
  color: #fbbf24;
}

.tip-stage {
  font-size: 12px;
  font-weight: 700;
}

.tip-text {
  font-size: 15px;
  line-height: 1.5;
  color: #d6dad4;
}

.tip-next {
  font-size: 12px;
  color: var(--text-3);
}
</style>
