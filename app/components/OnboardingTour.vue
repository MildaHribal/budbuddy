<template>
  <Transition name="onb-fade">
    <div
      v-if="visible"
      class="onb-root"
      @click="onBackdropClick"
    >
      <!-- Spotlight cut-out around the highlighted element -->
      <div
        v-if="rect"
        class="onb-spotlight"
        :style="spotlightStyle"
        @click.stop="next"
      >
        <span class="onb-tap-hint">Tap to continue</span>
      </div>
      <!-- Full dim for steps without a target (welcome / finish) -->
      <div
        v-else
        class="onb-dim"
      />

      <!-- Tooltip / step card -->
      <div
        class="onb-tip"
        :style="tipStyle"
        @click.stop
      >
        <!-- Autoplay countdown bar; freezes when paused. -->
        <div class="onb-progress">
          <div
            :key="`${step}-${runId}`"
            class="onb-progress-fill"
            :style="{
              animationDuration: AUTOPLAY_MS + 'ms',
              animationPlayState: playing ? 'running' : 'paused'
            }"
          />
        </div>

        <div class="onb-tip-top">
          <button
            class="onb-icon-btn"
            :aria-label="playing ? 'Pause tour' : 'Play tour'"
            @click="togglePlay"
          >
            <Icon
              :icon="playing ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'"
              :height="16"
            />
          </button>
          <button
            class="onb-skip"
            @click="finish"
          >
            Skip
          </button>
        </div>

        <div
          class="onb-tip-icon"
          :style="{ background: current.glow }"
        >
          <Icon
            :icon="current.icon"
            :height="30"
            :style="{ color: current.color }"
          />
        </div>

        <h3 class="onb-tip-title">
          {{ current.title }}
        </h3>
        <p class="onb-tip-text">
          {{ current.text }}
        </p>

        <div class="onb-dots">
          <span
            v-for="(s, i) in steps"
            :key="i"
            :class="['onb-dot', { active: i === step }]"
            @click="goTo(i)"
          />
        </div>

        <div class="onb-actions">
          <button
            v-if="step > 0"
            class="onb-back"
            @click="prev"
          >
            Back
          </button>
          <button
            class="onb-next"
            @click="next"
          >
            <span>{{ isLast ? "Start growing 🌱" : "Next" }}</span>
            <Icon
              v-if="!isLast"
              icon="tabler:arrow-right"
              :height="18"
            />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useNativeStorage } from '~/composables/useNativeStorage'

const ONBOARDED_KEY = 'budbuddy-onboarded'
const AUTOPLAY_MS = 3200

interface Step {
  target?: string // CSS selector of the element to highlight
  route?: string // page to navigate to for this step
  icon: string
  color: string
  glow: string
  title: string
  text: string
}

const router = useRouter()
const storage = useNativeStorage()
const visible = ref(false)
const step = ref(0)
const rect = ref<DOMRect | null>(null)
const playing = ref(true)
// Bumped on every (re)start so the CSS progress bar restarts its animation.
const runId = ref(0)
let timer: ReturnType<typeof setTimeout> | null = null

const steps: Step[] = [
  {
    route: '/',
    icon: 'tabler:plant-2',
    color: '#7bc74d',
    glow: 'rgba(123, 199, 77, 0.15)',
    title: 'Welcome to BudBuddy 🌿',
    text: 'Quick tour — sit back, we\'ll show you around the app.'
  },
  {
    route: '/',
    target: '[aria-label="Home"]',
    icon: 'tabler:home-2',
    color: '#7bc74d',
    glow: 'rgba(123, 199, 77, 0.15)',
    title: 'Dashboard',
    text: 'Your home screen — today\'s tasks and a quick overview of all your plants.'
  },
  {
    route: '/my-trees',
    target: '[aria-label="Plants"]',
    icon: 'tabler:leaf',
    color: '#7bc74d',
    glow: 'rgba(123, 199, 77, 0.15)',
    title: 'My Plants',
    text: 'Add your plants here and log watering, feeding, notes and growth stages for each one.'
  },
  {
    route: '/ai-assistant',
    target: '[aria-label="AI Assistant"]',
    icon: 'tabler:brain',
    color: '#9fe76d',
    glow: 'rgba(159, 231, 109, 0.15)',
    title: 'AI Assistant',
    text: 'Ask anything about growing and get a diagnosis from a photo of your plant. No setup needed!'
  },
  {
    route: '/nutriens-calc',
    target: '[aria-label="Gallery"]',
    icon: 'tabler:photo',
    color: '#7bc74d',
    glow: 'rgba(123, 199, 77, 0.15)',
    title: 'Gallery',
    text: 'Every photo from your grow journals, gathered in one place.'
  },
  {
    route: '/stats',
    target: '[aria-label="Statistics"]',
    icon: 'tabler:chart-bar',
    color: '#7bc74d',
    glow: 'rgba(123, 199, 77, 0.15)',
    title: 'Stats & achievements',
    text: 'Track your progress and unlock achievements. Always follow your local laws. 🌍'
  }
]

const current = computed(() => steps[step.value]!)
const isLast = computed(() => step.value === steps.length - 1)
const placeAbove = computed(() => {
  if (!rect.value) return false
  return rect.value.top > window.innerHeight / 2
})

const PAD = 8

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

// Restart the autoplay timer (and the progress bar) for the current step.
const scheduleAutoplay = () => {
  clearTimer()
  runId.value++
  if (playing.value && visible.value) {
    timer = setTimeout(() => next(), AUTOPLAY_MS)
  }
}

