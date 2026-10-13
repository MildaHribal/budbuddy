<script setup lang="ts">
import type { LightType } from '~/types/environment'
import { estimateLight, LIGHT_TYPES, ppfdBand, ROUGH_TYPES, type PpfdBand } from '~/utils/env/lightMeter'

const { t } = useI18n()
useHead({ title: () => `${t('environment.light.title')} · ${t('environment.title')}` })

const { state } = useGrow()
const envApi = useEnvironment()
const sensor = useLightSensor()
const { notify } = useNotify()
const route = useRoute()

const lightType = useLocalStorage<LightType>('budbuddy:light-type', 'led-white')
const calibration = useLocalStorage('budbuddy:light-calibration', 1)
const hours = ref<number | ''>(state.settings.lightHours)
const height = ref<number | ''>('')
const plantId = ref<string>(typeof route.query.plant === 'string' ? route.query.plant : '')
const manualLux = ref<number | ''>('')
const typing = ref(!sensor.native)

const plants = computed(() => state.plants.filter(p => !p.archived && isGrowing(p)))
const lux = computed(() => (typing.value ? (manualLux.value === '' ? null : Math.max(0, Number(manualLux.value))) : sensor.lux.value))
const est = computed(() => (lux.value === null ? null : estimateLight(lux.value, lightType.value, Number(hours.value) || 0, Number(calibration.value) || 1)))
const band = computed<PpfdBand | null>(() => (est.value ? ppfdBand(est.value.ppfd) : null))
const BAND_COLOR: Record<PpfdBand, string> = { low: 'var(--text-3)', seedling: '#8fd97a', veg: 'var(--green)', flower: '#b58cf5', high: 'var(--red)' }
const maxed = computed(() => !typing.value && sensor.maxLux.value && lux.value !== null && lux.value >= sensor.maxLux.value * 0.98)

const history = computed(() => [...envApi.env.value.light].reverse())
const plantName = (id: string | null) => (id ? state.plants.find(p => p.id === id)?.name ?? '' : '')

onMounted(async () => {
  if (sensor.native && await sensor.check()) {
    typing.value = false
    sensor.start()
  } else {
    typing.value = true
  }
})

function toggleSensor() {
  if (sensor.running.value) sensor.stop()
  else sensor.start()
}

function save() {
  if (lux.value === null || !est.value) return
  envApi.addLight({
    lux: Math.round(lux.value),
    source: typing.value ? 'manual' : 'sensor',
    lightType: lightType.value,
    ppfd: est.value.ppfd,
    hours: Math.min(24, Math.max(0, Number(hours.value) || 0)),
    dli: est.value.dli,
    heightCm: height.value === '' ? null : Number(height.value),
    plantId: plantId.value || null,
    note: ''
  })
  notify(t('environment.light.saved'))
}

function remove(id: string) {
  envApi.removeLight(id)
  notify(t('environment.light.deleted'))
}

