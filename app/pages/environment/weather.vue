<script setup lang="ts">
import { FORECAST_STALE, WEATHER_ICON, weatherKind } from '~/utils/env/weather'
import { ago, dayShort } from '~/utils/env/format'

const { t } = useI18n()
useHead({ title: () => `${t('environment.weather.title')} · ${t('environment.title')}` })

const envApi = useEnvironment()
const { confirm } = useConfirm()
const route = useRoute()
const today = useToday()
const online = useOnline()

const places = computed(() => envApi.env.value.places)
const addOpen = ref(route.query.add === '1')

const forecastFor = (id: string) => envApi.forecasts[id]
const days = (id: string) => (forecastFor(id)?.days ?? []).filter(d => d.date >= today.value)
const alertsFor = (id: string) => envApi.alerts.value.filter(a => a.placeId === id)
// avoid "-0°"
const deg = (v: number | null) => (v === null ? '–' : formatNumber(Math.round(v) || 0, 0))
const stale = (id: string) => {
  const f = forecastFor(id)
  return !!f && Date.now() - f.fetchedAt > FORECAST_STALE
}

async function remove(id: string, name: string) {
  const ok = await confirm({ title: t('environment.weather.removeConfirm', { name }), message: t('environment.weather.removeText'), confirmLabel: t('environment.weather.remove'), danger: true })
  if (ok) envApi.removePlace(id)
}

onMounted(() => envApi.refreshAll())
watch(online, (v) => {
  if (v) envApi.refreshAll()
})
</script>

<template>
  <div>
    <AppHeader
      :title="t('environment.weather.title')"
      :subtitle="t('environment.title')"
      back
    >
      <template #actions>
        <button
          v-if="places.length"
          type="button"
          class="icon-btn"
          :aria-label="t('environment.weather.refresh')"
          @click="envApi.refreshAll(true)"
        >
          <UIcon
            name="i-tabler-refresh"
            class="size-5"
          />
        </button>
      </template>
    </AppHeader>

    <div class="page rise">
      <EnvironmentRainCard
        v-for="r in envApi.rainDays.value"
        :key="r.key"
        :rain="r"
      />

      <EmptyState
        v-if="!places.length"
        icon="i-tabler-map-pin"
        :title="t('environment.weather.noPlaces')"
        :text="t('environment.weather.noPlacesText')"
      >
        <button
          type="button"
          class="btn btn-primary"
          @click="addOpen = true"
        >
          {{ t('environment.weather.addPlace') }}
        </button>
      </EmptyState>

      <p
        v-if="places.length && !envApi.outdoorPlants.value.length"
        class="card note"
      >
        <strong>{{ t('environment.weather.noOutdoor') }}</strong>
        {{ t('environment.weather.noOutdoorText') }}
      </p>

      <section
        v-for="p in places"
        :key="p.id"
        :aria-label="p.name"
      >
        <div class="section-head">
          <h2 class="section-title place-title">
            {{ p.name }}
            <span
              v-if="p.detail"
              class="section-meta"
            >{{ p.detail }}</span>
          </h2>
          <button
            type="button"
            class="icon-btn quiet"
            :aria-label="`${t('environment.weather.remove')}: ${p.name}`"
            @click="remove(p.id, p.name)"
          >
            <UIcon
              name="i-tabler-trash"
              class="size-5"
            />
          </button>
        </div>

        <div class="card">
          <!-- now -->
          <div
            v-if="forecastFor(p.id)?.current"
            class="now"
          >
            <UIcon
              :name="WEATHER_ICON[weatherKind(forecastFor(p.id)!.current!.code)]"
              class="now-icon"
            />
            <div class="now-main">
              <strong class="now-temp num">{{ deg(forecastFor(p.id)!.current!.temp) }} °C</strong>
              <span class="now-kind">{{ t(`environment.weather.kinds.${weatherKind(forecastFor(p.id)!.current!.code)}`) }}</span>
            </div>
            <span class="now-side num">{{ t('environment.weather.feels', { rh: formatNumber(forecastFor(p.id)!.current!.rh, 0), wind: formatNumber(forecastFor(p.id)!.current!.wind, 0) }) }}</span>
          </div>

          <div
            class="status"
            :class="{ warn: envApi.errors[p.id] || stale(p.id) }"
            role="status"
          >
            <template v-if="envApi.loading[p.id]">
              {{ t('environment.weather.loading') }}
            </template>
            <template v-else-if="envApi.errors[p.id] === 'offline'">
              {{ forecastFor(p.id) ? t('environment.weather.offline') : t('environment.weather.offlineNone') }}
            </template>
            <template v-else-if="envApi.errors[p.id]">
              {{ t('environment.weather.failed') }}
              <button
                type="button"
                class="link"
                @click="envApi.refreshForecast(p, true)"
              >
                {{ t('environment.weather.retry') }}
              </button>
            </template>
            <template v-else-if="forecastFor(p.id)">
              {{ stale(p.id) ? t('environment.weather.outdated', { when: ago(forecastFor(p.id)!.fetchedAt) }) : t('environment.weather.updated', { when: ago(forecastFor(p.id)!.fetchedAt) }) }}
            </template>
          </div>

          <!-- alerts -->
          <EnvironmentAlertItem
            v-for="a in alertsFor(p.id)"
            :key="a.key"
            :alert="a"
            dismissible
            class="row-line"
            @dismiss="envApi.dismissAlert(a.key)"
          />

          <!-- 7 days -->
          <ol
            v-if="days(p.id).length"
            class="days"
            :aria-label="t('environment.weather.days')"
          >
            <li
              v-for="d in days(p.id)"
              :key="d.date"
              class="day"
            >
              <span class="day-name">{{ dayShort(d.date, today) }}</span>
              <UIcon
                :name="WEATHER_ICON[weatherKind(d.code)]"
                class="size-5 day-icon"
                :aria-label="t(`environment.weather.kinds.${weatherKind(d.code)}`)"
              />
              <span class="day-rain num">
                <template v-if="(d.precip ?? 0) >= 0.1">{{ formatNumber(d.precip, 1) }} mm</template>
                <span
                  v-if="(d.precipProb ?? 0) >= 20"
                  class="day-prob"
                >{{ t('environment.weather.rainChance', { p: d.precipProb ?? 0 }) }}</span>
              </span>
              <span class="day-temps num">
                <span class="day-min">{{ deg(d.tMin) }}°</span>
                <span class="day-max">{{ deg(d.tMax) }}°</span>
              </span>
            </li>
          </ol>

          <!-- plants -->
          <div
            v-if="envApi.plantsAt(p.id).length"
            class="plants"
          >
            <span class="plants-label">{{ t('environment.weather.plants') }}</span>
            <span class="plants-list">{{ envApi.plantsAt(p.id).map(x => x.name).join(', ') }}</span>
          </div>
        </div>
      </section>

      <!-- which plant is where -->
      <section
        v-if="places.length > 1 && envApi.outdoorPlants.value.length"
        aria-labelledby="env-assign"
      >
        <h2
          id="env-assign"
          class="section-title assign-title"
        >
          {{ t('environment.weather.plants') }}
        </h2>
        <div class="card">
          <label
            v-for="pl in envApi.outdoorPlants.value"
            :key="pl.id"
            class="assign"
          >
            <span class="assign-name">{{ pl.name }}</span>
            <select
              class="input assign-select"
              :value="envApi.placeOf(pl.id)?.id"
              :aria-label="t('environment.weather.movePlant', { name: pl.name })"
              @change="envApi.setPlantPlace(pl.id, ($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="p in places"
                :key="p.id"
                :value="p.id"
              >{{ p.name }}</option>
            </select>
          </label>
        </div>
      </section>

      <button
        v-if="places.length"
        type="button"
        class="btn btn-soft btn-block"
        @click="addOpen = true"
      >
        <UIcon
          name="i-tabler-plus"
          class="size-5"
        />
        {{ t('environment.weather.addPlace') }}
      </button>

      <footer class="foot">
        <p>{{ t('environment.weather.privacy') }}</p>
        <p>
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener"
            class="foot-link"
          >{{ t('environment.weather.source') }}</a>
        </p>
      </footer>
    </div>

    <EnvironmentPlaceSheet v-model:open="addOpen" />
  </div>
