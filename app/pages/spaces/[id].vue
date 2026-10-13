<script setup lang="ts">
import type { EntryType, Plant } from '~/types/grow'

const route = useRoute()
const { t } = useI18n()
const grow = useGrow()
const { notify } = useNotify()
const { confirm } = useConfirm()
const { getSpace, updateSpace, deleteSpace, setPlantSpace, spaces } = useSpaces()
const today = useToday()

const space = computed(() => getSpace(String(route.params.id)))
useHead({ title: () => space.value?.name ?? t('organize.spaces.title') })

const plants = computed(() => (space.value ? plantsInSpace(grow.state.plants, space.value.id) : []))
const growing = computed(() => plants.value.filter(isGrowing))
const schedule = computed(() => (space.value ? spaceSchedule(space.value) : null))

// ── Bulk log ──────────────────────────────────────────────────────
const BULK_TYPES: EntryType[] = ['water', 'feed', 'measure', 'train', 'note']
const bulkTypes = computed(() => entryTypes().filter(e => BULK_TYPES.includes(e.type)))
const sheetOpen = ref(false)
const sheetType = ref<EntryType>('water')
const sheetIds = ref<string[]>([])
function bulkLog(type: EntryType) {
  sheetIds.value = growing.value.map(p => p.id)
  if (!sheetIds.value.length) return
  sheetType.value = type
  sheetOpen.value = true
}

// ── Sheets ────────────────────────────────────────────────────────
const editOpen = ref(false)
const lightOpen = ref(false)
const assignOpen = ref(false)
const assignPicked = ref<string[]>([])
const assignable = computed(() => grow.state.plants.filter(p => !p.archived))

function openAssign() {
  assignPicked.value = plants.value.map(p => p.id)
  assignOpen.value = true
}

function saveAssign() {
  const s = space.value
  if (!s) return
  const removed = plants.value.filter(p => !assignPicked.value.includes(p.id)).map(p => p.id)
  setPlantSpace(assignPicked.value, s.id)
  setPlantSpace(removed, null)
  assignOpen.value = false
  notify(t('organize.space.assigned', { n: assignPicked.value.length }))
}

function otherSpace(p: Plant) {
  if (!p.spaceId || p.spaceId === space.value?.id) return null
  return spaces.value.find(s => s.id === p.spaceId)?.name ?? null
}

function saveLight(v: { lightsOn: string, hours: number | null }) {
  if (!space.value) return
  updateSpace(space.value.id, { lightsOn: v.lightsOn, lightHours: v.hours })
  notify(t('home.light.saved'))
}

async function remove() {
  const s = space.value
  if (!s) return
  const ok = await confirm({
    title: t('organize.space.deleteTitle', { name: s.name }),
    message: t('organize.space.deleteMessage'),
    confirmLabel: t('common.delete'),
    danger: true
  })
  if (!ok) return
  deleteSpace(s.id)
  notify(t('organize.space.deleted'), { tone: 'info' })
  navigateTo('/spaces', { replace: true })
}

function waterHint(p: Plant) {
  const w = grow.wateringStatus(p, today.value)
  if (!w) return null
  if (w.dueIn < 0) return { text: t('plants.list.waterOverdue', { n: -w.dueIn }), tone: 'overdue' }
  if (w.dueIn === 0) return { text: t('plants.list.waterToday'), tone: 'today' }
  return { text: t('plants.list.waterIn', { n: w.dueIn }), tone: '' }
}
</script>

