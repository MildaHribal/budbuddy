<script setup lang="ts">
import { isGlyphName } from '~/utils/glyphs'

const props = defineProps<{
  /** a GrowIcon glyph name, or a legacy i-tabler-* name mapped to the nearest glyph */
  icon: string
  title: string
  text?: string
}>()

const LEGACY: Record<string, string> = {
  'i-tabler-plant-off': 'seedling',
  'i-tabler-photo-off': 'photo',
  'i-tabler-clipboard-list': 'note',
  'i-tabler-notebook-off': 'note',
  'i-tabler-basket-off': 'harvest',
  'i-tabler-mood-empty': 'measure',
  'i-tabler-search-off': 'plants',
  'i-tabler-archive': 'curing'
}

const glyph = computed(() => (isGlyphName(props.icon) ? props.icon : LEGACY[props.icon] ?? 'vegetative'))
</script>

<template>
  <div class="empty">
    <GrowIcon
      :name="glyph"
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
