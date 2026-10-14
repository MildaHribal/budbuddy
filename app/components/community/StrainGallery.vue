<script setup lang="ts">
import type { StrainPhoto } from '~/utils/strains'
import { isGrowerPhoto, photoReviewState } from '~/utils/strainPhotos'

const props = defineProps<{
  photos: StrainPhoto[]
  name: string
  auto?: boolean
  /** strain from its original breeder: grower photos must not pass as the breeder's genetics */
  breederStrain?: boolean
}>()
const emit = defineEmits<{ delete: [photo: StrainPhoto] }>()

const { t } = useI18n()
const track = ref<HTMLElement | null>(null)
const active = ref(0)
const loaded = ref(new Set<string>())
const failed = ref(new Set<string>())

const shown = computed(() => props.photos.filter(p => !failed.value.has(p.id)))
const current = computed(() => shown.value[active.value] ?? null)
const credit = (p: StrainPhoto) => (p.user_id ? p.author : `${p.author} · ${p.license}`)
const showSourceNote = computed(() => !!props.breederStrain && !!current.value && isGrowerPhoto(current.value))
const review = computed(() => (current.value ? photoReviewState(current.value) : null))

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
          :class="{ contain: p.fit === 'contain' }"
          :loading="i === 0 ? 'eager' : 'lazy'"
          decoding="async"
          referrerpolicy="no-referrer"
          @load="onLoad(p.id)"
          @error="onFail(p.id)"
        >
        <span class="kind">{{ t(`strains.photoKind.${p.kind}`) }}</span>
        <span
          v-if="photoReviewState(p)"
          class="review"
          :class="photoReviewState(p)"
        >
          <UIcon :name="photoReviewState(p) === 'pending' ? 'i-tabler-hourglass' : 'i-tabler-circle-x'" />
          {{ t(`strains.userPhoto.state.${photoReviewState(p)}`) }}
        </span>
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
        {{ t('strains.photoCredit', { credit: credit(current) }) }}
      </NuxtLink>
      <a
        v-else
        :href="current.source_url"
        target="_blank"
        rel="noopener noreferrer"
        class="credit"
      >
        {{ t('strains.photoCredit', { credit: credit(current) }) }}
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
      <div
        v-if="showSourceNote || review || current.user_id"
        class="meta-row"
      >
        <div class="notes">
          <p
            v-if="review === 'rejected'"
            class="note rejected"
          >
            {{ current.reject_reason ? t('strains.userPhoto.rejectedWhy', { reason: current.reject_reason }) : t('strains.userPhoto.rejectedText') }}
          </p>
          <p
            v-else-if="review === 'pending'"
            class="note"
          >
            {{ t('strains.userPhoto.pendingText') }}
          </p>
          <p
            v-if="showSourceNote"
            class="note"
          >
            {{ t('strains.userPhoto.sourceNote') }}
          </p>
        </div>
        <CommunityReportMenu
          v-if="current.user_id"
          target-type="strain_photo"
          :target-id="current.id"
          :author-id="current.user_id"
          :author-name="current.author"
          no-edit
          @delete="emit('delete', current)"
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

.slide img.contain {
  object-fit: contain;
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

.review {
  position: absolute;
  left: 10px;
  top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgb(14 16 15 / 0.92);
  font-size: 12px;
  font-weight: 600;
}

.review.pending {
  color: var(--amber);
}

.review.rejected {
  color: var(--red);
}

.meta-row {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: -10px;
}

.notes {
  flex: 1;
  min-width: 0;
}

.note {
  margin: 0;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.4;
}

.note + .note {
  margin-top: 2px;
}

.note.rejected {
  color: var(--red);
}

.placeholder {
  font-size: 48px;
}

.caption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
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
