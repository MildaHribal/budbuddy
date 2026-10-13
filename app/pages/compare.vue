<script setup lang="ts">
import type { Plant } from '~/types/grow'
import { daySeries, nearestFrame, runSummary, type RunSummary } from '~/utils/review/compare'
import { stageOn, timelapseFrames } from '~/utils/review/timelapse'

const { t } = useI18n()
const grow = useGrow()
const route = useRoute()
const today = useToday()
useHead({ title: () => t('review.compare.title') })

const COLOR_A = 'var(--green)'
const COLOR_B = '#b58cf5'

const plants = computed(() => [...grow.state.plants].sort((x, y) => y.startDate.localeCompare(x.startDate)))
const valid = (id: unknown) => typeof id === 'string' && plants.value.some(p => p.id === id)

const aId = computed({
  get: () => (valid(route.query.a) ? String(route.query.a) : plants.value[0]?.id ?? ''),
  set: v => setQuery({ a: v })
})
const bId = computed({
  get: () => {
    if (valid(route.query.b) && route.query.b !== aId.value) return String(route.query.b)
    // default to the newest finished run, else any other plant
    const others = plants.value.filter(p => p.id !== aId.value)
    return (others.find(p => p.harvest) ?? others[0])?.id ?? ''
  },
  set: v => setQuery({ b: v })
})

function setQuery(patch: Record<string, string>) {
  navigateTo({ query: { ...route.query, a: aId.value, b: bId.value, ...patch } }, { replace: true })
}

function swap() {
  navigateTo({ query: { ...route.query, a: bId.value, b: aId.value } }, { replace: true })
}

const a = computed(() => grow.getPlant(aId.value) ?? null)
const b = computed(() => grow.getPlant(bId.value) ?? null)

interface Side {
  plant: Plant
  summary: RunSummary
  frames: ReturnType<typeof timelapseFrames>
}

const side = (p: Plant | null): Side | null => (p ? { plant: p, summary: runSummary(p, grow.state.entries, today.value), frames: timelapseFrames(p, grow.state.entries) } : null)
const A = computed(() => side(a.value))
const B = computed(() => side(b.value))
const maxDay = computed(() => Math.max(A.value?.summary.length ?? 0, B.value?.summary.length ?? 0, 1))

// ── Timeline ──────────────────────────────────────────────────────
const ticks = computed(() => {
  const days = maxDay.value
  const step = days > 140 ? 28 : days > 56 ? 14 : 7
  const out: number[] = []
  for (let d = 0; d <= days; d += step) out.push(d)
  return out
})
const pct = (d: number) => `${Math.min(100, (d / (maxDay.value + 1)) * 100)}%`

// ── Numbers ───────────────────────────────────────────────────────
type Better = boolean | null
interface Row { key: string, a: number | null, b: number | null, digits: number, unit: string, higher: Better, warm?: boolean }

const rows = computed<Row[]>(() => {
  const x = A.value?.summary
  const y = B.value?.summary
  if (!x || !y) return []
  const perDay = (s: RunSummary) => (s.dry != null && s.length > 0 ? s.dry / (s.length + 1) : null)
  return [
    { key: 'length', a: x.length + 1, b: y.length + 1, digits: 0, unit: '', higher: null },
    { key: 'veg', a: x.vegDays, b: y.vegDays, digits: 0, unit: '', higher: null },
    { key: 'flower', a: x.flowerDays, b: y.flowerDays, digits: 0, unit: '', higher: null },
    { key: 'harvestDay', a: x.harvestDay, b: y.harvestDay, digits: 0, unit: '', higher: null },
    { key: 'waterings', a: x.waterings, b: y.waterings, digits: 0, unit: '', higher: null },
    { key: 'feeds', a: x.feeds, b: y.feeds, digits: 0, unit: '', higher: null },
    { key: 'trainings', a: x.trainings, b: y.trainings, digits: 0, unit: '', higher: null },
    { key: 'water', a: x.waterLitres || null, b: y.waterLitres || null, digits: 1, unit: 'L', higher: null },
    { key: 'ec', a: x.avgEc, b: y.avgEc, digits: 2, unit: '', higher: null },
    { key: 'ph', a: x.avgPh, b: y.avgPh, digits: 2, unit: '', higher: null },
    { key: 'height', a: x.maxHeight, b: y.maxHeight, digits: 1, unit: 'cm', higher: null },
    { key: 'wet', a: x.wet, b: y.wet, digits: 1, unit: 'g', higher: true, warm: true },
    { key: 'dry', a: x.dry, b: y.dry, digits: 1, unit: 'g', higher: true, warm: true },
    { key: 'perDay', a: perDay(x), b: perDay(y), digits: 2, unit: 'g', higher: true, warm: true }
  ]
})

