<script setup lang="ts">
import type { PhenoCriterion } from '~/types/grow'

const route = useRoute()
const { t } = useI18n()
const grow = useGrow()
const { notify } = useNotify()
const { confirm } = useConfirm()
const { getHunt, updateHunt, deleteHunt, restoreHunt } = useHunts()

const hunt = computed(() => getHunt(String(route.params.id)))
useHead({ title: () => hunt.value?.name ?? t('hunts.title') })

type Tab = 'score' | 'compare'
const tab = ref<Tab>('score')

const ranked = computed(() => (hunt.value ? rankCandidates(hunt.value) : []))
const best = computed(() => (hunt.value ? bestPerCriterion(hunt.value) : {}))
const activeCriteria = computed(() => (hunt.value ? PHENO_CRITERIA.filter(c => criterionWeight(hunt.value!, c) > 0) : []))
const plantOf = (id: string) => grow.getPlant(id)

const keeperRow = computed(() => {
  const h = hunt.value
  if (!h?.keeper) return null
  const c = h.candidates.find(x => x.plantId === h.keeper!.plantId)
  const p = c ? plantOf(c.plantId) : null
  return c && p ? { candidate: c, plant: p, role: h.keeper.role } : null
})

// ── Keeper ────────────────────────────────────────────────────────
const keeperOpen = ref(false)
const keeperPick = ref<string | null>(null)
const keeperRole = ref<'mother' | 'clone'>('mother')
function openKeeper(plantId: string) {
  keeperPick.value = plantId
  keeperRole.value = hunt.value?.keeper?.plantId === plantId ? hunt.value.keeper.role : 'mother'
  keeperOpen.value = true
}
function saveKeeper() {
  const h = hunt.value
  if (!h || !keeperPick.value) return
  updateHunt(h.id, { keeper: { plantId: keeperPick.value, role: keeperRole.value } })
  keeperOpen.value = false
  const c = h.candidates.find(x => x.plantId === keeperPick.value)
  notify(t('hunts.keeperSaved', { tag: c?.tag ?? '', name: plantOf(keeperPick.value)?.name ?? '' }), { icon: 'i-tabler-crown' })
}
function clearKeeper() {
  if (!hunt.value) return
  updateHunt(hunt.value.id, { keeper: null })
  keeperOpen.value = false
}

// ── Weights ───────────────────────────────────────────────────────
const weightsOpen = ref(false)
const draftWeights = ref<Partial<Record<PhenoCriterion, number>>>({})
function openWeights() {
  draftWeights.value = { ...hunt.value?.weights }
  weightsOpen.value = true
}
function saveWeights() {
  if (!hunt.value) return
  const w: Partial<Record<PhenoCriterion, number>> = {}
  for (const c of PHENO_CRITERIA) {
    const v = draftWeights.value[c] ?? 1
    if (v !== 1) w[c] = v
  }
  updateHunt(hunt.value.id, { weights: w })
  weightsOpen.value = false
}

