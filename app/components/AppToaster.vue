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
          <UIcon
            :name="n.icon ?? icons[n.tone]"
            class="size-5 shrink-0 toast-icon"
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
  left: 12px;
  right: 12px;
  bottom: calc(var(--nav-h) + var(--safe-bottom) + 12px);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #1d211c;
  border: 1px solid var(--line-strong);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  font-size: 14px;
  font-weight: 500;
}

.toast.success .toast-icon {
  color: var(--accent);
}

.toast.error .toast-icon {
  color: var(--danger);
}

.toast.info .toast-icon {
  color: var(--info);
}

.toast-msg {
  flex: 1;
}

.toast-action {
  border: 0;
  background: none;
  color: var(--accent);
  font-weight: 700;
  font-size: 14px;
  padding: 4px 6px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
