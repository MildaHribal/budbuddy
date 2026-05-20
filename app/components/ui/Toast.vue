<template>
  <Transition name="toast">
    <div v-if="show" :class="['toast', type]">
      <div class="toast-icon">
        <Icon v-if="type === 'success'" icon="tabler:check-circle" height="24" />
        <Icon v-else-if="type === 'error'" icon="tabler:x-circle" height="24" />
        <Icon v-else-if="type === 'warning'" icon="tabler:alert-triangle" height="24" />
        <Icon v-else icon="tabler:info-circle" height="24" />
      </div>
      <div class="toast-content">
        <div class="toast-title" v-if="title">{{ title }}</div>
        <div class="toast-message">{{ message }}</div>
      </div>
      <button @click="close" class="toast-close">
        <Icon icon="tabler:x" height="18" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Icon } from "@iconify/vue";

const props = withDefaults(defineProps<{
  message: string;
  title?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}>(), {
  type: 'info',
  duration: 3000
});

const emit = defineEmits<{
  close: [];
}>();

const show = ref(false);

onMounted(() => {
  show.value = true;
  if (props.duration > 0) {
    setTimeout(() => {
      close();
    }, props.duration);
  }
});

const close = () => {
  show.value = false;
  setTimeout(() => {
    emit('close');
  }, 300);
};
</script>

<style scoped>
.toast {
  position: fixed;
  top: calc(20px + env(safe-area-inset-top));
  left: 16px;
  right: 16px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.98) 0%, rgba(20, 20, 20, 0.98) 100%);
  border: 1px solid;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
}

.toast.success {
  border-color: rgba(123, 199, 77, 0.4);
}

.toast.error {
  border-color: rgba(255, 68, 68, 0.4);
}

.toast.warning {
  border-color: rgba(255, 170, 0, 0.4);
}

.toast.info {
  border-color: rgba(74, 158, 255, 0.4);
}

.toast-icon {
  flex-shrink: 0;
}

.toast.success .toast-icon {
  color: #7bc74d;
}

.toast.error .toast-icon {
  color: #ff4444;
}

.toast.warning .toast-icon {
  color: #ffaa00;
}

.toast.info .toast-icon {
  color: #4a9eff;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.toast-message {
  font-size: 14px;
  color: #bbb;
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.toast-close:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.1);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>