// ── Menu ──────────────────────────────────────────────────────────
const editOpen = ref(false)
const moreOpen = ref(false)
function toggleDone() {
  if (!hunt.value) return
  updateHunt(hunt.value.id, { done: !hunt.value.done })
  moreOpen.value = false
  notify(hunt.value.done ? t('hunts.markedDone') : t('hunts.reopened'))
}
async function remove() {
  const h = hunt.value
  if (!h) return
  moreOpen.value = false
  const ok = await confirm({ title: t('hunts.deleteTitle', { name: h.name }), message: t('hunts.deleteMessage'), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  const removed = deleteHunt(h.id)
  navigateTo('/hunts', { replace: true })
  if (removed) notify(t('hunts.deleted'), { tone: 'info', action: { label: t('common.undo'), run: () => restoreHunt(removed) } })
}

const barWidth = (s: number | null) => `${s === null ? 0 : Math.max(4, ((s - 1) / 4) * 100)}%`
</script>

<template>
  <div v-if="hunt">
    <AppHeader
      :title="hunt.name"
      :subtitle="[hunt.strain, hunt.source].filter(Boolean).join(' · ') || undefined"
      back
    >
      <template #actions>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('hunts.form.editTitle')"
          @click="editOpen = true"
        >
          <UIcon
            name="i-tabler-pencil"
            class="size-5"
          />
        </button>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('common.more')"
          @click="moreOpen = true"
        >
          <UIcon
            name="i-tabler-dots-vertical"
            class="size-5"
          />
        </button>
      </template>
    </AppHeader>

    <div class="page">
      <NuxtLink
        v-if="keeperRow"
        :to="`/plants/${keeperRow.plant.id}`"
        class="card keeper"
      >
        <span class="keeper-photo">
          <PlantPhoto
            :photo-id="keeperRow.plant.photoId"
            :stage="keeperRow.plant.stage"
            :alt="keeperRow.plant.name"
          />
        </span>
        <span class="keeper-text">
          <span class="keeper-kicker">
            <UIcon
              name="i-tabler-crown"
              class="size-4"
            /> {{ t(`hunts.keeper.${keeperRow.role}`) }}
          </span>
          <strong>{{ keeperRow.candidate.tag }} · {{ keeperRow.plant.name }}</strong>
        </span>
        <UIcon
          name="i-tabler-chevron-right"
          class="size-5 keeper-go"
        />
      </NuxtLink>

      <div
        class="segmented"
        role="tablist"
        :aria-label="t('hunts.tabsLabel')"
      >
        <button
          v-for="tb in (['score', 'compare'] as const)"
          :key="tb"
          type="button"
          role="tab"
          :aria-selected="tab === tb"
          @click="tab = tb"
        >
          {{ t(`hunts.tabs.${tb}`) }}
        </button>
      </div>

      <EmptyState
        v-if="!hunt.candidates.length"
        icon="flowering"
        :title="t('hunts.noCandidates')"
        :text="t('hunts.noCandidatesText')"
      >
        <button
          type="button"
          class="btn btn-primary"
          @click="editOpen = true"
        >
          {{ t('hunts.form.editTitle') }}
        </button>
      </EmptyState>

      <template v-else-if="tab === 'score'">
        <p class="muted intro">
          {{ t('hunts.scoreIntro') }}
        </p>
        <PhenoCandidateCard
          v-for="c in hunt.candidates"
          :key="c.plantId"
          :hunt="hunt"
          :candidate="c"
        />
      </template>

      <template v-else>
        <section aria-labelledby="rank-title">
          <div class="section-head">
            <h2
              id="rank-title"
              class="section-title"
            >
              {{ t('hunts.ranking') }}
            </h2>
            <button
              type="button"
              class="link"
              @click="openWeights"
            >
              {{ t('hunts.weights.open') }}
            </button>
          </div>
          <ol class="card rank">
            <li
              v-for="r in ranked"
              :key="r.candidate.plantId"
              class="rank-row"
            >
              <span class="rank-n num">{{ r.rank ?? '–' }}</span>
              <span class="rank-photo">
                <PlantPhoto
                  :photo-id="plantOf(r.candidate.plantId)?.photoId"
                  :stage="plantOf(r.candidate.plantId)?.stage ?? 'vegetative'"
                />
              </span>
              <span class="rank-body">
                <span class="rank-name">
                  <strong>{{ r.candidate.tag }}</strong> {{ plantOf(r.candidate.plantId)?.name }}
                  <UIcon
                    v-if="hunt.keeper?.plantId === r.candidate.plantId"
                    name="i-tabler-crown"
                    class="size-4 crown"
                    :aria-label="t(`hunts.keeper.${hunt.keeper.role}`)"
                  />
                </span>
                <span class="progress rank-bar">
                  <span
                    class="rank-fill"
                    :style="{ width: barWidth(r.score) }"
                  />
                </span>
              </span>
              <span class="rank-score num">{{ r.score === null ? '–' : formatNumber(r.score, 1, true) }}</span>
              <button
                type="button"
                class="icon-btn keep-btn"
                :class="{ accent: hunt.keeper?.plantId === r.candidate.plantId }"
                :aria-label="t('hunts.pickKeeper', { tag: r.candidate.tag })"
                @click="openKeeper(r.candidate.plantId)"
              >
                <UIcon
                  name="i-tabler-crown"
                  class="size-5"
                />
              </button>
            </li>
          </ol>
        </section>

        <section aria-labelledby="table-title">
          <div class="section-head">
            <h2
              id="table-title"
              class="section-title"
            >
              {{ t('hunts.table') }}
            </h2>
            <span class="section-meta">{{ t('hunts.tableMeta') }}</span>
          </div>
          <div class="card table-wrap">
            <table class="cmp">
              <thead>
                <tr>
                  <th scope="col">
                    <span class="sr-only">{{ t('hunts.criterion') }}</span>
                  </th>
                  <th
                    v-for="c in hunt.candidates"
                    :key="c.plantId"
                    scope="col"
                    class="num"
                  >
                    {{ c.tag }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="k in activeCriteria"
                  :key="k"
                >
                  <th scope="row">
                    {{ t(`hunts.criteria.${k}`) }}<small v-if="criterionWeight(hunt, k) > 1"> ×{{ criterionWeight(hunt, k) }}</small>
                  </th>
                  <td
                    v-for="c in hunt.candidates"
                    :key="c.plantId"
                    class="tabular"
                    :class="{ top: c.scores[k] != null && c.scores[k] === best[k] }"
                  >
                    {{ c.scores[k] ?? '–' }}
                  </td>
                </tr>
                <tr class="facts">
                  <th scope="row">
                    {{ t('hunts.facts.flowerShort') }}
                  </th>
                  <td
                    v-for="c in hunt.candidates"
                    :key="c.plantId"
                    class="tabular"
                  >
                    {{ plantOf(c.plantId) ? (floweringDays(plantOf(c.plantId)!, todayISO()) ?? '–') : '–' }}
                  </td>
                </tr>
                <tr class="facts">
                  <th scope="row">
                    {{ t('hunts.facts.dryShort') }}
                  </th>
                  <td
                    v-for="c in hunt.candidates"
                    :key="c.plantId"
                    class="tabular"
                  >
                    {{ plantOf(c.plantId)?.harvest?.dryWeight ?? '–' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>

    <PhenoHuntSheet
      v-model:open="editOpen"
      :hunt="hunt"
    />

    <BottomSheet
      v-model:open="keeperOpen"
      :title="t('hunts.keeperTitle')"
      icon="i-tabler-crown"
    >
      <div class="form-stack">
        <p class="muted keeper-intro">
          {{ t('hunts.keeperIntro', { tag: hunt.candidates.find(c => c.plantId === keeperPick)?.tag ?? '', name: keeperPick ? plantOf(keeperPick)?.name ?? '' : '' }) }}
        </p>
        <div
          class="roles"
          role="radiogroup"
          :aria-label="t('hunts.keeperTitle')"
        >
          <button
            v-for="r in (['mother', 'clone'] as const)"
            :key="r"
            type="button"
            role="radio"
            class="role"
            :aria-checked="keeperRole === r"
            @click="keeperRole = r"
          >
            <strong>{{ t(`hunts.keeper.${r}`) }}</strong>
            <span>{{ t(`hunts.keeperHint.${r}`) }}</span>
          </button>
        </div>
        <button
          v-if="hunt.keeper?.plantId === keeperPick"
          type="button"
          class="btn btn-ghost"
          @click="clearKeeper"
        >
          {{ t('hunts.clearKeeper') }}
        </button>
      </div>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="keeperOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveKeeper"
        >
          {{ t('hunts.setKeeper') }}
        </button>
      </template>
    </BottomSheet>

    <BottomSheet
      v-model:open="weightsOpen"
      :title="t('hunts.weights.title')"
      icon="i-tabler-adjustments"
    >
      <div class="form-stack">
        <p class="muted keeper-intro">
          {{ t('hunts.weights.intro') }}
        </p>
        <div
          v-for="c in PHENO_CRITERIA"
          :key="c"
          class="weight-row"
        >
          <span class="weight-label">{{ t(`hunts.criteria.${c}`) }}</span>
          <div
            class="segmented weight-seg"
            role="group"
            :aria-label="t(`hunts.criteria.${c}`)"
          >
            <button
              v-for="w in [0, 1, 2, 3]"
              :key="w"
              type="button"
              :aria-pressed="(draftWeights[c] ?? 1) === w"
              @click="draftWeights = { ...draftWeights, [c]: w }"
            >
              {{ w === 0 ? t('hunts.weights.off') : `×${w}` }}
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="weightsOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveWeights"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>

    <BottomSheet
      v-model:open="moreOpen"
      :title="hunt.name"
    >
      <div class="menu">
        <button
          type="button"
          class="menu-item"
          @click="toggleDone"
        >
          <UIcon
            :name="hunt.done ? 'i-tabler-player-play' : 'i-tabler-flag-check'"
            class="size-5"
          /> {{ hunt.done ? t('hunts.reopen') : t('hunts.markDone') }}
        </button>
        <NuxtLink
          :to="{ path: '/labels', query: { ids: hunt.candidates.map(c => c.plantId).join(',') } }"
          class="menu-item"
        >
          <UIcon
            name="i-tabler-qrcode"
            class="size-5"
          /> {{ t('hunts.labels') }}
        </NuxtLink>
        <button
          type="button"
          class="menu-item danger"
          @click="remove"
        >
          <UIcon
            name="i-tabler-trash"
            class="size-5"
          /> {{ t('hunts.delete') }}
        </button>
      </div>
    </BottomSheet>
  </div>
  <div v-else>
    <AppHeader
      :title="t('hunts.title')"
      back
    />
    <div class="page">
      <EmptyState
        icon="flowering"
        :title="t('hunts.notFound')"
        :text="t('hunts.notFoundText')"
      >
        <NuxtLink
          to="/hunts"
          class="btn"
        >
          {{ t('hunts.all') }}
        </NuxtLink>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.intro {
  margin: 0 0 -8px;
  font-size: 13px;
}

.keeper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-color: var(--accent-line);
  color: inherit;
  text-decoration: none;
}

.keeper-photo {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: var(--radius-control);
  overflow: hidden;
}

.keeper-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.keeper-kicker {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--green);
}

.keeper-text strong {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.keeper-go {
  color: var(--text-3);
}

.rank {
  list-style: none;
  margin: 0;
  padding: 0 12px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 8px 0;
}

.rank-row + .rank-row {
  border-top: 1px solid var(--line);
}

.rank-n {
  width: 18px;
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-3);
  text-align: center;
}

.rank-row:first-child .rank-n {
  color: var(--green);
}

.rank-photo {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.rank-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rank-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-name strong {
  color: var(--text);
  font-weight: 600;
}

.crown {
  flex-shrink: 0;
  color: var(--green);
}

.rank-bar {
  display: block;
  height: 4px;
}

.rank-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--green);
  transition: width var(--dur-slow) var(--ease-out);
}

.rank-score {
  width: 34px;
  flex-shrink: 0;
  font-size: 17px;
  font-weight: 600;
  text-align: right;
}

.keep-btn {
  color: var(--text-3);
}

.table-wrap {
  overflow-x: auto;
  padding: 4px 0;
}

.cmp {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.cmp th,
.cmp td {
  padding: 10px 12px;
  text-align: center;
  white-space: nowrap;
}

.cmp thead th {
  font-size: 13px;
  font-weight: 600;
  color: var(--green);
}

.cmp tbody th {
  text-align: left;
  font-weight: 500;
  color: var(--text-2);
}

.cmp tbody th small {
  color: var(--text-3);
  font-size: 11px;
}

.cmp tbody tr {
  border-top: 1px solid var(--line);
}

.cmp td {
  color: var(--text-2);
  font-weight: 600;
}

.cmp td.top {
  color: var(--green);
}

.cmp tr.facts td,
.cmp tr.facts th {
  color: var(--text-3);
  font-weight: 500;
}

.keeper-intro {
  margin: 0;
  font-size: 14px;
}

.roles {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-control);
  background: var(--well);
  color: var(--text);
  text-align: left;
}

.role strong {
  font-weight: 600;
}

.role span {
  font-size: 13px;
  color: var(--text-3);
}

.role[aria-checked="true"] {
  border-color: transparent;
  background: var(--accent-soft);
}

.role[aria-checked="true"] strong {
  color: var(--green);
}

.weight-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.weight-label {
  font-size: 14px;
  color: var(--text-2);
}

.weight-seg {
  width: 200px;
  flex-shrink: 0;
}

.weight-seg button {
  min-height: 34px;
  font-size: 13px;
}

.menu {
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 0 6px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
}

.menu-item:last-child {
  border-bottom: 0;
}

.menu-item .iconify {
  color: var(--text-2);
}

.menu-item.danger,
.menu-item.danger .iconify {
  color: var(--red);
}
</style>
