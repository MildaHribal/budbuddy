<script setup lang="ts">
import type { PhotoAlign } from '~/types/grow'
import { alignCss, FRAME_ASPECT, IDENTITY } from '~/utils/review/align'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  ghostId: string
  ghostAlign?: PhotoAlign | null
  ghostLabel?: string
}>()
const emit = defineEmits<{ capture: [photo: Blob], fallback: [] }>()

const { t } = useI18n()
useBackHandler(open, () => (open.value = false))

const ghost = usePhotoUrl(computed(() => (open.value ? props.ghostId : null)))
const video = ref<HTMLVideoElement | null>(null)
const frame = ref<HTMLElement | null>(null)
const { width: fw, height: fh } = useElementSize(frame)
const opacity = ref(40)
const state = ref<'starting' | 'live' | 'denied' | 'error'>('starting')
const busy = ref(false)
let stream: MediaStream | null = null

const ghostStyle = computed(() => ({ transform: alignCss(props.ghostAlign ?? IDENTITY, fw.value, fh.value), opacity: opacity.value / 100 }))

function stop() {
  stream?.getTracks().forEach(tr => tr.stop())
  stream = null
}

async function start() {
  state.value = 'starting'
  stop()
  if (!navigator.mediaDevices?.getUserMedia) {
    state.value = 'error'
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } }
    })
    if (!open.value) return stop()
    await nextTick()
    if (video.value) {
      video.value.srcObject = stream
      await video.value.play().catch(() => {})
    }
    state.value = 'live'
  } catch (e) {
    console.warn('[BudBuddy] camera', e)
    state.value = /NotAllowed|Permission|Security/i.test(String((e as Error)?.name ?? e)) ? 'denied' : 'error'
  }
}

watch(open, v => (v ? start() : stop()), { immediate: true })
onBeforeUnmount(stop)

/** Grabs exactly the visible 4:5 crop, so the shot needs no alignment afterwards. */
async function shoot() {
  const v = video.value
  if (!v || !v.videoWidth || busy.value) return
  busy.value = true
  try {
    const vw = v.videoWidth
    const vh = v.videoHeight
    const cropW = Math.min(vw, vh * FRAME_ASPECT)
    const cropH = cropW / FRAME_ASPECT
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(cropW)
    canvas.height = Math.round(cropH)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas unavailable')
    ctx.drawImage(v, (vw - cropW) / 2, (vh - cropH) / 2, cropW, cropH, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.92))
    if (!blob) throw new Error('encode failed')
    haptic('success')
    emit('capture', blob)
    open.value = false
  } catch (e) {
    console.error(e)
    state.value = 'error'
  } finally {
    busy.value = false
  }
}

function usePicker() {
  open.value = false
  emit('fallback')
}
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <Transition name="gc">
      <div
        v-if="open"
        class="gc"
        role="dialog"
        aria-modal="true"
        :aria-label="t('ghost.cameraTitle')"
      >
        <header class="gc-head">
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
          <div class="gc-title">
            <h2>{{ t('ghost.cameraTitle') }}</h2>
            <p>{{ t('ghost.cameraHint') }}</p>
          </div>
        </header>

        <div class="gc-stage">
          <div
            ref="frame"
            class="gc-frame"
          >
            <video
              ref="video"
              class="gc-media"
              playsinline
              muted
              autoplay
            />
            <img
              v-if="ghost && state === 'live'"
              :src="ghost"
              alt=""
              class="gc-media gc-ghost"
              :style="ghostStyle"
            >
            <div
              v-if="state !== 'live'"
              class="gc-state"
              role="status"
            >
              <template v-if="state === 'starting'">
                <UIcon
                  name="i-tabler-loader-2"
                  class="size-6 animate-spin"
                />
                <span>{{ t('ghost.starting') }}</span>
              </template>
              <template v-else>
                <UIcon
                  name="i-tabler-camera-off"
                  class="size-7"
                />
                <strong>{{ state === 'denied' ? t('ghost.deniedTitle') : t('ghost.errorTitle') }}</strong>
                <span>{{ state === 'denied' ? t('ghost.deniedText') : t('ghost.errorText') }}</span>
                <button
                  type="button"
                  class="btn btn-soft"
                  @click="usePicker"
                >
                  <UIcon
                    name="i-tabler-photo"
                    class="size-5"
                  /> {{ t('ghost.pickInstead') }}
                </button>
              </template>
            </div>
          </div>
        </div>

        <div class="gc-controls">
          <div class="field">
            <div class="rv-range-head">
              <label
                class="field-label"
                for="gc-opacity"
              >{{ ghostLabel ? t('ghost.ghostOf', { day: ghostLabel }) : t('ghost.ghost') }}</label>
              <output
                class="rv-range-value num"
                for="gc-opacity"
              >{{ opacity }} %</output>
            </div>
            <input
              id="gc-opacity"
              v-model.number="opacity"
              class="rv-range"
              type="range"
              min="0"
              max="90"
              step="5"
              :disabled="state !== 'live'"
            >
          </div>
          <div class="gc-shutter-row">
            <button
              type="button"
              class="btn btn-ghost"
              @click="usePicker"
            >
              {{ t('ghost.gallery') }}
            </button>
            <button
              type="button"
              class="gc-shutter"
              :disabled="state !== 'live' || busy"
              :aria-label="t('ghost.shoot')"
              @click="shoot"
            >
              <span />
            </button>
            <span class="gc-spacer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style src="./review.css"></style>

<style scoped>
.gc {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}

.gc-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
}

.gc-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.gc-title p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.gc-stage {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 4px 16px 12px;
}

.gc-frame {
  position: relative;
  height: 100%;
  max-width: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: var(--radius-control);
  border: 1px solid var(--line-strong);
  background: var(--well);
}

.gc-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center;
}

.gc-ghost {
  pointer-events: none;
}

.gc-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
  color: var(--text-2);
  font-size: 14px;
}

.gc-state strong {
  color: var(--text);
  font-size: 16px;
  font-weight: 600;
}

.gc-state .btn {
  margin-top: 6px;
}

.gc-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px 16px;
}

.gc-shutter-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.gc-shutter-row .btn {
  justify-self: start;
  padding: 0 12px;
}

.gc-shutter {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 3px solid var(--text);
  background: transparent;
  transition: transform var(--dur-fast) var(--ease-out);
}

.gc-shutter span {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--text);
}

.gc-shutter:active:not(:disabled) {
  transform: scale(0.94);
}

.gc-shutter:disabled {
  opacity: 0.4;
}

.gc-enter-active {
  transition: opacity var(--dur) var(--ease-out), transform var(--dur-slow) var(--ease-out);
}

.gc-leave-active {
  transition: opacity var(--dur-fast) ease;
}

.gc-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.gc-leave-to {
  opacity: 0;
}
</style>
