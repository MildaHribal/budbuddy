<script setup lang="ts">
import type { Settings } from '~/types/grow'
import { czechVocative, LOCALES, type Locale } from '~/utils/locale'
import { remindersSupported, requestReminderPermission } from '~/composables/useReminders'

const { state, updateSettings, eraseAll } = useGrow()
const { t, locale } = useI18n()

type StepId = 'welcome' | 'you' | 'light' | 'reminders' | 'start'
const steps: StepId[] = ['welcome', 'you', 'light', 'reminders', 'start']
const native = remindersSupported()

const index = ref(0)
const dir = ref<1 | -1>(1)
const step = computed(() => steps[index.value]!)
const isLast = computed(() => index.value === steps.length - 1)
const leaving = ref(false)
const busy = ref(false)

const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const leafShown = ref(reduced)
let leafTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  if (!reduced) leafTimer = setTimeout(() => (leafShown.value = true), 750)
})
onBeforeUnmount(() => clearTimeout(leafTimer))

const heading = ref<HTMLElement | null>(null)
function go(to: number) {
  if (to < 0 || to >= steps.length || to === index.value || leaving.value) return
  dir.value = to > index.value ? 1 : -1
  index.value = to
}
const next = () => go(index.value + 1)
const prev = () => go(index.value - 1)
const welcomed = ref(false)
watch(index, (i) => {
  if (i > 0) welcomed.value = true
})
const focusHeading = () => heading.value?.focus({ preventScroll: true })

useBackHandler(computed(() => index.value > 0 && !leaving.value), prev)

// Swipe between steps; ignore drags that start on form controls.
let touch: { x: number, y: number } | null = null
function onTouchStart(e: TouchEvent) {
  const el = e.target as HTMLElement
  touch = el.closest('input, textarea, select') ? null : { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }
}
function onTouchEnd(e: TouchEvent) {
  if (!touch) return
  const dx = e.changedTouches[0]!.clientX - touch.x
  const dy = e.changedTouches[0]!.clientY - touch.y
  touch = null
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  if (dx < 0 && !isLast.value) next()
  else if (dx > 0) prev()
}

const name = ref(state.settings.growerName)
watch(name, v => updateSettings({ growerName: v.trim() }))
const hello = computed(() => {
  const raw = name.value.trim()
  if (!raw) return t('onboarding.you.helloAnon')
  return t('onboarding.you.hello', { name: locale.value === 'cs' ? czechVocative(raw) : raw })
})
const setLanguage = (language: Locale) => updateSettings({ language })

const PRESETS = [18, 20, 12, 24] as const
const lightHint = computed(() => {
  const h = state.settings.lightHours
  return PRESETS.includes(h as typeof PRESETS[number]) ? t(`onboarding.light.hint.h${h}`) : ''
})
function setLightsOn(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (/^\d{2}:\d{2}$/.test(v)) updateSettings({ lightsOn: v })
}

const denied = ref(false)
async function enableReminders() {
  busy.value = true
  try {
    const ok = await requestReminderPermission()
    denied.value = !ok
    if (ok) updateSettings({ reminders: true })
  } finally {
    busy.value = false
  }
}
function setReminderTime(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (/^\d{2}:\d{2}$/.test(v)) updateSettings({ reminderTime: v })
}

async function finish(mode: 'demo' | 'empty') {
  if (leaving.value || busy.value) return
  busy.value = true
  try {
    if (mode === 'empty') {
      // eraseAll resets settings too, so put the guide's choices back.
      const { growerName, language, lightsOn, lightHours, reminders, reminderTime } = state.settings
      const keep: Partial<Settings> = { growerName, language, lightsOn, lightHours, reminders, reminderTime }
      await eraseAll()
      updateSettings({ ...keep, initialized: true })
    }
  } finally {
    busy.value = false
  }
  leaving.value = true
  setTimeout(() => updateSettings({ onboarded: true }), reduced ? 0 : 640)
}
</script>

