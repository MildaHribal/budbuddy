<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { normalizeHaUrl, numericState, type HaEntity } from '~/utils/env/homeAssistant'
import { HaError } from '~/composables/useHomeAssistant'

const { t } = useI18n()
useHead({ title: () => `${t('environment.ha.title')} · ${t('environment.title')}` })

const ha = useHomeAssistant()
const envApi = useEnvironment()
const { notify } = useNotify()
const { confirm } = useConfirm()

const url = ref('')
const token = ref('')
const error = ref<string | null>(null)
const busy = ref(false)
const loadingEntities = ref(false)
const pending = ref<string | null>(null)
const native = Capacitor.isNativePlatform()

const sensorsList = computed(() => ha.entities.value.filter(e => e.kind === 'temperature' || e.kind === 'humidity'))
const switches = computed(() => ha.entities.value.filter(e => e.kind === 'switch' || e.kind === 'light'))
const used = computed(() => new Set(envApi.env.value.sensors.flatMap(s => [s.haTemp, s.haHumidity]).filter(Boolean)))

function problemText(e: unknown) {
  return t(`environment.ha.errors.${e instanceof HaError ? e.problem : 'failed'}`)
}

async function connect() {
  error.value = null
  const u = normalizeHaUrl(url.value)
  if ('error' in u) {
    error.value = t(`environment.ha.errors.${u.error}`)
    return
  }
  if (!token.value.trim()) {
    error.value = t('environment.ha.errors.token')
    return
  }
  busy.value = true
  try {
    await ha.connect({ url: u.url, token: token.value.trim() })
    token.value = ''
  } catch (e) {
    error.value = problemText(e)
  } finally {
    busy.value = false
  }
}

async function refresh() {
  loadingEntities.value = true
  error.value = null
  try {
    await ha.sync()
  } catch (e) {
    error.value = problemText(e)
  } finally {
    loadingEntities.value = false
  }
}

async function toggle(e: HaEntity) {
  pending.value = e.id
  try {
    await ha.toggle(e.id)
  } catch {
    notify(t('environment.ha.toggleFailed', { name: e.name }), { tone: 'error' })
  } finally {
    pending.value = null
  }
}

async function disconnect() {
  const ok = await confirm({ title: t('environment.ha.disconnectConfirm'), message: t('environment.ha.disconnectText'), confirmLabel: t('environment.ha.disconnect'), danger: true })
  if (!ok) return
  await ha.disconnect()
  notify(t('environment.ha.disconnected'))
}

function addAsSensor(e: HaEntity) {
  const sensor = envApi.addSensor({
    name: e.name,
    kind: 'ha',
    target: { type: 'tent' },
    haTemp: e.kind === 'temperature' ? e.id : '',
    haHumidity: e.kind === 'humidity' ? e.id : ''
  })
  ha.sync().catch(() => {})
  notify(t('environment.add.added', { name: sensor.name }))
  navigateTo(`/environment/sensors/${sensor.id}`)
}

const stateLabel = (e: HaEntity) => {
  if (e.kind === 'switch' || e.kind === 'light') return e.state === 'on' ? t('environment.ha.on') : e.state === 'off' ? t('environment.ha.off') : t('environment.ha.unavailable')
  const v = numericState(e.state)
  return v === null ? t('environment.ha.unavailable') : `${formatNumber(v, 1)} ${e.unit}`
}

onMounted(async () => {
  await ha.ready()
  if (ha.config.value) {
    url.value = ha.config.value.url
    refresh()
  }
})
</script>

