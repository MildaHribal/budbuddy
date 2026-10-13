<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { canShareFiles, shareFiles } from '~/utils/review/shareFile'
import { computeWrapped, periodPhotos, wrappedPeriods, type Period, type WrappedPhoto } from '~/utils/review/wrapped'
import type { WrappedCardId } from '~/utils/review/wrappedCards'

const { t, locale } = useI18n()
const { notify } = useNotify()
const grow = useGrow()
const route = useRoute()
useHead({ title: () => t('review.wrapped.title') })

const periods = computed(() => wrappedPeriods(grow.state))
const periodId = computed({
  get: () => {
    const q = String(route.query.p ?? '')
    return periods.value.some(p => p.id === q) ? q : periods.value[0]!.id
  },
  set: v => navigateTo({ query: { ...route.query, p: v } }, { replace: true })
})
const period = computed<Period>(() => periods.value.find(p => p.id === periodId.value) ?? periods.value[0]!)
const periodLabel = (p: Period) => (p.id === 'all' ? t('review.wrapped.allTime') : p.id)
const stats = computed(() => computeWrapped(grow.state, period.value))

// ── Photo for the photo card ──────────────────────────────────────
const photos = computed(() => periodPhotos(grow.state, period.value))
const chosen = ref<string | null>(null)
watch(periodId, () => (chosen.value = null))
const photo = computed<WrappedPhoto | null>(() => photos.value.find(p => p.photoId === chosen.value) ?? stats.value?.bestPhoto ?? null)
const photoSheet = ref(false)

function caption(p: WrappedPhoto): string {
  const plant = grow.getPlant(p.plantId)
  if (!plant) return formatDate(p.date)
  return `${plant.name} · ${t('review.timelapse.day', { n: Math.max(0, daysBetween(plant.startDate, p.date)) })}`
}

function pickPhoto(id: string) {
  chosen.value = id
  photoSheet.value = false
}

// ── Cards ─────────────────────────────────────────────────────────
interface Card { id: WrappedCardId, blob: Blob, url: string }
const cards = shallowRef<Card[]>([])
const rendering = ref(false)
const failed = ref(false)
let renderSeq = 0

function clearCards() {
  cards.value.forEach(c => URL.revokeObjectURL(c.url))
  cards.value = []
}

async function render() {
  const s = stats.value
  const seq = ++renderSeq
  if (!s) {
    clearCards()
    return
  }
  rendering.value = true
  failed.value = false
  try {
    const mod = await import('~/utils/review/wrappedCards')
    const input = {
      stats: s,
      periodLabel: periodLabel(period.value),
      photo: photo.value ? { photoId: photo.value.photoId, caption: caption(photo.value) } : null,
      t
    }
    const ids = mod.wrappedCardIds(input)
    const out: Card[] = []
    for (const [i, id] of ids.entries()) {
      const blob = await mod.renderWrappedCard(input, id, i, ids.length)
      if (seq !== renderSeq) return
      out.push({ id, blob, url: URL.createObjectURL(blob) })
    }
    clearCards()
    cards.value = out
  } catch (e) {
    console.error(e)
    if (seq === renderSeq) failed.value = true
  } finally {
    if (seq === renderSeq) rendering.value = false
  }
}

watch([stats, photo, locale], render, { immediate: true })
onBeforeUnmount(() => {
  renderSeq++
  clearCards()
})

const track = ref<HTMLElement | null>(null)
const active = ref(0)
watch(cards, () => {
  active.value = 0
  track.value?.scrollTo({ left: 0 })
})

function onScroll() {
  const el = track.value
  if (!el) return
  const w = el.firstElementChild?.getBoundingClientRect().width ?? el.clientWidth
  active.value = Math.max(0, Math.min(cards.value.length - 1, Math.round(el.scrollLeft / (w + 12))))
}

function goTo(i: number) {
  const el = track.value
  const item = el?.children[i] as HTMLElement | undefined
  if (el && item) el.scrollTo({ left: item.offsetLeft - el.offsetLeft, behavior: 'smooth' })
}

// ── Share ─────────────────────────────────────────────────────────
const isNative = Capacitor.isNativePlatform()
const shareable = canShareFiles()
const sharing = ref(false)
const fileName = (c: Card, i: number) => `budbuddy-wrapped-${period.value.id}-${i + 1}-${c.id}.png`

