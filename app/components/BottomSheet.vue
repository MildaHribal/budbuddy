<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  iconColor?: string
}>(), {
  title: undefined,
  icon: undefined,
  iconColor: 'var(--accent)'
})

const slots = defineSlots<{
  default?: () => unknown
  footer?: () => unknown
  icon?: () => unknown
}>()

const sheet = ref<HTMLElement | null>(null)
const titleId = useId()
const { t } = useI18n()

useBackHandler(open, () => {
  open.value = false
})

// declared before the immediate open watcher below uses it
const drag = ref(0)
const dragging = ref(false)

// Modal: everything outside the sheet is inert while it is open; focus returns to the trigger on close.
const root = ref<HTMLElement | null>(null)
let trigger: HTMLElement | null = null
let inerted: HTMLElement[] = []

function lockBackground() {
  for (let el = root.value; el?.parentElement && el !== document.body; el = el.parentElement) {
    for (const sib of el.parentElement.children) {
      if (sib === el || !(sib instanceof HTMLElement) || sib.inert) continue
      // toasts stay usable (undo)
      if (sib.hasAttribute('aria-live') || sib.matches('script, style, template')) continue
      sib.inert = true
      inerted.push(sib)
    }
  }
}

function unlockBackground() {
  for (const el of inerted) el.inert = false
  inerted = []
}

function restoreFocus() {
  const el = trigger
  trigger = null
  if (el?.isConnected && !el.closest('[inert]')) el.focus({ preventScroll: true })
}

watch(open, async (v) => {
  if (!v) {
    unlockBackground()
    restoreFocus()
    return
  }
  drag.value = 0
  const active = document.activeElement
  trigger = active instanceof HTMLElement && active !== document.body ? active : null
  await nextTick()
  if (!open.value) return
  lockBackground()
  // On touch screens focusing a field would pop the keyboard, so only desktop focuses the first field.
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const first = coarse ? null : sheet.value?.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select')
  ;(first ?? sheet.value)?.focus({ preventScroll: true })
}, { immediate: true })

onBeforeUnmount(() => {
  if (!open.value) return
  unlockBackground()
  restoreFocus()
})

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// keeps Tab inside the sheet (inert covers the page; this also wraps at the ends)
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !sheet.value) return
  const items = [...sheet.value.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null)
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) {
    e.preventDefault()
    return
  }
  const current = document.activeElement
  if (e.shiftKey && (current === first || current === sheet.value)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && current === last) {
    e.preventDefault()
    first.focus()
  }
}

// Drag down on the grip (handle + header) to dismiss.
let startY = 0
let lastY = 0
let lastT = 0
let velocity = 0
let pointerId: number | null = null

function onGripDown(e: PointerEvent) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('button, a, input')) return
  pointerId = e.pointerId
  startY = lastY = e.clientY
  lastT = e.timeStamp
  velocity = 0
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onGripMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== pointerId) return
  const dy = e.clientY - startY
  // resist upward pulls, follow downward ones 1:1
  drag.value = dy < 0 ? dy / 6 : dy
  const dt = e.timeStamp - lastT
  if (dt > 0) velocity = (e.clientY - lastY) / dt
  lastY = e.clientY
  lastT = e.timeStamp
}

function onGripUp(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== pointerId) return
  dragging.value = false
  pointerId = null
  const height = sheet.value?.offsetHeight ?? 400
  if (drag.value > Math.min(140, height * 0.3) || (velocity > 0.6 && drag.value > 24)) {
    open.value = false
  } else {
    drag.value = 0
  }
}

const dragProgress = computed(() => {
  const h = sheet.value?.offsetHeight ?? 400
  return Math.min(1, Math.max(0, drag.value) / h)
})
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <Transition
      name="sheet"
      :duration="{ enter: 440, leave: 260 }"
    >
      <div
        v-if="open"
        ref="root"
        class="sheet-root"
        :style="{ '--drag': `${drag}px`, '--drag-p': dragProgress }"
      >
        <div
          class="sheet-scrim"
          aria-hidden="true"
          @click="open = false"
        />
        <div
          ref="sheet"
          class="sheet"
          :class="{ dragging }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="props.title ? titleId : undefined"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <div
            class="sheet-grip"
            @pointerdown="onGripDown"
            @pointermove="onGripMove"
            @pointerup="onGripUp"
            @pointercancel="onGripUp"
          >
            <div
              class="sheet-handle"
              aria-hidden="true"
            />
            <div
              v-if="props.title"
              class="sheet-head"
            >
              <span
                v-if="slots.icon || props.icon"
                class="sheet-icon"
                :style="{ color: props.iconColor }"
              >
                <slot name="icon">
                  <GrowIcon
                    v-if="props.icon"
                    :name="props.icon"
                  />
                </slot>
              </span>
              <h2 :id="titleId">
                {{ props.title }}
              </h2>
              <button
                type="button"
                class="icon-btn"
                :aria-label="t('gallery.close')"
                @click="open = false"
              >
                <UIcon
                  name="i-tabler-x"
                  class="size-5"
                />
              </button>
            </div>
          </div>
          <div class="sheet-body">
            <slot />
          </div>
          <div
            v-if="slots.footer"
            class="sheet-footer"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-root {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
}

.sheet-scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  opacity: calc(1 - var(--drag-p, 0) * 0.8);
  transition: opacity var(--dur) var(--ease-out);
}

.sheet {
  position: relative;
  width: 100%;
  max-height: 92%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1c2025 0%, #15181c 120px, #121417 100%);
  border: 1px solid var(--line-strong);
  border-bottom: 0;
  border-radius: 24px 24px 0 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 -18px 40px -12px rgba(0, 0, 0, 0.7);
  outline: none;
  transform: translateY(max(var(--drag, 0px), -12px));
  transition: transform var(--dur-slow) cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet.dragging,
.sheet-root:has(.dragging) .sheet-scrim {
  transition: none;
}

.sheet-grip {
  flex-shrink: 0;
  touch-action: none;
  cursor: grab;
}

.sheet.dragging .sheet-grip {
  cursor: grabbing;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  margin: 10px auto 6px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  transition: background var(--dur) ease, width var(--dur) var(--ease-out);
}

.sheet.dragging .sheet-handle {
  background: rgba(255, 255, 255, 0.36);
}

.sheet-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 16px 12px 20px;
}

.sheet-icon {
  display: inline-flex;
  font-size: 24px;
}

h2 {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.sheet-body {
  padding: 4px 20px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.sheet-footer {
  display: flex;
  gap: 10px;
  padding: 12px 20px calc(14px + var(--safe-bottom));
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}

.sheet-footer > :deep(*) {
  flex: 1;
}

.sheet-enter-active .sheet {
  transition: transform 440ms cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-leave-active .sheet {
  transition: transform 260ms cubic-bezier(0.3, 0, 0.8, 0.15);
}

.sheet-enter-active .sheet-scrim {
  transition: opacity 320ms var(--ease-out);
}

.sheet-leave-active .sheet-scrim {
  transition: opacity 240ms ease;
}

.sheet-enter-from .sheet-scrim,
.sheet-leave-to .sheet-scrim {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
