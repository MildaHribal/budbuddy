<script setup lang="ts">
export interface LightboxItem {
  photoId: string
  title?: string
  subtitle?: string
  to?: string
}

const props = defineProps<{
  items: LightboxItem[]
  /** screen rect of the tapped thumbnail; the photo zooms out of it on open */
  origin?: DOMRect | null
}>()
const index = defineModel<number | null>('index', { default: null })
const emit = defineEmits<{ delete: [item: LightboxItem] }>()

const open = computed(() => index.value !== null && !!props.items[index.value])
const current = computed(() => (index.value === null ? null : props.items[index.value] ?? null))
const url = usePhotoUrl(computed(() => current.value?.photoId))
const img = ref<HTMLImageElement | null>(null)
const { t } = useI18n()

useBackHandler(open, close)

function close() {
  index.value = null
}
function go(delta: number) {
  if (index.value === null) return
  const next = index.value + delta
  if (next >= 0 && next < props.items.length) index.value = next
}

function onKey(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'ArrowLeft') go(-1)
  if (e.key === 'ArrowRight') go(1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

let touchX: number | null = null
function onTouchStart(e: TouchEvent) {
  touchX = e.touches[0]?.clientX ?? null
}
function onTouchEnd(e: TouchEvent) {
  if (touchX === null) return
  const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
  touchX = null
}

// Keep the index valid when the list shrinks (e.g. after a delete).
watch(() => props.items.length, (len) => {
  if (index.value === null) return
  if (len === 0) close()
  else if (index.value >= len) index.value = len - 1
})

let opening = false
watch(open, (v) => {
  opening = v
})

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

function onImgLoad() {
  const el = img.value
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    opening = false
    return
  }
  if (!opening) {
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' })
    return
  }
  opening = false
  const f = el.getBoundingClientRect()
  const o = props.origin
  if (o && f.width && f.height && o.width && o.height) {
    // FLIP: start at the thumbnail's crop, settle into the contained photo
    const s = Math.max(o.width / f.width, o.height / f.height)
    const dx = o.left + o.width / 2 - (f.left + f.width / 2)
    const dy = o.top + o.height / 2 - (f.top + f.height / 2)
    const ix = Math.max(0, (f.width - o.width / s) / 2)
    const iy = Math.max(0, (f.height - o.height / s) / 2)
    el.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, clipPath: `inset(${iy}px ${ix}px)` },
      { transform: 'none', clipPath: 'inset(0px 0px)' }
    ], { duration: 360, easing: EASE })
  } else {
    el.animate([
      { opacity: 0, transform: 'scale(0.94)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 260, easing: EASE })
  }
}
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <Transition
      name="lb"
      :duration="{ enter: 360, leave: 200 }"
    >
      <div
        v-if="open && current"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="t('gallery.viewer')"
        @touchstart.passive="onTouchStart"
        @touchend="onTouchEnd"
      >
        <div
          class="lb-bg"
          aria-hidden="true"
        />

        <div class="lb-top lb-chrome">
          <div class="lb-text">
            <NuxtLink
              v-if="current.to"
              :to="current.to"
              class="lb-title"
              @click="close"
            >
              {{ current.title }}
              <UIcon
                name="i-tabler-chevron-right"
                class="size-4 lb-chev"
              />
            </NuxtLink>
            <span
              v-else
              class="lb-title"
            >{{ current.title }}</span>
            <span
              v-if="current.subtitle"
              class="lb-sub num"
            >{{ current.subtitle }}</span>
          </div>
          <button
            type="button"
            class="icon-btn lb-btn"
            :aria-label="t('gallery.deletePhoto')"
            @click="emit('delete', current)"
          >
            <UIcon
              name="i-tabler-trash"
              class="size-5"
            />
          </button>
          <button
            type="button"
            class="icon-btn lb-btn"
            :aria-label="t('gallery.close')"
            @click="close"
          >
            <UIcon
              name="i-tabler-x"
              class="size-5"
            />
          </button>
        </div>

        <div
          class="lb-stage"
          @click.self="close"
        >
          <img
            v-if="url"
            ref="img"
            :key="current.photoId"
            :src="url"
            :alt="current.title ?? t('gallery.photo')"
            class="lb-img"
            @load="onImgLoad"
          >
        </div>

        <div class="lb-bottom lb-chrome">
          <button
            type="button"
            class="icon-btn lb-btn"
            :disabled="index === 0"
            :aria-label="t('gallery.prev')"
            @click="go(-1)"
          >
            <UIcon
              name="i-tabler-chevron-left"
              class="size-5"
            />
          </button>
          <span
            class="lb-count num"
            aria-live="polite"
          >
            {{ (index ?? 0) + 1 }}<span class="lb-total"> / {{ items.length }}</span>
          </span>
          <button
            type="button"
            class="icon-btn lb-btn"
            :disabled="index === items.length - 1"
            :aria-label="t('gallery.next')"
            @click="go(1)"
          >
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5"
            />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
}

.lb-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: #000;
}

.lb-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(12px + var(--safe-top)) 14px 12px 20px;
}

.lb-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lb-title {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
  max-width: 100%;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

a.lb-title {
  min-height: 24px;
}

.lb-chev {
  color: var(--leaf);
}

.lb-sub {
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}

.lb-btn:disabled {
  opacity: 0.3;
}

.lb-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lb-img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  will-change: transform;
}

.lb-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 12px 14px calc(16px + var(--safe-bottom));
}

.lb-count {
  min-width: 64px;
  text-align: center;
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.lb-total {
  color: var(--text-3);
}

.lb-enter-active .lb-bg {
  transition: opacity 280ms var(--ease-out);
}

.lb-enter-active .lb-chrome {
  transition: opacity 240ms ease 120ms;
}

.lb-enter-from .lb-bg,
.lb-enter-from .lb-chrome {
  opacity: 0;
}

.lb-leave-active {
  transition: opacity 200ms ease;
}

.lb-leave-to {
  opacity: 0;
}
</style>
