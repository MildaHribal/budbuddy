<script setup lang="ts">
import type { Plant, StageId } from '~/types/grow'

definePageMeta({ alias: ['/my-trees'] })
const { t } = useI18n()
useHead({ title: () => t('plants.list.title') })

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
  return stages().filter(s => present.has(s.id))
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

const totalDry = computed(() => {
  if (view.value !== 'archive') return 0
  return list.value.reduce((sum, p) => sum + (p.harvest?.dryWeight ?? 0), 0)
})

watch(view, () => {
  stageFilter.value = null
})

function waterLabel(plant: Plant) {
  const w = wateringStatus(plant)
  if (!w) return null
  if (w.dueIn < 0) return { text: t('plants.list.waterOverdue', { n: -w.dueIn }), tone: 'overdue' }
  if (w.dueIn === 0) return { text: t('plants.list.waterToday'), tone: 'today' }
  return { text: t('plants.list.waterIn', { n: w.dueIn }), tone: '' }
}

function jarWeight(plant: Plant) {
  const h = plant.harvest
  if (h?.dryWeight) return { value: h.dryWeight, unit: t('plants.list.gDry') }
  if (h?.wetWeight) return { value: h.wetWeight, unit: t('plants.list.gWet') }
  return null
}

function rowStyle(plant: Plant, index: number) {
  return { '--c': stageInfo(plant.stage).color, '--d': `${Math.min(index, 6) * 45}ms` }
}
</script>