const fmt = (v: number | null, digits: number, unit: string) => (v == null ? '–' : `${formatNumber(v, digits)}${unit ? ` ${unit}` : ''}`)
const wins = (r: Row, which: 'a' | 'b') => {
  if (r.higher === null || r.a == null || r.b == null || r.a === r.b) return false
  return which === 'a' ? r.a > r.b : r.b > r.a
}

// ── Charts ────────────────────────────────────────────────────────
const series = (key: 'heightCm' | 'ec' | 'ph') => ({
  a: a.value ? daySeries(a.value, grow.state.entries, key) : [],
  b: b.value ? daySeries(b.value, grow.state.entries, key) : []
})
const height = computed(() => series('heightCm'))
const ec = computed(() => series('ec'))
const ph = computed(() => series('ph'))

// ── Same-day photos ───────────────────────────────────────────────
const photoDay = ref(0)
const photoDays = computed(() => [...new Set([...(A.value?.frames ?? []), ...(B.value?.frames ?? [])].map(f => f.day))].sort((x, y) => x - y))
watch([aId, bId], () => {
  const days = photoDays.value
  photoDay.value = days.length ? days[Math.floor(days.length / 2)]! : 0
}, { immediate: true })
const photoA = computed(() => (A.value ? nearestFrame(A.value.frames, photoDay.value) : null))
const photoB = computed(() => (B.value ? nearestFrame(B.value.frames, photoDay.value) : null))
const stageAt = (s: Side | null, day: number) => (s && day <= s.summary.length ? stageInfo(stageOn(s.plant, addDays(s.plant.startDate, day))) : null)
</script>

