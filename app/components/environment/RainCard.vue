<script setup lang="ts">
import type { Plant } from '~/types/grow'
import type { RainDay } from '~/utils/env/weather'
import { dayWhen } from '~/utils/env/format'

const props = defineProps<{ rain: RainDay & { plants: Plant[] } }>()

const { t, locale } = useI18n()
const today = useToday()
const envApi = useEnvironment()
const { notify } = useNotify()

const when = computed(() => {
  const w = dayWhen(props.rain.date, today.value)
  return locale.value === 'cs' ? w.charAt(0).toUpperCase() + w.slice(1) : w
})

function log() {
  envApi.logRain(props.rain)
  notify(t('environment.rain.logged', { n: props.rain.plants.length }), { icon: 'water' })
}
</script>

<template>
  <section class="card rain-card">
    <div class="rain-head">
      <span
        class="rain-tile"
        aria-hidden="true"
      >
        <GrowIcon name="water" />
      </span>
      <div class="rain-text">
        <p class="rain-title">
          {{ t('environment.rain.title', { mm: formatNumber(rain.mm), when }) }}
        </p>
        <p class="rain-sub">
          {{ t('environment.rain.text', { n: rain.plants.length }) }}
          <span class="rain-names">{{ rain.plants.map(p => p.name).join(', ') }}</span>
        </p>
      </div>
    </div>
    <div class="rain-actions">
      <button
        type="button"
        class="btn btn-ghost"
        @click="envApi.dismissRain(rain.key)"
      >
        {{ t('environment.rain.skip') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        @click="log"
      >
        {{ t('environment.rain.log') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.rain-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rain-head {
  display: flex;
  gap: 12px;
}

.rain-tile {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 14%, var(--surface));
  font-size: 24px;
}

.rain-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.rain-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.rain-names {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  margin-top: 2px;
}

.rain-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