<template>
  <div>
    <AppHeader
      :title="t('plants.list.title')"
      :subtitle="t('plants.list.subtitle', { active: counts.active, archived: counts.archive })"
    />

    <div class="page">
      <div class="controls">
        <div
          class="segmented"
          role="tablist"
          :aria-label="t('plants.list.tabsLabel')"
        >
          <span
            class="seg-thumb"
            :class="{ right: view === 'archive' }"
            aria-hidden="true"
          />
          <button
            type="button"
            role="tab"
            :aria-selected="view === 'active'"
            @click="view = 'active'"
          >
            {{ t('plants.list.active') }} <span class="count num">{{ counts.active }}</span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="view === 'archive'"
            @click="view = 'archive'"
          >
            {{ t('plants.list.archive') }} <span class="count num">{{ counts.archive }}</span>
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
              :placeholder="t('plants.list.searchPlaceholder')"
              :aria-label="t('plants.list.searchPlaceholder')"
            >
          </label>
          <select
            v-model="sort"
            class="input sort"
            :aria-label="t('plants.list.sortBy')"
          >
            <option value="recent">
              {{ t('plants.list.sortRecent') }}
            </option>
            <option value="name">
              {{ t('plants.list.sortName') }}
            </option>
            <option value="age">
              {{ t('plants.list.sortOldest') }}
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
            {{ t('plants.list.all') }}
          </button>
          <button
            v-for="s in stagesInView"
            :key="s.id"
            type="button"
            class="chip stage-chip"
            :style="{ '--c': s.color }"
            :aria-pressed="stageFilter === s.id"
            @click="stageFilter = stageFilter === s.id ? null : s.id"
          >
            <GrowIcon
              :name="s.glyph"
              class="chip-glyph"
              :glow="stageFilter === s.id"
            />
            {{ s.label }}
          </button>
        </div>
      </div>

      <EmptyState
        v-if="!list.length"
        :icon="query || stageFilter ? 'i-tabler-search-off' : view === 'archive' ? 'i-tabler-archive' : 'i-tabler-plant-off'"
        :title="t(query || stageFilter ? 'plants.list.noMatchTitle' : view === 'archive' ? 'plants.list.archiveEmptyTitle' : 'plants.list.emptyTitle')"
        :text="t(query || stageFilter ? 'plants.list.noMatchText' : view === 'archive' ? 'plants.list.archiveEmptyText' : 'plants.list.emptyText')"
      >
        <NuxtLink
          v-if="view === 'active' && !query && !stageFilter"
          to="/plants/new"
          class="btn btn-primary"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-5"
          /> {{ t('plants.list.addPlant') }}
        </NuxtLink>
      </EmptyState>

      <TransitionGroup
        v-else-if="view === 'active'"
        key="active"
        tag="ul"
        name="row"
        class="plant-list"
        appear
      >
        <li
          v-for="(p, i) in list"
          :key="p.id"
          :style="rowStyle(p, i)"
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
                  :aria-label="t('plants.list.autoflower')"
                />
              </div>
              <p class="row-strain">
                {{ p.strain || t('plants.list.unknownStrain') }}
              </p>
              <div class="row-stage">
                <GrowIcon
                  :name="stageInfo(p.stage).glyph"
                  class="stage-glyph"
                />
                <span class="stage-label">{{ stageInfo(p.stage).label }}</span>
                <span class="stage-day num">{{ t('plants.list.stageDay', { day: stageProgress(p).dayInStage, total: stageProgress(p).stageDays }) }}</span>
              </div>
              <div
                class="progress tube"
                role="progressbar"
                :aria-valuenow="stageProgress(p).percent"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="t('plants.list.stageProgress', { stage: stageInfo(p.stage).label })"
              >
                <div :style="{ width: `${stageProgress(p).percent}%` }" />
              </div>
              <span
                v-if="waterLabel(p)"
                class="water"
                :class="waterLabel(p)!.tone"
              >
                <UIcon
                  name="i-tabler-droplet"
                  class="size-3.5"
                /> {{ waterLabel(p)!.text }}
              </span>
            </div>
            <div class="row-age">
              <span class="age num">{{ stageProgress(p).age }}</span>
              <span class="age-unit">{{ t('plants.list.days', { n: stageProgress(p).age }) }}</span>
            </div>
          </NuxtLink>
        </li>
      </TransitionGroup>

      <section
        v-else
        class="shelf-wrap"
        :aria-label="t('plants.list.archivedLabel')"
      >
        <p
          v-if="totalDry"
          class="shelf-total"
        >
          <span class="total-num num">{{ totalDry }}</span>
          <span class="total-unit">{{ t('plants.list.dryOnShelf') }}</span>
        </p>
        <TransitionGroup
          key="archive"
          tag="ul"
          name="row"
          class="shelf"
          appear
        >
          <li
            v-for="(p, i) in list"
            :key="p.id"
            :style="rowStyle(p, i)"
          >
            <NuxtLink
              :to="`/plants/${p.id}`"
              class="jar"
            >
              <span
                class="jar-lid"
                aria-hidden="true"
              />
              <div class="jar-glass">
                <PlantPhoto
                  :photo-id="p.photoId"
                  :stage="p.stage"
                  :alt="p.name"
                />
              </div>
              <div class="jar-label">
                <h2>{{ p.name }}</h2>
                <p class="row-strain">
                  {{ p.strain || t('plants.list.unknownStrain') }}
                </p>
                <p
                  v-if="jarWeight(p)"
                  class="jar-weight"
                >
                  <span class="weight num">{{ jarWeight(p)!.value }}</span>
                  <span class="weight-unit">{{ jarWeight(p)!.unit }}</span>
                </p>
                <p class="jar-stage">
                  <GrowIcon
                    :name="stageInfo(p.stage).glyph"
                    class="stage-glyph"
                  />
                  {{ stageInfo(p.stage).label }}
                  <span class="num">· {{ t('plants.list.ageShort', { n: stageProgress(p).age }) }}</span>
                </p>
              </div>
            </NuxtLink>
          </li>
        </TransitionGroup>
      </section>
    </div>

    <NuxtLink
      v-if="view === 'active'"
      to="/plants/new"
      class="fab"
      :aria-label="t('plants.list.addPlant')"
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

.segmented button {
  position: relative;
  z-index: 1;
}

.segmented button[aria-selected="true"] {
  background: transparent;
  box-shadow: none;
}

.seg-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 6px);
  border-radius: 12px;
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight), 0 2px 8px rgba(0, 0, 0, 0.45);
  transition: transform var(--dur) var(--ease-out);
}

.seg-thumb.right {
  transform: translateX(calc(100% + 4px));
}

.count {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
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

.chips .chip {
  min-height: 44px;
}

.chip-glyph {
  font-size: 18px;
  color: var(--c);
}

.stage-chip[aria-pressed="true"] {
  color: var(--c);
  border-color: color-mix(in srgb, var(--c) 45%, transparent);
  background: color-mix(in srgb, var(--c) 13%, var(--surface));
}

/* Active list */
.plant-list,
.shelf {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
}

.plant-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plant-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px 12px 12px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur) ease;
}

.plant-row:active {
  transform: scale(0.985);
  border-color: var(--accent-line);
}

