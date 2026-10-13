<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const missing = computed(() => props.error.statusCode === 404)
</script>

<template>
  <div class="crash page">
    <EmptyState
      :icon="missing ? 'seedling' : 'pest'"
      :title="t(missing ? 'common.notFound.title' : 'common.crash.title')"
      :text="t(missing ? 'common.notFound.text' : 'common.crash.text')"
    >
      <button
        type="button"
        class="btn btn-soft"
        @click="clearError({ redirect: '/' })"
      >
        {{ t('common.notFound.home') }}
      </button>
    </EmptyState>
  </div>
</template>

<style scoped>
.crash {
  min-height: 100dvh;
  justify-content: center;
  background: var(--bg);
}
</style>
