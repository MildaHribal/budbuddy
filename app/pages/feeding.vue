<script setup lang="ts">
import type { FeedSchedule } from '~/types/kit'
import { scheduleTitle, sortedWeeks } from '~/utils/feeding'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const grow = useGrow()
const feeding = useFeeding()
const { confirm } = useConfirm()
const { notify } = useNotify()
const today = useToday()

const selected = computed(() => (typeof route.query.s === 'string' ? feeding.getSchedule(route.query.s) : undefined))
useHead({ title: () => (selected.value ? scheduleTitle(selected.value) : t('manage.feeding.title')) })

const growing = computed(() => grow.state.plants.filter(isGrowing))
const plantRows = computed(() => growing.value.map(p => ({ plant: p, f: feeding.feedingFor(p, today.value) })))
const bundled = computed(() => feeding.schedules.value.filter(s => !s.custom))

// ── assign ────────────────────────────────────────────────────────
const assignOpen = ref(false)
const assignPlants = ref<string[]>([])
const assignSchedule = ref<string | null>(null)

function assign(plantIds: string[], scheduleId: string | null = null) {
  assignPlants.value = plantIds
  assignSchedule.value = scheduleId
  assignOpen.value = true
}

async function unassign(plantId: string, name: string) {
  const ok = await confirm({ title: t('manage.feeding.unassignTitle', { name }), confirmLabel: t('manage.feeding.unassign'), danger: true })
  if (ok) feeding.removePlan(plantId)
}

// deep link from a plant or the entry sheet: ?plant=<id>
onMounted(() => {
  const id = route.query.plant
  if (typeof id === 'string' && grow.getPlant(id)) {
    assign([id])
    router.replace({ query: { ...route.query, plant: undefined } })
  }
})

// ── edit ──────────────────────────────────────────────────────────
const editorOpen = ref(false)
const draft = ref<FeedSchedule | null>(null)

function edit(s: FeedSchedule | null) {
  draft.value = feeding.draftFrom(s, t('manage.feeding.copySuffix'))
  editorOpen.value = true
}

function onSaved(s: FeedSchedule) {
  router.replace({ query: { s: s.id } })
}

async function remove(s: FeedSchedule) {
  const users = feeding.plans.value.filter(p => p.scheduleId === s.id).length
  const ok = await confirm({
    title: t('manage.feeding.deleteTitle', { name: scheduleTitle(s) }),
    message: users ? t('manage.feeding.deleteUsed', { n: users }) : undefined,
    confirmLabel: t('common.delete'),
    danger: true
  })
  if (!ok) return
  feeding.deleteCustom(s.id)
  notify(t('manage.feeding.deleted'), { tone: 'info' })
  router.replace({ query: {} })
}

const usersOf = (id: string) => feeding.plans.value.filter(p => p.scheduleId === id && grow.getPlant(p.plantId)).length
const weekCount = (s: FeedSchedule) => s.weeks.length
const doseList = (s: FeedSchedule, doses: Record<string, number>) => s.products
  .filter(p => doses[p.id])
  .map(p => `${p.name} ${formatNumber(doses[p.id], 2)}${p.unit === 'g' ? ' g' : ''}`)
  .join(' · ')
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
</script>

