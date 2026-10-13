<script setup lang="ts">
const { notices, dismiss } = useNotify()

const icons = { success: 'i-tabler-circle-check', error: 'i-tabler-alert-triangle', info: 'i-tabler-info-circle' }
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <div
      class="toaster"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="n in notices"
          :key="n.id"
          class="toast"
          :class="n.tone"
        >
          <GrowIcon
            :name="n.icon ?? icons[n.tone]"
            class="toast-icon"
          />
          <span class="toast-msg">{{ n.message }}</span>
          <button
            v-if="n.action"
            type="button"
            class="toast-action"
            @click="n.action.run(); dismiss(n.id)"
          >
            {{ n.action.label }}
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toaster {
  position: absolute;
  top: calc(var(--safe-top) + 12px);
  left: 16px;
  right: 16px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast {
  position: relative;
  width: 100%;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 4px 6px 4px 14px;
  border-radius: var(--radius);
  background: var(--surface-3);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-float);
  font-size: 14px;
  font-weight: 500;
}

.toast-icon {
  flex-shrink: 0;
  font-size: 20px;
}

.toast.success .toast-icon {
  color: var(--green);
}

.toast.error .toast-icon {
  color: var(--danger);
}

.toast.info .toast-icon {
  color: var(--info);
}

.toast-msg {
  flex: 1;
  padding: 10px 0;
}

.toast-action {
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-control);
  background: none;
  color: var(--green);
  font-size: 14px;
  font-weight: 600;
  transition: background var(--dur-fast) ease;
}

.toast-action:active {
  background: var(--accent-soft);
}

.toast-move,
.toast-enter-active {
  transition: opacity var(--dur) var(--ease-out), transform var(--dur-slow) var(--ease-out);
}

.toast-leave-active {
  position: absolute;
  transition: opacity var(--dur-fast) ease, transform var(--dur) var(--ease-in);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-18px) scale(0.97);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}
</style>
