<script setup lang="ts">
import type { PhotoAlign } from '~/types/grow'
import { ALIGN_LIMITS, alignCss, clampAlign, IDENTITY } from '~/utils/review/align'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  /** photo being lined up */
  photoId: string
  /** previous photo shown as the ghost */
  ghostId: string
  ghostAlign?: PhotoAlign | null
  initial?: PhotoAlign | null
  /** "Day 34" of the ghost, shown in the legend */
  ghostLabel?: string
}>()
const emit = defineEmits<{ save: [align: PhotoAlign] }>()

const { t } = useI18n()
useBackHandler(open, () => (open.value = false))

const photo = usePhotoUrl(computed(() => (open.value ? props.photoId : null)))
const ghost = usePhotoUrl(computed(() => (open.value ? props.ghostId : null)))

const align = reactive<PhotoAlign>({ ...IDENTITY })
const opacity = ref(50)
const peek = ref(false)

watch(open, (v) => {
  if (!v) return
  Object.assign(align, props.initial ?? IDENTITY)
  peek.value = false
}, { immediate: true })

const frame = ref<HTMLElement | null>(null)
const { width: fw, height: fh } = useElementSize(frame)

const photoStyle = computed(() => ({ transform: alignCss(align, fw.value, fh.value) }))
const ghostStyle = computed(() => ({
  transform: alignCss(props.ghostAlign ?? IDENTITY, fw.value, fh.value),
  opacity: peek.value ? 1 : opacity.value / 100
}))

function set(patch: Partial<PhotoAlign>) {
  Object.assign(align, clampAlign({ ...align, ...patch }))
}

const zoom = computed({
  get: () => Math.round(align.scale * 100),
  set: v => set({ scale: Number(v) / 100 })
})
const rotate = computed({
  get: () => align.rotate,
  set: v => set({ rotate: Number(v) })
})

const NUDGE = 0.005
function nudge(dx: number, dy: number) {
  set({ x: align.x + dx * NUDGE, y: align.y + dy * NUDGE })
  haptic('select')
}

// One finger moves, two fingers pinch-zoom and rotate.
const pointers = new Map<number, { x: number, y: number }>()
let start: { align: PhotoAlign, dist: number, angle: number, cx: number, cy: number } | null = null

function snapshot() {
  const pts = [...pointers.values()]
  const [a, b] = pts
  if (!a) return (start = null)
  const cx = b ? (a.x + b.x) / 2 : a.x
  const cy = b ? (a.y + b.y) / 2 : a.y
  start = {
    align: { ...align },
    dist: b ? Math.hypot(b.x - a.x, b.y - a.y) : 0,
    angle: b ? Math.atan2(b.y - a.y, b.x - a.x) : 0,
    cx,
    cy
  }
}

function onDown(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  snapshot()
}

function onMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId) || !start || !fw.value) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  const pts = [...pointers.values()]
  const [a, b] = pts
  if (!a) return
  const cx = b ? (a.x + b.x) / 2 : a.x
  const cy = b ? (a.y + b.y) / 2 : a.y
  const patch: Partial<PhotoAlign> = {
    x: start.align.x + (cx - start.cx) / fw.value,
    y: start.align.y + (cy - start.cy) / fh.value
  }
  if (b && start.dist > 0) {
    patch.scale = start.align.scale * (Math.hypot(b.x - a.x, b.y - a.y) / start.dist)
    patch.rotate = start.align.rotate + ((Math.atan2(b.y - a.y, b.x - a.x) - start.angle) * 180) / Math.PI
  }
  set(patch)
}

function onUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  snapshot()
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  set({ scale: align.scale * (e.deltaY < 0 ? 1.03 : 1 / 1.03) })
}

function reset() {
  Object.assign(align, IDENTITY)
  haptic('select')
}

