<script setup lang="ts">
import { checkBirth, COUNTRY_CODES, deviceCountry } from '~/utils/ageGate'
import { intlLocale } from '~/utils/locale'

const { t } = useI18n()
const { status, record, submit } = useAgeGate()
const legal = useLegal()

const names = new Intl.DisplayNames([intlLocale()], { type: 'region' })
const countryName = (code: string) => names.of(code) ?? code
const countries = computed(() => COUNTRY_CODES
  .map(code => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, intlLocale())))

const country = ref(deviceCountry(typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]) ?? '')
const day = ref('')
const month = ref('')
const year = ref('')
const invalid = ref(false)

const filled = computed(() => !!country.value && !!day.value && !!month.value && year.value.length === 4)
const blocked = computed(() => status.value === 'blocked')
const blockedText = computed(() => {
  const r = record.value
  return r ? t('age.blockedBody', { country: countryName(r.country), age: r.minAge }) : ''
})

async function onSubmit() {
  const birth = { y: Number(year.value), m: Number(month.value), d: Number(day.value) }
  invalid.value = checkBirth(birth, new Date()) !== 'ok'
  if (invalid.value) return
  await submit(country.value, birth)
  if (status.value === 'ok' && !legal.legal.value.country && (country.value === 'CZ' || country.value === 'DE')) {
    legal.update({ country: country.value === 'CZ' ? 'cz' : 'de' })
  }
}

for (const field of [day, month, year]) {
  watch(field, (v) => {
    const clean = v.replace(/\D/g, '')
    if (clean !== v) field.value = clean
  })
}
</script>

<template>
  <div
    class="gate"
    role="dialog"
    aria-modal="true"
    aria-labelledby="age-title"
  >
    <div
      v-if="blocked"
      class="body"
    >
      <img
        src="/icon.webp"
        alt=""
        width="64"
        height="64"
        class="icon"
      >
      <h1
        id="age-title"
        class="title"
      >
        {{ t('age.blockedTitle') }}
      </h1>
      <p class="lead">
        {{ blockedText }}
      </p>
      <p class="note">
        {{ t('age.blockedLater') }}
      </p>
    </div>

    <form
      v-else
      class="body"
      novalidate
      @submit.prevent="onSubmit"
    >
      <img
        src="/icon.webp"
        alt=""
        width="64"
        height="64"
        class="icon"
      >
      <h1
        id="age-title"
        class="title"
      >
        {{ t('age.title') }}
      </h1>
      <p class="lead">
        {{ t('age.lead') }}
      </p>

      <label class="field">
        <span class="field-label">{{ t('age.country') }}</span>
        <select
          v-model="country"
          class="input"
          autocomplete="country"
        >
          <option
            value=""
            disabled
          >{{ t('age.choose') }}</option>
          <option
            v-for="c in countries"
            :key="c.code"
            :value="c.code"
          >{{ c.name }}</option>
        </select>
      </label>

      <fieldset class="field birth">
        <legend class="field-label">
          {{ t('age.birth') }}
        </legend>
        <div class="date">
          <input
            v-model="day"
            maxlength="2"
            class="input"
            :class="{ invalid }"
            inputmode="numeric"
            autocomplete="bday-day"
            :placeholder="t('age.day')"
            :aria-label="t('age.day')"
            :aria-invalid="invalid"
          >
          <input
            v-model="month"
            maxlength="2"
            class="input"
            :class="{ invalid }"
            inputmode="numeric"
            autocomplete="bday-month"
            :placeholder="t('age.month')"
            :aria-label="t('age.month')"
            :aria-invalid="invalid"
          >
          <input
            v-model="year"
            maxlength="4"
            class="input year"
            :class="{ invalid }"
            inputmode="numeric"
            autocomplete="bday-year"
            :placeholder="t('age.year')"
            :aria-label="t('age.year')"
            :aria-invalid="invalid"
          >
        </div>
        <span
          v-if="invalid"
          class="field-error"
          role="alert"
        >{{ t('age.invalid') }}</span>
      </fieldset>

      <p class="field-hint">
        {{ t('age.privacy') }}
      </p>

      <button
        type="submit"
        class="btn btn-primary btn-block submit"
        :disabled="!filled"
      >
        {{ t('age.continue') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.gate {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  padding: calc(var(--safe-top) + 12px) 16px calc(var(--safe-bottom) + 16px);
  overflow-y: auto;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 420px;
  margin: auto;
  padding: 24px 0;
}

.icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius);
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.lead {
  margin: 0;
  color: var(--text-2);
}

.note {
  margin: 0;
  font-size: 14px;
  color: var(--text-3);
}

.birth {
  margin: 0;
  padding: 0;
  border: 0;
}

.birth legend {
  padding: 0;
  margin-bottom: 8px;
}

.date {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr;
  gap: 8px;
}

.submit {
  margin-top: 8px;
}
</style>
