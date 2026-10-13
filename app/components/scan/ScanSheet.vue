<script setup lang="ts">
// Scans a plant label: native code scanner in the app, camera + decoder on the web.
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { notify } = useNotify()
const native = isNativeScan()

type Status = 'idle' | 'starting' | 'live' | 'denied' | 'nocamera'
const status = ref<Status>('idle')
const video = ref<HTMLVideoElement | null>(null)
const webOpen = ref(false)
let stream: MediaStream | null = null
let raf = 0
let decode: Awaited<ReturnType<typeof createDecoder>> | null = null
let busy = false

watch(open, async (v) => {
  if (!v) {
    webOpen.value = false
    return
  }
  if (native) {
    const res = await scanNative()
    open.value = false
    if ('text' in res) openScanned(res.text)
    else if (res.error === 'installing') notify(t('organize.scan.installing'), { tone: 'info', duration: 6000 })
    else if (res.error === 'unsupported' || res.error === 'failed') notify(t('organize.scan.failed'), { tone: 'error' })
    return
  }
  webOpen.value = true
}, { immediate: true })

watch(webOpen, (v) => {
  if (v) start()
  else {
    stop()
    open.value = false
  }
})

async function start() {
  status.value = 'starting'
  if (!navigator.mediaDevices?.getUserMedia) {
    status.value = 'nocamera'
    return
  }
  try {
    decode ??= await createDecoder()
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
    if (!webOpen.value) return stop()
    await nextTick()
    if (!video.value) return stop()
    video.value.srcObject = stream
    await video.value.play()
    status.value = 'live'
    loop()
  } catch (e) {
    const name = (e as DOMException)?.name
    status.value = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'nocamera'
    stop()
  }
}

function loop() {
  raf = requestAnimationFrame(async () => {
    if (!webOpen.value || !video.value || !decode) return
    if (!busy && video.value.readyState >= 2) {
      busy = true
      const text = await decode(video.value).catch(() => null)
      busy = false
      if (text && webOpen.value) {
        if (openScanned(text)) webOpen.value = false
        else await new Promise(r => setTimeout(r, 1500))
      }
    }
    if (webOpen.value) loop()
  })
}

function stop() {
  cancelAnimationFrame(raf)
  stream?.getTracks().forEach(tr => tr.stop())
  stream = null
  if (video.value) video.value.srcObject = null
}

async function fromPhoto() {
  const file = await pickImage('environment')
  if (!file) return
  try {
    decode ??= await createDecoder()
    const bmp = await createImageBitmap(file)
    const text = await decode(bmp)
    bmp.close()
    if (!text) {
      notify(t('organize.scan.noCode'), { tone: 'error' })
      return
    }
    if (openScanned(text)) webOpen.value = false
  } catch {
    notify(t('organize.scan.noCode'), { tone: 'error' })
  }
}

onBeforeUnmount(stop)
</script>

<template>
  <BottomSheet
    v-if="!native"
    v-model:open="webOpen"
    :title="t('organize.scan.title')"
    icon="i-tabler-scan"
  >
    <div class="scan">
      <div
        class="viewfinder"
        :class="status"
      >
        <video
          ref="video"
          playsinline
          muted
          aria-hidden="true"
        />
        <span
          v-if="status === 'live'"
          class="frame"
          aria-hidden="true"
        />
        <p
          v-if="status !== 'live'"
          class="vf-msg"
          role="status"
        >
          <UIcon
            :name="status === 'starting' ? 'i-tabler-loader-2' : 'i-tabler-camera-off'"
            class="size-6"
            :class="{ 'animate-spin': status === 'starting' }"
          />
          {{ t(`organize.scan.status.${status}`) }}
        </p>
      </div>
      <p class="muted hint">
        {{ t('organize.scan.hint') }}
      </p>
    </div>
    <template #footer>
      <button
        type="button"
        class="btn"
        @click="webOpen = false"
      >
        {{ t('common.close') }}
      </button>
      <button
        type="button"
        class="btn btn-soft"
        @click="fromPhoto"
      >
        <UIcon
          name="i-tabler-photo-scan"
          class="size-5"
        /> {{ t('organize.scan.fromPhoto') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.scan {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.viewfinder {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--well);
  border: 1px solid var(--line);
}

.viewfinder video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.viewfinder:not(.live) video {
  visibility: hidden;
}

.frame {
  position: absolute;
  inset: 18%;
  border: 2px solid var(--green);
  border-radius: var(--radius);
}

.vf-msg {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--text-2);
}

.hint {
  margin: 0;
  font-size: 13px;
}
</style>
