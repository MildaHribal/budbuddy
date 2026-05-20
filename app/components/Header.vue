<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  title: string
  icon?: string
  showBack?: boolean
}

withDefaults(defineProps<Props>(), {
  icon: 'tabler:leaf',
  showBack: false
})

const goBack = () => {
  window.history.back()
}
</script>

<template>
  <div class="header-wrapper">
    <div class="header-background" />
    <div class="header-content">
      <button
        v-if="showBack"
        class="back-button"
        @click="goBack"
      >
        <Icon
          icon="tabler:arrow-left"
          height="24"
        />
      </button>

      <div class="header-icon">
        <Icon
          :icon="icon"
          height="26"
          style="color: #7bc74d"
        />
      </div>

      <h1 class="header-title">
        {{ title }}
      </h1>
    </div>
  </div>
</template>

<style scoped>
.header-wrapper {
  position: relative;
  padding: max(env(safe-area-inset-top), 12px) 20px 20px;
  margin-bottom: 0;
  overflow: hidden;
}

.header-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(123, 199, 77, 0.15) 0%, rgba(90, 158, 58, 0.1) 100%);
  border-radius: 0 0 28px 28px;
}

.header-background::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #7bc74d 30%, #9fe76d 50%, #7bc74d 70%, transparent 100%);
  opacity: 0.4;
}

.header-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 1;
}

.back-button {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(123, 199, 77, 0.15);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 12px;
  color: #7bc74d;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.back-button:active {
  transform: scale(0.95);
  background: rgba(123, 199, 77, 0.25);
}

.header-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: rgba(123, 199, 77, 0.15);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.header-title {
  flex: 1;
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
