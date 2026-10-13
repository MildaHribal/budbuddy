<script setup lang="ts">
import type { EnvTarget } from '~/types/environment'
import { MODEL_LABEL } from '~/utils/env/bleParsers'
import { ago, METRIC_COLOR, timeLabel } from '~/utils/env/format'
import { seriesOf, statsOf, thin, type Metric } from '~/utils/env/readings'

const { t } = useI18n()
const route = useRoute()
const envApi = useEnvironment()
const ha = useHomeAssistant()
const { notify } = useNotify()
const { confirm } = useConfirm()

const sensor = computed(() => envApi.env.value.sensors.find(s => s.id === route.params.id) ?? null)
useHead({ title: () => sensor.value?.name ?? t('environment.sensor.notFound') })

const leafOffset = useLocalStorage('budbuddy:vpd-leaf', -2)
const leaf = computed(() => Number(leafOffset.value) || -2)

type Range = 'day' | 'week' | 'month'
const RANGES: Record<Range, number> = { day: 86_400_000, week: 7 * 86_400_000, month: 30 * 86_400_000 }
const range = useLocalStorage<Range>('budbuddy:env-range', 'day')
const now = ref(Date.now())
const from = computed(() => now.value - RANGES[range.value])

const target = computed(() => (sensor.value ? envApi.targetFor(sensor.value.target) : null))
const stage = computed(() => (sensor.value ? envApi.targetStage(sensor.value.target) : null))
const latest = computed(() => (sensor.value ? envApi.latest(sensor.value.id) : null))
const latestVpd = computed(() => {
  const r = latest.value
  return r && r.c !== null && r.h !== null ? vpd(r.c, r.h, leaf.value) : null
})

const METRICS: { id: Metric, unit: string, digits: number }[] = [
  { id: 'vpd', unit: ' kPa', digits: 2 },
  { id: 'temp', unit: ' °C', digits: 1 },
  { id: 'rh', unit: ' %', digits: 0 }
]

const series = computed(() => {
  const s = sensor.value
  if (!s) return []
  return METRICS.map((m) => {
    const raw = seriesOf(envApi.env.value.readings, s.id, m.id, from.value, leaf.value)
    const band = m.id === 'vpd' ? target.value : null
    return { ...m, points: thin(raw, 180), stats: statsOf(raw, band), band, color: METRIC_COLOR[m.id] }
  }).filter(x => x.points.length)
})
const hasData = computed(() => series.value.length > 0)

// table view: newest first, one row per thinned point
const tableRows = computed(() => {
  const s = sensor.value
  if (!s) return []
  const rows = new Map<number, { t: number, c: number | null, h: number | null, v: number | null }>()
  const temp = thin(seriesOf(envApi.env.value.readings, s.id, 'temp', from.value), 48)
  const hum = thin(seriesOf(envApi.env.value.readings, s.id, 'rh', from.value), 48)
  for (const p of temp) rows.set(p.t, { t: p.t, c: p.v, h: null, v: null })
  for (const p of hum) {
    const r = [...rows.values()].find(x => Math.abs(x.t - p.t) < 30 * 60_000)
    if (r) r.h = p.v
    else rows.set(p.t, { t: p.t, c: null, h: p.v, v: null })
  }
  for (const r of rows.values()) if (r.c !== null && r.h !== null) r.v = vpd(r.c, r.h, leaf.value)
  return [...rows.values()].sort((a, b) => b.t - a.t)
})

// ── edit ────────────────────────────────────────────────────────────
const editOpen = ref(false)
const editName = ref('')
const editTarget = ref<EnvTarget>({ type: 'tent' })
const readingOpen = ref(false)

function openEdit() {
  if (!sensor.value) return
  editName.value = sensor.value.name
  editTarget.value = { ...sensor.value.target }
  editOpen.value = true
}

function saveEdit() {
  if (!sensor.value) return
  envApi.updateSensor(sensor.value.id, { name: editName.value.trim() || sensor.value.name, target: editTarget.value })
  editOpen.value = false
}

async function remove() {
  const s = sensor.value
  if (!s) return
  const ok = await confirm({ title: t('environment.sensor.removeConfirm', { name: s.name }), message: t('environment.sensor.removeText'), confirmLabel: t('environment.sensor.remove'), danger: true })
  if (!ok) return
  editOpen.value = false
  envApi.removeSensor(s.id)
  notify(t('environment.sensor.removed'))
  navigateTo('/environment/sensors', { replace: true })
}

// ── Home Assistant history ─────────────────────────────────────────
const importing = ref(false)
async function importHa(days: number) {
  if (!sensor.value) return
  importing.value = true
  try {
    const n = await ha.importHistory(sensor.value, days)
    notify(t('environment.sensor.imported', { n }))
  } catch {
    notify(t('environment.sensor.importFailed'), { tone: 'error' })
  } finally {
    importing.value = false
    now.value = Date.now()
  }
}

