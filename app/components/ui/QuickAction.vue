<template>
  <NuxtLink :to="to" class="quick-action">
    <div class="action-icon" :style="{ background: iconBg }">
      <Icon :icon="icon" height="28" :style="{ color: iconColor }" />
    </div>
    <div class="action-label">{{ label }}</div>
    <div v-if="badge" class="action-badge">{{ badge }}</div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";

interface Props {
  icon: string;
  label: string;
  to: string;
  badge?: string | number;
  iconColor?: string;
  iconBg?: string;
}

withDefaults(defineProps<Props>(), {
  iconColor: '#7bc74d',
  iconBg: 'rgba(123, 199, 77, 0.15)'
});
</script>

<style scoped>
.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 12px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.quick-action:active {
  transform: scale(0.95);
  box-shadow: 0 2px 12px rgba(123, 199, 77, 0.2);
}

.action-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(123, 199, 77, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-label {
  font-size: 13px;
  font-weight: 600;
  color: #ddd;
  text-align: center;
  letter-spacing: 0.01em;
}

.action-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(255, 68, 68, 0.4);
}
</style>

