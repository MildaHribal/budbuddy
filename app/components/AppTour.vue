<script setup lang="ts">
const tour = useAppTour()
const { t } = useI18n()
const route = useRoute()

const step = tour.step
const n = computed(() => tour.index.value + 1)
const isFirst = computed(() => tour.index.value === 0)
const isLast = computed(() => tour.index.value === tour.total - 1)
const preview = computed(() => tour.mode.value === 'preview')
const busy = ref(false)

const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const root = ref<HTMLElement | null>(null)
const heading = ref<HTMLElement | null>(null)
/** highlighted area in px inside the device frame; null = no target, full scrim */
const hole = ref<{ top: number, left: number, width: number, height: number } | null>(null)
const cardAt = ref<'top' | 'bottom'>('bottom')
const settled = ref(false)

const PAD = 6

function device(): HTMLElement | null {
  return root.value?.parentElement ?? null
}

function targets(): HTMLElement[] {
  return step.value.targets.flatMap(sel => [...document.querySelectorAll<HTMLElement>(sel)].slice(0, 1))
}

function measure() {
  const dev = device()
  const els = targets()
  if (!dev || !els.length) {
    hole.value = null
    return
  }
  const d = dev.getBoundingClientRect()
  // absolute children start inside the frame's border
  const ox = d.left + dev.clientLeft
  const oy = d.top + dev.clientTop
  const rects = els.map(e => e.getBoundingClientRect())
  const top = Math.max(Math.min(...rects.map(r => r.top)) - oy - PAD, 0)
  const left = Math.max(Math.min(...rects.map(r => r.left)) - ox - PAD, 0)
  const bottom = Math.min(Math.max(...rects.map(r => r.bottom)) - oy + PAD, dev.clientHeight)
  const right = Math.min(Math.max(...rects.map(r => r.right)) - ox + PAD, dev.clientWidth)
  hole.value = { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) }
  cardAt.value = top + (bottom - top) / 2 > dev.clientHeight / 2 ? 'top' : 'bottom'
}

let frame = 0
function remeasure() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    measure()
  })
}

/** Scrolls the target near the top of the page's scroller, leaving the lower part for the card. */
function bringIntoView(el: HTMLElement) {
  const scroller = el.closest<HTMLElement>('.app-scroll')
  if (!scroller) return
  const sticky = scroller.querySelector<HTMLElement>('.tabs-wrap')
  const offset = sticky && !sticky.contains(el) && step.value.id !== 'journal' ? sticky.offsetHeight + 12 : 12
  const delta = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - offset
  scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: reduced ? 'auto' : 'smooth' })
}

/** Pages mount lazily: wait for the step's target, give up after a few seconds (the card still shows). */
function waitFor(sel: string[], ms = 4000): Promise<HTMLElement | null> {
  const start = performance.now()
  return new Promise((resolve) => {
    const tick = () => {
      const el = sel.length ? document.querySelector<HTMLElement>(sel[0]!) : null
      if (el || !sel.length || performance.now() - start > ms) resolve(el)
      else requestAnimationFrame(tick)
    }
    tick()
  })
}

const layout = () => device()?.querySelector<HTMLElement>(':scope > .layout') ?? null

let token = 0
async function show() {
  const my = ++token
  settled.value = false
  const to = tour.stepRoute()
  if (to && route.path !== to) await navigateTo(to)
  const el = await waitFor(step.value.targets)
  if (my !== token) return
  // photos above the target may still change the layout
  await new Promise(r => setTimeout(r, reduced ? 0 : 120))
  if (my !== token) return
  if (el) bringIntoView(el)
  measure()
  layout()?.setAttribute('inert', '')
  settled.value = true
  await nextTick()
  heading.value?.focus({ preventScroll: true })
}

watch(() => tour.index.value, show)

let scroller: HTMLElement | null = null
let observer: ResizeObserver | null = null
onMounted(() => {
  show()
  window.addEventListener('resize', remeasure)
  // the scroller is replaced on layout changes; listen on the frame and catch its scroll events
  scroller = device()
  scroller?.addEventListener('scroll', remeasure, true)
  observer = new ResizeObserver(remeasure)
  if (device()) observer.observe(device()!)
})
onBeforeUnmount(() => {
  token++
  if (frame) cancelAnimationFrame(frame)
  window.removeEventListener('resize', remeasure)
  scroller?.removeEventListener('scroll', remeasure, true)
  observer?.disconnect()
  layout()?.removeAttribute('inert')
})

