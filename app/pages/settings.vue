<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { NotBackupError } from '~/composables/useGrow'
import { DEMO_PHOTO_CREDITS } from '~/utils/demoCredits'
import { LOCALES, type Locale } from '~/utils/locale'
import AiPackRow from '~/ai/AiPackRow.vue'

const { t } = useI18n()
useHead({ title: () => t('settings.title') })

const grow = useGrow()
const { state } = grow
const { notify } = useNotify()
const { confirm } = useConfirm()
const config = useRuntimeConfig()
const route = useRoute()

const name = ref(state.settings.growerName)
watch(name, v => grow.updateSettings({ growerName: v.trim().slice(0, 30) }))

function setLanguage(language: Locale) {
  grow.updateSettings({ language })
}

const LIGHT_PRESETS = [18, 20, 12, 24] as const
const lightsOn = ref(state.settings.lightsOn)
const lightHours = ref<number | string>(state.settings.lightHours)
const hoursValue = computed(() => {
  const n = Number(lightHours.value)
  return lightHours.value === '' || !Number.isFinite(n) ? null : Math.round(Math.min(24, Math.max(0, n)))
})
const hoursInvalid = computed(() => hoursValue.value === null || hoursValue.value !== Number(lightHours.value))
watch(lightsOn, (v) => {
  if (/^\d{2}:\d{2}$/.test(v)) grow.updateSettings({ lightsOn: v })
})
watch(hoursValue, (v) => {
  if (v !== null) grow.updateSettings({ lightHours: v })
})
function syncLight() {
  lightsOn.value = state.settings.lightsOn
  lightHours.value = state.settings.lightHours
  reminderTime.value = state.settings.reminderTime
}

const remindersNative = remindersSupported()
const reminderTime = ref(state.settings.reminderTime)
watch(reminderTime, (v) => {
  if (/^\d{2}:\d{2}$/.test(v)) grow.updateSettings({ reminderTime: v })
})
async function toggleReminders() {
  if (state.settings.reminders) {
    grow.updateSettings({ reminders: false })
    return
  }
  if (!(await requestReminderPermission())) {
    notify(t('settings.reminders.denied'), { tone: 'error' })
    return
  }
  grow.updateSettings({ reminders: true })
  notify(t('settings.reminders.enabled'))
}

// ── AI assistant ──────────────────────────────────────────────────
const ai = useAiSettings()
const testing = ref(false)
const testResult = ref<{ ok: boolean, text: string } | null>(null)

async function testAi() {
  testing.value = true
  testResult.value = null
  try {
    const version = await ai.provider.value.test()
    testResult.value = { ok: true, text: t('ai.settings.testOk', { version }) }
  } catch (e) {
    testResult.value = { ok: false, text: (e as Error).message || t('ai.settings.testFailed') }
  } finally {
    testing.value = false
  }
}

const usage = ref<string | null>(null)
const photoCount = computed(() => new Set([
  ...state.plants.map(p => p.photoId).filter(Boolean),
  ...state.entries.flatMap(e => e.photoIds)
]).size)

const aiSection = ref<HTMLElement | null>(null)

onMounted(async () => {
  if (route.hash === '#ai') nextTick(() => aiSection.value?.scrollIntoView({ block: 'start' }))
  try {
    const est = await navigator.storage?.estimate?.()
    if (est?.usage != null) usage.value = `${formatNumber(est.usage / 1024 / 1024)} MB`
  } catch {
    // not supported – just hide the number
  }
})

const busy = ref<'export' | 'import' | null>(null)

