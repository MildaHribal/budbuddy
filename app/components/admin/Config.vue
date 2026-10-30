<script setup lang="ts">
import type { RemoteConfig } from '~/composables/useRemoteConfig'

const { t } = useI18n()
const { notify } = useNotify()
const remote = useRemoteConfig()

const form = reactive<RemoteConfig>({ ...remote.config.value })
const saving = ref(false)
onMounted(async () => {
  await remote.load(true)
  Object.assign(form, remote.config.value)
})

const URL_KEYS = ['pay_url', 'contact_url', 'donate_url'] as const
const badUrl = computed(() => URL_KEYS.some(k => form[k].trim() && !safeUrl(form[k])))

async function save() {
  if (badUrl.value) return notify(t('admin.config.badUrl'), { tone: 'error' })
  saving.value = true
  try {
    const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v).trim()])) as unknown as RemoteConfig
    await remote.save(trimmed)
    notify(t('admin.config.saved'))
  } catch {
    notify(t('admin.failed'), { tone: 'error' })
  } finally {
    saving.value = false
  }
}

const FIELDS: { key: keyof RemoteConfig, type: 'text' | 'url' | 'email' | 'area', max: number, hint?: string }[] = [
  { key: 'price', type: 'text', max: 40 },
  { key: 'pay_note', type: 'area', max: 2000, hint: 'payNoteHint' },
  { key: 'pay_url', type: 'url', max: 500 },
  { key: 'contact_email', type: 'email', max: 254, hint: 'contactEmailHint' },
  { key: 'contact_url', type: 'url', max: 500, hint: 'contactUrlHint' },
  { key: 'donate_url', type: 'url', max: 500 },
  { key: 'donate_note', type: 'area', max: 2000 }
]
const label = (k: string) => t(`admin.config.${k.replace(/_(\w)/g, (_, c: string) => c.toUpperCase())}`)
</script>

<template>
  <form
    class="stack"
    @submit.prevent="save"
  >
    <p class="field-hint">
      {{ t('admin.config.lead') }}
    </p>
    <div class="card pad form-stack">
      <div
        v-for="f in FIELDS"
        :key="f.key"
        class="field"
      >
        <label
          class="field-label"
          :for="`cfg-${f.key}`"
        >{{ label(f.key) }}</label>
        <textarea
          v-if="f.type === 'area'"
          :id="`cfg-${f.key}`"
          v-model="form[f.key]"
          class="input area"
          rows="4"
          :maxlength="f.max"
        />
        <input
          v-else
          :id="`cfg-${f.key}`"
          v-model="form[f.key]"
          class="input"
          :class="{ invalid: f.type === 'url' && form[f.key].trim() && !safeUrl(form[f.key]) }"
          :type="f.type"
          :maxlength="f.max"
          :inputmode="f.type === 'url' ? 'url' : undefined"
          autocapitalize="off"
          spellcheck="false"
        >
        <span
          v-if="f.hint"
          class="field-hint"
        >{{ t(`admin.config.${f.hint}`) }}</span>
      </div>
    </div>
    <button
      type="submit"
      class="btn btn-primary"
      :disabled="saving || !remote.loaded.value"
    >
      <UIcon
        :name="saving ? 'i-tabler-loader-2' : 'i-tabler-device-floppy'"
        :class="{ 'animate-spin': saving }"
      />{{ t('admin.config.save') }}
    </button>
    <NuxtLink
      to="/premium"
      class="btn btn-ghost"
    >
      {{ t('admin.config.preview') }}
    </NuxtLink>
  </form>
</template>

<style scoped>
.area {
  min-height: 96px;
  padding-top: 10px;
  resize: vertical;
}
</style>
