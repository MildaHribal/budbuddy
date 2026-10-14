<script setup lang="ts">
// Loading and error states shared by every game screen; the slot renders once a game is loaded.
const { t } = useI18n()
const { confirm } = useConfirm()
const game = useGame()

const unreadable = computed(() => game.loadError.value === 'unreadable')

async function startOver() {
  const yes = await confirm({ title: t('game.error.newTitle'), message: t('game.error.newText'), confirmLabel: t('game.error.newConfirm'), danger: true })
  if (yes) await game.startNewGame()
}
</script>

<template>
  <div
    v-if="!game.ready.value"
    class="page"
    aria-busy="true"
  >
    <div class="card gate">
      <span
        class="spinner"
        aria-hidden="true"
      />
      <p>{{ t('game.loading') }}</p>
    </div>
  </div>
  <div
    v-else-if="game.loadError.value || !game.state.value"
    class="page"
  >
    <div
      class="card gate error"
      role="alert"
    >
      <UIcon
        name="i-tabler-alert-triangle"
        class="err-icon"
      />
      <p class="err-title">
        {{ unreadable ? t('game.error.unreadable') : t('game.error.load') }}
      </p>
      <p class="err-text">
        {{ unreadable ? t('game.error.unreadableText') : t('game.error.loadText') }}
      </p>
      <div class="err-actions">
        <button
          v-if="!unreadable"
          type="button"
          class="btn"
          @click="game.retryLoad()"
        >
          {{ t('game.error.retry') }}
        </button>
        <button
          type="button"
          class="btn btn-danger"
          @click="startOver"
        >
          {{ t('game.error.newGame') }}
        </button>
      </div>
    </div>
  </div>
  <template v-else>
    <div
      v-if="game.saveError.value || game.simError.value"
      class="strip"
      role="status"
    >
      <UIcon
        name="i-tabler-alert-triangle"
        class="strip-icon"
      />
      <span>{{ game.saveError.value ? t('game.error.save') : t('game.error.sim') }}</span>
    </div>
    <slot :state="game.state.value" />
  </template>
</template>

<style scoped>
.gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 20px;
  text-align: center;
}

.gate p {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
}

.spinner {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid var(--track);
  border-top-color: var(--green);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.err-icon {
  font-size: 28px;
  color: var(--red);
}

.gate .err-title {
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}

.gate .err-text {
  max-width: 32ch;
  font-size: 13px;
  line-height: 1.5;
}

.err-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}

.strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 16px 0;
  padding: 10px 14px;
  border-radius: var(--radius-control);
  background: var(--danger-soft);
  color: var(--red);
  font-size: 13px;
  font-weight: 600;
}

.strip-icon {
  flex-shrink: 0;
  font-size: 18px;
}
</style>