async function share(all: boolean) {
  const list = all ? cards.value : cards.value.slice(active.value, active.value + 1)
  if (!list.length) return
  sharing.value = true
  try {
    const files = list.map(c => ({ blob: c.blob, name: fileName(c, cards.value.indexOf(c)) }))
    const res = await shareFiles(files, t('review.wrapped.shareTitle', { period: periodLabel(period.value) }))
    if (res === 'downloaded') notify(all ? t('review.wrapped.savedAll', { n: files.length }) : t('review.common.downloaded'))
    if (res !== 'cancelled') haptic('success')
  } catch (e) {
    console.error(e)
    notify(t('review.common.shareFailed'), { tone: 'error' })
  } finally {
    sharing.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader
      :title="t('review.wrapped.title')"
      :subtitle="t('review.wrapped.subtitle')"
      back
    />

    <div class="page rise">
      <div
        v-if="periods.length > 1"
        class="chips"
        role="group"
        :aria-label="t('review.wrapped.period')"
      >
        <button
          v-for="p in periods"
          :key="p.id"
          type="button"
          class="chip num"
          :aria-pressed="p.id === periodId"
          @click="periodId = p.id"
        >
          {{ periodLabel(p) }}
        </button>
      </div>

      <EmptyState
        v-if="!stats"
        icon="harvest"
        :title="t('review.wrapped.emptyTitle')"
        :text="t('review.wrapped.emptyText')"
      />

      <template v-else>
        <section :aria-label="t('review.wrapped.cardsAria')">
          <div
            ref="track"
            class="track"
            :aria-busy="rendering"
            @scroll.passive="onScroll"
          >
            <template v-if="cards.length">
              <figure
                v-for="(c, i) in cards"
                :key="c.url"
                class="story"
              >
                <img
                  :src="c.url"
                  :alt="t(`review.wrapped.alt.${c.id}`, { n: i + 1, total: cards.length })"
                >
              </figure>
            </template>
            <div
              v-else
              class="story skeleton"
              role="status"
            >
              <span v-if="failed">{{ t('review.wrapped.failed') }}</span>
              <span v-else>
                <UIcon
                  name="i-tabler-loader-2"
                  class="size-6 animate-spin"
                />
                {{ t('review.wrapped.rendering') }}
              </span>
            </div>
          </div>
          <div
            v-if="cards.length > 1"
            class="dots"
          >
            <button
              v-for="(c, i) in cards"
              :key="c.url"
              type="button"
              class="dot"
              :class="{ on: i === active }"
              :aria-label="t('review.wrapped.goTo', { n: i + 1 })"
              :aria-current="i === active"
              @click="goTo(i)"
            />
          </div>
        </section>

        <div class="rv-actions">
          <button
            type="button"
            class="btn"
            :disabled="!cards.length || sharing"
            @click="share(true)"
          >
            <UIcon
              name="i-tabler-stack-2"
              class="size-5"
            /> {{ isNative || shareable ? t('review.wrapped.shareAll') : t('review.wrapped.saveAll') }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!cards.length || sharing"
            @click="share(false)"
          >
            <UIcon
              :name="isNative || shareable ? 'i-tabler-share-2' : 'i-tabler-download'"
              class="size-5"
            /> {{ isNative || shareable ? t('review.wrapped.shareOne') : t('review.wrapped.saveOne') }}
          </button>
        </div>

        <div class="card options">
          <button
            v-if="photos.length"
            type="button"
            class="rv-row"
            @click="photoSheet = true"
          >
            <span
              class="rv-tile"
              style="color: #8ea6f5"
            >
              <GrowIcon name="photo" />
            </span>
            <span class="rv-row-text">
              <span class="rv-row-title">{{ t('review.wrapped.changePhoto') }}</span>
              <span class="rv-row-desc">{{ photo ? caption(photo) : t('review.wrapped.noPhoto') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 rv-row-go"
            />
          </button>
          <NuxtLink
            to="/stats"
            class="rv-row"
          >
            <span
              class="rv-tile"
              style="color: var(--green)"
            >
              <GrowIcon name="i-tabler-chart-bar" />
            </span>
            <span class="rv-row-text">
              <span class="rv-row-title">{{ t('review.wrapped.allStats') }}</span>
              <span class="rv-row-desc">{{ t('review.wrapped.allStatsDesc') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 rv-row-go"
            />
          </NuxtLink>
        </div>

        <p class="rv-note">
          <UIcon
            name="i-tabler-lock"
            class="size-4"
          />
          {{ t('review.wrapped.private') }}
        </p>
      </template>
    </div>

    <BottomSheet
      v-model:open="photoSheet"
      :title="t('review.wrapped.pickPhoto')"
      icon="photo"
    >
      <div class="pick-grid">
        <button
          v-for="p in photos"
          :key="p.photoId"
          type="button"
          class="pick"
          :class="{ on: p.photoId === photo?.photoId }"
          :aria-pressed="p.photoId === photo?.photoId"
          :aria-label="caption(p)"
          @click="pickPhoto(p.photoId)"
        >
          <PlantPhoto
            :photo-id="p.photoId"
            stage="vegetative"
          />
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<style src="~/components/review/review.css"></style>

<style scoped>
.track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  margin: 0 -16px;
  padding: 0 16px;
  scroll-padding-inline: 16px;
}

.track::-webkit-scrollbar {
  display: none;
}

.story {
  flex: 0 0 min(78%, 300px);
  margin: 0;
  scroll-snap-align: start;
  aspect-ratio: 9 / 16;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  overflow: hidden;
  background: var(--surface);
}

.story img {
  display: block;
  width: 100%;
  height: 100%;
}

.skeleton {
  display: grid;
  place-items: center;
  color: var(--text-3);
  font-size: 14px;
  text-align: center;
  padding: 24px;
}

.skeleton span {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 8px;
}

.dot {
  position: relative;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: none;
}

.dot::before {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--line-strong);
  transition: width var(--dur) var(--ease-out), background var(--dur) ease;
}

.dot.on::before {
  width: 18px;
  background: var(--green);
}

.options {
  overflow: hidden;
}

.pick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding-bottom: 4px;
}

.pick {
  aspect-ratio: 1;
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-2);
}

.pick.on {
  border-color: var(--green);
}
</style>
