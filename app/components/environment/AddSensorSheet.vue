<script setup lang="ts">
import type { EnvTarget, SensorKind, SensorModel } from '~/types/environment'
import { MODEL_LABEL } from '~/utils/env/bleParsers'
import type { FoundDevice } from '~/composables/useBleSensors'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plantId?: string | null }>()

const { t } = useI18n()
const envApi = useEnvironment()
const ble = useBleSensors()
const ha = useHomeAssistant()
const { notify } = useNotify()

type Step = 'choose' | 'ble' | 'details'
const step = ref<Step>('choose')
const kind = ref<SensorKind>('manual')
const name = ref('')
const target = ref<EnvTarget>({ type: 'tent' })
const device = ref<FoundDevice | null>(null)
const haTemp = ref('')
const haHumidity = ref('')

const bleOk = bleSupported()
const haTemps = computed(() => ha.entities.value.filter(e => e.kind === 'temperature'))
const haHums = computed(() => ha.entities.value.filter(e => e.kind === 'humidity'))
const pairedIds = computed(() => new Set(envApi.env.value.sensors.filter(s => s.kind === 'ble').map(s => s.address)))

watch(open, (v) => {
  if (v) {
    step.value = 'choose'
    name.value = ''
    device.value = null
    haTemp.value = ''
    haHumidity.value = ''
    target.value = props.plantId ? { type: 'plant', plantId: props.plantId } : { type: 'tent' }
    if (ha.config.value) ha.refreshEntities().catch(() => {})
  } else {
    ble.endDiscovery()
  }
})

function choose(k: SensorKind) {
  kind.value = k
  if (k === 'ble') {
    step.value = 'ble'
    ble.start('discover')
  } else {
    step.value = 'details'
  }
}

function pickDevice(d: FoundDevice) {
  device.value = d
  name.value = MODEL_LABEL[d.sample.model as SensorModel]
  step.value = 'details'
}

const canSave = computed(() => {
  if (kind.value === 'ha') return !!(haTemp.value || haHumidity.value)
  if (kind.value === 'ble') return !!device.value
  return true
})

function defaultName() {
  if (kind.value === 'ha') return ha.entities.value.find(e => e.id === (haTemp.value || haHumidity.value))?.name ?? t('environment.sensors.kinds.ha')
  return t('environment.sensors.kinds.manual')
}