async function exportData() {
  busy.value = 'export'
  const filename = `budbuddy-backup-${todayISO()}.json`
  let uri: string | null = null
  try {
    if (Capacitor.isNativePlatform()) {
      // Write in pieces – one huge string through the native bridge can run out of memory.
      let first = true
      await grow.exportBackup(async (chunk) => {
        if (first) {
          uri = (await Filesystem.writeFile({ path: filename, data: chunk, directory: Directory.Cache, encoding: Encoding.UTF8 })).uri
          first = false
        } else {
          await Filesystem.appendFile({ path: filename, data: chunk, directory: Directory.Cache, encoding: Encoding.UTF8 })
        }
      })
    } else {
      const parts: string[] = []
      await grow.exportBackup(async (chunk) => {
        parts.push(chunk)
      })
      const url = URL.createObjectURL(new Blob(parts, { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify(t('settings.toast.downloaded'))
      useAutoBackup().markManualBackup()
    }
  } catch (e) {
    console.error(e)
    notify(t('settings.toast.exportFailed'), { tone: 'error' })
    busy.value = null
    return
  }

  if (uri) {
    try {
      await Share.share({ title: t('settings.shareTitle'), files: [uri] })
      useAutoBackup().markManualBackup()
    } catch (e) {
      // Closing the share sheet rejects too – that is not an error.
      if (!/cancel/i.test(String(e))) {
        console.error(e)
        notify(t('settings.toast.shareFailed'), { tone: 'error' })
      }
    }
  }
  busy.value = null
}

async function importData() {
  const file = await pickFile('application/json,.json')
  if (!file) return
  const ok = await confirm({
    title: t('settings.confirm.restoreTitle'),
    message: t('settings.confirm.restoreMessage'),
    confirmLabel: t('settings.confirm.restoreLabel'),
    danger: true
  })
  if (!ok) return
  busy.value = 'import'
  try {
    const result = await grow.importBackup(await file.text())
    name.value = state.settings.growerName
    syncLight()
    const restored = t('settings.toast.restored', {
      plants: t('common.plants', { n: result.plants }),
      entries: t('common.entries', { n: result.entries }),
      photos: t('common.photos', { n: result.photos })
    })
    notify(result.skipped ? `${restored}. ${t('settings.toast.skipped', { n: result.skipped })}` : restored, { duration: result.skipped ? 6000 : undefined })
  } catch (e) {
    console.error(e)
    const msg = e instanceof SyntaxError
      ? t('settings.toast.invalidJson')
      : e instanceof NotBackupError ? t('settings.toast.notBackup') : t('settings.toast.importFailed')
    notify(msg, { tone: 'error' })
  } finally {
    busy.value = null
  }
}

async function demo() {
  const ok = await confirm({
    title: t('settings.confirm.demoTitle'),
    message: t('settings.confirm.demoMessage'),
    confirmLabel: t('settings.confirm.demoLabel'),
    danger: true
  })
  if (!ok) return
  await grow.loadDemo()
  notify(t('settings.toast.demoLoaded'))
  navigateTo('/')
}

async function erase() {
  const ok = await confirm({
    title: t('settings.confirm.eraseTitle'),
    message: t('settings.confirm.eraseMessage'),
    confirmLabel: t('settings.confirm.eraseLabel'),
    danger: true
  })
  if (!ok) return
  await grow.eraseAll()
  await useAssistant().clearAll()
  name.value = ''
  syncLight()
  notify(t('settings.toast.erased'), { tone: 'info' })
  navigateTo('/')
}
</script>

<template>
  <div>
    <AppHeader
      :title="t('settings.title')"
      back
    />
    <div class="page rise">
      <CommunityAccountSection class="account-quiet" />
      <section aria-labelledby="h-you">
        <div class="section-head">
          <h2
            id="h-you"
            class="section-title"
          >
            {{ t('settings.you') }}
          </h2>
        </div>
        <div class="card pad">
          <div class="field">
            <label
              class="field-label"
              for="s-name"
            >{{ t('settings.yourName') }}</label>
            <input
              id="s-name"
              v-model="name"
              class="input"
              maxlength="30"
              :placeholder="t('settings.namePlaceholder')"
              autocomplete="nickname"
            >
          </div>
        </div>
      </section>

      <section aria-labelledby="h-lang">
        <div class="section-head">
          <h2
            id="h-lang"
            class="section-title"
          >
            {{ t('settings.language') }}
          </h2>
        </div>
        <div
          class="card list"
          role="radiogroup"
          aria-labelledby="h-lang"
        >
          <button
            v-for="opt in LOCALES"
            :key="opt.value"
            type="button"
            role="radio"
            class="row"
            :lang="opt.value"
            :aria-checked="state.settings.language === opt.value"
            @click="setLanguage(opt.value)"
          >
            <span class="row-tile">
              <UIcon
                name="i-tabler-language"
                class="size-5"
              />
            </span>
            <span class="row-text">
              <strong>{{ opt.label }}</strong>
            </span>
            <UIcon
              v-if="state.settings.language === opt.value"
              name="i-tabler-check"
              class="size-5 trail on"
            />
          </button>
        </div>
      </section>

      <section aria-labelledby="h-light">
        <div class="section-head">
          <h2
            id="h-light"
            class="section-title"
          >
            {{ t('settings.light.title') }}
          </h2>
        </div>
        <div class="card pad form-stack">
          <PhotoperiodRing
            :lights-on="state.settings.lightsOn"
            :hours="state.settings.lightHours"
            :size="96"
          />
          <div
            class="chips presets"
            role="group"
            :aria-label="t('settings.light.presets')"
          >
            <button
              v-for="h in LIGHT_PRESETS"
              :key="h"
              type="button"
              class="chip num"
              :aria-pressed="hoursValue === h"
              @click="lightHours = h"
            >
              {{ h }}/{{ 24 - h }}
            </button>
          </div>
          <div class="form-grid">
            <div class="field">
              <label
                class="field-label"
                for="s-lights-on"
              >{{ t('settings.light.lightsOn') }}</label>
              <input
                id="s-lights-on"
                v-model="lightsOn"
                type="time"
                class="input num"
                required
              >
            </div>
            <div class="field">
              <label
                class="field-label"
                for="s-light-hours"
              >{{ t('settings.light.hours') }}</label>
              <input
                id="s-light-hours"
                v-model="lightHours"
                type="number"
                inputmode="numeric"
                min="0"
                max="24"
                step="1"
                class="input num"
                :class="{ invalid: hoursInvalid }"
                :aria-invalid="hoursInvalid"
                aria-describedby="s-light-hours-hint"
              >
            </div>
          </div>
          <span
            id="s-light-hours-hint"
            :class="hoursInvalid ? 'field-error' : 'field-hint'"
          >{{ hoursInvalid ? t('settings.light.invalid') : t('settings.light.hint') }}</span>
        </div>
      </section>

      <section aria-labelledby="h-reminders">
        <div class="section-head">
          <h2
            id="h-reminders"
            class="section-title"
          >
            {{ t('settings.reminders.title') }}
          </h2>
        </div>
        <div class="card list">
          <button
            type="button"
            role="switch"
            class="row"
            :aria-checked="state.settings.reminders"
            :disabled="!remindersNative"
            @click="toggleReminders"
          >
            <span class="row-tile">
              <UIcon
                name="i-tabler-bell"
                class="size-5"
              />
            </span>
            <span class="row-text">
              <strong>{{ t('settings.reminders.toggle') }}</strong>
              <span>{{ remindersNative ? t('settings.reminders.hint') : t('settings.reminders.appOnly') }}</span>
            </span>
            <span
              class="switch"
              aria-hidden="true"
            />
          </button>
          <template v-if="remindersNative && state.settings.reminders">
            <label
              class="row"
              for="s-reminder-time"
            >
              <span class="row-tile">
                <UIcon
                  name="i-tabler-clock"
                  class="size-5"
                />
              </span>
              <span class="row-text">
                <strong>{{ t('settings.reminders.time') }}</strong>
              </span>
              <input
                id="s-reminder-time"
                v-model="reminderTime"
                type="time"
                class="input num row-input"
                required
              >
            </label>
            <button
              type="button"
              class="row"
              @click="sendTestReminder()"
            >
              <span class="row-tile">
                <UIcon
                  name="i-tabler-send"
                  class="size-5"
                />
              </span>
              <span class="row-text">
                <strong>{{ t('settings.reminders.test') }}</strong>
              </span>
              <UIcon
                name="i-tabler-chevron-right"
                class="size-5 trail"
              />
            </button>
          </template>
        </div>
      </section>

      <section
        id="ai"
        ref="aiSection"
        aria-labelledby="h-ai"
      >
        <div class="section-head">
          <h2
            id="h-ai"
            class="section-title"
          >
            {{ t('ai.settings.title') }}
          </h2>
        </div>
        <div class="card pad form-stack">
          <button
            type="button"
            class="btn btn-soft"
            :disabled="testing"
            @click="testAi"
          >
            <UIcon
              :name="testing ? 'i-tabler-loader-2' : 'i-tabler-plug-connected'"
              class="size-5"
              :class="{ 'animate-spin': testing }"
            />
            {{ t('ai.settings.test') }}
          </button>
          <p
            v-if="testResult"
            class="test-result"
            :class="{ ok: testResult.ok }"
            role="status"
          >
            <UIcon
              :name="testResult.ok ? 'i-tabler-circle-check' : 'i-tabler-alert-triangle'"
              class="size-5 shrink-0"
            />
            {{ testResult.text }}
          </p>
          <AiPackRow />
        </div>
        <p class="note">
          {{ t('ai.settings.privacy') }}
        </p>
      </section>

      <section aria-labelledby="h-data">
        <div class="section-head">
          <h2
            id="h-data"
            class="section-title"
          >
            {{ t('settings.data.title') }}
          </h2>
          <span
            v-if="usage"
            class="section-meta num"
          >{{ usage }}</span>
        </div>
        <div class="card list">
          <div class="stats-row">
            <span class="stat-cell">
              <strong class="num">{{ state.plants.length }}</strong>
              <span>{{ t('settings.data.plants', { n: state.plants.length }) }}</span>
            </span>
            <span class="stat-cell">
              <strong class="num">{{ state.entries.length }}</strong>
              <span>{{ t('settings.data.entries', { n: state.entries.length }) }}</span>
            </span>
            <span class="stat-cell">
              <strong class="num">{{ photoCount }}</strong>
              <span>{{ t('settings.data.photos', { n: photoCount }) }}</span>
            </span>
          </div>
          <button
            type="button"
            class="row"
            :disabled="!!busy"
            @click="exportData"
          >
            <span class="row-tile">
              <UIcon
                :name="busy === 'export' ? 'i-tabler-loader-2' : 'i-tabler-download'"
                class="size-5"
                :class="{ 'animate-spin': busy === 'export' }"
              />
            </span>
            <span class="row-text">
              <strong>{{ t('settings.data.export') }}</strong>
              <span>{{ t('settings.data.exportHint') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 trail"
            />
          </button>
          <button
            type="button"
            class="row"
            :disabled="!!busy"
            @click="importData"
          >
            <span class="row-tile">
              <UIcon
                :name="busy === 'import' ? 'i-tabler-loader-2' : 'i-tabler-upload'"
                class="size-5"
                :class="{ 'animate-spin': busy === 'import' }"
              />
            </span>
            <span class="row-text">
              <strong>{{ t('settings.data.restore') }}</strong>
              <span>{{ t('settings.data.restoreHint') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 trail"
            />
          </button>
          <NuxtLink
            to="/stats"
            class="row"
          >
            <span class="row-tile">
              <UIcon
                name="i-tabler-chart-bar"
                class="size-5"
              />
            </span>
            <span class="row-text">
              <strong>{{ t('settings.data.stats') }}</strong>
              <span>{{ t('settings.data.statsHint') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 trail"
            />
          </NuxtLink>
        </div>
        <p class="note">
          {{ t('settings.data.note') }}
        </p>
      </section>

      <BackupAutoBackupSection @restored="name = state.settings.growerName; syncLight()" />

      <section aria-labelledby="h-danger">
        <div class="section-head">
          <h2
            id="h-danger"
            class="section-title"
          >
            {{ t('settings.danger.title') }}
          </h2>
        </div>
        <div class="card list">
          <button
            type="button"
            class="row"
            @click="demo"
          >
            <span class="row-tile">
              <UIcon
                name="i-tabler-flask-2"
                class="size-5"
              />
            </span>
            <span class="row-text">
              <strong>{{ t('settings.danger.demo') }}</strong>
              <span>{{ t('settings.danger.demoHint') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 trail"
            />
          </button>
          <button
            type="button"
            class="row danger"
            @click="erase"
          >
            <span class="row-tile">
              <UIcon
                name="i-tabler-trash"
                class="size-5"
              />
            </span>
            <span class="row-text">
              <strong>{{ t('settings.danger.erase') }}</strong>
              <span>{{ t('settings.danger.eraseHint') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 trail"
            />
          </button>
        </div>
      </section>

      <footer class="about">
        <img
          src="/icon.webp"
          alt=""
          width="48"
          height="48"
        >
        <strong>BudBuddy <span class="num">{{ config.public.version }}</span></strong>
        <span>{{ t('settings.about.tagline') }}</span>
        <span class="legal">{{ t('settings.about.legal') }}</span>
        <details class="credits">
          <summary>{{ t('settings.about.credits') }}</summary>
          <ul>
            <li
              v-for="c in DEMO_PHOTO_CREDITS"
              :key="c.file"
            >
              <a
                :href="c.sourceUrl"
                target="_blank"
                rel="noopener"
              >{{ c.title }}</a> · {{ c.author }} ·
              <a
                v-if="c.licenseUrl"
                :href="c.licenseUrl"
                target="_blank"
                rel="noopener"
              >{{ c.license }}</a>
              <template v-else>
                {{ c.license }}
              </template>
            </li>
          </ul>
        </details>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.pad {
  padding: 16px;
}

.presets .chip {
  flex: 1;
  justify-content: center;
  min-height: 44px;
  padding: 0 10px;
}

/* Grouped list cards */
.list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list > * + * {
  border-top: 1px solid var(--line);
}

.stats-row {
  display: flex;
  padding: 14px 0;
}

.stat-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 14px;
}

.stat-cell + .stat-cell {
  border-left: 1px solid var(--line);
}

.stat-cell strong {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.stat-cell span {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 8px 14px;
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
  text-decoration: none;
  transition: background var(--dur-fast) ease;
}

.row:active:not(:disabled) {
  background: var(--surface-2);
}

.row:disabled {
  opacity: 0.5;
}

.row-tile {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  color: var(--text-2);
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-text strong {
  font-size: 15px;
  font-weight: 500;
}

.row-text span {
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-3);
}

.row-input {
  width: auto;
  min-height: 40px;
  padding: 6px 10px;
}

.trail {
  flex-shrink: 0;
  color: var(--text-3);
}

.trail.on {
  color: var(--green);
}

.row.danger .row-tile {
  background: var(--danger-soft);
  color: var(--red);
}

.row.danger strong {
  color: var(--red);
}

.note {
  margin: 10px 2px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-3);
}

.test-result {
  display: flex;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--red);
}

.test-result.ok {
  color: var(--green);
}

/* Standard toggle */
.switch {
  position: relative;
  flex-shrink: 0;
  width: 51px;
  height: 31px;
  border-radius: 999px;
  background: var(--track);
  transition: background var(--dur) ease;
}

.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: var(--text);
  transition: transform var(--dur) var(--ease-out);
}

.row[aria-checked="true"] .switch {
  background: var(--green);
}

.row[aria-checked="true"] .switch::after {
  transform: translateX(20px);
}

/* About */
.about {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0 4px;
  text-align: center;
  font-size: 13px;
  color: var(--text-2);
}

.about img {
  border-radius: var(--radius-control);
  margin-bottom: 8px;
}

.about strong {
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}

.about strong .num {
  font-weight: 400;
  color: var(--text-2);
}

.credits {
  margin-top: 10px;
  max-width: 100%;
  font-size: 12px;
  color: var(--text-3);
}

.credits summary {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-2);
}

.credits ul {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.credits a {
  color: var(--text-2);
  text-underline-offset: 3px;
}

.legal {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-3);
}

/* the optional community sign-in is a plain button, not the page's primary action */
.account-quiet :deep(.btn-primary) {
  background: var(--surface-2);
  border-color: var(--line-strong);
  color: var(--text);
}
</style>
