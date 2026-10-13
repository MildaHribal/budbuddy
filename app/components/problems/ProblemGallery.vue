<script setup lang="ts">
import type { ProblemPhoto } from '~/utils/problems'
import { problemPhotoUrl } from '~/utils/problems/photos'

const props = defineProps<{ photos: ProblemPhoto[] }>()

const { t } = useI18n()
const track = ref<HTMLElement | null>(null)
const active = ref(0)
const loaded = ref(new Set<string>())
const failed = ref(new Set<string>())

const shown = computed(() => props.photos
  .map(p => ({ ...p, url: problemPhotoUrl(p.file) }))
  .filter((p): p is ProblemPhoto & { url: string } => !!p.url && !failed.value.has(p.file)))

watch(() => props.photos, () => {
  active.value = 0
  failed.value = new Set()
  track.value?.scrollTo({ left: 0 })
})

function onScroll() {
  const el = track.value
  if (el) active.value = Math.round(el.scrollLeft / el.clientWidth)
}

function go(i: number) {
  const el = track.value
  if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}

const onLoad = (file: string) => (loaded.value = new Set(loaded.value).add(file))
const onFail = (file: string) => (failed.value = new Set(failed.value).add(file))
</script>

<template>
  <div
    v-if="shown.length"
    class="gallery card"
  >
    <div
      ref="track"
      class="track"
      @scroll.passive="onScroll"
    >
      <figure
        v-for="(p, i) in shown"
        :key="p.file"
        class="slide"
        :aria-label="shown.length > 1 ? t('problems.detail.photoN', { n: i + 1, total: shown.length }) : undefined"
      >
        <div
          class="frame"
          :class="{ loaded: loaded.has(p.file) }"
        >
          <img
            :src="p.url"
            :alt="p.caption"
            :loading="i === 0 ? 'eager' : 'lazy'"
            decoding="async"
            @load="onLoad(p.file)"
            @error="onFail(p.file)"
          >
        </div>
        <figcaption class="caption">
          <span class="what">{{ p.caption }}</span>
          <a
            :href="p.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="credit"
          >{{ t('problems.detail.photoCredit', { credit: `${p.author} · ${p.license}` }) }}</a>
        </figcaption>
      </figure>
    </div>
    <div
      v-if="shown.length > 1"
      class="dots"
      role="tablist"
    >
      <button
        v-for="(p, i) in shown"
        :key="p.file"
        type="button"
        class="dot"
        :class="{ on: i === active }"
        :aria-label="t('problems.detail.photoN', { n: i + 1, total: shown.length })"
        :aria-selected="i === active"
        role="tab"
        @click="go(i)"
      />
    </div>
  </div>
</template>

<style scoped>
.gallery {
  overflow: hidden;
}

.track {
  display: flex;
  align-items: flex-start;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.track::-webkit-scrollbar {
  display: none;
}

.slide {
  flex: 0 0 100%;
  margin: 0;
  scroll-snap-align: start;
}

.frame {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--surface-2);
}

.frame img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--dur) ease;
}

.frame.loaded img {
  opacity: 1;
}

.caption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px 12px;
  border-top: 1px solid var(--line);
}

.what {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.credit {
  align-self: flex-start;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-3);
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 3px;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 2px;
  padding: 0 0 6px;
}

.dot {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: none;
  display: grid;
  place-items: center;
}

.dot::after {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line-strong);
  transition: background var(--dur) ease;
}

.dot.on::after {
  background: var(--green);
}
</style>