const KIND_LABEL = computed(() => (sensor.value ? t(`environment.sensors.kinds.${sensor.value.kind}`) : ''))

let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (sensor.value?.kind === 'ble' && bleSupported() && localStorage.getItem(BLE_LIVE_KEY) !== 'false') useBleSensors().start('log')
  if (sensor.value?.kind === 'ha') ha.sync().catch(() => {})
  tick = setInterval(() => (now.value = Date.now()), 60_000)
})
onBeforeUnmount(() => clearInterval(tick))
</script>

<template>
  <div>
    <AppHeader
      :title="sensor?.name ?? t('environment.sensor.notFound')"
      :subtitle="sensor ? `${envApi.targetLabel(sensor.target)} · ${KIND_LABEL}` : undefined"
      back
    >
      <template
        v-if="sensor"
        #actions
      >
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('environment.sensor.edit')"
          @click="openEdit"
        >
          <UIcon
            name="i-tabler-pencil"
            class="size-5"
          />
        </button>
      </template>
    </AppHeader>

    <div
      v-if="!sensor"
      class="page"
    >
      <EmptyState
        icon="measure"
        :title="t('environment.sensor.notFound')"
      >
        <NuxtLink
          to="/environment/sensors"
          class="btn"
        >{{ t('environment.sensors.title') }}</NuxtLink>
      </EmptyState>
    </div>

    <div
      v-else
      class="page rise"
    >
      <!-- latest -->
      <section class="card tiles">
        <div class="tile">
          <span class="tile-label">{{ t('environment.metric.temp') }}</span>
          <strong class="tile-value num">{{ latest?.c != null ? `${formatNumber(latest.c, 1)} °C` : '–' }}</strong>
        </div>
        <div class="tile">
          <span class="tile-label">{{ t('environment.metric.rh') }}</span>
          <strong class="tile-value num">{{ latest?.h != null ? `${formatNumber(latest.h, 0)} %` : '–' }}</strong>
        </div>
        <div class="tile">
          <span class="tile-label">{{ t('environment.metric.vpd') }}</span>
          <strong class="tile-value num">
            <template v-if="latestVpd !== null">
              <i
                class="zone-dot"
                :style="{ background: vpdZone(latestVpd).color }"
                aria-hidden="true"
              />{{ formatNumber(latestVpd, 2) }}
            </template>
            <template v-else>–</template>
          </strong>
          <span
            v-if="latestVpd !== null"
            class="tile-sub"
          >{{ vpdZone(latestVpd).label }}</span>
        </div>
        <p class="tiles-foot">
          <template v-if="sensor.lastSeen">
            {{ t('environment.sensor.lastSeen', { when: ago(sensor.lastSeen, now) }) }}
          </template>
          <template v-else>
            {{ t('environment.sensors.noReading') }}
          </template>
          <template v-if="sensor.model">
            · {{ MODEL_LABEL[sensor.model] }}
          </template>
          <template v-if="sensor.battery != null">
            · {{ t('environment.sensors.battery', { n: sensor.battery }) }}
          </template>
        </p>
      </section>

      <div class="actions">
        <button
          type="button"
          class="btn btn-soft"
          @click="readingOpen = true"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-5"
          />
          {{ t('environment.sensor.addReading') }}
        </button>
      </div>

      <!-- range -->
      <div
        class="segmented"
        role="group"
        :aria-label="t('environment.sensors.title')"
      >
        <button
          v-for="r in (['day', 'week', 'month'] as const)"
          :key="r"
          type="button"
          :aria-pressed="range === r"
          @click="range = r"
        >
          {{ t(`environment.sensor.range.${r}`) }}
        </button>
      </div>

      <EmptyState
        v-if="!hasData"
        icon="i-tabler-chart-line"
        :title="t('environment.sensor.noData')"
        :text="t('environment.sensor.noDataText')"
      />

      <section
        v-for="s in series"
        :key="s.id"
        class="card chart-card"
        :aria-labelledby="`chart-${s.id}`"
      >
        <div class="chart-head">
          <h2
            :id="`chart-${s.id}`"
            class="chart-title"
          >
            <i
              class="key"
              :style="{ background: s.color }"
              aria-hidden="true"
            />
            {{ t(`environment.metric.${s.id}`) }}
          </h2>
          <span
            v-if="s.stats"
            class="chart-stats num"
          >
            {{ t('environment.sensor.min') }} {{ formatNumber(s.stats.min, s.digits) }} · {{ t('environment.sensor.avg') }} {{ formatNumber(s.stats.avg, s.digits) }} · {{ t('environment.sensor.max') }} {{ formatNumber(s.stats.max, s.digits) }}
          </span>
        </div>
        <EnvironmentTimeChart
          :points="s.points"
          :label="`${t(`environment.metric.${s.id}`)}: ${formatNumber(s.points[s.points.length - 1]!.v, s.digits)}${s.unit}`"
          :unit="s.unit"
          :digits="s.digits"
          :color="s.color"
          :band="s.band"
          :band-color="stage === 'flowering' ? '#b58cf5' : 'var(--green)'"
          :from="from"
          :to="now"
        />
        <p
          v-if="s.id === 'vpd'"
          class="chart-note"
        >
          <template v-if="s.band && stage">
            {{ t('environment.sensor.target', { min: formatNumber(s.band.min, 1), max: formatNumber(s.band.max, 1), stage: stageInfo(stage).label.toLowerCase() }) }}
            <template v-if="s.stats?.inTarget != null">
              · {{ t('environment.sensor.inTarget', { p: Math.round(s.stats.inTarget * 100) }) }}
            </template>
          </template>
          <template v-else>
            {{ t('environment.sensor.noTarget') }}
          </template>
          <span class="leaf">{{ t('environment.sensor.leafNote', { o: formatNumber(Math.abs(leaf), 1) }) }}</span>
        </p>
      </section>

      <details
        v-if="hasData"
        class="card table-wrap"
      >
        <summary>
          <span>{{ t('environment.sensor.table') }}</span>
          <UIcon
            name="i-tabler-chevron-down"
            class="size-4 chev"
          />
        </summary>
        <table class="tabular">
          <thead>
            <tr>
              <th scope="col">
                {{ t('environment.sensor.time') }}
              </th>
              <th scope="col">
                °C
              </th>
              <th scope="col">
                %
              </th>
              <th scope="col">
                kPa
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in tableRows"
              :key="r.t"
            >
              <td>{{ timeLabel(r.t, range !== 'day') }}</td>
              <td>{{ formatNumber(r.c, 1) }}</td>
              <td>{{ formatNumber(r.h, 0) }}</td>
              <td>{{ formatNumber(r.v, 2) }}</td>
            </tr>
          </tbody>
        </table>
      </details>

      <section
        v-if="sensor.kind === 'ha'"
        class="card ha-import"
      >
        <h2 class="chart-title">
          {{ t('environment.sensor.importHa') }}
        </h2>
        <div class="ha-buttons">
          <button
            v-for="d in [7, 30]"
            :key="d"
            type="button"
            class="btn"
            :disabled="importing || !ha.config.value"
            @click="importHa(d)"
          >
            {{ t('environment.sensor.importDays', { n: d }) }}
          </button>
        </div>
        <p
          v-if="!ha.config.value"
          class="chart-note"
        >
          {{ t('environment.add.haFirst') }}
        </p>
      </section>
    </div>

    <EnvironmentReadingSheet
      v-if="sensor"
      v-model:open="readingOpen"
      :sensor-id="sensor.id"
    />

    <BottomSheet
      v-model:open="editOpen"
      :title="t('environment.sensor.edit')"
      icon="i-tabler-pencil"
    >
      <form
        class="form-stack"
        @submit.prevent="saveEdit"
      >
        <label class="field">
          <span class="field-label">{{ t('environment.add.name') }}</span>
          <input
            v-model="editName"
            class="input"
            maxlength="40"
          >
        </label>
        <EnvironmentTargetSelect v-model="editTarget" />
        <button
          type="submit"
          class="btn btn-primary btn-block"
        >
          {{ t('common.save') }}
        </button>
        <button
          type="button"
          class="btn btn-danger btn-block"
          @click="remove"
        >
          {{ t('environment.sensor.remove') }}
        </button>
      </form>
    </BottomSheet>
  </div>
