<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ sensorId: string }>()

const { t } = useI18n()
const envApi = useEnvironment()
const { notify } = useNotify()

const temp = ref<number | ''>('')
const rh = ref<number | ''>('')
const when = ref('')
const error = ref<string | null>(null)

const pad = (n: number) => String(n).padStart(2, '0')
function localNow() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

watch(open, (v) => {
  if (!v) return
  const last = envApi.latest(props.sensorId)
  temp.value = last?.c ?? ''
  rh.value = last?.h ?? ''
  when.value = localNow()
  error.value = null
})

function save() {
  const c = temp.value === '' ? null : Number(temp.value)
  const h = rh.value === '' ? null : Number(rh.value)
  if (c === null && h === null) {
    error.value = t('environment.reading.needOne')
    return
  }
  if ((c !== null && (c < -20 || c > 60)) || (h !== null && (h < 0 || h > 100))) {
    error.value = t('environment.reading.range')
    return
  }
  const at = Date.parse(when.value)
  envApi.addReading(props.sensorId, c, h, Number.isFinite(at) ? Math.min(at, Date.now()) : Date.now())
  notify(t('environment.reading.saved'))
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('environment.reading.title')"
    icon="measure"
    icon-color="#5fd9c4"
  >
    <form
      class="form-stack"
      novalidate
      @submit.prevent="save"
    >
      <div class="form-grid">
        <label class="field">
          <span class="field-label">{{ t('environment.reading.temp') }} (°C)</span>
          <input
            v-model.number="temp"
            class="input"
            type="number"
            inputmode="decimal"
            step="0.1"
            min="-20"
            max="60"
            @input="error = null"
          >
        </label>
        <label class="field">
          <span class="field-label">{{ t('environment.reading.rh') }} (%)</span>
          <input
            v-model.number="rh"
            class="input"
            type="number"
            inputmode="decimal"
            step="1"
            min="0"
            max="100"
            @input="error = null"
          >
        </label>
      </div>
      <label class="field">
        <span class="field-label">{{ t('environment.reading.when') }}</span>
        <input
          v-model="when"
          class="input"
          type="datetime-local"
          :max="localNow()"
        >
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
      >
        {{ t('environment.reading.save') }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.field-error {
  margin: 0;
}
</style>
