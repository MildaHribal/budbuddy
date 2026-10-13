<script setup lang="ts">
import type { BleProblem } from '~/composables/useBleSensors'

defineProps<{ problem: BleProblem }>()
defineEmits<{ retry: [] }>()

const { t } = useI18n()
const ble = useBleSensors()
</script>

<template>
  <div
    class="ble-problem"
    role="alert"
  >
    <UIcon
      name="i-tabler-bluetooth-off"
      class="size-5 bp-icon"
    />
    <div class="bp-body">
      <p>{{ t(`environment.ble.${problem}`) }}</p>
      <div
        v-if="problem !== 'unsupported'"
        class="bp-actions"
      >
        <button
          v-if="problem === 'disabled'"
          type="button"
          class="btn btn-soft"
          @click="ble.openSettings()"
        >
          {{ t('environment.ble.turnOn') }}
        </button>
        <button
          v-if="problem === 'denied'"
          type="button"
          class="btn btn-soft"
          @click="ble.openAppSettings()"
        >
          {{ t('environment.ble.permissions') }}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          @click="$emit('retry')"
        >
          {{ t('environment.ble.retry') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ble-problem {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius);
  background: var(--danger-soft);
}

.bp-icon {
  color: var(--red);
  flex: none;
  margin-top: 2px;
}

.bp-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.bp-body p {
  margin: 0;
  font-size: 14px;
}

.bp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