<template>
  <div v-if="space">
    <AppHeader
      :title="space.name"
      :subtitle="spaceSubline(space)"
      back
    >
      <template #actions>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('organize.space.editTitle')"
          @click="editOpen = true"
        >
          <UIcon
            name="i-tabler-pencil"
            class="size-5"
          />
        </button>
        <button
          type="button"
          class="icon-btn danger"
          :aria-label="t('organize.space.delete')"
          @click="remove"
        >
          <UIcon
            name="i-tabler-trash"
            class="size-5"
          />
        </button>
      </template>
    </AppHeader>

    <div class="page">
      <section
        class="card light"
        :aria-label="t('organize.space.schedule')"
      >
        <PhotoperiodRing
          v-if="schedule"
          :lights-on="schedule.lightsOn"
          :hours="schedule.hours"
          :size="132"
        />
        <div
          v-else
          class="natural"
        >
          <UIcon
            name="i-tabler-sun"
            class="size-6"
          />
          <p>{{ t('organize.space.naturalHint') }}</p>
        </div>
        <div class="light-foot">
          <span class="light-gear">
            <template v-if="space.light">{{ space.light }}</template>
            <template v-else>{{ t('organize.space.noLight') }}</template>
          </span>
          <button
            type="button"
            class="btn btn-lamp light-edit"
            @click="lightOpen = true"
          >
            <GrowIcon name="lamp" /> {{ t('organize.space.editSchedule') }}
          </button>
        </div>
      </section>

      <section aria-labelledby="bulk-title">
        <div class="section-head">
          <h2
            id="bulk-title"
            class="section-title"
          >
            {{ t('organize.space.logAll') }}
          </h2>
          <span class="section-meta num">{{ t('common.plants', { n: growing.length }) }}</span>
        </div>
        <div
          class="bulk card"
          role="group"
          :aria-label="t('organize.space.logAll')"
        >
          <button
            v-for="b in bulkTypes"
            :key="b.type"
            type="button"
            class="bulk-btn"
            :style="{ '--c': b.color }"
            :disabled="!growing.length"
            @click="bulkLog(b.type)"
          >
            <span class="bulk-tile"><GrowIcon :name="b.glyph" /></span>
            <span class="bulk-label">{{ b.label }}</span>
          </button>
        </div>
        <p
          v-if="!growing.length"
          class="field-hint bulk-empty"
        >
          {{ t('organize.space.logAllEmpty') }}
        </p>
      </section>

      <section aria-labelledby="space-plants">
        <div class="section-head">
          <h2
            id="space-plants"
            class="section-title"
          >
            {{ t('organize.space.plants') }}
          </h2>
          <button
            type="button"
            class="link"
            @click="openAssign"
          >
            {{ t('organize.space.assign') }}
          </button>
        </div>
        <EmptyState
          v-if="!plants.length"
          icon="seedling"
          :title="t('organize.space.emptyTitle')"
          :text="t('organize.space.emptyText')"
        >
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!assignable.length"
            @click="openAssign"
          >
            {{ t('organize.space.assign') }}
          </button>
        </EmptyState>
        <div
          v-else
          class="card rows"
        >
          <NuxtLink
            v-for="p in plants"
            :key="p.id"
            :to="`/plants/${p.id}`"
            class="row"
          >
            <span class="row-photo">
              <PlantPhoto
                :photo-id="p.photoId"
                :stage="p.stage"
                :alt="p.name"
              />
            </span>
            <span class="row-text">
              <strong>{{ p.name }}</strong>
              <span
                v-if="waterHint(p)"
                class="row-hint"
                :class="waterHint(p)!.tone"
              >
                <GrowIcon name="water" /> {{ waterHint(p)!.text }}
              </span>
              <span
                v-else
                class="row-hint"
              >{{ p.strain || t('plants.list.unknownStrain') }}</span>
            </span>
            <StageBadge :stage="p.stage" />
          </NuxtLink>
        </div>
      </section>

      <NuxtLink
        v-if="plants.length"
        :to="{ path: '/labels', query: { space: space.id } }"
        class="btn btn-block"
      >
        <UIcon
          name="i-tabler-qrcode"
          class="size-5"
        /> {{ t('organize.space.labels') }}
      </NuxtLink>

      <section
        v-if="space.notes"
        class="card notes"
      >
        <span class="field-label">{{ t('organize.space.notes') }}</span>
        <p>{{ space.notes }}</p>
      </section>
    </div>

    <SpacesSpaceSheet
      v-model:open="editOpen"
      :space="space"
    />
    <SpacesLightSheet
      v-model:open="lightOpen"
      :title="t('organize.space.lightTitle', { name: space.name })"
      :lights-on="space.lightsOn"
      :hours="space.lightHours"
      @save="saveLight"
    />
    <BottomSheet
      v-model:open="assignOpen"
      :title="t('organize.space.assignTitle', { name: space.name })"
      icon="i-tabler-tent"
    >
      <SpacesPlantPicker
        v-if="assignable.length"
        v-model="assignPicked"
        :plants="assignable"
        :label="t('organize.space.assignLabel', { n: assignPicked.length })"
        :note="otherSpace"
      />
      <EmptyState
        v-else
        icon="seedling"
        :title="t('plants.list.emptyTitle')"
        :text="t('plants.list.emptyText')"
      />
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="assignOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveAssign"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>
    <EntrySheet
      v-if="sheetIds.length"
      v-model:open="sheetOpen"
      :plant-id="sheetIds[0]!"
      :plant-ids="sheetIds"
      :type="sheetType"
      :date="today"
    />
  </div>
  <div v-else>
    <AppHeader
      :title="t('organize.spaces.title')"
      back
    />
    <div class="page">
      <EmptyState
        icon="plants"
        :title="t('organize.space.notFound')"
        :text="t('organize.space.notFoundText')"
      >
        <NuxtLink
          to="/spaces"
          class="btn"
        >
          {{ t('organize.spaces.all') }}
        </NuxtLink>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.light {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 16px 14px 14px;
}

.natural {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  color: var(--amber);
}

.natural p {
  margin: 0;
  font-size: 14px;
  color: var(--text-2);
}

.light-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.light-gear {
  min-width: 0;
  font-size: 13px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.light-edit {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 14px;
  font-size: 14px;
}

.bulk {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 12px 8px;
}

.bulk-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-2);
  transition: transform var(--dur-fast) var(--ease-out), opacity var(--dur) ease;
}

.bulk-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.bulk-btn:disabled {
  opacity: 0.4;
}

.bulk-tile {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: var(--c);
  font-size: 22px;
}

.bulk-label {
  font-size: 12px;
  font-weight: 600;
}

.bulk-empty {
  display: block;
  margin-top: 8px;
}

.rows {
  display: flex;
  flex-direction: column;
  padding: 0 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 0;
  color: inherit;
  text-decoration: none;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row-photo {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-text strong {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-3);
}

.row-hint .grow-icon {
  font-size: 14px;
}

.row-hint.today {
  color: var(--blue);
  font-weight: 600;
}

.row-hint.overdue {
  color: var(--red);
  font-weight: 600;
}

.notes {
  padding: 14px;
}

.notes p {
  margin: 6px 0 0;
  white-space: pre-line;
}
</style>