<template>
  <div
    class="guide"
    :class="{ leaving }"
    role="dialog"
    aria-modal="true"
    :aria-label="t('onboarding.label')"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div
      class="g-light"
      aria-hidden="true"
    />

    <header class="g-top">
      <p class="sr-only">
        {{ t('onboarding.step', { n: index + 1, total: steps.length }) }}
      </p>
      <ol
        class="dots"
        aria-hidden="true"
      >
        <li
          v-for="(s, i) in steps"
          :key="s"
          :class="{ on: i === index, done: i < index }"
        />
      </ol>
      <button
        v-if="!isLast"
        type="button"
        class="btn btn-ghost skip"
        @click="go(steps.length - 1)"
      >
        {{ t('onboarding.skip') }}
      </button>
    </header>

    <div class="g-body">
      <Transition
        :name="dir > 0 ? 'step-fwd' : 'step-back'"
        mode="out-in"
        @after-enter="focusHeading"
      >
        <section
          v-if="step === 'welcome'"
          key="welcome"
          class="step welcome"
          :class="{ again: welcomed }"
        >
          <div
            class="hero-leaf"
            aria-hidden="true"
          >
            <GrowIcon
              v-if="leafShown"
              name="vegetative"
              draw
              glow
              :stroke-width="1.2"
            />
          </div>
          <h1
            ref="heading"
            tabindex="-1"
            class="brand"
          >
            BudBuddy
          </h1>
          <p class="tagline">
            {{ t('onboarding.welcome.tagline') }}
          </p>
          <ul class="values">
            <li>
              <UIcon
                name="i-tabler-cloud-off"
                class="v-icon v-lamp"
              />
              <div>
                <strong>{{ t('onboarding.welcome.offline') }}</strong>
                <span>{{ t('onboarding.welcome.offlineHint') }}</span>
              </div>
            </li>
            <li>
              <GrowIcon
                name="harvest"
                class="v-icon leaf"
              />
              <div>
                <strong>{{ t('onboarding.welcome.lifecycle') }}</strong>
                <span>{{ t('onboarding.welcome.lifecycleHint') }}</span>
              </div>
            </li>
            <li>
              <GrowIcon
                name="spark"
                class="v-icon leaf"
              />
              <div>
                <strong>{{ t('onboarding.welcome.ai') }}</strong>
                <span>{{ t('onboarding.welcome.aiHint') }}</span>
              </div>
            </li>
          </ul>
        </section>

        <section
          v-else-if="step === 'you'"
          key="you"
          class="step"
        >
          <h2
            ref="heading"
            tabindex="-1"
            class="s-title"
          >
            {{ t('onboarding.you.title') }}
          </h2>
          <div class="field">
            <span
              id="ob-lang"
              class="field-label"
            >{{ t('onboarding.you.language') }}</span>
            <div
              class="segmented tall"
              role="group"
              aria-labelledby="ob-lang"
            >
              <button
                v-for="opt in LOCALES"
                :key="opt.value"
                type="button"
                :lang="opt.value"
                :aria-pressed="state.settings.language === opt.value"
                @click="setLanguage(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <label class="field">
            <span class="field-label">{{ t('onboarding.you.name') }}</span>
            <input
              v-model="name"
              class="input"
              type="text"
              autocomplete="given-name"
              autocapitalize="words"
              maxlength="40"
              :placeholder="t('onboarding.you.namePlaceholder')"
              @keydown.enter.prevent="next"
            >
            <span class="field-hint">{{ t('onboarding.you.nameHint') }}</span>
          </label>
          <p
            class="hello"
            aria-live="polite"
          >
            {{ hello }}
          </p>
        </section>

        <section
          v-else-if="step === 'light'"
          key="light"
          class="step"
        >
          <h2
            ref="heading"
            tabindex="-1"
            class="s-title"
          >
            {{ t('onboarding.light.title') }}
          </h2>
          <p class="s-lead">
            {{ t('onboarding.light.lead') }}
          </p>
          <div class="ring-panel">
            <PhotoperiodRing
              :lights-on="state.settings.lightsOn"
              :hours="state.settings.lightHours"
              :size="132"
            />
          </div>
          <div class="field">
            <span
              id="ob-hours"
              class="field-label"
            >{{ t('onboarding.light.presets') }}</span>
            <div
              class="segmented tall"
              role="group"
              aria-labelledby="ob-hours"
            >
              <button
                v-for="h in PRESETS"
                :key="h"
                type="button"
                class="num"
                :aria-pressed="state.settings.lightHours === h"
                @click="updateSettings({ lightHours: h })"
              >
                {{ h }}/{{ 24 - h }}
              </button>
            </div>
            <span
              class="field-hint"
              aria-live="polite"
            >{{ lightHint }}</span>
          </div>
          <label class="field">
            <span class="field-label">{{ t('onboarding.light.lightsOn') }}</span>
            <input
              class="input num"
              type="time"
              :value="state.settings.lightsOn"
              @change="setLightsOn"
            >
          </label>
        </section>

        <section
          v-else-if="step === 'reminders'"
          key="reminders"
          class="step"
        >
          <h2
            ref="heading"
            tabindex="-1"
            class="s-title"
          >
            {{ t('onboarding.reminders.title') }}
          </h2>
          <p class="s-lead">
            {{ t('onboarding.reminders.lead') }}
          </p>
          <div
            class="bell"
            :class="{ on: state.settings.reminders }"
            aria-hidden="true"
          >
            <GrowIcon
              name="water"
              :glow="state.settings.reminders"
            />
          </div>
          <template v-if="native">
            <button
              v-if="!state.settings.reminders"
              type="button"
              class="btn btn-soft btn-block"
              :disabled="busy"
              @click="enableReminders"
            >
              {{ t('onboarding.reminders.enable') }}
            </button>
            <template v-else>
              <p
                class="status-on"
                role="status"
              >
                <UIcon name="i-tabler-check" />
                {{ t('onboarding.reminders.enabled') }}
              </p>
              <label class="field">
                <span class="field-label">{{ t('onboarding.reminders.time') }}</span>
                <input
                  class="input num"
                  type="time"
                  :value="state.settings.reminderTime"
                  @change="setReminderTime"
                >
              </label>
            </template>
            <p
              v-if="denied"
              class="note"
              role="alert"
            >
              {{ t('onboarding.reminders.denied') }}
            </p>
          </template>
          <p
            v-else
            class="note"
          >
            <UIcon
              name="i-tabler-info-circle"
              class="note-icon"
            />
            {{ t('onboarding.reminders.web') }}
          </p>
        </section>

        <section
          v-else
          key="start"
          class="step"
        >
          <h2
            ref="heading"
            tabindex="-1"
            class="s-title"
          >
            {{ t('onboarding.start.title') }}
          </h2>
          <p class="s-lead">
            {{ t('onboarding.start.lead') }}
          </p>
          <div class="choices">
            <button
              type="button"
              class="choice primary"
              :disabled="busy || leaving"
              @click="finish('demo')"
            >
              <GrowIcon
                name="flowering"
                class="c-icon"
              />
              <span class="c-text">
                <strong>{{ t('onboarding.start.demo') }}</strong>
                <span>{{ t('onboarding.start.demoHint') }}</span>
              </span>
              <UIcon
                name="i-tabler-chevron-right"
                class="c-go"
              />
            </button>
            <button
              type="button"
              class="choice"
              :disabled="busy || leaving"
              @click="finish('empty')"
            >
              <GrowIcon
                name="germination"
                class="c-icon"
              />
              <span class="c-text">
                <strong>{{ t('onboarding.start.empty') }}</strong>
                <span>{{ t('onboarding.start.emptyHint') }}</span>
              </span>
              <UIcon
                name="i-tabler-chevron-right"
                class="c-go"
              />
            </button>
          </div>
        </section>
      </Transition>
    </div>

    <footer class="g-foot">
      <button
        v-if="index > 0"
        type="button"
        class="icon-btn"
        :aria-label="t('onboarding.back')"
        @click="prev"
      >
        <UIcon name="i-tabler-chevron-left" />
      </button>
      <button
        v-if="!isLast"
        type="button"
        class="btn btn-primary next"
        @click="next"
      >
        {{ index === 0 ? t('onboarding.begin') : t('onboarding.next') }}
        <UIcon name="i-tabler-chevron-right" />
      </button>
    </footer>

    <div
      class="flood"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.guide {
  position: absolute;
  inset: 0;
  /* below the app lamp (60) so its single bar stays on top */
  z-index: 55;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  padding: calc(var(--safe-top) + 14px) 20px calc(var(--safe-bottom) + 20px);
  overflow: hidden;
}

