<script setup lang="ts">
import type { EntryType, Plant, StageId } from '~/types/grow'

definePageMeta({ alias: ['/my-trees'] })
const { t } = useI18n()
useHead({ title: () => t('plants.list.title') })

const { state, wateringStatus } = useGrow()
const today = useToday()

const sheetOpen = ref(false)
const sheetPlant = ref('')
const sheetType = ref<EntryType>('water')
function quickLog(plant: Plant, type: EntryType) {
  sheetIds.value = null
  sheetPlant.value = plant.id
  sheetType.value = type
  sheetOpen.value = true
}

type View = 'active' | 'archive'
type Sort = 'recent' | 'name' | 'age'

const view = ref<View>('active')
const query = ref('')
const stageFilter = ref<StageId | null>(null)
const sort = ref<Sort>('recent')

// tents, multi-select and bulk actions
const { spaces } = useSpaces()
const { hunts } = useHunts()
const spaceFilter = ref<string | null>(null)
const selecting = ref(false)
const selected = ref<string[]>([])
const scanOpen = ref(false)
const moveOpen = ref(false)
const NuxtLinkComp = resolveComponent('NuxtLink')
function toggleSelecting() {
  selecting.value = !selecting.value
  selected.value = []
}
function toggleSelected(id: string) {
  selected.value = selected.value.includes(id) ? selected.value.filter(x => x !== id) : [...selected.value, id]
}
function bulkLog() {
  const ids = selected.value.filter(id => state.plants.some(p => p.id === id && isGrowing(p)))
  if (!ids.length) return
  sheetPlant.value = ids[0]!
  sheetIds.value = ids
  sheetType.value = 'water'
  sheetOpen.value = true
}
const sheetIds = ref<string[] | null>(null)
watch(sheetOpen, (v) => {
  if (!v && sheetIds.value) {
    sheetIds.value = null
    selecting.value = false
    selected.value = []
  }
})
const selectedGrowing = computed(() => selected.value.filter(id => state.plants.some(p => p.id === id && isGrowing(p))).length)

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
    && (!spaceFilter.value || (spaceFilter.value === 'none' ? !p.spaceId : p.spaceId === spaceFilter.value))
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
  selecting.value = false
  selected.value = []
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

function rowStyle(index: number) {
  return { '--d': `${Math.min(index, 5) * 40}ms` }
}
</script>

