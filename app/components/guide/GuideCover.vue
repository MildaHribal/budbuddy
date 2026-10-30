<script setup lang="ts">
// Chapter cover: one real photo from that chapter's lessons.
const COVERS: Record<string, string> = {
  start: 'start-legal-home-plant.webp',
  environment: 'environment-tent-filter.webp',
  media: 'media-potting-soil.webp',
  germination: 'germination-sprouting-seed.webp',
  vegetative: 'vegetative-young-plant-coco.webp',
  training: 'training-scrog-canopy.webp',
  nutrition: 'nutrition-healthy-leaf.webp',
  flowering: 'flowering-pistils.webp',
  harvest: 'harvest-curing-jar.webp',
  problems: 'problems-aphid-colony.webp'
}

const props = defineProps<{ chapter: string, glyph: string, color: string }>()

const photos = import.meta.glob<string>('~/assets/guide/*.{jpg,jpeg,webp,png}', { eager: true, query: '?url', import: 'default' })
const src = computed(() => {
  const name = COVERS[props.chapter]
  if (!name) return undefined
  return Object.entries(photos).find(([path]) => path.split('/').pop() === name)?.[1]
})
</script>

<template>
  <div
    class="cover"
    :style="{ '--c': color }"
    aria-hidden="true"
  >
    <img
      v-if="src"
      :src="src"
      alt=""
      loading="lazy"
      decoding="async"
    >
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

.cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-glyph {
  font-size: 40px;
  color: var(--c);
}
</style>