</template>

<style scoped>
.note {
  margin: 0;
  padding: 14px;
  font-size: 13px;
  color: var(--text-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.note strong {
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}

.section-head {
  align-items: center;
}

.place-title {
  flex-wrap: wrap;
  min-width: 0;
}

.place-title .section-meta {
  font-weight: 400;
  letter-spacing: 0;
}

.icon-btn.quiet {
  border-color: transparent;
  background: transparent;
  color: var(--text-3);
  margin-right: -10px;
}

.now {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 4px;
}

.now-icon {
  width: 36px;
  height: 36px;
  color: var(--blue);
  flex: none;
}

.now-main {
  display: flex;
  flex-direction: column;
}

.now-temp {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.now-kind {
  font-size: 13px;
  color: var(--text-2);
}

.now-side {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
  text-align: right;
  max-width: 45%;
}

.status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  padding: 6px 14px 12px;
  font-size: 12px;
  color: var(--text-3);
}

.status.warn {
  color: var(--amber);
}

.row-line,
.days,
.plants {
  border-top: 1px solid var(--line);
}

.days {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.day {
  display: grid;
  grid-template-columns: 1fr 28px 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 14px;
  font-size: 14px;
}

.day-name {
  font-weight: 600;
  white-space: nowrap;
}

.day-icon {
  color: var(--text-2);
}

.day-rain {
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: var(--blue);
  white-space: nowrap;
}

.day-prob {
  color: var(--text-3);
}

.day-temps {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  min-width: 72px;
}

.day-min {
  color: var(--text-3);
}

.day-max {
  font-weight: 600;
}

.plants {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px 12px;
}

.plants-label {
  font-size: 12px;
  color: var(--text-3);
}

.plants-list {
  font-size: 13px;
  color: var(--text-2);
}

.assign-title {
  margin-bottom: 12px;
}

.assign {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 8px 14px;
}

.assign + .assign {
  border-top: 1px solid var(--line);
}

.assign-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assign-select {
  width: auto;
  max-width: 55%;
}

.foot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
}

.foot p {
  margin: 0;
}

.foot-link {
  color: var(--text-2);
}
</style>