function save() {
  emit('save', clampAlign(align))
  open.value = false
}
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <Transition name="ga">
      <div
        v-if="open"
        class="ga"
        role="dialog"
        aria-modal="true"
        :aria-label="t('ghost.alignTitle')"
      >
        <header class="ga-head">
          <button
            type="button"
            class="icon-btn"
            :aria-label="t('common.close')"
            @click="open = false"
          >
            <UIcon
              name="i-tabler-x"
              class="size-5"
            />
          </button>
          <div class="ga-title">
            <h2>{{ t('ghost.alignTitle') }}</h2>
            <p>{{ t('ghost.alignHint') }}</p>
          </div>
        </header>

        <div class="ga-stage">
          <div
            ref="frame"
            class="ga-frame"
            @pointerdown="onDown"
            @pointermove="onMove"
            @pointerup="onUp"
            @pointercancel="onUp"
            @wheel="onWheel"
          >
            <img
              v-if="photo"
              :src="photo"
              alt=""
              class="ga-img"
              :style="photoStyle"
              draggable="false"
            >
            <img
              v-if="ghost"
              :src="ghost"
              alt=""
              class="ga-img ga-ghost"
              :style="ghostStyle"
              draggable="false"
            >
            <span
              class="ga-grid"
              aria-hidden="true"
            />
          </div>
        </div>

        <div class="ga-controls">
          <div class="field">
            <div class="rv-range-head">
              <label
                class="field-label"
                for="ga-opacity"
              >{{ ghostLabel ? t('ghost.ghostOf', { day: ghostLabel }) : t('ghost.ghost') }}</label>
              <output
                class="rv-range-value num"
                for="ga-opacity"
              >{{ opacity }} %</output>
            </div>
            <input
              id="ga-opacity"
              v-model.number="opacity"
              class="rv-range"
              type="range"
              min="0"
              max="100"
              step="5"
            >
          </div>
          <div class="ga-two">
            <div class="field">
              <div class="rv-range-head">
                <label
                  class="field-label"
                  for="ga-zoom"
                >{{ t('ghost.zoom') }}</label>
                <output
                  class="rv-range-value num"
                  for="ga-zoom"
                >{{ zoom }} %</output>
              </div>
              <input
                id="ga-zoom"
                v-model.number="zoom"
                class="rv-range"
                type="range"
                :min="ALIGN_LIMITS.scaleMin * 100"
                :max="ALIGN_LIMITS.scaleMax * 100"
                step="1"
              >
            </div>
            <div class="field">
              <div class="rv-range-head">
                <label
                  class="field-label"
                  for="ga-rotate"
                >{{ t('ghost.rotate') }}</label>
                <output
                  class="rv-range-value num"
                  for="ga-rotate"
                >{{ formatNumber(rotate, 1) }}°</output>
              </div>
              <input
                id="ga-rotate"
                v-model.number="rotate"
                class="rv-range"
                type="range"
                min="-15"
                max="15"
                step="0.5"
              >
            </div>
          </div>
          <div class="ga-tools">
            <div
              class="ga-nudge"
              role="group"
              :aria-label="t('ghost.nudge')"
            >
              <button
                type="button"
                class="icon-btn"
                :aria-label="t('ghost.left')"
                @click="nudge(-1, 0)"
              >
                <UIcon
                  name="i-tabler-arrow-left"
                  class="size-5"
                />
              </button>
              <button
                type="button"
                class="icon-btn"
                :aria-label="t('ghost.up')"
                @click="nudge(0, -1)"
              >
                <UIcon
                  name="i-tabler-arrow-up"
                  class="size-5"
                />
              </button>
              <button
                type="button"
                class="icon-btn"
                :aria-label="t('ghost.down')"
                @click="nudge(0, 1)"
              >
                <UIcon
                  name="i-tabler-arrow-down"
                  class="size-5"
                />
              </button>
              <button
                type="button"
                class="icon-btn"
                :aria-label="t('ghost.right')"
                @click="nudge(1, 0)"
              >
                <UIcon
                  name="i-tabler-arrow-right"
                  class="size-5"
                />
              </button>
            </div>
            <button
              type="button"
              class="btn btn-ghost ga-peek"
              :aria-pressed="peek"
              :aria-label="t('ghost.peekAria')"
              @pointerdown="peek = true"
              @pointerup="peek = false"
              @pointerleave="peek = false"
              @keydown.space.prevent="peek = true"
              @keyup.space="peek = false"
            >
              <UIcon
                name="i-tabler-eye"
                class="size-5"
              /> {{ t('ghost.peek') }}
            </button>
          </div>
        </div>

        <footer class="ga-foot">
          <button
            type="button"
            class="btn"
            @click="reset"
          >
            <UIcon
              name="i-tabler-restore"
              class="size-5"
            /> {{ t('ghost.reset') }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="save"
          >
            <UIcon
              name="i-tabler-check"
              class="size-5"
            /> {{ t('ghost.save') }}
          </button>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style src="./review.css"></style>

<style scoped>
.ga {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}

.ga-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
}

.ga-title {
  min-width: 0;
}

.ga-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.ga-title p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.ga-stage {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 4px 16px 12px;
}

.ga-frame {
  position: relative;
  height: 100%;
  max-width: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: var(--radius-control);
  border: 1px solid var(--line-strong);
  background: var(--surface-2);
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.ga-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center;
  pointer-events: none;
}

.ga-ghost {
  transition: opacity var(--dur-fast) ease;
}

/* rule-of-thirds guide */
.ga-grid,
.ga-grid::after {
  position: absolute;
  pointer-events: none;
  border: 0 solid rgba(242, 244, 241, 0.22);
}

.ga-grid {
  inset: 0 33.33%;
  border-width: 0 1px;
}

.ga-grid::after {
  content: "";
  inset: 33.33% -100%;
  border-width: 1px 0;
}

.ga-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 16px;
}

.ga-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.ga-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 4px;
}

.ga-nudge {
  display: flex;
  gap: 6px;
}

.ga-peek {
  padding: 0 12px;
  user-select: none;
  touch-action: none;
}

.ga-peek[aria-pressed="true"] {
  color: var(--green);
}

.ga-foot {
  display: flex;
  gap: 10px;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--line);
  margin-top: 12px;
}

.ga-foot .btn {
  flex: 1;
}

.ga-enter-active {
  transition: opacity var(--dur) var(--ease-out), transform var(--dur-slow) var(--ease-out);
}

.ga-leave-active {
  transition: opacity var(--dur-fast) ease;
}

.ga-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.ga-leave-to {
  opacity: 0;
}
</style>
