<template>
  <div class="stats-card">
    <div
      class="stats-icon"
      :style="{ background: iconBg }"
    >
      <Icon
        :icon="icon"
        :height="iconSize"
        :style="{ color: iconColor }"
      />
    </div>
    <div class="stats-content">
      <div class="stats-label">
        {{ label }}
      </div>
      <div class="stats-value">
        {{ value }}
      </div>
      <div
        v-if="subtitle"
        class="stats-subtitle"
      >
        {{ subtitle }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  icon: string
  label: string
  value: string | number
  subtitle?: string
  iconColor?: string
  iconBg?: string
  iconSize?: number
}

withDefaults(defineProps<Props>(), {
  iconSize: 24,
  iconColor: '#7bc74d',
  iconBg: 'rgba(123, 199, 77, 0.15)'
})
</script>

<style scoped>
.stats-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.stats-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.stats-icon {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(123, 199, 77, 0.15);
}

.stats-content {
  flex: 1;
  min-width: 0;
}

.stats-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.stats-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
  margin-bottom: 2px;
}

.stats-subtitle {
  font-size: 11px;
  color: #7bc74d;
  font-weight: 500;
}
</style>