const fmtTime = (iso: string) => new Date(iso).toLocaleString(intlLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div>
    <AppHeader
      :title="t('environment.light.title')"
      :subtitle="t('environment.title')"
      back
    />

    <div class="page rise">
      <!-- reading -->
      <section
        class="card result"
        aria-live="polite"
      >
        <div class="result-main">
          <div class="figure">
            <span class="fig-label">{{ t('environment.light.ppfd') }}</span>
            <strong class="fig-value num">{{ est ? est.ppfd : '–' }}</strong>
            <span class="fig-unit">{{ t('environment.light.ppfdUnit') }}</span>
          </div>
          <div class="figure">
            <span class="fig-label">{{ t('environment.light.dli') }}</span>
            <strong class="fig-value num">{{ est ? formatNumber(est.dli) : '–' }}</strong>
            <span class="fig-unit">{{ t('environment.light.dliUnit') }}</span>
          </div>
        </div>
        <div class="result-foot">
          <span class="num">{{ lux === null ? '–' : formatNumber(lux, 0) }} {{ t('environment.light.lux') }}</span>
          <span
            v-if="band"
            class="badge"
            :style="{ color: BAND_COLOR[band] }"
          >{{ t(`environment.light.bands.${band}`) }}</span>
        </div>
        <p
          v-if="maxed"
          class="warn"
        >
          {{ t('environment.light.maxed', { max: formatNumber(sensor.maxLux.value, 0) }) }}
        </p>
        <p
          v-if="ROUGH_TYPES.includes(lightType)"
          class="warn"
        >
          {{ t('environment.light.rough') }}
        </p>
      </section>

      <!-- source -->
      <section class="form-stack">
        <template v-if="!typing">
          <p class="muted how">
            {{ t('environment.light.howTo') }}
          </p>
          <div class="row-buttons">
            <button
              type="button"
              class="btn"
              :class="sensor.running.value ? 'btn-ghost' : 'btn-lamp'"
              @click="toggleSensor"
            >
              <UIcon
                :name="sensor.running.value ? 'i-tabler-player-pause' : 'i-tabler-sun-high'"
                class="size-5"
              />
              {{ sensor.running.value ? t('environment.light.stop') : t('environment.light.measure') }}
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              @click="typing = true; sensor.stop()"
            >
              {{ t('environment.light.manualLux') }}
            </button>
          </div>
          <p
            v-if="sensor.error.value"
            class="field-error"
            role="alert"
          >
            {{ t('environment.light.sensorError') }}
          </p>
        </template>
        <template v-else>
          <p
            v-if="sensor.native && sensor.available.value === false"
            class="muted how"
          >
            {{ t('environment.light.noSensor') }}
          </p>
          <p
            v-else-if="!sensor.native"
            class="muted how"
          >
            {{ t('environment.light.webOnly') }}
          </p>
          <label class="field">
            <span class="field-label">{{ t('environment.light.manualLux') }}</span>
            <input
              v-model.number="manualLux"
              class="input"
              type="number"
              inputmode="numeric"
              min="0"
              step="100"
              placeholder="30000"
            >
            <span class="field-hint">{{ t('environment.light.manualHint') }}</span>
          </label>
          <button
            v-if="sensor.native && sensor.available.value"
            type="button"
            class="link"
            @click="typing = false; sensor.start()"
          >
            {{ t('environment.light.sensorLive') }}
          </button>
        </template>
      </section>

      <!-- settings -->
      <section class="form-stack">
        <label class="field">
          <span class="field-label">{{ t('environment.light.lightType') }}</span>
          <select
            v-model="lightType"
            class="input"
          >
            <option
              v-for="lt in LIGHT_TYPES"
              :key="lt"
              :value="lt"
            >{{ t(`environment.light.types.${lt}`) }}</option>
          </select>
        </label>
        <div class="form-grid">
          <label class="field">
            <span class="field-label">{{ t('environment.light.hours') }}</span>
            <input
              v-model.number="hours"
              class="input"
              type="number"
              inputmode="numeric"
              min="0"
              max="24"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ t('environment.light.height') }} (cm)</span>
            <input
              v-model.number="height"
              class="input"
              type="number"
              inputmode="numeric"
              min="0"
              max="300"
            >
          </label>
        </div>
        <p class="field-hint">
          {{ t('environment.light.hoursHint', { h: state.settings.lightHours }) }}
        </p>
        <label
          v-if="plants.length"
          class="field"
        >
          <span class="field-label">{{ t('environment.light.plant') }}</span>
          <select
            v-model="plantId"
            class="input"
          >
            <option value="">{{ t('environment.light.noPlant') }}</option>
            <option
              v-for="p in plants"
              :key="p.id"
              :value="p.id"
            >{{ p.name }}</option>
          </select>
        </label>
        <details class="calib">
          <summary>{{ t('environment.light.calibration') }}</summary>
          <label class="field">
            <input
              v-model.number="calibration"
              class="input"
              type="number"
              inputmode="decimal"
              min="0.2"
              max="5"
              step="0.05"
              :aria-label="t('environment.light.calibration')"
            >
            <span class="field-hint">{{ t('environment.light.calibrationHint') }}</span>
          </label>
        </details>
        <button
          type="button"
          class="btn btn-primary btn-block"
          :disabled="!est || lux === null"
          @click="save"
        >
          {{ t('environment.light.save') }}
        </button>
      </section>

      <p class="card disclaimer">
        <UIcon
          name="i-tabler-info-circle"
          class="size-5"
        />
        <span>{{ t('environment.light.disclaimer') }}</span>
      </p>

      <!-- history -->
      <section aria-labelledby="light-history">
        <h2
          id="light-history"
          class="section-title hist-title"
        >
          {{ t('environment.light.history') }}
        </h2>
        <p
          v-if="!history.length"
          class="muted empty-hist"
        >
          {{ t('environment.light.noHistory') }}
        </p>
        <ul
          v-else
          class="card hist"
        >
          <li
            v-for="h in history"
            :key="h.id"
            class="hist-row"
          >
            <div class="hist-text">
              <strong class="num">{{ h.ppfd }} µmol · DLI {{ formatNumber(h.dli) }}</strong>
              <span>
                {{ fmtTime(h.at) }} · {{ t(`environment.light.types.${h.lightType}`) }}<template v-if="h.heightCm != null"> · {{ h.heightCm }} cm</template><template v-if="plantName(h.plantId)"> · {{ plantName(h.plantId) }}</template>
              </span>
            </div>
            <button
              type="button"
              class="icon-btn quiet"
              :aria-label="t('environment.light.remove')"
              @click="remove(h.id)"
            >
              <UIcon
                name="i-tabler-trash"
                class="size-5"
              />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.result {
  padding: 16px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.figure {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.figure + .figure {
  border-left: 1px solid var(--line);
  padding-left: 14px;
}

.fig-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--amber);
}

.fig-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.fig-unit {
  font-size: 12px;
  color: var(--text-3);
}

.result-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-size: 13px;
  color: var(--text-2);
}

.warn {
  margin: 0;
  font-size: 12px;
  color: var(--amber);
}

.how {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.row-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.link {
  align-self: flex-start;
}

.field-hint,
.field-error {
  margin: 0;
}

.calib summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
}

.calib .field {
  margin-top: 4px;
}

.disclaimer {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-2);
}

.disclaimer .iconify {
  flex: none;
  color: var(--amber);
}

.hist-title {
  margin-bottom: 12px;
}

.empty-hist {
  margin: 0;
  font-size: 13px;
}

.hist {
  list-style: none;
  margin: 0;
  padding: 0;
}

.hist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 6px 8px 14px;
}

.hist-row + .hist-row {
  border-top: 1px solid var(--line);
}

.hist-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hist-text strong {
  font-weight: 600;
}

.hist-text span {
  font-size: 12px;
  color: var(--text-3);
}

.icon-btn.quiet {
  border-color: transparent;
  background: transparent;
  color: var(--text-3);
}
</style>
