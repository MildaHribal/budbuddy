<script setup lang="ts">
import { openExternal } from '~/utils/external'

const { t } = useI18n()
const updates = useUpdates()
const rel = updates.available

const open = computed({
  get: () => updates.prompt.value && !!rel.value,
  set: (v) => {
    if (!v) updates.dismiss()
  }
})

function download() {
  if (rel.value) openExternal(rel.value.apkUrl)
  updates.dismiss()
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('support.update.title', { version: rel?.version ?? '' })"
  >
    <template #icon>
      <UIcon name="i-tabler-download" />
    </template>
    <div class="form-stack">
      <p class="text">
        {{ t('support.update.text') }}
      </p>
      <button
        type="button"
        class="btn btn-primary btn-block"
        @click="download"
      >
        <UIcon
          name="i-tabler-brand-android"
          class="size-5"
        />{{ t('support.update.download') }}
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-block"
        @click="open = false"
      >
        {{ t('support.update.later') }}
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.text {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-2);
}
</style>
