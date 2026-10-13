<script setup lang="ts">
import type { DryCheck, Plant, StemTest } from '~/types/grow'
import { DRY_TARGET, dryingAdvice, dryingDay, dryRhBand, tempBand } from '~/utils/curing'

const props = defineProps<{ plant: Plant }>()

const { t } = useI18n()
const grow = useGrow()
const care = useCare()
const { notify } = useNotify()
const today = useToday()

const start = computed(() => props.plant.harvest?.date ?? props.plant.stageHistory.at(-1)?.date ?? today.value)
const day = computed(() => dryingDay(start.value, today.value))
const checks = computed(() => care.checksFor(props.plant.id))
const todayCheck = computed(() => checks.value.find(c => c.date === today.value) ?? null)
const latest = computed(() => checks.value[0] ?? null)
const advice = computed(() => dryingAdvice(latest.value, day.value))
const ready = computed(() => latest.value?.stem === 'snaps')
const percent = computed(() => Math.min(100, (day.value / DRY_TARGET.daysMax) * 100))

const STEMS: StemTest[] = ['bends', 'cracks', 'snaps']

const sheet = ref(false)
const form = reactive({ id: '' as string, date: '', tempC: '' as number | '', humidity: '' as number | '', stem: null as StemTest | null, note: '' })
const submitted = ref(false)

function openCheck(c: DryCheck | null = todayCheck.value) {
  submitted.value = false
  Object.assign(form, c
    ? { id: c.id, date: c.date, tempC: c.tempC ?? '', humidity: c.humidity ?? '', stem: c.stem, note: c.note }
    : { id: '', date: today.value, tempC: latest.value?.tempC ?? '', humidity: '', stem: null, note: '' })
  sheet.value = true
}

const toNum = (v: number | '') => (v === '' || Number.isNaN(v) ? null : Number(v))
const rhError = computed(() => {
  const v = toNum(form.humidity)
  return v !== null && (v < 0 || v > 100)
})

function save() {
  submitted.value = true
  if (rhError.value) return
  care.saveCheck({
    id: form.id || undefined,
    plantId: props.plant.id,
    date: form.date,
    tempC: toNum(form.tempC),
    humidity: toNum(form.humidity),
    stem: form.stem,
    note: form.note.trim()
  })
  sheet.value = false
  notify(t('care.dry.saved'), { icon: 'i-tabler-check' })
}

function remove() {
  if (!form.id) return
  care.deleteCheck(form.id)
  sheet.value = false
  notify(t('care.dry.deleted'), { tone: 'info' })
}

function toJars() {
  grow.setStage(props.plant.id, 'curing')
}

const band = (b: 'low' | 'ok' | 'high' | null) => (b === null ? 'empty' : b === 'ok' ? 'in' : 'out')
</script>

