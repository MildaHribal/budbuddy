<template>
  <div :class="['env-widget', size]">
    <div class="widget-header">
      <div
        class="widget-icon"
        :style="{ background: iconBg }"
      >
        <Icon
          :icon="icon"
          :height="iconSize"
          :style="{ color: iconColor }"
        />
      </div>
      <div class="widget-title">
        {{ title }}
      </div>
    </div>

    <div class="widget-value">
      <span class="value-number">{{ value }}</span>
      <span class="value-unit">{{ unit }}</span>
    </div>

    <div class="widget-footer">
      <div :class="['status-indicator', status]" />
      <div class="status-text">
        {{ statusText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

interface Props {
  icon: string
  title: string
  value: number | string
  unit: string
  status: 'optimal' | 'warning' | 'danger'
  size?: 'small' | 'medium' | 'large'
  iconColor?: string
  iconBg?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  iconColor: '#7bc74d',
  iconBg: 'rgba(123, 199, 77, 0.15)'
})

const statusText = computed(() => {
  switch (props.status) {
    case 'optimal': return 'Optimální'
    case 'warning': return 'Pozor'
    case 'danger': return 'Kritické'
    default: return 'Neznámé'
  }
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'small': return 20
    case 'large': return 28
    default: return 24
  }
})
</script>

<style scoped>
.env-widget {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.env-widget.small {
  padding: 12px;
}

.env-widget.large {
  padding: 20px;
}

.env-widget:active {
  transform: scale(0.98);
}

.widget-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.widget-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(123, 199, 77, 0.15);
}

.env-widget.small .widget-icon {
  width: 36px;
  height: 36px;
}

.env-widget.large .widget-icon {
  width: 48px;
  height: 48px;
}

.widget-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.env-widget.small .widget-title {
  font-size: 11px;
}

.env-widget.large .widget-title {
  font-size: 14px;
}

.widget-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 10px;
}

.value-number {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.env-widget.small .value-number {
  font-size: 24px;
}

.env-widget.large .value-number {
  font-size: 40px;
}

.value-unit {
  font-size: 16px;
  color: #999;
  font-weight: 600;
}

.env-widget.small .value-unit {
  font-size: 14px;
}

.env-widget.large .value-unit {
  font-size: 18px;
}

.widget-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse-status 2s ease-in-out infinite;
}

.status-indicator.optimal {
  background: #7bc74d;
  box-shadow: 0 0 10px rgba(123, 199, 77, 0.6);
}

.status-indicator.warning {
  background: #ffaa00;
  box-shadow: 0 0 10px rgba(255, 170, 0, 0.6);
}

.status-indicator.danger {
  background: #ff4444;
  box-shadow: 0 0 10px rgba(255, 68, 68, 0.6);
}

@keyframes pulse-status {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.status-text {
  font-size: 12px;
  font-weight: 600;
}

.env-widget.small .status-text {
  font-size: 11px;
}

.env-widget.large .status-text {
  font-size: 13px;
}

.status-indicator.optimal ~ .status-text {
  color: #7bc74d;
}

.status-indicator.warning ~ .status-text {
  color: #ffaa00;
}

.status-indicator.danger ~ .status-text {
  color: #ff4444;
}
</style>
