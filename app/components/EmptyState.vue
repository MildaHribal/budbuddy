<script setup lang="ts">
import type { GlyphName } from '~/utils/glyphs'

defineProps<{
  icon: GlyphName
  title: string
  text?: string
}>()
</script>

<template>
  <div class="empty">
    <span
      class="empty-tile"
      aria-hidden="true"
    >
      <GrowIcon :name="icon" />
    </span>
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
  gap: 6px;
  padding: 28px 20px 30px;
  text-align: center;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--line);
}

.empty-tile {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 10px;
  border-radius: var(--radius);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 32px;
}

.empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.empty-text {
  max-width: 30ch;
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
</style>
