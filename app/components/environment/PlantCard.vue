<script setup lang="ts">
import type { Plant } from '~/types/grow'
import { WEATHER_ICON, weatherKind } from '~/utils/env/weather'

const props = defineProps<{ plant: Plant }>()

const { t } = useI18n()
const envApi = useEnvironment()

const sensors = computed(() => envApi.sensorsFor(props.plant))
const outdoor = computed(() => props.plant.location !== 'indoor')
const place = computed(() => (outdoor.value ? envApi.placeOf(props.plant.id) : null))
const forecast = computed(() => (place.value ? envApi.forecasts[place.value.id] ?? null : null))
const alert = computed(() => (place.value ? envApi.alerts.value.find(a => a.placeId === place.value!.id) ?? null : null))
const light = computed(() => [...envApi.env.value.light].reverse().find(l => l.plantId === props.plant.id) ?? null)
const empty = computed(() => !sensors.value.length && !place.value && !light.value)

onMounted(() => {
  if (place.value) envApi.refreshForecast(place.value)
})
</script>

<template>
  <section
    class="card env-card"
    aria-labelledby="env-plant-title"
  >
    <h2
      id="env-plant-title"
      class="env-title"
    >
      <UIcon
        name="i-tabler-temperature"
        class="size-5"
      />
      {{ t('environment.plantCard.title') }}
    </h2>

    <EnvironmentSensorRow
      v-for="s in sensors.slice(0, 2)"
      :key="s.id"
      :sensor="s"
      class="line"
    />

    <NuxtLink
      v-if="place"
      to="/environment/weather"
      class="env-row line"
    >
      <UIcon
        :name="WEATHER_ICON[weatherKind(forecast?.current?.code ?? 3)]"
        class="size-5 env-icon"
      />
      <span class="env-text">
        <strong>{{ place.name }}</strong>
        <span v-if="forecast?.current">{{ t(`environment.weather.kinds.${weatherKind(forecast.current.code)}`) }}</span>
      </span>
      <span
        v-if="forecast?.current?.temp != null"
        class="env-value num"
      >{{ formatNumber(forecast.current.temp, 0) }} °C</span>
    </NuxtLink>
    <EnvironmentAlertItem
      v-if="alert"
      :alert="alert"
      class="line"
    />

    <NuxtLink
      v-if="light"
      :to="{ path: '/environment/light', query: { plant: plant.id } }"
      class="env-row line"
    >
      <GrowIcon
        name="lamp"
        class="env-icon lamp"
      />
      <span class="env-text">
        <strong class="num">{{ light.ppfd }} µmol · DLI {{ formatNumber(light.dli) }}</strong>
        <span>{{ t(`environment.light.types.${light.lightType}`) }}</span>
      </span>
    </NuxtLink>

    <p
      v-if="empty"
      class="env-empty line"
    >
      {{ t('environment.plantCard.noData') }}
    </p>

    <NuxtLink
      :to="{ path: sensors.length || !outdoor ? '/environment/sensors' : '/environment', query: { plant: plant.id } }"
      class="env-more line"
    >
      {{ t('environment.plantCard.open') }}
      <UIcon
        name="i-tabler-chevron-right"
        class="size-4"
      />
    </NuxtLink>
  </section>
</template>

<style scoped>
.env-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 14px 14px 10px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.line {
  border-top: 1px solid var(--line);
}

.env-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 14px;
  color: inherit;
  text-decoration: none;
}

.env-icon {
  flex: none;
  color: var(--blue);
  font-size: 20px;
}

.env-icon.lamp {
  color: var(--amber);
  width: 20px;
  height: 20px;
}

.env-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.env-text strong {
  font-weight: 600;
}

.env-text span {
  font-size: 12px;
  color: var(--text-3);
}

.env-value {
  font-size: 17px;
  font-weight: 600;
}

.env-empty {
  margin: 0;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--text-2);
}

.env-more {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--green);
  text-decoration: none;
}
</style>