function save() {
  if (!canSave.value) return
  const sensor = envApi.addSensor({
    name: name.value.trim() || defaultName(),
    kind: kind.value,
    target: target.value,
    model: device.value?.sample.model ?? null,
    address: device.value?.id ?? '',
    haTemp: kind.value === 'ha' ? haTemp.value : '',
    haHumidity: kind.value === 'ha' ? haHumidity.value : ''
  })
  if (device.value) envApi.addReading(sensor.id, device.value.sample.tempC, device.value.sample.humidity, Date.now(), device.value.sample.battery)
  if (kind.value === 'ha') ha.sync().catch(() => {})
  notify(t('environment.add.added', { name: sensor.name }))
  open.value = false
  navigateTo(`/environment/sensors/${sensor.id}`)
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('environment.add.title')"
    icon="measure"
    icon-color="#5fd9c4"
  >
    <!-- choose a source -->
    <div
      v-if="step === 'choose'"
      class="card options"
    >
      <button
        type="button"
        class="option"
        :disabled="!bleOk"
        @click="choose('ble')"
      >
        <UIcon
          name="i-tabler-bluetooth"
          class="size-6 option-icon"
        />
        <span class="option-text">
          <span class="option-title">{{ t('environment.add.ble') }}</span>
          <span class="option-desc">{{ bleOk ? t('environment.add.bleDesc') : t('environment.add.onlyApp') }}</span>
        </span>
      </button>
      <button
        type="button"
        class="option"
        :disabled="!ha.config.value"
        @click="choose('ha')"
      >
        <UIcon
          name="i-tabler-smart-home"
          class="size-6 option-icon"
        />
        <span class="option-text">
          <span class="option-title">{{ t('environment.add.ha') }}</span>
          <span class="option-desc">{{ ha.config.value ? t('environment.add.haDesc') : t('environment.add.haFirst') }}</span>
        </span>
      </button>
      <button
        type="button"
        class="option"
        @click="choose('manual')"
      >
        <UIcon
          name="i-tabler-pencil"
          class="size-6 option-icon"
        />
        <span class="option-text">
          <span class="option-title">{{ t('environment.add.manual') }}</span>
          <span class="option-desc">{{ t('environment.add.manualDesc') }}</span>
        </span>
      </button>
    </div>

    <!-- BLE discovery -->
    <div
      v-else-if="step === 'ble'"
      class="form-stack"
    >
      <EnvironmentBleProblem
        v-if="ble.problem.value"
        :problem="ble.problem.value"
        @retry="ble.start('discover')"
      />
      <template v-else>
        <p
          class="scan-state"
          role="status"
        >
          <span
            class="pulse"
            aria-hidden="true"
          />
          {{ t('environment.add.scanning') }}
        </p>
        <p class="field-hint">
          {{ t('environment.add.scanHint') }}
        </p>
        <ul
          v-if="ble.found.value.length"
          class="card found"
          :aria-label="t('environment.add.found')"
        >
          <li
            v-for="d in ble.found.value"
            :key="d.id"
          >
            <button
              type="button"
              class="option"
              :disabled="pairedIds.has(d.id)"
              @click="pickDevice(d)"
            >
              <UIcon
                name="i-tabler-bluetooth-connected"
                class="size-5 option-icon"
              />
              <span class="option-text">
                <span class="option-title">{{ d.name || MODEL_LABEL[d.sample.model] }}</span>
                <span class="option-desc">{{ MODEL_LABEL[d.sample.model] }}<template v-if="pairedIds.has(d.id)"> · {{ t('environment.add.paired') }}</template></span>
              </span>
              <span class="found-values num">{{ formatNumber(d.sample.tempC, 1) }}° · {{ formatNumber(d.sample.humidity, 0) }} %</span>
            </button>
          </li>
        </ul>
        <p
          v-else
          class="muted nothing"
        >
          {{ t('environment.add.nothing') }}
        </p>
      </template>
    </div>

    <!-- details -->
    <form
      v-else
      class="form-stack"
      @submit.prevent="save"
    >
      <label class="field">
        <span class="field-label">{{ t('environment.add.name') }}</span>
        <input
          v-model="name"
          class="input"
          maxlength="40"
          :placeholder="t('environment.add.namePlaceholder')"
        >
      </label>
      <EnvironmentTargetSelect v-model="target" />
      <template v-if="kind === 'ha'">
        <label class="field">
          <span class="field-label">{{ t('environment.add.haTemp') }}</span>
          <select
            v-model="haTemp"
            class="input"
          >
            <option value="">{{ t('environment.add.none') }}</option>
            <option
              v-for="e in haTemps"
              :key="e.id"
              :value="e.id"
            >{{ e.name }} ({{ e.state }} {{ e.unit }})</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">{{ t('environment.add.haHumidity') }}</span>
          <select
            v-model="haHumidity"
            class="input"
          >
            <option value="">{{ t('environment.add.none') }}</option>
            <option
              v-for="e in haHums"
              :key="e.id"
              :value="e.id"
            >{{ e.name }} ({{ e.state }} {{ e.unit }})</option>
          </select>
        </label>
      </template>
      <p
        v-if="device"
        class="field-hint"
      >
        {{ MODEL_LABEL[device.sample.model] }} · {{ formatNumber(device.sample.tempC, 1) }} °C · {{ formatNumber(device.sample.humidity, 0) }} %
      </p>
      <button
        type="submit"
        class="btn btn-primary btn-block"
        :disabled="!canSave"
      >
        {{ t('environment.add.save') }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.options,
.found {
  list-style: none;
  margin: 0;
  padding: 0;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 10px 14px;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: left;
}

.option + .option,
.found li + li {
  border-top: 1px solid var(--line);
}

.option:active:not(:disabled) {
  transform: scale(0.985);
}

.option:disabled {
  opacity: 0.5;
}

.option-icon {
  color: #5fd9c4;
  flex: none;
}

.option-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-title {
  font-weight: 600;
}

.option-desc {
  font-size: 13px;
  color: var(--text-2);
}

.found-values {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.scan-state {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-weight: 600;
}

.pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--blue);
  animation: pulse 1.4s var(--ease-out) infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.25;
    transform: scale(0.8);
  }
}

.field-hint,
.nothing {
  margin: 0;
}

.nothing {
  font-size: 13px;
}
</style>
