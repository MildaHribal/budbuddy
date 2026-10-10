<script setup lang="ts">
export interface LightboxItem {
  photoId: string
  title?: string
  subtitle?: string
  to?: string
}

const props = defineProps<{ items: LightboxItem[] }>()
const index = defineModel<number | null>('index', { default: null })
const emit = defineEmits<{ delete: [item: LightboxItem] }>()

const open = computed(() => index.value !== null && !!props.items[index.value])
const current = computed(() => (index.value === null ? null : props.items[index.value] ?? null))
const url = usePhotoUrl(computed(() => current.value?.photoId))

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
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <Transition name="fade">
      <div
        v-if="open && current"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
        @touchstart.passive="onTouchStart"
        @touchend="onTouchEnd"
      >
        <div class="lb-top">
          <div class="lb-text">
            <NuxtLink
              v-if="current.to"
              :to="current.to"
              class="lb-title"
              @click="close"
            >
              {{ current.title }}
            </NuxtLink>
            <span
              v-else
              class="lb-title"
            >{{ current.title }}</span>
            <span class="lb-sub">{{ current.subtitle }}</span>
          </div>
          <button
            type="button"
            class="icon-btn"
            aria-label="Delete photo"
            @click="emit('delete', current)"
          >
            <UIcon
              name="i-tabler-trash"
              class="size-5"
            />
          </button>
          <button
            type="button"
            class="icon-btn"
            aria-label="Close"
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
            :src="url"
            :alt="current.title ?? 'Photo'"
            class="lb-img"
          >
        </div>

        <div class="lb-bottom">
          <button
            type="button"
            class="icon-btn"
            :disabled="index === 0"
            aria-label="Previous photo"
            @click="go(-1)"
          >
            <UIcon
              name="i-tabler-chevron-left"
              class="size-5"
            />
          </button>
          <span class="lb-count">{{ (index ?? 0) + 1 }} / {{ items.length }}</span>
          <button
            type="button"
            class="icon-btn"
            :disabled="index === items.length - 1"
            aria-label="Next photo"
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
  background: #000;
}

.lb-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(12px + var(--safe-top)) 14px 12px;
}

.lb-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.lb-title {
  font-weight: 700;
  color: var(--text);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

a.lb-title {
  color: var(--accent);
}

.lb-sub {
  font-size: 13px;
  color: var(--text-2);
}

.lb-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.lb-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.lb-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 12px 14px calc(16px + var(--safe-bottom));
}

.lb-bottom .icon-btn:disabled {
  opacity: 0.3;
}

.lb-count {
  min-width: 60px;
  text-align: center;
  font-size: 14px;
  color: var(--text-2);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