.g-light {
  position: absolute;
  inset: 0 0 auto;
  height: 75%;
  z-index: 0;
  background: radial-gradient(90% 60% at 50% 0%, rgba(255, 210, 138, 0.12) 0%, rgba(155, 227, 107, 0.05) 45%, transparent 75%);
  pointer-events: none;
  opacity: 0;
  transform: scaleY(0.4);
  transform-origin: top;
  animation: g-fall 1.4s 0.6s var(--ease-out) forwards;
}

@keyframes g-fall {
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

.g-top,
.g-body,
.g-foot {
  position: relative;
  z-index: 1;
}

.g-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
}

.dots {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dots li {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--surface-3);
  transition: background var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.dots li.done {
  background: var(--leaf-deep);
}

.dots li.on {
  background: var(--lamp);
  box-shadow: 0 0 10px 2px rgba(255, 210, 138, 0.45);
  transform: scale(1.15);
}

.skip {
  min-height: 44px;
  padding: 0 12px;
  margin-right: -12px;
  font-size: 14px;
}

.g-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  padding: 8px 0 16px;
}

.step {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;
  padding-top: 28px;
}

.step h1,
.step h2 {
  outline: none;
}

.welcome {
  align-items: center;
  justify-content: center;
  padding: 0 0 24px;
  text-align: center;
  gap: 0;
}

