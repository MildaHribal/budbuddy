<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  text?: string
}>()
</script>

<template>
  <div class="empty">
    <UIcon
      :name="icon"
      class="size-11 empty-icon"
    />
    <p class="empty-title">
      {{ title }}
    </p>
    <p
      v-if="text"
      class="empty-text"
    >
      {{ text }}
    </p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 20px;
  text-align: center;
  border: 1px dashed var(--accent-line);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.015);
}

.empty-icon {
  color: var(--text-3);
}

.empty-title {
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 700;
}

.empty-text {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
</style>
