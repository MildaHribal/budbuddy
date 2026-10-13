<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import type { PhotoAlign } from '~/types/grow'
import { isIdentity, withoutKey } from '~/utils/review/align'
import { safeFileName, shareFiles } from '~/utils/review/shareFile'
import { clipSeconds, timelapseFrames, type TimelapseFrame } from '~/utils/review/timelapse'
import { drawTimelapseFrame, ExportAborted, exportTimelapse, loadFrameImage, webCodecsAvailable, type FrameLabel, type LoadedImage } from '~/utils/review/timelapseVideo'

const route = useRoute()
const grow = useGrow()
const { t } = useI18n()
const { notify } = useNotify()

const plantId = computed(() => String(route.params.id))
const plant = computed(() => grow.getPlant(plantId.value))
useHead({ title: () => `${t('review.timelapse.title')} · ${plant.value?.name ?? ''}` })

const frames = computed<TimelapseFrame[]>(() => (plant.value ? timelapseFrames(plant.value, grow.state.entries) : []))
const enough = computed(() => frames.value.length >= 2)

// per-device preferences
const prefs = useLocalStorage('budbuddy:timelapse', { speed: 4, smooth: true, labels: true, size: 1080 })
const SPEEDS = [
  { value: 2, key: 'slow' },
  { value: 4, key: 'normal' },
  { value: 8, key: 'fast' }
] as const

function labelFor(f: TimelapseFrame): FrameLabel {
  const s = stageInfo(f.stage)
  return {
    day: t('review.timelapse.day', { n: f.day }),
    stage: s.label,
    stageColor: s.color,
    date: formatDate(f.date),
    title: plant.value?.name ?? ''
  }
}

// ── Player ────────────────────────────────────────────────────────
const canvas = ref<HTMLCanvasElement | null>(null)
const index = ref(0)
const playing = ref(false)
const PREVIEW_W = 720
const PREVIEW_H = 900

const cache = new Map<string, Promise<LoadedImage | null>>()
function image(i: number, size: 'thumb' | 'full'): Promise<LoadedImage | null> {
  const f = frames.value[i]
  if (!f) return Promise.resolve(null)
  const key = `${f.photoId}:${size}`
  let p = cache.get(key)
  if (!p) {
    p = loadFrameImage(f.photoId, size)
    cache.set(key, p)
    // small LRU: decoded photos are big
    if (cache.size > 24) cache.delete(cache.keys().next().value!)
  }
  return p
}

let drawSeq = 0
async function draw(i: number, mix = 0, size: 'thumb' | 'full' = 'full') {
  const ctx = canvas.value?.getContext('2d')
  const f = frames.value[i]
  if (!ctx || !f) return
  const seq = ++drawSeq
  const next = mix > 0 ? frames.value[i + 1] : undefined
  const [a, b] = await Promise.all([image(i, size), next ? image(i + 1, size) : null])
  if (seq !== drawSeq) return
  drawTimelapseFrame(ctx, PREVIEW_W, PREVIEW_H, { img: a, align: f.align }, next ? { img: b, align: next.align } : null, mix, prefs.value.labels ? labelFor(mix > 0.5 && next ? next : f) : null)
}

let raf = 0
let startedAt = 0
let startIndex = 0
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)

function tick(now: number) {
  if (!playing.value) return
  const n = frames.value.length
  const pos = startIndex + ((now - startedAt) / 1000) * prefs.value.speed
  // hold the last photo a second, then loop
  if (pos >= n - 1 + prefs.value.speed) {
    startedAt = now
    startIndex = 0
  }
  const p = Math.min(pos, n - 1)
  const i = Math.floor(p)
  const frac = p - i
  if (i !== index.value) index.value = i
  const mix = prefs.value.smooth && i < n - 1 && frac > 0.6 ? easeInOut((frac - 0.6) / 0.4) : 0
  draw(i, mix, 'thumb')
  raf = requestAnimationFrame(tick)
}

function play() {
  if (!enough.value) return
  if (index.value >= frames.value.length - 1) index.value = 0
  playing.value = true
  startedAt = performance.now()
  startIndex = index.value
  raf = requestAnimationFrame(tick)
}

function pause() {
  playing.value = false
  cancelAnimationFrame(raf)
  draw(index.value)
}

function toggle() {
  if (playing.value) pause()
  else play()
}