</template>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 14px 0 0;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 14px 12px;
  min-width: 0;
}

.tile + .tile {
  border-left: 1px solid var(--line);
}

.tile-label {
  font-size: 12px;
  color: var(--text-3);
}

.tile-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.tile-sub {
  font-size: 12px;
  color: var(--text-2);
}

.zone-dot,
.key {
  display: inline-block;
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.key {
  width: 14px;
  height: 3px;
  border-radius: 2px;
}

.tiles-foot {
  grid-column: 1 / -1;
  margin: 0;
  padding: 10px 14px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--text-3);
}

.actions {
  display: flex;
  gap: 10px;
}

.actions .btn {
  flex: 1;
}

.chart-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chart-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.chart-stats {
  font-size: 12px;
  color: var(--text-3);
}

.chart-note {
  margin: 0;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}

.leaf {
  display: block;
  color: var(--text-3);
}

.table-wrap summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 0 14px;
  font-weight: 600;
  list-style: none;
  cursor: pointer;
}

.table-wrap summary::-webkit-details-marker {
  display: none;
}

.table-wrap[open] .chev {
  transform: rotate(180deg);
}

.chev {
  color: var(--text-3);
  transition: transform var(--dur) var(--ease-out);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 8px 14px;
  text-align: right;
  border-top: 1px solid var(--line);
}

th:first-child,
td:first-child {
  text-align: left;
}

th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
}

.ha-import {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ha-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
