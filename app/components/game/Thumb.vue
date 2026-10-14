<script setup lang="ts">
import type { PlantVisual } from '~~/shared/game/types'

// Frame for the plant render; keeps the box size when there is nothing to draw yet.
withDefaults(defineProps<{ visual: PlantVisual | null, size: number, label: string, framed?: boolean }>(), { framed: true })
</script>

<template>
  <span
    class="thumb"
    :class="{ framed }"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <GameRenderGamePlant
      v-if="visual"
      :visual="visual"
      :size="size"
      :label="label"
    />
    <span
      v-else
      class="thumb-empty"
      role="img"
      :aria-label="label"
    >
      <GrowIcon name="seedling" />
    </span>
  </span>
</template>

<style scoped>
.thumb {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  overflow: hidden;
}

.thumb.framed {
  border-radius: var(--radius-control);
  background: var(--well);
  border: 1px solid var(--line);
}

.thumb-empty {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--text-3);
  font-size: 28px;
}
</style>
