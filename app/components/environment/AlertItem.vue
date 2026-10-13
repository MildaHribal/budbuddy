<script setup lang="ts">
import { ALERT_ICON, type WeatherAlert } from '~/utils/env/weather'
import { alertText, alertTitle } from '~/utils/env/format'

defineProps<{
  alert: WeatherAlert
  place?: string
  dismissible?: boolean
}>()
defineEmits<{ dismiss: [] }>()

const { t } = useI18n()
const today = useToday()
</script>

<template>
  <div
    class="alert-item"
    :class="{ severe: alert.severe }"
  >
    <span
      class="alert-tile"
      aria-hidden="true"
    >
      <UIcon
        :name="ALERT_ICON[alert.type]"
        class="size-5"
      />
    </span>
    <div class="alert-text">
      <p class="alert-title">
        {{ alertTitle(alert, today) }}
        <span
          v-if="alert.severe"
          class="badge alert-badge"
        >{{ t('environment.alerts.severe') }}</span>
      </p>
      <p class="alert-body">
        {{ alertText(alert) }}
      </p>
      <p
        v-if="place"
        class="alert-place"
      >
        {{ place }}
      </p>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="icon-btn alert-close"
      :aria-label="t('environment.alerts.dismiss')"
      @click="$emit('dismiss')"
    >
      <UIcon
        name="i-tabler-x"
        class="size-4"
      />
    </button>
  </div>
</template>

<style scoped>
.alert-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  --tone: var(--amber);
}

.alert-item.severe {
  --tone: var(--red);
}

.alert-tile {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 14%, var(--surface));
}

.alert-text {
  flex: 1;
  min-width: 0;
}

.alert-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.alert-badge {
  color: var(--red);
}

.alert-body {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.alert-place {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.alert-close {
  flex: none;
  margin: -8px -10px -8px 0;
  border-color: transparent;
  background: transparent;
  color: var(--text-3);
}
</style>
