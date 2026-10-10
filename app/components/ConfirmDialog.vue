<script setup lang="ts">
const { confirmRequest, answer } = useConfirm()
const open = computed(() => !!confirmRequest.value)
useBackHandler(open, () => answer(false))
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <Transition name="fade">
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
        >
          <h2 id="confirm-title">
            {{ confirmRequest.title }}
          </h2>
          <p v-if="confirmRequest.message">
            {{ confirmRequest.message }}
          </p>
          <div class="confirm-actions">
            <button
              type="button"
              class="btn"
              @click="answer(false)"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn"
              :class="confirmRequest.danger ? 'btn-danger' : 'btn-primary'"
              autofocus
              @click="answer(true)"
            >
              {{ confirmRequest.confirmLabel ?? 'Confirm' }}
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
  background: rgba(0, 0, 0, 0.7);
}

.confirm {
  width: 100%;
  max-width: 340px;
  padding: 22px;
  border-radius: 20px;
  background: #151815;
  border: 1px solid var(--line-strong);
}

h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 800;
}

p {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.5;
}

.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
