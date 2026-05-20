<template>
  <div
    v-if="show"
    class="loading-overlay"
  >
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner-leaf">
          <Icon
            icon="tabler:leaf"
            height="48"
          />
        </div>
      </div>
      <div
        v-if="text"
        class="loading-text"
      >
        {{ text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  show: boolean
  text?: string
}>()
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner {
  position: relative;
  width: 80px;
  height: 80px;
}

.spinner-leaf {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7bc74d;
  animation: spin 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
  50% {
    transform: rotate(180deg) scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: rotate(360deg) scale(1);
    opacity: 1;
  }
}

.loading-text {
  font-size: 16px;
  font-weight: 600;
  color: #7bc74d;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
