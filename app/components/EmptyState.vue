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
    <GrowIcon
      :name="icon"
      draw
      glow
      :stroke-width="1.1"
      class="empty-glyph"
      aria-hidden="true"
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
  gap: 6px;
  padding: 28px 20px 30px;
  text-align: center;
  border-radius: var(--radius);
  background: radial-gradient(70% 60% at 50% 0%, rgba(155, 227, 107, 0.07), transparent 75%);
  box-shadow: inset 0 0 0 1px var(--line);
}

.empty-glyph {
  margin-bottom: 8px;
  font-size: 64px;
  color: var(--leaf);
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