<template>
  <div>
    <AppHeader
      :title="t('environment.ha.title')"
      :subtitle="t('environment.title')"
      back
    >
      <template
        v-if="ha.config.value"
        #actions
      >
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('environment.ha.refresh')"
          :disabled="loadingEntities"
          @click="refresh"
        >
          <UIcon
            name="i-tabler-refresh"
            class="size-5"
          />
        </button>
      </template>
    </AppHeader>

    <div class="page rise">
      <!-- connect -->
      <form
        v-if="!ha.config.value"
        class="form-stack"
        novalidate
        @submit.prevent="connect"
      >
        <p class="muted intro">
          {{ t('environment.ha.intro') }}
        </p>
        <label class="field">
          <span class="field-label">{{ t('environment.ha.url') }}</span>
          <input
            v-model="url"
            class="input"
            type="url"
            inputmode="url"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :placeholder="t('environment.ha.urlPlaceholder')"
          >
          <span class="field-hint">{{ t('environment.ha.urlHint') }}</span>
        </label>
        <label class="field">
          <span class="field-label">{{ t('environment.ha.token') }}</span>
          <input
            v-model="token"
            class="input"
            type="password"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          >
          <span class="field-hint">{{ t('environment.ha.tokenHint') }}</span>
          <span class="field-hint">{{ t('environment.ha.tokenStored') }}</span>
        </label>
        <p
          v-if="error"
          class="field-error"
          role="alert"
        >
          {{ error }}
        </p>
        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="busy"
        >
          {{ busy ? t('environment.ha.connecting') : t('environment.ha.connect') }}
        </button>
        <p
          v-if="!native"
          class="note"
        >
          {{ t('environment.ha.webNote') }}
        </p>
      </form>

      <!-- connected -->
      <template v-else>
        <div class="card status">
          <span
            class="dot"
            aria-hidden="true"
          />
          <span class="status-text">{{ t('environment.ha.connected', { url: ha.config.value.url }) }}</span>
        </div>

        <p
          v-if="error"
          class="field-error"
          role="alert"
        >
          {{ error }}
        </p>

        <section aria-labelledby="ha-switches">
          <h2
            id="ha-switches"
            class="section-title block"
          >
            {{ t('environment.ha.switches') }}
          </h2>
          <ul
            v-if="switches.length"
            class="card list"
          >
            <li
              v-for="e in switches"
              :key="e.id"
            >
              <button
                type="button"
                role="switch"
                class="row"
                :aria-checked="e.state === 'on'"
                :disabled="pending === e.id || (e.state !== 'on' && e.state !== 'off')"
                @click="toggle(e)"
              >
                <UIcon
                  :name="e.kind === 'light' ? 'i-tabler-bulb' : 'i-tabler-plug'"
                  class="size-5 row-icon"
                />
                <span class="row-text">
                  <strong>{{ e.name }}</strong>
                  <span>{{ stateLabel(e) }}</span>
                </span>
                <span
                  class="switch"
                  aria-hidden="true"
                />
              </button>
            </li>
          </ul>
          <p
            v-else
            class="muted empty"
          >
            {{ loadingEntities ? t('common.loading') : t('environment.ha.noEntities') }}
          </p>
        </section>

        <section aria-labelledby="ha-sensors">
          <h2
            id="ha-sensors"
            class="section-title block"
          >
            {{ t('environment.ha.sensors') }}
          </h2>
          <ul
            v-if="sensorsList.length"
            class="card list"
          >
            <li
              v-for="e in sensorsList"
              :key="e.id"
              class="row static"
            >
              <UIcon
                :name="e.kind === 'temperature' ? 'i-tabler-temperature' : 'i-tabler-droplet'"
                class="size-5 row-icon"
              />
              <span class="row-text">
                <strong>{{ e.name }}</strong>
                <span class="num">{{ stateLabel(e) }}</span>
              </span>
              <button
                v-if="!used.has(e.id)"
                type="button"
                class="btn btn-soft compact"
                @click="addAsSensor(e)"
              >
                {{ t('environment.ha.useAsSensor') }}
              </button>
              <UIcon
                v-else
                name="i-tabler-check"
                class="size-5 used"
                :aria-label="t('environment.add.paired')"
              />
            </li>
          </ul>
          <p
            v-else
            class="muted empty"
          >
            {{ loadingEntities ? t('common.loading') : t('environment.ha.noEntities') }}
          </p>
        </section>

        <button
          type="button"
          class="btn btn-danger btn-block"
          @click="disconnect"
        >
          {{ t('environment.ha.disconnect') }}
        </button>
      </template>

      <p class="note">
        {{ t('environment.ha.future') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.intro {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.field-error,
.field-hint {
  margin: 0;
}

.note {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
}

.status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  min-width: 0;
}

.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
}

.status-text {
  font-size: 14px;
  overflow-wrap: anywhere;
}

.block {
  margin-bottom: 12px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list li + li {
  border-top: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  padding: 8px 14px;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: left;
}

.row:disabled {
  opacity: 0.6;
}

.row-icon {
  flex: none;
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
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-text span {
  font-size: 12px;
  color: var(--text-3);
}

.compact {
  min-height: 40px;
  padding: 0 12px;
  font-size: 13px;
}

.used {
  color: var(--green);
}

.empty {
  margin: 0;
  font-size: 13px;
}

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
</style>
