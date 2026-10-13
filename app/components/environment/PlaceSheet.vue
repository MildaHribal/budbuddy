<script setup lang="ts">
import { geocodeUrl, parseGeocode, validCoords, type GeoResult } from '~/utils/env/weather'

const open = defineModel<boolean>('open', { default: false })

const { t, locale } = useI18n()
const envApi = useEnvironment()
const { notify } = useNotify()

const manual = ref(false)
const query = ref('')
const results = shallowRef<GeoResult[]>([])
const status = ref<'idle' | 'searching' | 'empty' | 'failed'>('idle')
const name = ref('')
const lat = ref<number | ''>('')
const lon = ref<number | ''>('')
const coordsError = ref(false)

watch(open, (v) => {
  if (!v) return
  manual.value = false
  query.value = ''
  results.value = []
  status.value = 'idle'
  name.value = ''
  lat.value = ''
  lon.value = ''
  coordsError.value = false
})

let seq = 0
async function search() {
  const q = query.value.trim()
  if (q.length < 2) return
  const mine = ++seq
  status.value = 'searching'
  try {
    const res = await fetch(geocodeUrl(q, locale.value))
    if (!res.ok) throw new Error(String(res.status))
    const list = parseGeocode(await res.json())
    if (mine !== seq) return
    results.value = list
    status.value = list.length ? 'idle' : 'empty'
  } catch {
    if (mine === seq) status.value = 'failed'
  }
}
const debounced = useDebounceFn(search, 450)
watch(query, (q) => {
  if (q.trim().length >= 2) debounced()
  else {
    results.value = []
    status.value = 'idle'
  }
})

function pick(g: GeoResult) {
  const place = envApi.addPlace(g)
  notify(t('environment.place.added', { name: place.name }))
  open.value = false
}

function addManual() {
  const la = Number(lat.value)
  const lo = Number(lon.value)
  if (lat.value === '' || lon.value === '' || !validCoords(la, lo)) {
    coordsError.value = true
    return
  }
  pick({ name: name.value.trim(), detail: '', lat: la, lon: lo })
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('environment.place.title')"
    icon="i-tabler-map-pin"
    icon-color="var(--blue)"
  >
    <div
      v-if="!manual"
      class="form-stack"
    >
      <label class="field">
        <span class="field-label">{{ t('environment.place.search') }}</span>
        <input
          v-model="query"
          class="input"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          :placeholder="t('environment.place.searchPlaceholder')"
          @keydown.enter.prevent="search"
        >
        <span class="field-hint">{{ t('environment.place.searchHint') }}</span>
      </label>

      <p
        v-if="status === 'searching'"
        class="state muted"
        role="status"
      >
        {{ t('environment.place.searching') }}
      </p>
      <p
        v-else-if="status === 'empty'"
        class="state muted"
        role="status"
      >
        {{ t('environment.place.noResults') }}
      </p>
      <p
        v-else-if="status === 'failed'"
        class="state field-error"
        role="alert"
      >
        {{ t('environment.place.searchFailed') }}
      </p>

      <ul
        v-if="results.length"
        class="card results"
      >
        <li
          v-for="(r, i) in results"
          :key="i"
        >
          <button
            type="button"
            class="result"
            @click="pick(r)"
          >
            <UIcon
              name="i-tabler-map-pin"
              class="size-5 result-icon"
            />
            <span class="result-text">
              <span class="result-name">{{ r.name }}</span>
              <span
                v-if="r.detail"
                class="result-detail"
              >{{ r.detail }}</span>
            </span>
          </button>
        </li>
      </ul>

      <button
        type="button"
        class="link"
        @click="manual = true"
      >
        {{ t('environment.place.manual') }}
      </button>
    </div>

    <form
      v-else
      class="form-stack"
      novalidate
      @submit.prevent="addManual"
    >
      <label class="field">
        <span class="field-label">{{ t('environment.place.name') }}</span>
        <input
          v-model="name"
          class="input"
          maxlength="40"
          :placeholder="t('environment.place.namePlaceholder')"
        >
      </label>
      <div class="form-grid">
        <label class="field">
          <span class="field-label">{{ t('environment.place.lat') }}</span>
          <input
            v-model.number="lat"
            class="input"
            :class="{ invalid: coordsError }"
            type="number"
            inputmode="decimal"
            step="0.01"
            min="-90"
            max="90"
            @input="coordsError = false"
          >
        </label>
        <label class="field">
          <span class="field-label">{{ t('environment.place.lon') }}</span>
          <input
            v-model.number="lon"
            class="input"
            :class="{ invalid: coordsError }"
            type="number"
            inputmode="decimal"
            step="0.01"
            min="-180"
            max="180"
            @input="coordsError = false"
          >
        </label>
      </div>
      <p
        :class="coordsError ? 'field-error' : 'field-hint'"
        :role="coordsError ? 'alert' : undefined"
      >
        {{ coordsError ? t('environment.place.invalid') : t('environment.place.coordsHint') }}
      </p>
      <button
        type="submit"
        class="btn btn-primary btn-block"
      >
        {{ t('environment.place.add') }}
      </button>
      <button
        type="button"
        class="link"
        @click="manual = false"
      >
        {{ t('environment.place.backToSearch') }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.state {
  margin: 0;
  font-size: 13px;
}

.results {
  list-style: none;
  margin: 0;
  padding: 0;
}

.results li + li {
  border-top: 1px solid var(--line);
}

.result {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 8px 14px;
  background: none;
  border: 0;
  color: inherit;
  text-align: left;
  font: inherit;
}

.result:active {
  transform: scale(0.985);
}

.result-icon {
  color: var(--text-3);
  flex: none;
}

.result-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.result-name {
  font-weight: 600;
}

.result-detail {
  font-size: 12px;
  color: var(--text-3);
}

.link {
  align-self: flex-start;
}

.field-hint,
.field-error {
  margin: 0;
}
</style>