async function run(fn: () => Promise<void> | void) {
  if (busy.value) return
  busy.value = true
  try {
    await fn()
  } finally {
    busy.value = false
  }
}

const next = () => tour.go(tour.index.value + 1)
const back = () => tour.go(tour.index.value - 1)
const skip = () => run(tour.skip)

useBackHandler(computed(() => true), () => (isFirst.value ? skip() : back()))

const holeStyle = computed(() => hole.value && {
  top: `${hole.value.top}px`,
  left: `${hole.value.left}px`,
  width: `${hole.value.width}px`,
  height: `${hole.value.height}px`
})
</script>

<template>
  <div
    ref="root"
    class="tour"
    :class="{ calm: reduced }"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="`tour-title-${step.id}`"
    @keydown.right="!isLast && next()"
    @keydown.left="!isFirst && back()"
  >
    <div
      v-if="holeStyle"
      class="hole"
      :style="holeStyle"
      aria-hidden="true"
    />
    <div
      v-else
      class="scrim"
      aria-hidden="true"
    />

    <section
      :key="step.id"
      class="t-card"
      :class="[hole ? cardAt : 'center', { shown: settled }]"
    >
      <header class="t-top">
        <span
          class="t-count num"
          aria-live="polite"
        >{{ t('tour.count', { n, total: tour.total }) }}</span>
        <button
          v-if="!isLast"
          type="button"
          class="btn btn-ghost t-skip"
          :disabled="busy"
          @click="skip"
        >
          {{ t('tour.skip') }}
        </button>
      </header>
      <h2
        :id="`tour-title-${step.id}`"
        ref="heading"
        tabindex="-1"
        class="t-title"
      >
        {{ isLast && preview ? t('tour.steps.done.previewTitle') : t(`tour.steps.${step.id}.title`) }}
      </h2>
      <p class="t-text">
        {{ isLast && preview ? t('tour.steps.done.previewText') : t(`tour.steps.${step.id}.text`) }}
      </p>

      <div
        v-if="!isLast"
        class="t-foot"
      >
        <button
          v-if="!isFirst"
          type="button"
          class="icon-btn"
          :aria-label="t('tour.back')"
          @click="back"
        >
          <UIcon name="i-tabler-chevron-left" />
        </button>
        <button
          type="button"
          class="btn btn-primary t-next"
          @click="next"
        >
          {{ t('tour.next') }}
          <UIcon name="i-tabler-chevron-right" />
        </button>
      </div>
      <div
        v-else
        class="t-end"
      >
        <template v-if="preview">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="busy"
            @click="run(tour.close)"
          >
            {{ t('tour.backToGarden') }}
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="busy"
            @click="run(tour.startOwn)"
          >
            {{ t('tour.startOwn') }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="busy"
            @click="run(tour.close)"
          >
            {{ t('tour.keepExploring') }}
          </button>
        </template>
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="busy"
          @click="back"
        >
          <UIcon name="i-tabler-chevron-left" />
          {{ t('tour.back') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tour {
  position: absolute;
  inset: 0;
  z-index: 60;
  overflow: hidden;
  --tour-scrim: rgba(0, 0, 0, 0.62);
}

.scrim {
  position: absolute;
  inset: 0;
  background: var(--tour-scrim);
}

/* the cut-out: everything around it is dimmed by its spread */
.hole {
  position: absolute;
  border-radius: var(--radius);
  outline: 2px solid var(--green);
  outline-offset: 0;
  box-shadow: 0 0 0 200vmax var(--tour-scrim);
  transition: top var(--dur-slow) var(--ease-out), left var(--dur-slow) var(--ease-out), width var(--dur-slow) var(--ease-out), height var(--dur-slow) var(--ease-out);
}

.t-card {
  position: absolute;
  left: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.t-card.shown {
  opacity: 1;
  transform: none;
}

.t-card.bottom {
  bottom: calc(var(--safe-bottom) + 16px);
}

.t-card.top {
  top: calc(var(--safe-top) + 12px);
}

.t-card.center {
  top: 50%;
  translate: 0 -50%;
}

.t-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  margin-bottom: -4px;
}

.t-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
}

.t-skip {
  min-height: 44px;
  padding: 0 12px;
  margin-right: -12px;
  font-size: 14px;
}

.t-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  outline: none;
}

.t-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  color: var(--text-2);
}

.t-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.t-next {
  flex: 1;
}

.t-end {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.t-end .btn-ghost {
  min-height: 44px;
  font-size: 14px;
}

.calm .hole,
.calm .t-card {
  transition: none;
}
</style>
