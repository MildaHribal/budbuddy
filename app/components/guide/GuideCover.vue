<script setup lang="ts">
import { asyncRegistry, componentKey } from '~/guide/resolve'

// Chapter cover: one of the lesson illustrations, drawn without its labels.
const COVERS: Record<string, string> = {
  start: 'plant-anatomy',
  environment: 'setup-indoor',
  media: 'medium-soil',
  germination: 'germination-paper-towel',
  vegetative: 'leaf-healthy',
  training: 'stretch',
  nutrition: 'leaf-magnesium',
  flowering: 'trichome-stages',
  harvest: 'drying-hang',
  problems: 'pest-spider-mites'
}

const props = defineProps<{ chapter: string, glyph: string, color: string }>()

const illustrations = asyncRegistry(import.meta.glob('./illustrations/*.vue'))
const comp = computed(() => {
  const name = COVERS[props.chapter]
  return name ? illustrations.get(componentKey(name)) : undefined
})
</script>

<template>
  <div
    class="cover"
    :style="{ '--c': color }"
    aria-hidden="true"
  >
    <component
      :is="comp"
      v-if="comp"
    />
    <GrowIcon
      v-else
      :name="glyph"
      class="cover-glyph"
    />
  </div>
</template>

<style scoped>
.cover {
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--well);
}

.cover :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  padding: 10px 12px;
  box-sizing: border-box;
}

/* labels are unreadable at cover size */
.cover :deep(text),
.cover :deep(.ga-callout) {
  display: none;
}

.cover-glyph {
  font-size: 40px;
  color: var(--c);
}
</style>
