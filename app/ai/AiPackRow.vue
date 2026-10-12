<script setup lang="ts">
// Offline AI files in the AI settings: download, progress, cancel/resume, delete.
const { t } = useI18n()
const config = useRuntimeConfig()
const { confirm } = useConfirm()
const assistant = useAssistant()
const pack = assistant.pack

const PACK_MB = 185
const mb = (b: number) => Math.round(b / 1024 / 1024)
const percent = computed(() => (pack.total ? Math.min(100, Math.round((pack.done / pack.total) * 100)) : 0))

async function remove() {
  const ok = await confirm({ title: t('ai.pack.removeTitle'), message: t('ai.pack.removeText'), confirmLabel: t('ai.pack.remove'), danger: true })
  if (ok) await assistant.removePack()
}

onMounted(() => assistant.refreshPack(config.app.baseURL))
</script>

<template>
  <div
    v-if="pack.status !== 'unavailable'"
    class="pack form-stack"
  >
    <div class="pack-head">
      <UIcon
        name="i-tabler-cloud-download"
        class="size-5 shrink-0"
      />
      <div>
        <strong>{{ t('ai.pack.title') }}</strong>
        <p class="muted pack-text">
          {{ pack.status === 'bundled' ? t('ai.pack.bundled') : pack.status === 'installed' ? t('ai.pack.installed') : t('ai.pack.about') }}
        </p>
      </div>
    </div>

    <div
      v-if="pack.status === 'downloading' || pack.status === 'paused' || pack.status === 'failed'"
      class="pack-progress"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="t('ai.pack.title')"
    >
      <div class="progress">
        <div :style="{ width: `${percent}%` }" />
      </div>
      <span class="muted num">{{ t('ai.pack.progress', { done: mb(pack.done), total: mb(pack.total) || PACK_MB }) }}</span>
    </div>
    <p
      v-if="pack.status === 'failed'"
      class="pack-error"
      role="alert"
    >
      {{ t('ai.pack.failed') }}
    </p>

    <button
      v-if="pack.status === 'none' || pack.status === 'paused' || pack.status === 'failed'"
      type="button"
      class="btn btn-soft"
      @click="assistant.startPackDownload()"
    >
      <UIcon
        name="i-tabler-download"
        class="size-5"
      />
      {{ pack.status === 'none' ? t('ai.pack.download', { mb: PACK_MB }) : pack.status === 'paused' ? t('ai.pack.resume') : t('ai.pack.retry') }}
    </button>
    <button
      v-else-if="pack.status === 'downloading'"
      type="button"
      class="btn btn-soft"
      @click="assistant.cancelPackDownload()"
    >
      <UIcon
        name="i-tabler-player-pause"
        class="size-5"
      />
      {{ t('ai.pack.cancel') }}
    </button>
    <button
      v-else-if="pack.status === 'needs_confirmation'"
      type="button"
      class="btn btn-soft"
      @click="assistant.confirmPackDownload()"
    >
      {{ t('ai.pack.confirm') }}
    </button>
    <button
      v-if="pack.status === 'installed' || pack.status === 'paused' || pack.status === 'failed'"
      type="button"
      class="btn btn-ghost"
      @click="remove"
    >
      <UIcon
        name="i-tabler-trash"
        class="size-5"
      />
      {{ t('ai.pack.remove') }}
    </button>
  </div>
</template>

<style scoped>
.pack {
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.pack-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.pack-text {
  margin: 2px 0 0;
  font-size: 13px;
}

.pack-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.pack-error {
  margin: 0;
  font-size: 13px;
  color: #ff9aa3;
}
</style>