.row-photo {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 0 0 1px var(--line), 0 6px 16px -6px color-mix(in srgb, var(--c) 40%, transparent);
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.row-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auto {
  color: var(--lamp);
  flex-shrink: 0;
}

.row-strain {
  margin: 1px 0 0;
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-stage {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  font-size: 12px;
}

.stage-glyph {
  font-size: 15px;
  color: var(--c);
}

.stage-label {
  font-weight: 600;
  color: var(--c);
}

.stage-day {
  margin-left: auto;
  color: var(--text-3);
}

.tube {
  height: 4px;
  margin-top: 6px;
}

.tube > div {
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 55%, #0b0d10), var(--c));
  box-shadow: 0 0 8px color-mix(in srgb, var(--c) 50%, transparent);
}

.water {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 7px;
  font-size: 12px;
  color: var(--text-3);
}

.water.today {
  color: var(--leaf);
  font-weight: 600;
}

.water.overdue {
  color: var(--pink);
  font-weight: 600;
}

.row-age {
  flex-shrink: 0;
  min-width: 44px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1;
}

.age {
  font-size: 30px;
  font-weight: 300;
  letter-spacing: -0.03em;
  color: var(--text);
}

.age-unit {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-3);
}

/* Archive: a shelf of curing jars */
.shelf-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.shelf-total {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.total-num {
  font-size: 34px;
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--lamp);
  text-shadow: 0 0 18px rgba(255, 210, 138, 0.35);
}

.total-unit {
  font-size: 13px;
  color: var(--text-2);
}

.shelf {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 26px 12px;
  padding-bottom: 6px;
}

.shelf > li {
  position: relative;
}

/* the shelf plank under each jar */
.shelf > li::after {
  content: '';
  position: absolute;
  left: -6px;
  right: -6px;
  bottom: -12px;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 210, 138, 0.22) 20%, rgba(255, 210, 138, 0.22) 80%, transparent);
  box-shadow: 0 6px 14px rgba(255, 210, 138, 0.08);
}

.jar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.jar:active {
  transform: scale(0.97);
}

.jar-lid {
  align-self: center;
  width: 62%;
  height: 10px;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, #3a3f46, #23272d);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.jar-glass {
  position: relative;
  aspect-ratio: 1 / 1;
  margin-top: 2px;
  border-radius: 14px 14px 22px 22px;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  box-shadow: inset 0 1px 0 var(--highlight), 0 10px 24px -10px rgba(0, 0, 0, 0.7);
}

.jar-glass::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 18%, rgba(255, 255, 255, 0.1) 24%, transparent 31%);
  pointer-events: none;
}

.jar-label {
  padding: 10px 2px 0;
  min-width: 0;
}

.jar-weight {
  margin: 6px 0 0;
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.weight {
  font-size: 24px;
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--lamp);
}

.weight-unit {
  font-size: 12px;
  color: var(--text-2);
}

.jar-stage {
  margin: 6px 0 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-3);
}

/* Rows rise in (capped stagger); filtering moves and fades */
.row-enter-active {
  transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out);
  transition-delay: var(--d, 0ms);
}

.row-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  transition: opacity var(--dur-fast) ease, transform var(--dur) var(--ease-out);
}

.shelf .row-leave-active {
  right: auto;
  width: calc(50% - 6px);
}

.row-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.row-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.row-move {
  transition: transform var(--dur-slow) var(--ease-out);
}

/* FAB: a leaf-lit lamp button */
.fab {
  position: absolute;
  right: 20px;
  bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px);
  z-index: 40;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--on-accent);
  background: radial-gradient(120% 120% at 50% 0%, #c6f59f 0%, var(--leaf) 45%, #76c24a 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 0 0 1px rgba(155, 227, 107, 0.4),
    0 0 26px rgba(155, 227, 107, 0.45),
    0 10px 24px -6px rgba(0, 0, 0, 0.7);
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur) var(--ease-out);
  animation: fab-in var(--dur-slow) var(--ease-out) 120ms both;
}

.fab:active {
  transform: scale(0.9);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    0 0 0 1px rgba(155, 227, 107, 0.5),
    0 0 12px rgba(155, 227, 107, 0.6),
    0 4px 10px -4px rgba(0, 0, 0, 0.7);
}

@keyframes fab-in {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .row-enter-active {
    transition-delay: 0ms;
  }

  .fab {
    animation: none;
  }
}
</style>
