<script setup lang="ts">
import { WEATHER_ICON, weatherKind } from '~/utils/env/weather'

const { t } = useI18n()
useHead({ title: () => t('environment.title') })

const envApi = useEnvironment()
const ha = useHomeAssistant()
const env = envApi.env

const places = computed(() => env.value.places)
const sensors = computed(() => env.value.sensors)
const alerts = computed(() => envApi.alerts.value)
const lastLight = computed(() => env.value.light[env.value.light.length - 1] ?? null)
const placeName = (id: string) => places.value.find(p => p.id === id)?.name ?? ''

onMounted(() => {
  envApi.refreshAll()
  ha.sync().catch(() => {})
})
</script>

<template>
  <div>
    <AppHeader
      :title="t('environment.title')"
      :subtitle="t('environment.subtitle')"
      back
    />

    <div class="page rise">
      <EnvironmentRainCard
        v-for="r in envApi.rainDays.value"
        :key="r.key"
        :rain="r"
      />

      <!-- Weather -->
      <section aria-labelledby="env-weather">
        <div class="section-head">
          <h2
            id="env-weather"
            class="section-title"
          >
            {{ t('environment.hub.weather') }}
          </h2>
          <NuxtLink
            v-if="places.length"
            to="/environment/weather"
            class="link"
          >{{ t('environment.weather.days') }}</NuxtLink>
        </div>
        <div class="card">
          <NuxtLink
            v-if="!places.length"
            to="/environment/weather?add=1"
            class="nav-row"
          >
            <span
              class="nav-tile"
              style="color: var(--blue)"
            ><UIcon
              name="i-tabler-map-pin"
              class="size-5"
            /></span>
            <span class="nav-text">
              <span class="nav-title">{{ t('environment.weather.addPlace') }}</span>
              <span class="nav-desc">{{ envApi.outdoorPlants.value.length ? t('environment.hub.weatherEmpty') : t('environment.hub.weatherNoPlants') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 nav-go"
            />
          </NuxtLink>
          <template v-else>
            <NuxtLink
              v-for="p in places.slice(0, 3)"
              :key="p.id"
              to="/environment/weather"
              class="nav-row"
            >
              <span
                class="nav-tile"
                style="color: var(--blue)"
              ><UIcon
                :name="WEATHER_ICON[weatherKind(envApi.forecasts[p.id]?.current?.code ?? 3)]"
                class="size-5"
              /></span>
              <span class="nav-text">
                <span class="nav-title">{{ p.name }}</span>
                <span class="nav-desc">
                  <template v-if="envApi.forecasts[p.id]?.current">
                    {{ t(`environment.weather.kinds.${weatherKind(envApi.forecasts[p.id]!.current!.code)}`) }}
                  </template>
                  <template v-else-if="envApi.loading[p.id]">{{ t('environment.weather.loading') }}</template>
                  <template v-else>{{ t('environment.weather.offlineNone') }}</template>
                </span>
              </span>
              <span
                v-if="envApi.forecasts[p.id]?.current?.temp != null"
                class="nav-value num"
              >{{ formatNumber(envApi.forecasts[p.id]!.current!.temp, 0) }} °C</span>
              <UIcon
                name="i-tabler-chevron-right"
                class="size-5 nav-go"
              />
            </NuxtLink>
            <EnvironmentAlertItem
              v-for="a in alerts.slice(0, 2)"
              :key="a.key"
              :alert="a"
              :place="places.length > 1 ? placeName(a.placeId) : undefined"
              class="row-line"
            />
            <NuxtLink
              v-if="alerts.length > 2"
              to="/environment/weather"
              class="more-row"
            >{{ t('environment.alerts.more', { n: alerts.length - 2 }) }}</NuxtLink>
          </template>
        </div>
      </section>

      <!-- Sensors -->
      <section aria-labelledby="env-sensors">
        <div class="section-head">
          <h2
            id="env-sensors"
            class="section-title"
          >
            {{ t('environment.hub.sensors') }}
          </h2>
          <NuxtLink
            to="/environment/sensors"
            class="link"
          >{{ sensors.length ? t('environment.hub.sensorsCount', { n: sensors.length }) : t('environment.sensors.add') }}</NuxtLink>
        </div>
        <div class="card">
          <NuxtLink
            v-if="!sensors.length"
            to="/environment/sensors?add=1"
            class="nav-row"
          >
            <span
              class="nav-tile"
              style="color: #5fd9c4"
            ><GrowIcon name="measure" /></span>
            <span class="nav-text">
              <span class="nav-title">{{ t('environment.sensors.add') }}</span>
              <span class="nav-desc">{{ t('environment.hub.sensorsEmpty') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 nav-go"
            />
          </NuxtLink>
          <EnvironmentSensorRow
            v-for="s in sensors.slice(0, 4)"
            :key="s.id"
            :sensor="s"
          />
        </div>
      </section>

      <!-- Light + Home Assistant -->
      <nav class="card">
        <NuxtLink
          to="/environment/light"
          class="nav-row"
        >
          <span
            class="nav-tile"
            style="color: var(--amber)"
          ><GrowIcon name="lamp" /></span>
          <span class="nav-text">
            <span class="nav-title">{{ t('environment.hub.light') }}</span>
            <span class="nav-desc">{{ lastLight ? t('environment.hub.lightLast', { ppfd: lastLight.ppfd, dli: formatNumber(lastLight.dli) }) : t('environment.hub.lightEmpty') }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="size-5 nav-go"
          />
        </NuxtLink>
        <NuxtLink
          to="/environment/home-assistant"
          class="nav-row"
        >
          <span
            class="nav-tile"
            style="color: var(--text-2)"
          ><UIcon
            name="i-tabler-smart-home"
            class="size-5"
          /></span>
          <span class="nav-text">
            <span class="nav-title">{{ t('environment.hub.ha') }}</span>
            <span class="nav-desc">{{ ha.config.value ? t('environment.hub.haConnected') : t('environment.hub.haEmpty') }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="size-5 nav-go"
          />
        </NuxtLink>
      </nav>

      <p class="privacy">
        <UIcon
          name="i-tabler-lock"
          class="size-4"
        />
        {{ t('environment.hub.privacy') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.section-head {
  margin-bottom: 12px;
}

.nav-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 12px 10px 14px;
  color: inherit;
  text-decoration: none;
}

.nav-row + .nav-row,
.row-line,
.more-row {
  border-top: 1px solid var(--line);
}

.nav-tile {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, currentColor 14%, var(--surface));
  font-size: 24px;
}

.nav-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-title {
  font-size: 15px;
  font-weight: 600;
}

.nav-desc {
  font-size: 13px;
  color: var(--text-2);
}

.nav-value {
  font-size: 20px;
  font-weight: 600;
  white-space: nowrap;
}

.nav-go {
  color: var(--text-3);
  flex: none;
}

.more-row {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  text-decoration: none;
}

.privacy {
  display: flex;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
}

.privacy .iconify {
  flex: none;
  margin-top: 2px;
}
</style>