<template>
  <section
    class="card care"
    :aria-label="t('care.dry.title')"
  >
    <div class="care-head">
      <span
        class="care-tile"
        aria-hidden="true"
      ><GrowIcon name="drying" /></span>
      <div class="care-title">
        <h2>{{ t('care.dry.day', { n: day }) }}</h2>
        <p>{{ t('care.dry.target') }}</p>
      </div>
    </div>
    <div
      class="progress"
      role="presentation"
    >
      <div :style="{ width: `${percent}%` }" />
    </div>

    <dl class="targets">
      <div :data-state="band(tempBand(latest?.tempC ?? null))">
        <dt>{{ t('care.dry.temp') }}</dt>
        <dd class="num">
          {{ latest?.tempC != null ? `${formatNumber(latest.tempC)} °C` : t('care.dry.tempTarget') }}
        </dd>
        <span class="num">{{ t('care.dry.targets') }} {{ t('care.dry.tempTarget') }}</span>
      </div>
      <div :data-state="band(dryRhBand(latest?.humidity ?? null))">
        <dt>{{ t('care.dry.rh') }}</dt>
        <dd class="num">
          {{ latest?.humidity != null ? `${formatNumber(latest.humidity, 0)} %` : t('care.dry.rhTarget') }}
        </dd>
        <span class="num">{{ t('care.dry.targets') }} {{ t('care.dry.rhTarget') }}</span>
      </div>
      <div>
        <dt>{{ t('care.dry.stemLabel') }}</dt>
        <dd>{{ latest?.stem ? t(`care.dry.stem.${latest.stem}`) : '–' }}</dd>
        <span>{{ t('care.dry.targets') }} {{ t('care.dry.stem.snaps').toLowerCase() }}</span>
      </div>
    </dl>

    <ul
      class="advice"
      aria-live="polite"
    >
      <li
        v-for="a in advice"
        :key="a"
        :class="{ warn: ['tooHumid', 'tooDry', 'tooWarm', 'tooCold', 'slow', 'tooFast'].includes(a), good: a === 'ready' }"
      >
        <UIcon
          :name="a === 'ready' ? 'i-tabler-circle-check' : ['tooHumid', 'tooDry', 'tooWarm', 'tooCold', 'slow', 'tooFast'].includes(a) ? 'i-tabler-alert-triangle' : 'i-tabler-info-circle'"
          class="size-[18px] shrink-0"
        />
        <span>{{ t(`care.dry.advice.${a}`) }}</span>
      </li>
    </ul>

    <p
      v-if="!todayCheck"
      class="care-note"
    >
      {{ t('care.dry.noCheck') }}
    </p>

    <div class="care-actions">
      <button
        v-if="ready"
        type="button"
        class="btn btn-primary"
        @click="toJars"
      >
        <GrowIcon name="curing" /> {{ t('care.dry.toJars') }}
      </button>
      <button
        type="button"
        class="btn"
        :class="ready ? '' : 'btn-soft'"
        @click="openCheck()"
      >
        <UIcon
          :name="todayCheck ? 'i-tabler-pencil' : 'i-tabler-clipboard-check'"
          class="size-5"
        /> {{ todayCheck ? t('care.dry.todayCheck') : t('care.dry.logCheck') }}
      </button>
    </div>

    <details
      v-if="checks.length"
      class="history"
    >
      <summary>
        {{ t('care.dry.history') }} <span class="num">{{ checks.length }}</span>
        <UIcon
          name="i-tabler-chevron-down"
          class="size-4 chev"
        />
      </summary>
      <ul>
        <li
          v-for="c in checks.slice(0, 10)"
          :key="c.id"
        >
          <button
            type="button"
            @click="openCheck(c)"
          >
            <span class="h-date">{{ formatRelativeDay(c.date) }}</span>
            <span class="h-vals num">
              {{ [c.tempC != null ? `${formatNumber(c.tempC)} °C` : '', c.humidity != null ? `${formatNumber(c.humidity, 0)} %` : '', c.stem ? t(`care.dry.stem.${c.stem}`) : ''].filter(Boolean).join(' · ') || c.note || '–' }}
            </span>
          </button>
        </li>
      </ul>
    </details>

    <BottomSheet
      v-model:open="sheet"
      :title="t('care.dry.sheetTitle')"
      icon="i-tabler-clipboard-check"
    >
      <form
        class="form-stack"
        novalidate
        @submit.prevent="save"
      >
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="dc-temp"
            >{{ t('care.dry.temp') }}</label>
            <div class="unit-input">
              <input
                id="dc-temp"
                v-model.number="form.tempC"
                class="input num"
                type="number"
                inputmode="decimal"
                step="any"
                :placeholder="formatNumber(19)"
              >
              <span
                class="unit"
                aria-hidden="true"
              >°C</span>
            </div>
          </div>
          <div class="field">
            <label
              class="field-label"
              for="dc-rh"
            >{{ t('care.dry.rh') }}</label>
            <div class="unit-input">
              <input
                id="dc-rh"
                v-model.number="form.humidity"
                class="input num"
                :class="{ invalid: submitted && rhError }"
                type="number"
                inputmode="decimal"
                min="0"
                max="100"
                step="any"
                placeholder="58"
              >
              <span
                class="unit"
                aria-hidden="true"
              >%</span>
            </div>
            <span
              v-if="submitted && rhError"
              class="field-error"
            >{{ t('care.cure.invalidRh') }}</span>
          </div>
        </div>

        <div class="field">
          <span
            id="dc-stem"
            class="field-label"
          >{{ t('care.dry.stemLabel') }}</span>
          <div
            class="segmented"
            role="group"
            aria-labelledby="dc-stem"
          >
            <button
              v-for="s in STEMS"
              :key="s"
              type="button"
              :aria-pressed="form.stem === s"
              @click="form.stem = form.stem === s ? null : s"
            >
              {{ t(`care.dry.stem.${s}`) }}
            </button>
          </div>
          <span class="field-hint">{{ form.stem ? t(`care.dry.stemHint.${form.stem}`) : t('care.dry.stemHint.snaps') }}</span>
        </div>

        <div class="field">
          <label
            class="field-label"
            for="dc-note"
          >{{ t('care.dry.note') }}</label>
          <textarea
            id="dc-note"
            v-model="form.note"
            class="input"
            rows="2"
            :placeholder="t('care.dry.notePh')"
          />
        </div>
      </form>
      <template #footer>
        <button
          v-if="form.id"
          type="button"
          class="btn btn-danger sheet-icon-btn"
          :aria-label="t('common.delete')"
          @click="remove"
        >
          <UIcon
            name="i-tabler-trash"
            class="size-5"
          />
        </button>
        <button
          type="button"
          class="btn"
          @click="sheet = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="save"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>
  </section>
</template>

<style scoped src="./care.css"></style>
