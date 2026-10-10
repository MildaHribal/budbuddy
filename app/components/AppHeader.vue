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
</script>

<template>
  <header class="app-header">
    <button
      v-if="back"
      type="button"
      class="icon-btn"
      aria-label="Back"
      @click="$goBack()"
    >
      <UIcon
        name="i-tabler-arrow-left"
        class="size-5"
      />
    </button>
    <span
      v-else-if="icon"
      class="header-icon"
    >
      <UIcon
        :name="icon"
        class="size-6"
      />
    </span>
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
  padding: calc(10px + var(--safe-top)) 16px 10px;
  background: rgba(10, 10, 10, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--line);
}

.header-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.header-text {
  flex: 1;
  min-width: 0;
}

h1 {
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

p {
  margin: 1px 0 0;
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  gap: 8px;
}
</style>
