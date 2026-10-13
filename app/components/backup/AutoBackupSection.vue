<script setup lang="ts">
import { backupHealth, isAutoBackupName, KEEP_OPTIONS, type BackupInterval } from '~/utils/autoBackup'
import { intlLocale } from '~/utils/locale'
import { BackupError, autoBackupSupported, type BackupItem } from '~/composables/useAutoBackup'

const emit = defineEmits<{ restored: [] }>()

const { t } = useI18n()
const grow = useGrow()
const backup = useAutoBackup()
const { notify } = useNotify()
const { confirm } = useConfirm()
const supported = autoBackupSupported()
const cfg = backup.config

const access = ref(true)
onMounted(async () => {
  await backup.load()
  if (cfg.value.target) access.value = await backup.checkAccess()
})

const now = ref(new Date())
const health = computed(() => backupHealth(cfg.value, now.value))
const lastWasAuto = computed(() => !!cfg.value.lastAt && (!cfg.value.lastManualAt || cfg.value.lastAt >= cfg.value.lastManualAt))
const hasData = computed(() => grow.state.entries.length > 0 && !grow.state.settings.demo)
const warn = computed(() => hasData.value && health.value.health !== 'ok')

function when(d: Date): string {
  return `${formatRelativeDay(toISODate(d)).toLowerCase()} ${d.toLocaleTimeString(intlLocale(), { hour: 'numeric', minute: '2-digit' })}`
}

const errorText = (e: unknown) => t(`backup.errors.${e instanceof BackupError ? e.code : 'write'}`)

async function chooseFolder(): Promise<boolean> {
  try {
    const ok = await backup.pickFolder()
    if (ok) access.value = true
    return ok
  } catch (e) {
    console.error(e)
    notify(errorText(e), { tone: 'error' })
    return false
  }
}

async function toggle() {
  if (cfg.value.enabled) {
    await backup.update({ enabled: false })
    return
  }
  if (!cfg.value.target || !access.value) {
    if (!(await chooseFolder())) return
  }
  await backup.update({ enabled: true })
  if (!cfg.value.lastAt) backupNow()
}

async function backupNow() {
  try {
    const { name } = await backup.runBackup({ interactive: true })
    access.value = true
    now.value = new Date()
    notify(t('backup.done', { name }), { duration: 4000 })
  } catch (e) {
    console.error(e)
    if (e instanceof BackupError && e.code === 'permission') access.value = false
    notify(errorText(e), { tone: 'error' })
  }
}

const setFrequency = (interval: BackupInterval) => backup.update({ interval })
const setKeep = (keep: number) => backup.update({ keep })

// ── Restore ────────────────────────────────────────────────────────
const restoreOpen = ref(false)
const listing = ref(false)
const items = ref<BackupItem[]>([])
const restoring = ref<string | null>(null)

async function openRestore() {
  restoreOpen.value = true
  listing.value = true
  items.value = []
  try {
    items.value = await backup.listBackups({ interactive: true })
  } catch (e) {
    console.error(e)
    restoreOpen.value = false
    if (e instanceof BackupError && e.code === 'permission') access.value = false
    notify(errorText(e), { tone: 'error' })
  } finally {
    listing.value = false
  }
}

const size = (b: number) => (b >= 1024 * 1024 ? t('backup.size', { mb: formatNumber(b / 1024 / 1024) }) : t('backup.sizeKb', { kb: Math.max(1, Math.round(b / 1024)) }))

async function restore(item: BackupItem) {
  const ok = await confirm({
    title: t('settings.confirm.restoreTitle'),
    message: t('settings.confirm.restoreMessage'),
    confirmLabel: t('settings.confirm.restoreLabel'),
    danger: true
  })
  if (!ok) return
  restoring.value = item.id
  try {
    const result = await grow.importBackup(await backup.readBackup(item))
    restoreOpen.value = false
    emit('restored')
    notify(t('settings.toast.restored', {
      plants: t('common.plants', { n: result.plants }),
      entries: t('common.entries', { n: result.entries }),
      photos: t('common.photos', { n: result.photos })
    }))
  } catch (e) {
    console.error(e)
    notify(e instanceof SyntaxError ? t('settings.toast.invalidJson') : t('settings.toast.importFailed'), { tone: 'error' })
  } finally {
    restoring.value = null
  }
}
</script>

