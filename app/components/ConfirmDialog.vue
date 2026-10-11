<script setup lang="ts">
const { t } = useI18n()
const { confirmRequest, answer } = useConfirm()
const open = computed(() => !!confirmRequest.value)
useBackHandler(open, () => answer(false))

const confirmBtn = ref<HTMLButtonElement | null>(null)
watch(open, async (v) => {
  if (!v) return
  await nextTick()
  confirmBtn.value?.focus({ preventScroll: true })
})
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <Transition name="confirm">
      <div
        v-if="confirmRequest"
        class="confirm-backdrop"
        @click.self="answer(false)"
      >
        <div
          class="confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          :aria-describedby="confirmRequest.message ? 'confirm-msg' : undefined"
        >
          <h2 id="confirm-title">
            {{ confirmRequest.title }}
          </h2>
          <p
            v-if="confirmRequest.message"
            id="confirm-msg"
          >
            {{ confirmRequest.message }}
          </p>
          <div class="confirm-actions">
            <button
              type="button"
              class="btn"
              @click="answer(false)"
            >
              {{ t('dialog.cancel') }}
            </button>
            <button
              ref="confirmBtn"
              type="button"
              class="btn"
              :class="confirmRequest.danger ? 'confirm-danger' : 'btn-primary'"
              @click="answer(true)"
            >
              {{ confirmRequest.confirmLabel ?? t('dialog.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-backdrop {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(3, 4, 5, 0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.confirm {
  width: 100%;
  max-width: 340px;
  padding: 22px 20px 20px;
  border-radius: var(--radius-lg);
  background: var(--panel);
  border: 1px solid var(--line-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 24px 60px -16px rgba(0, 0, 0, 0.9);
}

h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

p {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.55;
}

.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 22px;
}

.confirm-danger {
  background: linear-gradient(180deg, #ff7a86 0%, var(--danger) 100%);
  border-color: transparent;
  color: #1a0507;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 8px 22px -10px rgba(255, 95, 109, 0.6);
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity var(--dur) var(--ease-out);
}

.confirm-enter-active .confirm {
  transition: transform var(--dur-slow) var(--ease-out), opacity var(--dur) var(--ease-out);
}

.confirm-leave-active .confirm {
  transition: transform var(--dur-fast) ease, opacity var(--dur-fast) ease;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-from .confirm,
.confirm-leave-to .confirm {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}
</style>
