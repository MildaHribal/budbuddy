<script setup lang="ts">
import type { Settings } from '~/types/grow'
import { czechVocative, LOCALES, type Locale } from '~/utils/locale'
import { remindersSupported, requestReminderPermission } from '~/composables/useReminders'
import { isDemoGarden } from '~/utils/appTour'

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

const heading = ref<HTMLElement | null>(null)
function go(to: number) {
  if (to < 0 || to >= steps.length || to === index.value || leaving.value) return
  dir.value = to > index.value ? 1 : -1
  index.value = to
}
const next = () => go(index.value + 1)
const prev = () => go(index.value - 1)
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
// the demo garden runs 12/12 (its hero plant flowers); an empty garden starts at 18/6 unless picked here
const lightTouched = ref(false)
function setHours(h: number) {
  lightTouched.value = true
  updateSettings({ lightHours: h })
}
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

// a fresh native install keeps the demo garden for the app tour that follows
const tour = useAppTour()
const canTour = native && isDemoGarden(state)

const choice = ref<'demo' | 'empty' | null>(null)
async function finish(mode: 'demo' | 'empty') {
  if (leaving.value || busy.value) return
  choice.value = mode
  busy.value = true
  try {
    if (mode === 'empty') {
      // eraseAll resets settings too, so put the guide's choices back.
      const { growerName, language, lightsOn, lightHours, reminders, reminderTime } = state.settings
      const keep: Partial<Settings> = { growerName, language, lightsOn, lightHours: lightTouched.value ? lightHours : 18, reminders, reminderTime }
      await eraseAll()
      updateSettings({ ...keep, initialized: true })
    }
  } finally {
    busy.value = false
  }
  leaving.value = true
  setTimeout(() => {
    updateSettings({ onboarded: true })
    if (mode === 'demo' && canTour) tour.startFirstRun({ lightHours: lightTouched.value ? state.settings.lightHours : null })
  }, reduced ? 0 : 220)
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
          class="step"
        >
          <img
            src="/icon.webp"
            alt=""
            width="72"
            height="72"
            class="app-icon"
          >
          <h1
            ref="heading"
            tabindex="-1"
            class="s-title"
          >
            BudBuddy
          </h1>
          <p class="s-lead">
            {{ t('onboarding.welcome.tagline') }}
          </p>
          <ul class="card values">
            <li>
              <span class="v-tile">
                <UIcon
                  name="i-tabler-cloud-off"
                  class="size-5"
                />
              </span>
              <span class="v-text">
                <strong>{{ t('onboarding.welcome.offline') }}</strong>
                <span>{{ t('onboarding.welcome.offlineHint') }}</span>
              </span>
            </li>
            <li>
              <span class="v-tile">
                <GrowIcon name="harvest" />
              </span>
              <span class="v-text">
                <strong>{{ t('onboarding.welcome.lifecycle') }}</strong>
                <span>{{ t('onboarding.welcome.lifecycleHint') }}</span>
              </span>
            </li>
            <li>
              <span class="v-tile">
                <GrowIcon name="spark" />
              </span>
              <span class="v-text">
                <strong>{{ t('onboarding.welcome.ai') }}</strong>
                <span>{{ t('onboarding.welcome.aiHint') }}</span>
              </span>
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
          <div
            v-if="LOCALES.length > 1"
            class="field"
          >
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
          <div class="card ring-panel">
            <PhotoperiodRing
              :lights-on="state.settings.lightsOn"
              :hours="state.settings.lightHours"
              :size="128"
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
                @click="setHours(h)"
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
          <template v-if="native">
            <button
              v-if="!state.settings.reminders"
              type="button"
              class="btn btn-soft btn-block"
              :disabled="busy"
              @click="enableReminders"
            >
              <UIcon
                name="i-tabler-bell"
                class="size-5"
              />
              {{ t('onboarding.reminders.enable') }}
            </button>
            <template v-else>
              <p
                class="status-on"
                role="status"
              >
                <UIcon
                  name="i-tabler-circle-check"
                  class="size-5"
                />
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
              class="note-icon size-5"
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
          <div
            class="choices"
            role="radiogroup"
            :aria-label="t('onboarding.start.title')"
          >
            <button
              type="button"
              role="radio"
              class="card choice"
              :aria-checked="choice === 'demo'"
              :disabled="busy || leaving"
              @click="finish('demo')"
            >
              <span class="c-tile">
                <GrowIcon name="flowering" />
              </span>
              <span class="c-text">
                <strong>{{ canTour ? t('onboarding.start.tour') : t('onboarding.start.demo') }}</strong>
                <span>{{ canTour ? t('onboarding.start.tourHint') : t('onboarding.start.demoHint') }}</span>
              </span>
              <span
                class="radio"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              role="radio"
              class="card choice"
              :aria-checked="choice === 'empty'"
              :disabled="busy || leaving"
              @click="finish('empty')"
            >
              <span class="c-tile">
                <GrowIcon name="germination" />
              </span>
              <span class="c-text">
                <strong>{{ t('onboarding.start.empty') }}</strong>
                <span>{{ t('onboarding.start.emptyHint') }}</span>
              </span>
              <span
                class="radio"
                aria-hidden="true"
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
  </div>
</template>

<style scoped>
.guide {
  position: absolute;
  inset: 0;
  z-index: 55;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  padding: calc(var(--safe-top) + 12px) 16px calc(var(--safe-bottom) + 16px);
  overflow: hidden;
  transition: opacity var(--dur) ease;
}

.leaving {
  opacity: 0;
  pointer-events: none;
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
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--track);
  transition: background var(--dur) ease, width var(--dur) var(--ease-out);
}

.dots li.done {
  background: var(--accent-line);
}

.dots li.on {
  width: 20px;
  border-radius: 4px;
  background: var(--green);
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
  padding-top: 24px;
}

.step h1,
.step h2 {
  outline: none;
}

.app-icon {
  width: 72px;
  height: 72px;
  border-radius: var(--radius);
}

.s-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.s-lead {
  margin: -10px 0 0;
  font-size: 15px;
  line-height: 1.45;
  color: var(--text-2);
}

.values {
  display: flex;
  flex-direction: column;
  margin: 6px 0 0;
  padding: 0 14px;
  list-style: none;
}

.values li {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 0;
}

.values li + li {
  border-top: 1px solid var(--line);
}

.v-tile,
.c-tile {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 20px;
}

.v-text,
.c-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.v-text strong,
.c-text strong {
  font-size: 15px;
  font-weight: 500;
}

.v-text span,
.c-text span {
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-3);
}

.segmented.tall button {
  min-height: 44px;
}

.hello {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.ring-panel {
  padding: 16px;
}

.status-on {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--green);
}

.note {
  display: flex;
  gap: 10px;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.note-icon {
  flex: none;
  margin-top: 2px;
  color: var(--text-3);
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.choice {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 72px;
  padding: 12px 14px;
  color: var(--text);
  text-align: left;
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur) ease;
}

.choice:active:not(:disabled) {
  transform: scale(0.98);
}

.choice:disabled {
  opacity: 0.6;
}

.choice[aria-checked="true"] {
  border-color: var(--green);
}

.radio {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--line-strong);
  transition: border var(--dur-fast) ease;
}

.choice[aria-checked="true"] .radio {
  border: 7px solid var(--green);
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
  transition: opacity var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.step-fwd-leave-active,
.step-back-leave-active {
  transition: opacity var(--dur-fast) ease, transform var(--dur-fast) ease;
}

.step-fwd-enter-from,
.step-back-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.step-fwd-leave-to,
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