// Navigate to the step's page (really clicking through the app), then locate
// the element to spotlight and schedule the next step when auto-playing.
const showStep = async () => {
  clearTimer()
  const s = current.value
  if (s.route && router.currentRoute.value.path !== s.route) {
    await router.push(s.route)
  }
  await nextTick()
  // Let the page render/transition before measuring.
  await new Promise(r => setTimeout(r, 220))

  const el = s.target ? document.querySelector(s.target) : null
  rect.value = el ? el.getBoundingClientRect() : null

  scheduleAutoplay()
}

const measure = () => {
  const sel = current.value.target
  const el = sel ? document.querySelector(sel) : null
  rect.value = el ? el.getBoundingClientRect() : null
}

const spotlightStyle = computed(() => {
  const r = rect.value
  if (!r) return {}
  return {
    top: `${r.top - PAD}px`,
    left: `${r.left - PAD}px`,
    width: `${r.width + PAD * 2}px`,
    height: `${r.height + PAD * 2}px`
  }
})

const tipStyle = computed(() => {
  const r = rect.value
  // Centered card for steps without a target.
  if (!r) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }
  const vw = window.innerWidth
  const tipW = Math.min(320, vw - 24)
  const centerX = r.left + r.width / 2
  const left = Math.max(12, Math.min(centerX - tipW / 2, vw - tipW - 12))
  const style: Record<string, string> = { width: `${tipW}px`, left: `${left}px` }
  if (placeAbove.value) {
    style.bottom = `${window.innerHeight - r.top + PAD + 14}px`
  } else {
    style.top = `${r.bottom + PAD + 14}px`
  }
  return style
})

const onResize = () => measure()

onMounted(async () => {
  const seen = await storage.getItem(ONBOARDED_KEY)
  if (seen) return
  visible.value = true
  await showStep()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  clearTimer()
  window.removeEventListener('resize', onResize)
})

watch(step, () => showStep())

// Advance / go back. The step watcher reschedules autoplay, so manual taps
// don't stop the tour — only the pause button does.
const next = () => {
  if (isLast.value) finish()
  else step.value++
}

const prev = () => {
  if (step.value > 0) step.value--
}

const goTo = (i: number) => {
  if (i !== step.value) step.value = i
}

const togglePlay = () => {
  playing.value = !playing.value
  if (playing.value) scheduleAutoplay()
  else clearTimer()
}

const onBackdropClick = () => {
  // Tapping the dimmed area skips ahead to the next step.
  next()
}

const finish = async () => {
  clearTimer()
  await storage.setItem(ONBOARDED_KEY, '1')
  visible.value = false
  if (router.currentRoute.value.path !== '/') router.push('/')
}
</script>

<style scoped>
.onb-root {
  position: fixed;
  inset: 0;
  z-index: 10000;
}

.onb-dim {
  position: absolute;
  inset: 0;
  background: rgba(5, 8, 5, 0.88);
}

.onb-spotlight {
  position: fixed;
  border-radius: 16px;
  box-shadow: 0 0 0 9999px rgba(5, 8, 5, 0.82);
  border: 2px solid rgba(123, 199, 77, 0.9);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
  cursor: pointer;
  animation: onbPulse 2s ease-in-out infinite;
}

.onb-tap-hint {
  position: absolute;
  left: 50%;
  bottom: -28px;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #9fe76d;
  opacity: 0.85;
  pointer-events: none;
}

@keyframes onbPulse {
  0%, 100% {
    border-color: rgba(123, 199, 77, 0.5);
  }
  50% {
    border-color: rgba(159, 231, 109, 1);
  }
}

.onb-tip {
  position: fixed;
  width: 320px;
  max-width: calc(100vw - 24px);
  padding: 20px 18px 16px;
  background: linear-gradient(160deg, #16201a 0%, #0c120e 100%);
  border: 1px solid rgba(123, 199, 77, 0.25);
  border-radius: 20px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.65);
  text-align: center;
  animation: onbIn 0.3s ease;
}

@keyframes onbIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.onb-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 20px 20px 0 0;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.onb-progress-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(90deg, #7bc74d 0%, #9fe76d 100%);
  animation: onbProgress linear forwards;
}

@keyframes onbProgress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

.onb-tip-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.onb-icon-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: rgba(123, 199, 77, 0.14);
  border: 1px solid rgba(123, 199, 77, 0.25);
  color: #9fe76d;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.onb-icon-btn:active {
  transform: scale(0.92);
}

.onb-skip {
  background: none;
  border: none;
  color: #7c857a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.onb-tip-icon {
  width: 64px;
  height: 64px;
  margin: 4px auto 14px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(123, 199, 77, 0.25);
}

.onb-tip-title {
  margin: 0 0 8px;
  font-size: 19px;
  font-weight: 800;
  color: #fff;
}

.onb-tip-text {
  margin: 0 auto 18px;
  font-size: 14px;
  line-height: 1.5;
  color: #aab3a8;
}

.onb-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 18px;
}

.onb-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  transition: all 0.25s ease;
  cursor: pointer;
}

.onb-dot.active {
  width: 20px;
  border-radius: 4px;
  background: #7bc74d;
}

.onb-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.onb-back {
  flex-shrink: 0;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  border-radius: 14px;
  color: #cdd6cb;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.onb-next {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 13px;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(123, 199, 77, 0.3);
  -webkit-tap-highlight-color: transparent;
}

.onb-next:active,
.onb-back:active {
  transform: scale(0.98);
}

.onb-fade-enter-active,
.onb-fade-leave-active {
  transition: opacity 0.3s ease;
}

.onb-fade-enter-from,
.onb-fade-leave-to {
  opacity: 0;
}
</style>
