<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
  icon?: string
  back?: boolean
}>(), {
  subtitle: undefined,
  icon: undefined,
  back: false
})

const { $goBack } = useNuxtApp()
const { t } = useI18n()
</script>

<template>
  <header class="app-header">
    <button
      v-if="back"
      type="button"
      class="icon-btn"
      :aria-label="t('common.back')"
      @click="$goBack()"
    >
      <UIcon name="i-tabler-chevron-left" />
    </button>
    <div class="header-text">
      <h1>{{ title }}</h1>
      <p v-if="subtitle">
        {{ subtitle }}
      </p>
    </div>
    <div class="header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: calc(14px + var(--safe-top)) 20px 12px;
  /* opaque gradient: a backdrop blur re-renders on every scroll frame */
  background: linear-gradient(180deg, #07080a 0%, rgba(7, 8, 10, 0.97) 62%, rgba(7, 8, 10, 0.88) 84%, rgba(7, 8, 10, 0) 100%);
}

.header-text {
  flex: 1;
  min-width: 0;
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  gap: 8px;
}
</style>
