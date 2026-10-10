<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

useHead({ title: 'Settings' })

const grow = useGrow()
const { state } = grow
const { notify } = useNotify()
const { confirm } = useConfirm()
const config = useRuntimeConfig()

const name = ref(state.settings.growerName)
watch(name, v => grow.updateSettings({ growerName: v.trim().slice(0, 30) }))

const usage = ref<string | null>(null)
const photoCount = computed(() => new Set([
  ...state.plants.map(p => p.photoId).filter(Boolean),
  ...state.entries.flatMap(e => e.photoIds)
]).size)

onMounted(async () => {
  try {
    const est = await navigator.storage?.estimate?.()
    if (est?.usage != null) usage.value = `${(est.usage / 1024 / 1024).toFixed(1)} MB`
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
      notify('Backup downloaded')
    }
  } catch (e) {
    console.error(e)
    notify('Could not create the backup', { tone: 'error' })
    busy.value = null
    return
  }

  if (uri) {
    try {
      await Share.share({ title: 'BudBuddy backup', files: [uri] })
    } catch (e) {
      // Closing the share sheet rejects too – that is not an error.
      if (!/cancel/i.test(String(e))) {
        console.error(e)
        notify('Could not open the share sheet', { tone: 'error' })
      }
    }
  }
  busy.value = null
}

async function importData() {
  const file = await pickFile('application/json,.json')
  if (!file) return
  const ok = await confirm({
    title: 'Restore this backup?',
    message: 'All current plants, journal entries, tasks and photos will be replaced by the backup.',
    confirmLabel: 'Restore',
    danger: true
  })
  if (!ok) return
  busy.value = 'import'
  try {
    const result = await grow.importBackup(await file.text())
    name.value = state.settings.growerName
    const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
    notify(`Restored ${n(result.plants, 'plant')}, ${n(result.entries, 'entry').replace('entrys', 'entries')} and ${n(result.photos, 'photo')}`)
  } catch (e) {
    console.error(e)
    notify(e instanceof SyntaxError ? 'That file is not valid JSON' : (e as Error).message || 'Import failed', { tone: 'error' })
  } finally {
    busy.value = null
  }
}

async function demo() {
  const ok = await confirm({
    title: 'Load demo garden?',
    message: 'Your current data will be replaced with example plants. Export a backup first if you want to keep it.',
    confirmLabel: 'Load demo',
    danger: true
  })
  if (!ok) return
  await grow.loadDemo()
  notify('Demo garden loaded')
  navigateTo('/')
}

async function erase() {
  const ok = await confirm({
    title: 'Erase everything?',
    message: 'This deletes all plants, journal entries, tasks and photos from this device. It cannot be undone.',
    confirmLabel: 'Erase all',
    danger: true
  })
  if (!ok) return
  await grow.eraseAll()
  name.value = ''
  notify('All data erased', { tone: 'info' })
  navigateTo('/')
}
</script>

<template>
  <div>
    <AppHeader
      title="Settings"
      back
    />
    <div class="page">
      <section class="card pad form-stack">
        <div class="field">
          <label
            class="field-label"
            for="s-name"
          >Your name</label>
          <input
            id="s-name"
            v-model="name"
            class="input"
            maxlength="30"
            placeholder="Used in the dashboard greeting"
            autocomplete="nickname"
          >
        </div>
      </section>

      <section>
        <h2 class="group-title">
          Your data
        </h2>
        <div class="card list">
          <div class="row static">
            <UIcon
              name="i-tabler-database"
              class="size-5 row-icon"
            />
            <span class="row-text">
              <strong>Stored on this device</strong>
              <span>{{ state.plants.length }} plants · {{ state.entries.length }} entries · {{ photoCount }} photos<template v-if="usage"> · {{ usage }}</template></span>
            </span>
          </div>
          <button
            type="button"
            class="row"
            :disabled="!!busy"
            @click="exportData"
          >
            <UIcon
              :name="busy === 'export' ? 'i-tabler-loader-2' : 'i-tabler-download'"
              class="size-5 row-icon"
              :class="{ 'animate-spin': busy === 'export' }"
            />
            <span class="row-text">
              <strong>Export backup</strong>
              <span>One JSON file with everything, including photos</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 chev"
            />
          </button>
          <button
            type="button"
            class="row"
            :disabled="!!busy"
            @click="importData"
          >
            <UIcon
              :name="busy === 'import' ? 'i-tabler-loader-2' : 'i-tabler-upload'"
              class="size-5 row-icon"
              :class="{ 'animate-spin': busy === 'import' }"
            />
            <span class="row-text">
              <strong>Restore backup</strong>
              <span>Replace the current data with a backup file</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 chev"
            />
          </button>
          <NuxtLink
            to="/stats"
            class="row"
          >
            <UIcon
              name="i-tabler-chart-bar"
              class="size-5 row-icon"
            />
            <span class="row-text">
              <strong>Statistics</strong>
              <span>Activity, harvests and achievements</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-5 chev"
            />
          </NuxtLink>
        </div>
        <p class="field-hint note">
          BudBuddy works offline and never uploads your journal. Export a backup now and then – uninstalling the app deletes its data.
        </p>
      </section>

      <section>
        <h2 class="group-title">
          Danger zone
        </h2>
        <div class="card list">
          <button
            type="button"
            class="row"
            @click="demo"
          >
            <UIcon
              name="i-tabler-flask-2"
              class="size-5 row-icon"
            />
            <span class="row-text">
              <strong>Load demo garden</strong>
              <span>Replace your data with example plants</span>
            </span>
          </button>
          <button
            type="button"
            class="row danger"
            @click="erase"
          >
            <UIcon
              name="i-tabler-trash"
              class="size-5 row-icon"
            />
            <span class="row-text">
              <strong>Erase all data</strong>
              <span>Start from an empty garden</span>
            </span>
          </button>
        </div>
      </section>

      <section class="about">
        <img
          src="/icon.webp"
          alt=""
          width="56"
          height="56"
        >
        <strong>BudBuddy {{ config.public.version }}</strong>
        <span>Grow journal · made with Nuxt &amp; Capacitor</span>
        <span class="legal">Only grow where it is legal for you to do so.</span>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pad {
  padding: 16px;
}

.group-title {
  margin: 0 0 8px 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-2);
}

.list {
  overflow: hidden;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
  text-decoration: none;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row:active:not(.static):not(:disabled) {
  background: var(--surface-2);
}

.row:disabled {
  opacity: 0.6;
}

.row-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.row.danger .row-icon,
.row.danger strong {
  color: #ff8080;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.row-text strong {
  font-size: 15px;
  font-weight: 600;
}

.row-text span {
  font-size: 13px;
  color: var(--text-2);
}

.chev {
  color: var(--text-3);
}

.note {
  margin: 8px 4px 0;
  line-height: 1.5;
}

.about {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0 8px;
  text-align: center;
  font-size: 13px;
  color: var(--text-2);
}

.about img {
  border-radius: 14px;
  margin-bottom: 6px;
}

.about strong {
  color: var(--text);
  font-size: 15px;
}

.legal {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-3);
}
</style>