<template>
  <div>
    <AppHeader
      :title="t('review.compare.title')"
      :subtitle="t('review.compare.subtitle')"
      back
    />

    <div
      v-if="plants.length < 2"
      class="page rise"
    >
      <EmptyState
        icon="plants"
        :title="t('review.compare.emptyTitle')"
        :text="t('review.compare.emptyText')"
      />
      <NuxtLink
        to="/plants/new"
        class="btn btn-primary"
      >
        <UIcon
          name="i-tabler-plus"
          class="size-5"
        /> {{ t('review.compare.addPlant') }}
      </NuxtLink>
    </div>

    <div
      v-else-if="A && B"
      class="page rise"
    >
      <section
        class="card pickers"
        :aria-label="t('review.compare.pick')"
      >
        <label class="picker">
          <span
            class="swatch"
            :style="{ background: COLOR_A }"
            aria-hidden="true"
          />
          <span class="sr-only">{{ t('review.compare.plantA') }}</span>
          <select
            v-model="aId"
            class="input"
          >
            <option
              v-for="p in plants"
              :key="p.id"
              :value="p.id"
              :disabled="p.id === bId"
            >{{ p.name }}{{ p.strain ? ` · ${p.strain}` : '' }}</option>
          </select>
        </label>
        <button
          type="button"
          class="icon-btn swap"
          :aria-label="t('review.compare.swap')"
          @click="swap"
        >
          <UIcon
            name="i-tabler-arrows-up-down"
            class="size-5"
          />
        </button>
        <label class="picker">
          <span
            class="swatch square"
            :style="{ background: COLOR_B }"
            aria-hidden="true"
          />
          <span class="sr-only">{{ t('review.compare.plantB') }}</span>
          <select
            v-model="bId"
            class="input"
          >
            <option
              v-for="p in plants"
              :key="p.id"
              :value="p.id"
              :disabled="p.id === aId"
            >{{ p.name }}{{ p.strain ? ` · ${p.strain}` : '' }}</option>
          </select>
        </label>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('review.compare.timeline') }}
          </h2>
          <span class="section-meta">{{ t('review.compare.byDay') }}</span>
        </div>
        <div class="card block">
          <div
            v-for="(s, i) in [A, B]"
            :key="s.plant.id"
            class="lane"
          >
            <div class="lane-head">
              <span
                class="swatch"
                :class="{ square: i === 1 }"
                :style="{ background: i === 0 ? COLOR_A : COLOR_B }"
                aria-hidden="true"
              />
              <NuxtLink
                :to="`/plants/${s.plant.id}`"
                class="lane-name"
              >{{ s.plant.name }}</NuxtLink>
              <span class="lane-days num">{{ t('review.common.days', { n: s.summary.length + 1 }) }}</span>
            </div>
            <div
              class="bar"
              role="img"
              :aria-label="s.summary.segments.map(g => `${stageInfo(g.stage).label} ${t('review.common.days', { n: g.to - g.from })}`).join(', ')"
            >
              <span
                v-for="g in s.summary.segments"
                :key="`${g.stage}${g.from}`"
                class="seg"
                :style="{ left: pct(g.from), width: `calc(${pct(Math.max(1, g.to - g.from))} - 2px)`, background: stageInfo(g.stage).color }"
              />
              <span
                v-if="s.summary.harvestDay != null"
                class="harvest-mark"
                :style="{ left: pct(s.summary.harvestDay) }"
                :title="t('review.compare.harvestOn', { n: s.summary.harvestDay })"
              />
            </div>
          </div>
          <div
            class="ticks"
            aria-hidden="true"
          >
            <span
              v-for="d in ticks"
              :key="d"
              class="tick num"
              :style="{ left: pct(d) }"
            >{{ d }}</span>
          </div>
          <div class="legend">
            <span
              v-for="st in stages().filter(st => [A, B].some(s => s!.summary.segments.some(g => g.stage === st.id)))"
              :key="st.id"
              class="legend-item"
            >
              <span
                class="legend-dot"
                :style="{ background: st.color }"
              /> {{ st.short }}
            </span>
            <span class="legend-item">
              <span class="legend-dot harvest" /> {{ t('review.compare.harvest') }}
            </span>
          </div>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('review.compare.numbers') }}
          </h2>
        </div>
        <div class="card table-card">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">
                  <span class="sr-only">{{ t('review.compare.metric') }}</span>
                </th>
                <th scope="col">
                  <span
                    class="swatch"
                    :style="{ background: COLOR_A }"
                    aria-hidden="true"
                  /> <span class="th-name">{{ A.plant.name }}</span>
                </th>
                <th scope="col">
                  <span
                    class="swatch square"
                    :style="{ background: COLOR_B }"
                    aria-hidden="true"
                  /> <span class="th-name">{{ B.plant.name }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in rows"
                :key="r.key"
              >
                <th scope="row">
                  {{ t(`review.compare.rows.${r.key}`) }}
                </th>
                <td
                  class="tabular"
                  :class="{ win: wins(r, 'a'), warm: r.warm && r.a != null }"
                >
                  {{ fmt(r.a, r.digits, r.unit) }}
                </td>
                <td
                  class="tabular"
                  :class="{ win: wins(r, 'b'), warm: r.warm && r.b != null }"
                >
                  {{ fmt(r.b, r.digits, r.unit) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('review.compare.charts') }}
          </h2>
          <span class="section-meta">{{ t('review.compare.tapChart') }}</span>
        </div>
        <div class="card block charts">
          <ReviewDualChart
            :a="height.a"
            :b="height.b"
            :max-day="maxDay"
            :label="t('review.compare.height')"
            unit="cm"
            :digits="0"
            :color-a="COLOR_A"
            :color-b="COLOR_B"
            :name-a="A.plant.name"
            :name-b="B.plant.name"
          />
          <ReviewDualChart
            :a="ec.a"
            :b="ec.b"
            :max-day="maxDay"
            :label="t('review.compare.ec')"
            :digits="1"
            :color-a="COLOR_A"
            :color-b="COLOR_B"
            :name-a="A.plant.name"
            :name-b="B.plant.name"
          />
          <ReviewDualChart
            :a="ph.a"
            :b="ph.b"
            :max-day="maxDay"
            :label="t('review.compare.ph')"
            :digits="1"
            :color-a="COLOR_A"
            :color-b="COLOR_B"
            :name-a="A.plant.name"
            :name-b="B.plant.name"
          />
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('review.compare.sameDay') }}
          </h2>
          <span class="section-meta num">{{ t('review.timelapse.day', { n: photoDay }) }}</span>
        </div>
        <div class="card block">
          <div class="pair">
            <figure
              v-for="(s, i) in [A, B]"
              :key="s.plant.id"
              class="pair-cell"
            >
              <div class="pair-photo">
                <PlantPhoto
                  v-if="(i === 0 ? photoA : photoB)"
                  :photo-id="(i === 0 ? photoA : photoB)!.photoId"
                  :stage="(i === 0 ? photoA : photoB)!.stage"
                  size="full"
                  :alt="s.plant.name"
                />
                <span
                  v-else
                  class="pair-none"
                >{{ t('review.compare.noPhoto') }}</span>
              </div>
              <figcaption>
                <span
                  class="swatch"
                  :class="{ square: i === 1 }"
                  :style="{ background: i === 0 ? COLOR_A : COLOR_B }"
                  aria-hidden="true"
                />
                <span class="num">{{ (i === 0 ? photoA : photoB) ? t('review.timelapse.day', { n: (i === 0 ? photoA : photoB)!.day }) : '–' }}</span>
                <span
                  v-if="stageAt(s, photoDay)"
                  class="pair-stage"
                  :style="{ color: stageAt(s, photoDay)!.color }"
                >{{ stageAt(s, photoDay)!.short }}</span>
              </figcaption>
            </figure>
          </div>
          <input
            v-model.number="photoDay"
            class="rv-range"
            type="range"
            min="0"
            :max="maxDay"
            step="1"
            :aria-label="t('review.compare.dayAria')"
          >
          <p class="field-hint">
            {{ t('review.compare.sameDayHint') }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style src="~/components/review/review.css"></style>

<style scoped>
.pickers {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 12px;
  position: relative;
}

.picker {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 52px;
}

.picker .input {
  flex: 1;
  min-width: 0;
}

.swap {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.swap:active {
  transform: translateY(-50%) scale(0.94);
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  vertical-align: middle;
}

.swatch.square {
  border-radius: 2px;
}

.block {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lane {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lane-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.lane-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
}

.lane-days {
  font-size: 13px;
  color: var(--text-3);
}

.bar {
  position: relative;
  height: 20px;
  border-radius: 6px;
  background: var(--well);
}

.seg {
  position: absolute;
  top: 0;
  bottom: 0;
  margin-left: 1px;
  border-radius: 5px;
}

.harvest-mark {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 3px;
  margin-left: -1px;
  border-radius: 2px;
  background: var(--amber);
}

.ticks {
  position: relative;
  height: 14px;
  margin-top: -6px;
}

.tick {
  position: absolute;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--text-3);
}

.tick:first-child {
  transform: none;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 12px;
  color: var(--text-2);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 14px;
  height: 6px;
  border-radius: 3px;
}

.legend-dot.harvest {
  width: 3px;
  height: 12px;
  background: var(--amber);
}

.table-card {
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}

.table th,
.table td {
  padding: 10px 12px;
  text-align: left;
  border-top: 1px solid var(--line);
}

.table thead th {
  border-top: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table thead th:first-child {
  width: 38%;
}

.th-name {
  vertical-align: middle;
}

.table tbody th {
  font-weight: 400;
  color: var(--text-2);
}

.table td {
  font-weight: 600;
  white-space: nowrap;
}

.table td.warm {
  color: var(--amber);
}

.table td.win::after {
  content: "";
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 6px;
  border-radius: 50%;
  background: currentColor;
  vertical-align: middle;
}

.charts {
  gap: 18px;
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.pair-cell {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.pair-photo {
  aspect-ratio: 4 / 5;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-2);
  display: grid;
  place-items: center;
}

.pair-photo > * {
  width: 100%;
  height: 100%;
}

.pair-none {
  display: grid;
  place-items: center;
  padding: 12px;
  font-size: 12px;
  color: var(--text-3);
  text-align: center;
}

.pair-cell figcaption {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.pair-stage {
  margin-left: auto;
  font-size: 12px;
}
</style>