function seek(i: number) {
  if (playing.value) pause()
  index.value = Math.max(0, Math.min(frames.value.length - 1, i))
  draw(index.value)
}

watch([() => prefs.value.labels, frames], () => {
  if (index.value >= frames.value.length) index.value = Math.max(0, frames.value.length - 1)
  if (!playing.value) draw(index.value)
}, { deep: true })
watch(canvas, c => c && draw(index.value))
onBeforeUnmount(() => cancelAnimationFrame(raf))

const current = computed(() => frames.value[index.value] ?? null)
const currentAligned = computed(() => !!current.value && !isIdentity(current.value.align))
const seconds = computed(() => Math.round(clipSeconds(frames.value.length, prefs.value.speed, 30)))

// ── Alignment of the current photo ────────────────────────────────
const alignOpen = ref(false)
const alignUsed = ref(false)
const previous = computed(() => (index.value > 0 ? frames.value[index.value - 1] ?? null : null))

function lineUp() {
  if (!previous.value) return
  pause()
  alignUsed.value = true
  alignOpen.value = true
}

function saveAlign(a: PhotoAlign) {
  const f = current.value
  if (!f) return
  const entry = grow.state.entries.find(e => e.id === f.entryId)
  if (!entry) return
  const map = isIdentity(a) ? withoutKey(entry.align ?? {}, f.photoId) : { ...entry.align, [f.photoId]: a }
  grow.updateEntry(entry.id, { align: Object.keys(map).length ? map : undefined })
  notify(t('review.timelapse.aligned'), { icon: 'photo' })
}

function resetAlign() {
  saveAlign({ x: 0, y: 0, scale: 1, rotate: 0 })
}

// ── Adding photos ─────────────────────────────────────────────────
const entryOpen = ref(false)

// ── Export ────────────────────────────────────────────────────────
const exportSheet = ref(false)
const exporting = ref(false)
const progress = ref(0)
const result = shallowRef<{ blob: Blob, ext: 'mp4' | 'webm' | 'gif', url: string } | null>(null)
let abort: AbortController | null = null

function clearResult() {
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = null
}
watch(exportSheet, (v) => {
  if (v) return
  abort?.abort()
  clearResult()
})
onBeforeUnmount(() => {
  abort?.abort()
  clearResult()
})

async function startExport() {
  if (!enough.value || exporting.value) return
  pause()
  clearResult()
  exportSheet.value = true
  exporting.value = true
  progress.value = 0
  abort = new AbortController()
  try {
    const w = prefs.value.size === 720 ? 720 : 1080
    const res = await exportTimelapse(frames.value, {
      width: w,
      height: Math.round(w * 1.25),
      photosPerSecond: prefs.value.speed,
      smooth: prefs.value.smooth,
      labels: prefs.value.labels,
      labelFor,
      onProgress: p => (progress.value = p),
      signal: abort.signal
    })
    if (!exportSheet.value) return
    result.value = { ...res, url: URL.createObjectURL(res.blob) }
    haptic('success')
  } catch (e) {
    if (e instanceof ExportAborted) return
    console.error(e)
    exportSheet.value = false
    notify(t('review.timelapse.failed'), { tone: 'error' })
  } finally {
    exporting.value = false
    abort = null
  }
}

const isNative = Capacitor.isNativePlatform()
const sharing = ref(false)

async function share() {
  const r = result.value
  const p = plant.value
  if (!r || !p) return
  sharing.value = true
  try {
    const res = await shareFiles([{ blob: r.blob, name: `${safeFileName(p.name, 'plant')}-timelapse.${r.ext}` }], t('review.timelapse.shareTitle', { name: p.name }))
    if (res === 'downloaded') notify(t('review.common.downloaded'))
  } catch (e) {
    console.error(e)
    notify(t('review.common.shareFailed'), { tone: 'error' })
  } finally {
    sharing.value = false
  }
}

const sizeLabel = (b: Blob) => (b.size >= 1e6 ? `${formatNumber(b.size / 1e6, 1)} MB` : `${Math.max(1, Math.round(b.size / 1e3))} kB`)
</script>