<template>
  <div>
    <AppHeader
      :title="t('plants.list.title')"
      :subtitle="t('plants.list.subtitle', { active: counts.active, archived: counts.archive })"
    >
      <template #actions>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('organize.scan.open')"
          @click="scanOpen = true"
        >
          <UIcon
            name="i-tabler-scan"
            class="size-5"
          />
        </button>
        <button
          v-if="view === 'active' && counts.active"
          type="button"
          class="icon-btn"
          :class="{ accent: selecting }"
          :aria-pressed="selecting"
          :aria-label="selecting ? t('organize.select.done') : t('organize.select.start')"
          @click="toggleSelecting"
        >
          <UIcon
            :name="selecting ? 'i-tabler-x' : 'i-tabler-checkbox'"
            class="size-5"
          />
        </button>
        <NuxtLink
          to="/gallery"
          class="icon-btn"
          :aria-label="t('common.nav.gallery')"
        >
          <GrowIcon name="gallery" />
        </NuxtLink>
      </template>
    </AppHeader>

    <div class="page">
      <div class="controls">
        <div
          class="segmented"
          role="tablist"
          :aria-label="t('plants.list.tabsLabel')"
        >
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

        <nav
          class="chips shortcuts"
          :aria-label="t('organize.shortcuts')"
        >
          <NuxtLink
            to="/spaces"
            class="chip"
          >
            <UIcon
              name="i-tabler-tent"
              class="size-4"
            /> {{ t('organize.spaces.title') }}<span
              v-if="spaces.length"
              class="count num"
            >{{ spaces.length }}</span>
          </NuxtLink>
          <NuxtLink
            to="/hunts"
            class="chip"
          >
            <UIcon
              name="i-tabler-dna-2"
              class="size-4"
            /> {{ t('organize.hunts') }}<span
              v-if="hunts.length"
              class="count num"
            >{{ hunts.length }}</span>
          </NuxtLink>
          <NuxtLink
            to="/labels"
            class="chip"
          >
            <UIcon
              name="i-tabler-qrcode"
              class="size-4"
            /> {{ t('organize.labels') }}
          </NuxtLink>
        </nav>

        <div
          v-if="spaces.length"
          class="chips"
          role="group"
          :aria-label="t('organize.spaceFilter')"
        >
          <button
            type="button"
            class="chip"
            :aria-pressed="spaceFilter === null"
            @click="spaceFilter = null"
          >
            {{ t('organize.allSpaces') }}
          </button>
          <button
            v-for="s in spaces"
            :key="s.id"
            type="button"
            class="chip"
            :aria-pressed="spaceFilter === s.id"
            @click="spaceFilter = spaceFilter === s.id ? null : s.id"
          >
            <UIcon
              name="i-tabler-tent"
              class="size-4"
            /> {{ s.name }}
          </button>
          <button
            type="button"
            class="chip"
            :aria-pressed="spaceFilter === 'none'"
            @click="spaceFilter = spaceFilter === 'none' ? null : 'none'"
          >
            {{ t('organize.noSpace') }}
          </button>
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
            class="chip"
            :aria-pressed="stageFilter === s.id"
            @click="stageFilter = stageFilter === s.id ? null : s.id"
          >
            <GrowIcon
              :name="s.glyph"
              class="chip-glyph"
            />
            {{ s.label }}
          </button>
        </div>
      </div>

      <EmptyState
        v-if="!list.length"
        :icon="query || stageFilter ? 'plants' : view === 'archive' ? 'curing' : 'seedling'"
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

      <section
        v-else
        :aria-label="view === 'archive' ? t('plants.list.archivedLabel') : undefined"
      >
        <div
          v-if="totalDry"
          class="section-head"
        >
          <span class="section-meta num">
            <strong>{{ totalDry }}</strong> {{ t('plants.list.dryOnShelf') }}
          </span>
        </div>
        <TransitionGroup
          :key="view"
          tag="ul"
          name="row"
          class="plant-list"
          appear
        >
          <li
            v-for="(p, i) in list"
            :key="p.id"
            :style="rowStyle(i)"
          >
            <component
              :is="selecting ? 'button' : NuxtLinkComp"
              v-bind="selecting ? { 'type': 'button', 'role': 'checkbox', 'aria-checked': selected.includes(p.id) } : { to: `/plants/${p.id}` }"
              class="card plant"
              :class="{ picked: selecting && selected.includes(p.id) }"
              @click="selecting && toggleSelected(p.id)"
            >
              <span class="plant-photo">
                <PlantPhoto
                  :photo-id="p.photoId"
                  :stage="p.stage"
                  :alt="p.name"
                />
              </span>
              <span class="plant-body">
                <span class="plant-top">
                  <span class="plant-name">
                    {{ p.name }}
                    <UIcon
                      v-if="p.type === 'autoflower'"
                      name="i-tabler-bolt"
                      class="size-4 auto"
                      :aria-label="t('plants.list.autoflower')"
                    />
                  </span>
                  <StageBadge :stage="p.stage" />
                </span>
                <span class="plant-lower">
                  <span class="plant-lines">
                    <span class="plant-sub">
                      <strong class="num">{{ t('plants.list.totalAge', { n: stageProgress(p).age }) }}</strong>
                      <span> · {{ p.strain || t('plants.list.unknownStrain') }}</span>
                    </span>
                    <span
                      v-if="view === 'archive' && jarWeight(p)"
                      class="plant-hint"
                    >
                      <GrowIcon name="harvest" />
                      <span class="num">{{ jarWeight(p)!.value }} {{ jarWeight(p)!.unit }}</span>
                    </span>
                    <span
                      v-else-if="view === 'active' && waterLabel(p)"
                      class="plant-hint"
                      :class="waterLabel(p)!.tone"
                    >
                      <GrowIcon name="water" />
                      {{ waterLabel(p)!.text }}
                    </span>
                    <span
                      class="progress plant-bar"
                      role="progressbar"
                      :aria-valuenow="stageProgress(p).percent"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      :aria-label="t('plants.list.stageProgress', { stage: stageInfo(p.stage).label })"
                    >
                      <span
                        class="bar-fill"
                        :style="{ width: `${stageProgress(p).percent}%` }"
                      />
                    </span>
                  </span>
                  <span
                    v-if="selecting"
                    class="plant-check"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 12 12"><path d="M2.5 6.5l2.3 2.3 4.7-5" /></svg>
                  </span>
                  <button
                    v-else-if="view === 'active' && isGrowing(p)"
                    type="button"
                    class="plant-log"
                    :aria-label="t('home.tasks.logWater', { name: p.name })"
                    @click.prevent.stop="quickLog(p, 'water')"
                  >
                    <GrowIcon name="water" />
                  </button>
                </span>
              </span>
            </component>
          </li>
        </TransitionGroup>
      </section>
    </div>

    <div
      v-if="selecting"
      class="select-bar"
      role="toolbar"
      :aria-label="t('organize.select.toolbar')"
    >
      <span class="select-count num">{{ t('organize.select.count', { n: selected.length }) }}</span>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('organize.select.move')"
        :disabled="!selected.length"
        @click="moveOpen = true"
      >
        <UIcon
          name="i-tabler-tent"
          class="size-5"
        />
      </button>
      <NuxtLink
        :to="selected.length ? { path: '/labels', query: { ids: selected.join(',') } } : '/labels'"
        class="icon-btn"
        :class="{ off: !selected.length }"
        :aria-label="t('organize.select.labels')"
      >
        <UIcon
          name="i-tabler-qrcode"
          class="size-5"
        />
      </NuxtLink>
      <NuxtLink
        :to="selected.length > 1 ? { path: '/hunts', query: { new: selected.join(',') } } : '/hunts'"
        class="icon-btn"
        :class="{ off: selected.length < 2 }"
        :aria-label="t('organize.select.hunt')"
      >
        <UIcon
          name="i-tabler-dna-2"
          class="size-5"
        />
      </NuxtLink>
      <button
        type="button"
        class="btn btn-primary select-log"
        :disabled="!selectedGrowing"
        @click="bulkLog"
      >
        <GrowIcon name="water" /> {{ t('organize.select.log') }}
      </button>
    </div>

    <NuxtLink
      v-if="view === 'active' && !selecting"
      to="/plants/new"
      class="fab"
      :aria-label="t('plants.list.addPlant')"
    >
      <UIcon name="i-tabler-plus" />
    </NuxtLink>

    <EntrySheet
      v-if="sheetPlant"
      v-model:open="sheetOpen"
      :plant-id="sheetPlant"
      :plant-ids="sheetIds"
      :type="sheetType"
      :date="today"
    />
    <SpacesMoveSheet
      v-model:open="moveOpen"
      :plant-ids="selected"
      @moved="selecting = false; selected = []"
    />
    <ScanSheet v-model:open="scanOpen" />
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.segmented button {
  min-height: 40px;
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
  width: 132px;
  padding-right: 30px;
  flex-shrink: 0;
}