<template>
  <section aria-labelledby="h-autobackup">
    <div class="section-head">
      <h2
        id="h-autobackup"
        class="section-title"
      >
        {{ t('backup.title') }}
      </h2>
      <span
        v-if="cfg.enabled && cfg.target"
        class="section-meta"
      >{{ cfg.interval === 'daily' ? t('backup.daily') : t('backup.weekly') }}</span>
    </div>

    <div class="card list">
      <div
        class="row status"
        :class="{ warn }"
        role="status"
      >
        <span class="row-tile">
          <UIcon
            :name="warn ? 'i-tabler-alert-triangle' : 'i-tabler-shield-check'"
            class="size-5"
          />
        </span>
        <span class="row-text">
          <strong v-if="health.last">{{ t('backup.last', { when: when(health.last) }) }} · {{ lastWasAuto ? t('backup.lastAuto') : t('backup.lastManual') }}</strong>
          <strong v-else>{{ t('backup.never') }}</strong>
          <span v-if="health.health === 'never'">{{ t('backup.neverHint') }}</span>
          <span v-else-if="health.health === 'stale'">{{ t('backup.staleHint') }}</span>
          <span v-else-if="cfg.target && cfg.enabled">{{ t('backup.okHint', { folder: cfg.target.name || '…' }) }}</span>
        </span>
      </div>

      <template v-if="supported">
        <button
          type="button"
          role="switch"
          class="row"
          :aria-checked="cfg.enabled"
          @click="toggle"
        >
          <span class="row-tile">
            <UIcon
              name="i-tabler-refresh"
              class="size-5"
            />
          </span>
          <span class="row-text">
            <strong>{{ t('backup.toggle') }}</strong>
            <span>{{ t('backup.toggleHint') }}</span>
          </span>
          <span
            class="switch"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          class="row"
          @click="chooseFolder"
        >
          <span class="row-tile">
            <UIcon
              name="i-tabler-folder"
              class="size-5"
            />
          </span>
          <span class="row-text">
            <strong>{{ cfg.target ? cfg.target.name || t('backup.folder') : t('backup.noFolder') }}</strong>
            <span>{{ cfg.target && !access ? t('backup.errors.permission') : t('backup.folderHint') }}</span>
          </span>
          <span class="trail-text">{{ cfg.target ? t('backup.changeFolder') : t('backup.pickFolder') }}</span>
        </button>

        <template v-if="cfg.target">
          <div class="row">
            <span class="row-text">
              <strong>{{ t('backup.interval') }}</strong>
            </span>
            <div
              class="segmented mini"
              role="group"
              :aria-label="t('backup.interval')"
            >
              <button
                v-for="iv in (['daily', 'weekly'] as const)"
                :key="iv"
                type="button"
                :aria-pressed="cfg.interval === iv"
                @click="setFrequency(iv)"
              >
                {{ t(`backup.${iv}`) }}
              </button>
            </div>
          </div>
          <div class="row">
            <span class="row-text">
              <strong>{{ t('backup.keep') }}</strong>
            </span>
            <div
              class="segmented mini"
              role="group"
              :aria-label="t('backup.keep')"
            >
              <button
                v-for="k in KEEP_OPTIONS"
                :key="k"
                type="button"
                class="num"
                :aria-pressed="cfg.keep === k"
                @click="setKeep(k)"
              >
                {{ k }}
              </button>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            class="row"
            :aria-checked="cfg.photos"
            @click="backup.update({ photos: !cfg.photos })"
          >
            <span class="row-tile">
              <UIcon
                name="i-tabler-photo"
                class="size-5"
              />
            </span>
            <span class="row-text">
              <strong>{{ t('backup.photos') }}</strong>
              <span>{{ t('backup.photosHint') }}</span>
            </span>
            <span
              class="switch"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            class="row"
            :disabled="backup.running.value"
            @click="backupNow"
          >
            <span class="row-tile">
              <UIcon
                :name="backup.running.value ? 'i-tabler-loader-2' : 'i-tabler-cloud-upload'"
                class="size-5"
                :class="{ 'animate-spin': backup.running.value }"
              />
            </span>
            <span class="row-text">
              <strong>{{ backup.running.value ? t('backup.running') : !access && cfg.target.kind === 'fsa' ? t('backup.allow') : t('backup.now') }}</strong>
              <span v-if="!access && cfg.target.kind === 'fsa'">{{ t('backup.allowHint') }}</span>
              <span
                v-else-if="cfg.lastError"
                class="err"
              >{{ t(`backup.errors.${cfg.lastError}`) }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 trail"
            />
          </button>
          <button
            type="button"
            class="row"
            @click="openRestore"
          >
            <span class="row-tile">
              <UIcon
                name="i-tabler-history"
                class="size-5"
              />
            </span>
            <span class="row-text">
              <strong>{{ t('backup.restore') }}</strong>
              <span>{{ t('backup.restoreHint') }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 trail"
            />
          </button>
        </template>
      </template>
    </div>
    <p
      v-if="!supported"
      class="note"
    >
      {{ t('backup.unsupported') }}
    </p>

    <BottomSheet
      v-model:open="restoreOpen"
      :title="t('backup.restoreTitle')"
      icon="i-tabler-history"
    >
      <p
        v-if="listing"
        class="sheet-note"
      >
        {{ t('backup.loading') }}
      </p>
      <p
        v-else-if="!items.length"
        class="sheet-note"
      >
        {{ t('backup.restoreEmpty') }}
      </p>
      <div
        v-else
        class="card list"
      >
        <button
          v-for="it in items"
          :key="it.id"
          type="button"
          class="row"
          :disabled="!!restoring"
          @click="restore(it)"
        >
          <span class="row-tile">
            <UIcon
              :name="restoring === it.id ? 'i-tabler-loader-2' : isAutoBackupName(it.name) ? 'i-tabler-refresh' : 'i-tabler-file-download'"
              class="size-5"
              :class="{ 'animate-spin': restoring === it.id }"
            />
          </span>
          <span class="row-text">
            <strong>{{ it.date ? `${formatDate(toISODate(it.date), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}, ${it.date.toLocaleTimeString(intlLocale(), { hour: 'numeric', minute: '2-digit' })}` : it.name }}</strong>
            <span class="num">{{ isAutoBackupName(it.name) ? t('backup.auto') : t('backup.manual') }} · {{ size(it.size) }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="size-5 trail"
          />
        </button>
      </div>
    </BottomSheet>
  </section>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list > * + * {
  border-top: 1px solid var(--line);
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

button.row:active:not(:disabled) {
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

.status .row-tile {
  background: var(--accent-soft);
  color: var(--green);
}

.status.warn .row-tile {
  background: var(--lamp-soft);
  color: var(--amber);
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

.row-text .err {
  color: var(--red);
}

.trail {
  flex-shrink: 0;
  color: var(--text-3);
}

.trail-text {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--green);
}

.segmented.mini {
  flex-shrink: 0;
}

.segmented.mini button {
  min-height: 36px;
  padding: 0 12px;
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

.note,
.sheet-note {
  margin: 10px 2px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-3);
}
</style>