<template>
  <div>
    <AppHeader
      :title="t('review.timelapse.title')"
      :subtitle="plant?.name"
      back
    />

    <div
      v-if="!plant"
      class="page"
    >
      <EmptyState
        icon="seedling"
        :title="t('review.common.noPlant')"
      />
    </div>

    <div
      v-else-if="!enough"
      class="page rise"
    >
      <EmptyState
        icon="photo"
        :title="t('review.timelapse.emptyTitle')"
        :text="t('review.timelapse.emptyText', { n: frames.length })"
      />
      <button
        v-if="!plant.archived"
        type="button"
        class="btn btn-primary"
        @click="entryOpen = true"
      >
        <GrowIcon
          name="photo"
          class="text-[20px]"
        /> {{ t('review.timelapse.addPhoto') }}
      </button>
    </div>

    <div
      v-else
      class="page rise"
    >
      <section class="card player">
        <button
          type="button"
          class="screen"
          :aria-label="playing ? t('review.timelapse.pause') : t('review.timelapse.play')"
          @click="toggle"
        >
          <canvas
            ref="canvas"
            :width="PREVIEW_W"
            :height="PREVIEW_H"
            role="img"
            :aria-label="current ? t('review.timelapse.frameAria', { day: current.day, n: index + 1, total: frames.length }) : ''"
          />
          <span
            v-if="!playing"
            class="play-badge"
            aria-hidden="true"
          >
            <UIcon
              name="i-tabler-player-play-filled"
              class="size-7"
            />
          </span>
        </button>
        <div class="controls">
          <button
            type="button"
            class="icon-btn accent"
            :aria-label="playing ? t('review.timelapse.pause') : t('review.timelapse.play')"
            @click="toggle"
          >
            <UIcon
              :name="playing ? 'i-tabler-player-pause-filled' : 'i-tabler-player-play-filled'"
              class="size-5"
            />
          </button>
          <input
            :value="index"
            class="rv-range"
            type="range"
            min="0"
            :max="frames.length - 1"
            step="1"
            :aria-label="t('review.timelapse.scrub')"
            :aria-valuetext="current ? t('review.timelapse.frameAria', { day: current.day, n: index + 1, total: frames.length }) : ''"
            @input="seek(Number(($event.target as HTMLInputElement).value))"
          >
          <span class="count num">{{ index + 1 }}/{{ frames.length }}</span>
        </div>
        <div
          v-if="current"
          class="frame-meta"
        >
          <span class="num">{{ t('review.timelapse.day', { n: current.day }) }} · {{ formatDate(current.date) }}</span>
          <StageBadge :stage="current.stage" />
        </div>
        <div class="frame-actions">
          <button
            type="button"
            class="btn btn-soft"
            :disabled="!previous"
            @click="lineUp"
          >
            <UIcon
              name="i-tabler-layers-intersect"
              class="size-5"
            /> {{ currentAligned ? t('review.timelapse.realign') : t('review.timelapse.lineUp') }}
          </button>
          <button
            v-if="currentAligned"
            type="button"
            class="btn btn-ghost"
            @click="resetAlign"
          >
            {{ t('review.timelapse.resetAlign') }}
          </button>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('review.timelapse.settings') }}
          </h2>
          <span class="section-meta num">{{ t('review.timelapse.length', { n: seconds }) }}</span>
        </div>
        <div class="card settings">
          <div class="setting">
            <span
              id="tl-speed"
              class="field-label"
            >{{ t('review.timelapse.speed') }}</span>
            <div
              class="segmented"
              role="group"
              aria-labelledby="tl-speed"
            >
              <button
                v-for="s in SPEEDS"
                :key="s.value"
                type="button"
                :aria-pressed="prefs.speed === s.value"
                @click="prefs.speed = s.value"
              >
                {{ t(`review.timelapse.speeds.${s.key}`) }}
              </button>
            </div>
          </div>
          <div class="setting">
            <span
              id="tl-size"
              class="field-label"
            >{{ t('review.timelapse.size') }}</span>
            <div
              class="segmented"
              role="group"
              aria-labelledby="tl-size"
            >
              <button
                type="button"
                :aria-pressed="prefs.size !== 720"
                @click="prefs.size = 1080"
              >
                {{ t('review.timelapse.sizeFull') }}
              </button>
              <button
                type="button"
                :aria-pressed="prefs.size === 720"
                @click="prefs.size = 720"
              >
                {{ t('review.timelapse.sizeSmall') }}
              </button>
            </div>
          </div>
          <button
            type="button"
            class="rv-switch"
            role="switch"
            :aria-checked="prefs.smooth"
            @click="prefs.smooth = !prefs.smooth"
          >
            <span class="rv-switch-text">
              {{ t('review.timelapse.smooth') }}
              <small>{{ t('review.timelapse.smoothHint') }}</small>
            </span>
            <span class="rv-switch-track" />
          </button>
          <button
            type="button"
            class="rv-switch"
            role="switch"
            :aria-checked="prefs.labels"
            @click="prefs.labels = !prefs.labels"
          >
            <span class="rv-switch-text">
              {{ t('review.timelapse.labels') }}
              <small>{{ t('review.timelapse.labelsHint') }}</small>
            </span>
            <span class="rv-switch-track" />
          </button>
        </div>
      </section>

      <button
        type="button"
        class="btn btn-primary btn-block"
        @click="startExport"
      >
        <UIcon
          name="i-tabler-movie"
          class="size-5"
        /> {{ t('review.timelapse.export') }}
      </button>
      <p class="rv-note">
        <UIcon
          name="i-tabler-lock"
          class="size-4"
        />
        {{ webCodecsAvailable() ? t('review.timelapse.privateNote') : t('review.timelapse.gifNote') }}
      </p>
    </div>

    <BottomSheet
      v-model:open="exportSheet"
      :title="t('review.timelapse.exportTitle')"
      icon="i-tabler-movie"
    >
      <div
        v-if="!result"
        class="exporting"
        aria-live="polite"
      >
        <div class="rv-progress-label">
          <span>{{ t('review.timelapse.rendering') }}</span>
          <span class="num">{{ Math.round(progress * 100) }} %</span>
        </div>
        <div
          class="progress"
          role="progressbar"
          :aria-valuenow="Math.round(progress * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div :style="{ width: `${Math.max(2, progress * 100)}%` }" />
        </div>
        <p class="field-hint">
          {{ t('review.timelapse.keepOpen') }}
        </p>
      </div>
      <div
        v-else
        class="result"
      >
        <video
          v-if="result.ext !== 'gif'"
          :src="result.url"
          class="result-media"
          autoplay
          loop
          muted
          playsinline
          controls
        />
        <img
          v-else
          :src="result.url"
          class="result-media"
          :alt="t('review.timelapse.previewAlt')"
        >
        <p class="result-meta num">
          {{ result.ext.toUpperCase() }} · {{ sizeLabel(result.blob) }}
          <template v-if="result.ext === 'gif'">
            · {{ t('review.timelapse.gifFallback') }}
          </template>
        </p>
      </div>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="exportSheet = false"
        >
          {{ exporting ? t('common.cancel') : t('common.close') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!result || sharing"
          @click="share"
        >
          <UIcon
            :name="isNative ? 'i-tabler-share-2' : 'i-tabler-download'"
            class="size-5"
          /> {{ isNative ? t('review.common.share') : t('review.common.saveFile') }}
        </button>
      </template>
    </BottomSheet>

    <LazyReviewGhostAlign
      v-if="alignUsed && current && previous"
      v-model:open="alignOpen"
      :photo-id="current.photoId"
      :ghost-id="previous.photoId"
      :ghost-align="previous.align"
      :ghost-label="t('ghost.day', { n: previous.day })"
      :initial="current.align"
      @save="saveAlign"
    />

    <EntrySheet
      v-if="plant"
      v-model:open="entryOpen"
      :plant-id="plant.id"
      type="photo"
      :date="todayISO()"
    />
  </div>
</template>

<style src="~/components/review/review.css"></style>

<style scoped>
.player {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.screen {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-2);
  aspect-ratio: 4 / 5;
}

.screen canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.play-badge {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(14, 16, 15, 0.72);
  color: var(--text);
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.count {
  min-width: 44px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.frame-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: var(--text-2);
}

.frame-actions {
  display: flex;
  gap: 8px;
}

.frame-actions .btn-soft {
  flex: 1;
}

.settings {
  display: flex;
  flex-direction: column;
}

.setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
}

.exporting {
  padding: 8px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exporting .field-hint {
  margin: 8px 0 0;
}

.result {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-media {
  display: block;
  width: min(100%, 300px);
  margin: 0 auto;
  aspect-ratio: 4 / 5;
  border-radius: var(--radius-control);
  border: 1px solid var(--line);
  background: var(--well);
  object-fit: cover;
}

.result-meta {
  margin: 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-2);
}
</style>
