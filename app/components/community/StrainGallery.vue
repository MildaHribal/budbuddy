<script setup lang="ts">
import type { StrainPhoto } from '~/utils/strains'

const props = defineProps<{
  photos: StrainPhoto[]
  name: string
  auto?: boolean
}>()

const { t } = useI18n()
const track = ref<HTMLElement | null>(null)
const active = ref(0)
const loaded = ref(new Set<string>())
const failed = ref(new Set<string>())

const shown = computed(() => props.photos.filter(p => !failed.value.has(p.id)))
const current = computed(() => shown.value[active.value] ?? null)

watch(() => props.photos, () => {
  active.value = 0
  loaded.value = new Set()
  failed.value = new Set()
  track.value?.scrollTo({ left: 0 })
})

function onScroll() {
  const el = track.value
  if (!el) return
  active.value = Math.round(el.scrollLeft / el.clientWidth)
}

function go(i: number) {
  const el = track.value
  if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}

function onLoad(id: string) {
  loaded.value = new Set(loaded.value).add(id)
}

function onFail(id: string) {
  failed.value = new Set(failed.value).add(id)
}
</script>

<template>
  <figure class="gallery card">
    <div
      v-if="shown.length"
      ref="track"
      class="track"
      @scroll.passive="onScroll"
    >
      <div
        v-for="(p, i) in shown"
        :key="p.id"
        class="slide"
        :class="{ loaded: loaded.has(p.id) }"
      >
        <img
          :src="p.url"
          :alt="`${name} – ${t(`strains.photoKind.${p.kind}`)}`"
          :loading="i === 0 ? 'eager' : 'lazy'"
          decoding="async"
          referrerpolicy="no-referrer"
          @load="onLoad(p.id)"
          @error="onFail(p.id)"
        >
        <span class="kind">{{ t(`strains.photoKind.${p.kind}`) }}</span>
      </div>
    </div>
    <div
      v-else
      class="slide empty"
    >
      <GrowIcon
        :name="auto ? 'seedling' : 'flowering'"
        class="placeholder"
      />
    </div>

    <figcaption
      v-if="current"
      class="caption"
    >
      <NuxtLink
        v-if="current.source_url.startsWith('/')"
        :to="current.source_url"
        class="credit"
      >
        {{ t('strains.photoCredit', { credit: `${current.author} · ${current.license}` }) }}
      </NuxtLink>
      <a
        v-else
        :href="current.source_url"
        target="_blank"
        rel="noopener noreferrer"
        class="credit"
      >
        {{ t('strains.photoCredit', { credit: `${current.author} · ${current.license}` }) }}
      </a>
      <div
        v-if="shown.length > 1"
        class="dots"
        role="tablist"
      >
        <button
          v-for="(p, i) in shown"
          :key="p.id"
          type="button"
          class="dot"
          :class="{ on: i === active }"
          :aria-label="t(`strains.photoKind.${p.kind}`)"
          :aria-selected="i === active"
          role="tab"
          @click="go(i)"
        />
      </div>
    </figcaption>
  </figure>
</template>

<style scoped>
.gallery {
  margin: 0;
  overflow: hidden;
}

.track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.track::-webkit-scrollbar {
  display: none;
}

.slide {
  position: relative;
  flex: 0 0 100%;
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  scroll-snap-align: start;
  color: var(--text-3);
  background: var(--surface-3);
}

.slide img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--dur) ease;
}

.slide.loaded img {
  opacity: 1;
}

.kind {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgb(14 16 15 / 0.78);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
}

.placeholder {
  font-size: 48px;
}

.caption {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-top: 1px solid var(--line);
}

.credit {
  flex: 1;
  min-width: 0;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.4;
  text-decoration: none;
}

.dots {
  display: flex;
  gap: 4px;
}

.dot {
  width: 24px;
  height: 24px;
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
}

.dot.on::after {
  background: var(--green);
}
</style>
