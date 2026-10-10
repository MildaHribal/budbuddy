<script setup lang="ts">
import type { StageId } from '~/types/grow'

definePageMeta({ alias: ['/my-trees'] })
useHead({ title: 'Plants' })

const { state, wateringStatus } = useGrow()

type View = 'active' | 'archive'
type Sort = 'recent' | 'name' | 'age'

const view = ref<View>('active')
const query = ref('')
const stageFilter = ref<StageId | null>(null)
const sort = ref<Sort>('recent')

const counts = computed(() => ({
  active: state.plants.filter(p => !p.archived).length,
  archive: state.plants.filter(p => p.archived).length
}))

const stagesInView = computed(() => {
  const present = new Set(state.plants.filter(p => p.archived === (view.value === 'archive')).map(p => p.stage))
  return STAGES.filter(s => present.has(s.id))
})

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  const items = state.plants.filter(p =>
    p.archived === (view.value === 'archive')
    && (!stageFilter.value || p.stage === stageFilter.value)
    && (!q || p.name.toLowerCase().includes(q) || p.strain.toLowerCase().includes(q))
  )
  const sorted = [...items]
  if (sort.value === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort.value === 'age') sorted.sort((a, b) => a.startDate.localeCompare(b.startDate))
  else sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return sorted
})

watch(view, () => {
  stageFilter.value = null
})

function waterLabel(id: string) {
  const plant = state.plants.find(p => p.id === id)
  const w = plant && wateringStatus(plant)
  if (!w) return null
  if (w.dueIn < 0) return { text: `Water overdue ${-w.dueIn}d`, urgent: true }
  if (w.dueIn === 0) return { text: 'Water today', urgent: true }
  return { text: `Water in ${w.dueIn}d`, urgent: false }
}
</script>

<template>
  <div>
    <AppHeader
      title="Plants"
      :subtitle="`${counts.active} active · ${counts.archive} archived`"
      icon="i-tabler-leaf"
    />

    <div class="page">
      <div class="controls">
        <div
          class="segmented"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="view === 'active'"
            @click="view = 'active'"
          >
            Active <span class="count">{{ counts.active }}</span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="view === 'archive'"
            @click="view = 'archive'"
          >
            Archive <span class="count">{{ counts.archive }}</span>
          </button>
        </div>

        <div class="search-row">
          <label class="search">
            <UIcon
              name="i-tabler-search"
              class="size-5 search-icon"
            />
            <input
              v-model="query"
              class="input"
              type="search"
              placeholder="Search plants"
              aria-label="Search plants"
            >
          </label>
          <select
            v-model="sort"
            class="input sort"
            aria-label="Sort by"
          >
            <option value="recent">
              Recent
            </option>
            <option value="name">
              Name
            </option>
            <option value="age">
              Oldest
            </option>
          </select>
        </div>

        <div
          v-if="stagesInView.length > 1"
          class="chips"
        >
          <button
            type="button"
            class="chip"
            :aria-pressed="stageFilter === null"
            @click="stageFilter = null"
          >
            All
          </button>
          <button
            v-for="s in stagesInView"
            :key="s.id"
            type="button"
            class="chip"
            :aria-pressed="stageFilter === s.id"
            @click="stageFilter = stageFilter === s.id ? null : s.id"
          >
            <UIcon
              :name="s.icon"
              class="size-4"
              :style="{ color: s.color }"
            />
            {{ s.label }}
          </button>
        </div>
      </div>

      <EmptyState
        v-if="!list.length"
        :icon="query || stageFilter ? 'i-tabler-search-off' : view === 'archive' ? 'i-tabler-archive' : 'i-tabler-plant-off'"
        :title="query || stageFilter ? 'No matching plants' : view === 'archive' ? 'Archive is empty' : 'No plants yet'"
        :text="query || stageFilter ? 'Try a different search or filter.' : view === 'archive' ? 'Finished grows land here after you archive them.' : 'Add your first plant to start its journal.'"
      >
        <NuxtLink
          v-if="view === 'active' && !query && !stageFilter"
          to="/plants/new"
          class="btn btn-primary"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-5"
          /> Add plant
        </NuxtLink>
      </EmptyState>

      <ul
        v-else
        class="plant-list"
      >
        <li
          v-for="p in list"
          :key="p.id"
        >
          <NuxtLink
            :to="`/plants/${p.id}`"
            class="plant-row card"
          >
            <div class="row-photo">
              <PlantPhoto
                :photo-id="p.photoId"
                :stage="p.stage"
                :alt="p.name"
              />
            </div>
            <div class="row-main">
              <div class="row-top">
                <h2>{{ p.name }}</h2>
                <UIcon
                  v-if="p.type === 'autoflower'"
                  name="i-tabler-bolt"
                  class="size-4 auto"
                  aria-label="Autoflower"
                />
              </div>
              <p class="row-strain">
                {{ p.strain || 'Unknown strain' }}
              </p>
              <div class="row-meta">
                <StageBadge :stage="p.stage" />
                <span class="meta">Day {{ stageProgress(p).age }}</span>
                <span
                  v-if="p.harvest?.dryWeight"
                  class="meta"
                >{{ p.harvest.dryWeight }} g dry</span>
                <span
                  v-else-if="waterLabel(p.id)"
                  class="meta"
                  :class="{ urgent: waterLabel(p.id)!.urgent }"
                >
                  <UIcon
                    name="i-tabler-droplet"
                    class="size-3.5"
                  /> {{ waterLabel(p.id)!.text }}
                </span>
              </div>
            </div>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 chev"
            />
          </NuxtLink>
        </li>
      </ul>
    </div>

    <NuxtLink
      v-if="view === 'active'"
      to="/plants/new"
      class="fab"
      aria-label="Add plant"
    >
      <UIcon
        name="i-tabler-plus"
        class="size-7"
      />
    </NuxtLink>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.count {
  font-size: 12px;
  opacity: 0.7;
}

.search-row {
  display: flex;
  gap: 8px;
}

.search {
  position: relative;
  flex: 1;
}

.search .input {
  padding-left: 42px;
}

.search-icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  pointer-events: none;
}

.sort {
  width: 118px;
  flex-shrink: 0;
}

.plant-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plant-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.plant-row:active {
  transform: scale(0.985);
  border-color: var(--accent-line);
}

.row-photo {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 16px;
  overflow: hidden;
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auto {
  color: #fbbf24;
  flex-shrink: 0;
}

.row-strain {
  margin: 1px 0 8px;
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.meta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--text-2);
}

.meta.urgent {
  color: #fbbf24;
  font-weight: 600;
}

.chev {
  color: var(--text-3);
  flex-shrink: 0;
}

.fab {
  position: absolute;
  right: 18px;
  bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px);
  z-index: 40;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--on-accent);
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  box-shadow: 0 8px 24px rgba(123, 199, 77, 0.4), 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s ease;
}

.fab:active {
  transform: scale(0.92);
}
</style>