<template>
  <div>
    <AppHeader
      :title="selected ? scheduleTitle(selected) : t('manage.feeding.title')"
      :subtitle="selected ? (selected.custom ? t('kit.custom') : t('manage.feeding.official')) : t('manage.feeding.subtitle')"
      back
    >
      <template
        v-if="!selected"
        #actions
      >
        <button
          type="button"
          class="icon-btn accent"
          :aria-label="t('manage.feeding.new')"
          @click="edit(null)"
        >
          <UIcon name="i-tabler-plus" />
        </button>
      </template>
    </AppHeader>

    <!-- Schedule detail -->
    <div
      v-if="selected"
      :key="selected.id"
      class="page rise"
    >
      <section class="card pad detail-head">
        <div class="media">
          <span
            v-for="m in selected.media"
            :key="m"
            class="badge"
          >{{ t(`kit.media.${m}`) }}</span>
          <span class="badge muted-badge">{{ t('manage.feeding.weeks', { n: weekCount(selected) }) }}</span>
        </div>
        <p
          v-if="scheduleNotes(selected)"
          class="notes"
        >
          {{ scheduleNotes(selected) }}
        </p>
        <p
          v-if="selected.source"
          class="source"
        >
          {{ t('manage.feeding.source') }}
          <a
            :href="selected.source.url"
            target="_blank"
            rel="noopener noreferrer"
            class="link"
          >{{ hostOf(selected.source.url) }}<UIcon
            name="i-tabler-external-link"
            class="size-4"
          /></a>
          · {{ t('manage.feeding.checked', { date: formatDate(selected.source.checked) }) }}
        </p>
        <div class="actions">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!growing.length"
            @click="assign([], selected.id)"
          >
            {{ t('manage.feeding.assign') }}
          </button>
          <button
            type="button"
            class="btn"
            @click="edit(selected)"
          >
            {{ selected.custom ? t('common.edit') : t('manage.feeding.copy') }}
          </button>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('manage.feeding.chart') }}
          </h2>
          <span class="section-meta">{{ t('manage.feeding.perLitre') }}</span>
        </div>
        <ol class="card weeks">
          <li
            v-for="(w, i) in sortedWeeks(selected)"
            :key="i"
          >
            <div class="week-top">
              <strong>{{ feedWeekLabel(w.phase, w.n) }}</strong>
              <span
                v-if="w.ec != null"
                class="num ec"
              >EC {{ formatNumber(w.ec, 2) }}</span>
            </div>
            <p class="num doses">
              {{ doseList(selected, w.doses) || t('kit.plainWater') }}
            </p>
            <p
              v-if="localized(w.note)"
              class="week-note"
            >
              {{ localized(w.note) }}
            </p>
          </li>
        </ol>
        <p
          v-if="selected.products.some(p => p.unit === 'g')"
          class="hint"
        >
          {{ t('manage.feeding.gramHint', { names: selected.products.filter(p => p.unit === 'g').map(p => p.name).join(', ') }) }}
        </p>
        <p
          v-if="!selected.custom"
          class="hint"
        >
          {{ t('manage.feeding.disclaimer') }}
        </p>
      </section>

      <button
        v-if="selected.custom"
        type="button"
        class="btn btn-danger btn-block"
        @click="remove(selected)"
      >
        {{ t('manage.feeding.delete') }}
      </button>
    </div>

    <!-- Overview -->
    <div
      v-else
      class="page rise"
    >
      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('manage.feeding.plants') }}
          </h2>
        </div>
        <EmptyState
          v-if="!growing.length"
          icon="plants"
          :title="t('manage.feeding.noPlantsTitle')"
          :text="t('manage.feeding.noPlantsText')"
        />
        <div
          v-else
          class="card list"
        >
          <div
            v-for="r in plantRows"
            :key="r.plant.id"
            class="row"
          >
            <NuxtLink
              :to="`/plants/${r.plant.id}?tab=info`"
              class="row-main"
            >
              <strong>{{ r.plant.name }}</strong>
              <span v-if="r.f">
                {{ scheduleTitle(r.f.schedule) }} · {{ r.f.current ? feedWeekLabel(r.f.current.week.phase, r.f.current.week.n) : t('kit.fill.noWeek') }}
              </span>
              <span
                v-else
                class="faint"
              >{{ t('manage.feeding.noPlan') }}</span>
              <span
                v-if="r.f?.doses.length"
                class="num dose-line"
              >{{ r.f.doses.map(d => `${d.name} ${formatNumber(d.perLitre, 2)}`).join(' · ') }}</span>
            </NuxtLink>
            <button
              v-if="r.f"
              type="button"
              class="icon-btn"
              :aria-label="t('manage.feeding.changeFor', { name: r.plant.name })"
              @click="assign([r.plant.id])"
            >
              <UIcon
                name="i-tabler-adjustments"
                class="size-5"
              />
            </button>
            <button
              v-if="r.f"
              type="button"
              class="icon-btn danger"
              :aria-label="t('manage.feeding.unassignFor', { name: r.plant.name })"
              @click="unassign(r.plant.id, r.plant.name)"
            >
              <UIcon
                name="i-tabler-x"
                class="size-4"
              />
            </button>
            <button
              v-else
              type="button"
              class="btn btn-soft compact"
              @click="assign([r.plant.id])"
            >
              {{ t('manage.feeding.assignShort') }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="feeding.custom.value.length">
        <div class="section-head">
          <h2 class="section-title">
            {{ t('manage.feeding.yours') }}
          </h2>
        </div>
        <nav class="card list">
          <NuxtLink
            v-for="s in feeding.custom.value"
            :key="s.id"
            :to="{ query: { s: s.id } }"
            class="row link-row"
          >
            <span class="row-main">
              <strong>{{ scheduleTitle(s) }}</strong>
              <span>{{ t('manage.feeding.weeks', { n: weekCount(s) }) }}<template v-if="usersOf(s.id)"> · {{ t('common.plants', { n: usersOf(s.id) }) }}</template></span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 go"
            />
          </NuxtLink>
        </nav>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('manage.feeding.brands') }}
          </h2>
          <span class="section-meta">{{ t('manage.feeding.brandsMeta') }}</span>
        </div>
        <nav class="card list">
          <NuxtLink
            v-for="s in bundled"
            :key="s.id"
            :to="{ query: { s: s.id } }"
            class="row link-row"
          >
            <span class="row-main">
              <strong>{{ scheduleTitle(s) }}</strong>
              <span>{{ s.media.map(m => t(`kit.media.${m}`)).join(', ') }} · {{ t('manage.feeding.weeks', { n: weekCount(s) }) }}<template v-if="usersOf(s.id)"> · {{ t('common.plants', { n: usersOf(s.id) }) }}</template></span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 go"
            />
          </NuxtLink>
        </nav>
        <p class="hint">
          {{ t('manage.feeding.disclaimer') }}
        </p>
      </section>

      <button
        type="button"
        class="btn btn-block"
        @click="edit(null)"
      >
        <UIcon
          name="i-tabler-plus"
          class="size-4"
        /> {{ t('manage.feeding.new') }}
      </button>
    </div>

    <KitAssignSheet
      v-model:open="assignOpen"
      :plant-ids="assignPlants"
      :schedule-id="assignSchedule"
    />
    <KitScheduleEditor
      v-model:open="editorOpen"
      :draft="draft"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.pad {
  padding: 16px;
}

.detail-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.media {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--green);
}

.muted-badge {
  color: var(--text-2);
}

.notes {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.source {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-3);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.weeks {
  margin: 0;
  padding: 0;
  list-style: none;
}

.weeks li {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weeks li + li {
  border-top: 1px solid var(--line);
}

.week-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
}

.week-top strong {
  font-weight: 600;
}

.ec {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.doses {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

.week-note {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}

.list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 10px 12px 10px 14px;
  color: inherit;
  text-decoration: none;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.link-row:active {
  background: var(--surface-2);
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: inherit;
  text-decoration: none;
  font-size: 13px;
  color: var(--text-2);
}

.row-main strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.faint {
  color: var(--text-3);
}

.dose-line {
  font-size: 12px;
  color: var(--text-3);
}

.go {
  flex-shrink: 0;
  color: var(--text-3);
}

.compact {
  min-height: 40px;
  padding: 0 14px;
  font-size: 14px;
}
</style>