.hero-leaf {
  height: 128px;
  font-size: 120px;
  line-height: 1;
  color: var(--leaf);
}

.brand {
  margin: 20px 0 0;
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -0.035em;
  opacity: 0;
  animation: g-rise var(--dur-slow) 1.2s var(--ease-out) forwards;
}

.tagline {
  max-width: 28ch;
  margin: 8px 0 0;
  font-size: 16px;
  line-height: 1.45;
  color: var(--text-2);
  opacity: 0;
  animation: g-rise var(--dur-slow) 1.35s var(--ease-out) forwards;
}

.values {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  margin: 36px 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.values li {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  opacity: 0;
  animation: g-rise var(--dur-slow) var(--ease-out) forwards;
}

.values li:nth-child(1) { animation-delay: 1.55s; }
.values li:nth-child(2) { animation-delay: 1.65s; }
.values li:nth-child(3) { animation-delay: 1.75s; }

.v-icon {
  flex: none;
  width: 24px;
  height: 24px;
  font-size: 24px;
  margin-top: 1px;
}

.v-icon.leaf {
  color: var(--leaf);
}

.v-icon.v-lamp {
  color: var(--lamp);
}

.values strong {
  display: block;
  font-size: 15px;
  font-weight: 600;
}

.values span {
  display: block;
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-3);
}

.welcome.again .brand,
.welcome.again .tagline,
.welcome.again .values li {
  animation-delay: 0s;
}

@keyframes g-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.s-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.s-lead {
  margin: -8px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-2);
}

.segmented.tall button {
  min-height: 44px;
}

.hello {
  margin: 6px 0 0;
  font-size: 30px;
  font-weight: 300;
  letter-spacing: -0.03em;
  color: var(--lamp);
}

.ring-panel {
  padding: 18px 16px;
  border-radius: 22px;
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight), var(--panel-shadow);
}

.bell {
  align-self: center;
  font-size: 88px;
  line-height: 1;
  color: var(--text-3);
  transition: color var(--dur-slow) var(--ease-out);
}

.bell.on {
  color: var(--leaf);
}

.status-on {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--leaf);
}

.note {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.note-icon {
  flex: none;
  margin-top: 2px;
  font-size: 18px;
  color: var(--lamp);
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.choice {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 88px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid var(--line-strong);
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight), var(--panel-shadow);
  color: var(--text);
  text-align: left;
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur) ease;
}

.choice:active:not(:disabled) {
  transform: scale(0.98);
}

.choice:disabled {
  opacity: 0.5;
}

.choice.primary {
  border-color: var(--accent-line);
  background:
    radial-gradient(120% 90% at 50% -20%, rgba(155, 227, 107, 0.14), transparent 70%),
    var(--panel);
}

.c-icon {
  flex: none;
  font-size: 36px;
  color: var(--text-2);
}

.choice.primary .c-icon {
  color: var(--leaf);
  filter: drop-shadow(0 0 8px rgba(155, 227, 107, 0.45));
}

.c-text {
  flex: 1;
  min-width: 0;
}

.c-text strong {
  display: block;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.c-text span {
  display: block;
  margin-top: 3px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-3);
}

.c-go {
  flex: none;
  font-size: 20px;
  color: var(--text-3);
}

.g-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
}

.next {
  flex: 1;
}

.step-fwd-enter-active,
.step-back-enter-active {
  transition: opacity var(--dur) var(--ease-out), transform var(--dur-slow) var(--ease-out);
}

.step-fwd-leave-active,
.step-back-leave-active {
  transition: opacity var(--dur-fast) ease, transform var(--dur-fast) ease;
}

.step-fwd-enter-from,
.step-back-leave-to {
  opacity: 0;
  transform: translateX(28px);
}

.step-fwd-leave-to,
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}

/* Exit: the light floods the tent, then the guide dissolves into the dashboard. */
.flood {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(120% 80% at 50% 0%, rgba(255, 228, 180, 0.5) 0%, rgba(155, 227, 107, 0.12) 50%, transparent 85%);
  opacity: 0;
  transform: scaleY(0.2);
  transform-origin: top;
}

.leaving .flood {
  animation: g-flood 0.64s var(--ease-out) forwards;
}

.leaving {
  animation: g-out 0.64s var(--ease-in) forwards;
  pointer-events: none;
}

@keyframes g-flood {
  50% {
    opacity: 1;
    transform: scaleY(1);
  }

  to {
    opacity: 0.6;
    transform: scaleY(1.2);
  }
}

@keyframes g-out {
  0%, 35% {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .g-light,
  .brand,
  .tagline,
  .values li {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .leaving,
  .leaving .flood {
    animation: none;
  }
}
</style>
