<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { todayISO } from '~/utils/date'

// Storage problems the grower must know about: unreadable data, a set-aside copy, failed saves.
const { loadError, recovered, saveError, rawCopy, dismissRecovery } = useGrow()
const { t } = useI18n()
const { notify } = useNotify()
const exporting = ref(false)

async function exportCopy() {
  if (exporting.value) return
  exporting.value = true
  try {
    const raw = await rawCopy()
    if (raw == null) return
    const filename = `budbuddy-unreadable-${todayISO()}.json`
    if (Capacitor.isNativePlatform()) {
      const [{ Directory, Encoding, Filesystem }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
      const { uri } = await Filesystem.writeFile({ path: filename, data: raw, directory: Directory.Cache, encoding: Encoding.UTF8 })
      await Share.share({ title: filename, files: [uri] })
    } else {
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  } catch (e) {
    // closing the share sheet rejects too
    if (!/cancel/i.test(String((e as Error)?.message ?? e))) notify(t('common.recovered.exportFailed'), { tone: 'error' })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div
    v-if="loadError"
    class="data-alert"
    role="alert"
  >
    <strong>{{ t('common.loadError') }}</strong>
    {{ t('common.loadErrorHint') }} ({{ loadError }})
  </div>
  <div
    v-else-if="recovered"
    class="data-alert"
    role="alert"
  >
    <strong>{{ t('common.recovered.title') }}</strong>
    {{ t('common.recovered.text') }}
    <span class="data-actions">
      <button
        type="button"
        class="btn btn-soft"
        :disabled="exporting"
        @click="exportCopy"
      >
        {{ t('common.recovered.export') }}
      </button>
      <button
        type="button"
        class="btn btn-ghost"
        @click="dismissRecovery"
      >
        {{ t('common.recovered.dismiss') }}
      </button>
    </span>
  </div>
  <div
    v-if="saveError && !loadError"
    class="data-alert"
    role="alert"
  >
    <strong>{{ t('common.saveError.title') }}</strong>
    {{ t('common.saveError.text') }}
    <span class="data-actions">
      <NuxtLink
        to="/settings"
        class="btn btn-soft"
      >
        {{ t('common.saveError.action') }}
      </NuxtLink>
    </span>
  </div>
</template>

<style scoped>
.data-alert {
  padding: calc(10px + var(--safe-top)) 16px 10px;
  background: var(--danger-soft);
  border-bottom: 1px solid var(--line);
  color: var(--red);
  font-size: 13px;
  line-height: 1.4;
}

.data-alert + .data-alert {
  padding-top: 10px;
}

.data-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
</style>
