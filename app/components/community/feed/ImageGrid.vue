<script setup lang="ts">
import type { LightboxItem } from '~/components/PhotoLightbox.vue'

const props = defineProps<{ images: string[], title?: string | null }>()
const { t } = useI18n()

const MAX = 4
const shown = computed(() => props.images.slice(0, MAX))
const extra = computed(() => props.images.length - MAX)
const items = computed<LightboxItem[]>(() => props.images.map((url, i) => ({
  photoId: url,
  url,
  title: props.title ?? undefined,
  subtitle: t('feed.photo', { n: i + 1, total: props.images.length })
})))

const index = ref<number | null>(null)
const origin = ref<DOMRect | null>(null)
const loaded = ref(new Set<number>())

function open(i: number, e: MouseEvent) {
  origin.value = (e.currentTarget as HTMLElement).getBoundingClientRect()
  index.value = i
}
</script>

<template>
  <div
    class="grid"
    :class="`n${Math.min(images.length, MAX)}`"
  >
    <button
      v-for="(src, i) in shown"
      :key="src"
      type="button"
      class="cell"
      :class="{ loaded: loaded.has(i) }"
      :aria-label="t('feed.photo', { n: i + 1, total: images.length })"
      @click.stop="open(i, $event)"
    >
      <img
        :src="src"
        alt=""
        loading="lazy"
        decoding="async"
        @load="loaded.add(i)"
        @error="loaded.add(i)"
      >
      <span
        v-if="i === MAX - 1 && extra > 0"
        class="more num"
      >{{ t('feed.morePhotos', { n: extra }) }}</span>
    </button>
    <PhotoLightbox
      v-model:index="index"
      :items="items"
      :origin="origin"
      readonly
    />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  gap: 4px;
  border-radius: 14px;
  overflow: hidden;
  grid-template-columns: 1fr 1fr;
  aspect-ratio: 4 / 3;
}

.grid.n1 {
  grid-template-columns: 1fr;
}

.grid.n3 {
  grid-template-rows: 1fr 1fr;
}

.grid.n3 .cell:first-child {
  grid-row: span 2;
}

.grid.n4 {
  grid-template-rows: 1fr 1fr;
}

.cell {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  background: linear-gradient(110deg, #15181c 30%, #1d2126 50%, #15181c 70%) 0 0 / 300% 100%;
  animation: shimmer 1.4s linear infinite;
  overflow: hidden;
}

.cell.loaded {
  animation: none;
  background: #0b0d10;
}

.cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.cell.loaded img {
  opacity: 1;
}

.cell:active img {
  transform: scale(0.98);
}

.more {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(7, 8, 10, 0.6);
  font-size: 26px;
  font-weight: 300;
  color: var(--text);
}

@keyframes shimmer {
  to {
    background-position: -300% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cell {
    animation: none;
  }
}
</style>