.chip-glyph {
  font-size: 16px;
}

.shortcuts .chip {
  text-decoration: none;
}

.shortcuts .count {
  margin-left: 2px;
}

button.plant {
  width: 100%;
  text-align: left;
  font: inherit;
}

.plant.picked {
  border-color: var(--accent-line);
  background: color-mix(in srgb, var(--green) 6%, var(--surface));
}

.plant-check {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin: 0 8px 6px;
  display: grid;
  place-items: center;
  border: 2px solid var(--line-strong);
  border-radius: 6px;
  transition: background var(--dur) ease, border-color var(--dur) ease;
}

.plant-check svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--on-accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
}

.picked .plant-check {
  background: var(--green);
  border-color: var(--green);
}

.picked .plant-check svg {
  opacity: 1;
}

.select-bar {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(var(--nav-h) + var(--safe-bottom) + 12px);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--surface-3);
  box-shadow: var(--shadow-float);
}

.select-count {
  flex: 1;
  min-width: 0;
  padding-left: 6px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.select-bar .icon-btn:disabled,
.select-bar .icon-btn.off {
  opacity: 0.4;
  pointer-events: none;
}

.select-log {
  min-height: 44px;
  padding: 0 14px;
}

.section-meta strong {
  font-weight: 600;
  color: var(--text);
}

/* List */
.plant-list {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plant {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.plant:active {
  transform: scale(0.985);
}

.plant-photo {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--radius-control);
  overflow: hidden;
}

.plant-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plant-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.plant-name {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auto {
  flex-shrink: 0;
  color: var(--amber);
}

.plant-sub {
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-sub strong {
  font-weight: 600;
  color: var(--text);
}

.plant-lower {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.plant-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plant-log {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  margin-bottom: -2px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--blue) 14%, transparent);
  color: var(--blue);
  font-size: 20px;
  transition: transform var(--dur-fast) var(--ease-out);
}

.plant-log:active {
  transform: scale(0.92);
}

.plant-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
}

.plant-hint .grow-icon {
  font-size: 14px;
}

.plant-hint.today {
  color: var(--blue);
  font-weight: 600;
}

.plant-hint.overdue {
  color: var(--red);
  font-weight: 600;
}

.plant-bar {
  display: block;
  height: 4px;
  margin-top: 4px;
}

.bar-fill {
  display: block;
  height: 100%;
  min-width: 4px;
  border-radius: inherit;
  background: var(--green);
  transition: width var(--dur-slow) var(--ease-out);
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
  transition: opacity var(--dur-fast) ease;
}

.row-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.row-leave-to {
  opacity: 0;
}

.row-move {
  transition: transform var(--dur-slow) var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .row-enter-active {
    transition-delay: 0ms;
  }
}
</style>
