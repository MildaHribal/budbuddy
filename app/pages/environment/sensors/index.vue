<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => `${t('environment.sensors.title')} · ${t('environment.title')}` })

const envApi = useEnvironment()
const ble = useBleSensors()
const ha = useHomeAssistant()
const route = useRoute()

const plantId = computed(() => (typeof route.query.plant === 'string' ? route.query.plant : null))
const plant = computed(() => (plantId.value ? useGrow().getPlant(plantId.value) ?? null : null))
const sensors = computed(() => (plant.value ? envApi.sensorsFor(plant.value) : envApi.env.value.sensors))
const addOpen = ref(route.query.add === '1')

const native = bleSupported()
const hasBle = computed(() => envApi.env.value.sensors.some(s => s.kind === 'ble'))
const live = useLocalStorage(BLE_LIVE_KEY, 'true')
const liveOn = computed({
  get: () => live.value !== 'false',
  set: (v: boolean) => {
    live.value = v ? 'true' : 'false'
    if (v) ble.start('log')
    else ble.stop()
  }
})

onMounted(() => {
  if (native && hasBle.value && liveOn.value) ble.start('log')
  ha.sync().catch(() => {})
})
</script>

<template>
  <div>
    <AppHeader
      :title="t('environment.sensors.title')"
      :subtitle="plant ? plant.name : t('environment.title')"
      back
    >
      <template #actions>
        <button
          type="button"
          class="icon-btn accent"
          :aria-label="t('environment.sensors.add')"
          @click="addOpen = true"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-5"
          />
        </button>
      </template>
    </AppHeader>

    <div class="page rise">
      <EmptyState
        v-if="!sensors.length"
        icon="measure"
        :title="t('environment.sensors.empty')"
        :text="t('environment.sensors.emptyText')"
      >
        <button
          type="button"
          class="btn btn-primary"
          @click="addOpen = true"
        >
          {{ t('environment.sensors.add') }}
        </button>
      </EmptyState>

      <div
        v-else
        class="card"
      >
        <EnvironmentSensorRow
          v-for="s in sensors"
          :key="s.id"
          :sensor="s"
        />
      </div>

      <EnvironmentBleProblem
        v-if="native && hasBle && ble.problem.value"
        :problem="ble.problem.value"
        @retry="ble.start('log')"
      />

      <button
        v-if="native && hasBle"
        type="button"
        role="switch"
        class="card live"
        :aria-checked="liveOn"
        @click="liveOn = !liveOn"
      >
        <span class="live-text">
          <span class="live-title">{{ t('environment.sensors.live') }}</span>
          <span class="live-hint">{{ t('environment.sensors.liveHint') }}</span>
        </span>
        <span
          class="switch"
          aria-hidden="true"
        />
      </button>

      <details class="card about">
        <summary>
          <span>{{ t('environment.sensors.supported') }}</span>
          <UIcon
            name="i-tabler-chevron-down"
            class="size-4 about-chevron"
          />
        </summary>
        <p>{{ t('environment.sensors.supportedList') }}</p>
        <p>{{ t('environment.ha.future') }}</p>
      </details>
    </div>

    <EnvironmentAddSensorSheet
      v-model:open="addOpen"
      :plant-id="plantId"
    />
  </div>
</template>

<style scoped>
.live {
  width: 100%;
  color: inherit;
  font: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}

.live-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.live-title {
  font-weight: 600;
}

.live-hint {
  font-size: 12px;
  color: var(--text-3);
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 51px;
  height: 31px;
  border-radius: 999px;
  background: var(--track);
  transition: background var(--dur) ease;
}

.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: var(--text);
  transition: transform var(--dur) var(--ease-out);
}

.live[aria-checked="true"] .switch {
  background: var(--green);
}

.live[aria-checked="true"] .switch::after {
  transform: translateX(20px);
}

.about summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 0 14px;
  font-weight: 600;
  list-style: none;
  cursor: pointer;
}

.about summary::-webkit-details-marker {
  display: none;
}

.about[open] .about-chevron {
  transform: rotate(180deg);
}

.about-chevron {
  color: var(--text-3);
  transition: transform var(--dur) var(--ease-out);
}

.about p {
  margin: 0;
  padding: 0 14px 14px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
</style>
