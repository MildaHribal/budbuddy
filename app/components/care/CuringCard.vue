<script setup lang="ts">
import type { CureJar, Plant } from '~/types/grow'
import { burpStatus, cureDay, curePhase, jarRhState, latestReading, nextJarLabel, type CurePhase } from '~/utils/curing'
import { intlLocale } from '~/utils/locale'

const props = defineProps<{ plant: Plant }>()

const { t } = useI18n()
const grow = useGrow()
const care = useCare()
const { notify } = useNotify()
const { confirm } = useConfirm()
const today = useToday()

// re-evaluate "burp now" every minute while the card is visible
const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (now.value = new Date()), 60_000)
})
onBeforeUnmount(() => clearInterval(timer))
watch(today, () => (now.value = new Date()))

const jars = computed(() => care.jarsFor(props.plant.id))
const active = computed(() => jars.value.filter(j => !j.doneDate))
const cureStart = computed(() => props.plant.stageHistory.findLast(h => h.stage === 'curing')?.date ?? today.value)
const firstJar = computed(() => active.value[0]?.startDate ?? jars.value[0]?.startDate ?? cureStart.value)
const dayN = computed(() => cureDay({ startDate: firstJar.value }, today.value))
const phase = computed<CurePhase>(() => curePhase(dayN.value))
const PHASES: CurePhase[] = ['daily3', 'daily', 'twiceWeekly', 'weekly']
const totalG = computed(() => Math.round(jars.value.reduce((s, j) => s + (j.weightG ?? 0), 0) * 10) / 10)
const offerDryWeight = computed(() => totalG.value > 0 && props.plant.harvest && props.plant.harvest.dryWeight == null)

function rows() {
  return jars.value.map((j) => {
    const reading = latestReading(j)
    return {
      jar: j,
      status: burpStatus(j, now.value),
      reading,
      state: reading ? jarRhState(reading.humidity) : null
    }
  })
}
const jarRows = computed(rows)

function when(d: Date): string {
  const time = d.toLocaleTimeString(intlLocale(), { hour: 'numeric', minute: '2-digit' })
  const day = toISODate(d)
  const diff = daysBetween(today.value, day)
  if (diff === 0) return time
  if (diff === 1) return `${t('care.cure.tomorrow')} ${time}`
  return `${d.toLocaleDateString(intlLocale(), { weekday: 'short' })} ${time}`
}

function quickBurp(j: CureJar) {
  care.burp(j.id)
  now.value = new Date()
  notify(t('care.cure.burpedToast', { label: j.label }), { icon: 'i-tabler-check' })
}

// ── Jar sheet ───────────────────────────────────────────────────────
const sheet = ref(false)
const editing = ref<CureJar | null>(null)
const form = reactive({ label: '', weightG: '' as number | '', startDate: '', reading: '' as number | '' })
const readingError = ref(false)

function openJar(j: CureJar | null) {
  editing.value = j
  readingError.value = false
  Object.assign(form, j
    ? { label: j.label, weightG: j.weightG ?? '', startDate: j.startDate, reading: '' }
    : { label: nextJarLabel(jars.value), weightG: '', startDate: today.value, reading: '' })
  sheet.value = true
}

const toNum = (v: number | '') => (v === '' || Number.isNaN(v) ? null : Number(v))
const sheetJar = computed(() => (editing.value ? jars.value.find(j => j.id === editing.value!.id) ?? null : null))
const sheetReading = computed(() => (sheetJar.value ? latestReading(sheetJar.value) : null))

function saveReading(): boolean {
  const v = toNum(form.reading)
  if (v === null) return true
  if (v < 0 || v > 100) {
    readingError.value = true
    return false
  }
  readingError.value = false
  if (sheetJar.value) {
    care.addReading(sheetJar.value.id, v)
    form.reading = ''
  }
  return true
}

function saveJar() {
  const label = form.label.trim() || nextJarLabel(jars.value)
  const patch = { label, weightG: toNum(form.weightG), startDate: isValidISODate(form.startDate) ? form.startDate : today.value }
  if (sheetJar.value) {
    if (!saveReading()) return
    care.updateJar(sheetJar.value.id, patch)
  } else {
    const v = toNum(form.reading)
    if (v !== null && (v < 0 || v > 100)) {
      readingError.value = true
      return
    }
    const j = care.addJar({ plantId: props.plant.id, ...patch })
    if (v !== null) care.addReading(j.id, v)
  }
  sheet.value = false
  notify(t('care.cure.jarSaved'))
}

function addReadingOnly() {
  if (toNum(form.reading) === null) return
  if (saveReading()) notify(t('care.cure.readingSaved'))
}

function burpInSheet() {
  if (!sheetJar.value) return
  care.burp(sheetJar.value.id)
  now.value = new Date()
  notify(t('care.cure.burpedToast', { label: sheetJar.value.label }), { icon: 'i-tabler-check' })
}

function toggleDone() {
  const j = sheetJar.value
  if (!j) return
  care.updateJar(j.id, { doneDate: j.doneDate ? null : today.value })
}

async function removeJar() {
  const j = sheetJar.value
  if (!j) return
  const ok = await confirm({ title: t('care.cure.deleteTitle', { label: j.label }), message: t('care.cure.deleteText'), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  care.deleteJar(j.id)
  sheet.value = false
  notify(t('care.cure.jarDeleted'), { tone: 'info' })
}

function useAsDry() {
  grow.updateHarvest(props.plant.id, { dryWeight: totalG.value })
  notify(t('care.cure.dryWeightSet'))
}

const sheetState = computed(() => {
  const v = toNum(form.reading)
  if (v !== null && v >= 0 && v <= 100) return jarRhState(v)
  return sheetReading.value ? jarRhState(sheetReading.value.humidity) : null
})
</script>

<template>
  <section
    class="card care"
    style="--tone: #f2b544"
    :aria-label="t('care.cure.title')"
  >
    <div class="care-head">
      <span
        class="care-tile"
        aria-hidden="true"
      ><GrowIcon name="curing" /></span>
      <div class="care-title">
        <h2>{{ t('care.cure.week', { n: Math.floor(dayN / 7) + 1 }) }}</h2>
        <p>{{ t(`care.cure.phase.${phase}`) }}</p>
      </div>
    </div>

    <EmptyState
      v-if="!jars.length"
      icon="curing"
      :title="t('care.cure.noJarsTitle')"
      :text="t('care.cure.noJarsText')"
    />

    <ul
      v-else
      class="jars"
    >
      <li
        v-for="r in jarRows"
        :key="r.jar.id"
        class="jar"
        :class="{ done: !!r.jar.doneDate }"
      >
        <button
          type="button"
          class="jar-main"
          @click="openJar(r.jar)"
        >
          <span class="jar-name">{{ r.jar.label }}<span
            v-if="r.jar.weightG != null"
            class="num"
          > · {{ formatNumber(r.jar.weightG) }} g</span></span>
          <span class="jar-sub">
            <span
              v-if="r.reading"
              class="rh num"
              :data-state="r.state"
            >{{ t('care.cure.lastRh', { v: formatNumber(r.reading.humidity, 0) }) }} · {{ t(`care.cure.rhState.${r.state}`) }}</span>
            <span v-else>{{ t('care.cure.noRh') }}</span>
          </span>
          <span
            class="jar-burp num"
            :class="{ due: r.status.due }"
          >
            <template v-if="r.jar.doneDate">{{ t('care.cure.finished', { date: formatDate(r.jar.doneDate, { day: 'numeric', month: 'short' }) }) }}</template>
            <template v-else-if="r.status.due">{{ t('care.cure.burpNow') }}</template>
            <template v-else-if="r.status.next">{{ t('care.cure.next', { when: when(r.status.next) }) }}</template>
            <template v-else>{{ t('care.cure.noMore') }}</template>
          </span>
        </button>
        <button
          v-if="!r.jar.doneDate && (r.status.due || r.status.next)"
          type="button"
          class="icon-btn burp-btn"
          :class="{ accent: r.status.due }"
          :aria-label="`${t('care.cure.burped')}: ${r.jar.label}`"
          @click="quickBurp(r.jar)"
        >
          <UIcon
            name="i-tabler-check"
            class="size-5"
          />
        </button>
      </li>
    </ul>

    <p
      v-for="r in jarRows.filter(x => x.state && x.state !== 'ideal' && !x.jar.doneDate)"
      :key="`a-${r.jar.id}`"
      class="advice-line"
      :class="{ warn: r.state === 'wet' || r.state === 'damp' || r.state === 'dry' }"
    >
      <UIcon
        name="i-tabler-alert-triangle"
        class="size-[18px] shrink-0"
      />
      <span><strong>{{ r.jar.label }}:</strong> {{ t(`care.cure.advice.${r.state}`) }}</span>
    </p>

    <div
      v-if="jars.length"
      class="cure-meta"
    >
      <span class="num">{{ t('care.cure.inJars', { g: formatNumber(totalG) }) }} · {{ t('care.cure.target') }}</span>
      <button
        v-if="offerDryWeight"
        type="button"
        class="link"
        @click="useAsDry"
      >
        {{ t('care.cure.useAsDry') }}
      </button>
    </div>

    <div class="care-actions">
      <button
        type="button"
        class="btn btn-soft"
        @click="openJar(null)"
      >
        <UIcon
          name="i-tabler-plus"
          class="size-5"
        /> {{ t('care.cure.addJar') }}
      </button>
    </div>

    <details class="history">
      <summary>
        {{ t('care.cure.schedule') }}
        <UIcon
          name="i-tabler-chevron-down"
          class="size-4 chev"
        />
      </summary>
      <ol class="phases">
        <li
          v-for="p in PHASES"
          :key="p"
          :class="{ current: p === phase }"
        >
          {{ t(`care.cure.phase.${p}`) }}
        </li>
      </ol>
      <p class="care-note">
        {{ t('care.cure.ready') }}
      </p>
    </details>

    <BottomSheet
      v-model:open="sheet"
      :title="sheetJar ? t('care.cure.jarTitle', { label: sheetJar.label }) : t('care.cure.newJar')"
      icon="i-tabler-bottle"
    >
      <form
        class="form-stack"
        novalidate
        @submit.prevent="saveJar"
      >
        <div
          v-if="sheetJar && !sheetJar.doneDate"
          class="sheet-burp"
        >
          <span class="num">{{ t('care.cure.burpLog', { n: sheetJar.burps.length }) }}</span>
          <button
            type="button"
            class="btn btn-soft"
            @click="burpInSheet"
          >
            <UIcon
              name="i-tabler-check"
              class="size-5"
            /> {{ t('care.cure.burped') }}
          </button>
        </div>

        <div class="field">
          <label
            class="field-label"
            for="jar-rh"
          >{{ t('care.cure.reading') }}</label>
          <div class="reading-row">
            <div class="unit-input">
              <input
                id="jar-rh"
                v-model.number="form.reading"
                class="input num"
                :class="{ invalid: readingError }"
                type="number"
                inputmode="decimal"
                min="0"
                max="100"
                step="any"
                :placeholder="sheetReading ? formatNumber(sheetReading.humidity, 0) : '62'"
              >
              <span
                class="unit"
                aria-hidden="true"
              >%</span>
            </div>
            <button
              v-if="sheetJar"
              type="button"
              class="btn"
              :disabled="form.reading === ''"
              @click="addReadingOnly"
            >
              {{ t('care.cure.saveReading') }}
            </button>
          </div>
          <span
            v-if="readingError"
            class="field-error"
          >{{ t('care.cure.invalidRh') }}</span>
          <span
            v-else-if="sheetState"
            class="field-hint"
          >{{ t(`care.cure.rhState.${sheetState}`) }}: {{ t(`care.cure.advice.${sheetState}`) }}</span>
          <span
            v-else
            class="field-hint"
          >{{ t('care.cure.target') }}</span>
        </div>

        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="jar-label"
            >{{ t('care.cure.label') }}</label>
            <input
              id="jar-label"
              v-model="form.label"
              class="input"
              maxlength="40"
              :placeholder="t('care.cure.labelPh')"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="jar-weight"
            >{{ t('care.cure.weight') }}</label>
            <div class="unit-input">
              <input
                id="jar-weight"
                v-model.number="form.weightG"
                class="input num"
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
              >
              <span
                class="unit"
                aria-hidden="true"
              >g</span>
            </div>
          </div>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="jar-date"
          >{{ t('care.cure.filled') }}</label>
          <input
            id="jar-date"
            v-model="form.startDate"
            class="input num"
            type="date"
            :max="today"
          >
        </div>

        <div
          v-if="sheetJar?.readings.length"
          class="readings"
        >
          <span class="field-label">{{ t('care.cure.readings') }}</span>
          <ol>
            <li
              v-for="(rd, i) in [...sheetJar.readings].reverse().slice(0, 6)"
              :key="i"
              class="num"
            >
              <span>{{ formatDate(toISODate(new Date(rd.at)), { day: 'numeric', month: 'short' }) }}</span>
              <strong :data-state="jarRhState(rd.humidity)">{{ formatNumber(rd.humidity, 0) }} %</strong>
            </li>
          </ol>
        </div>

        <div
          v-if="sheetJar"
          class="sheet-links"
        >
          <button
            type="button"
            class="link"
            @click="toggleDone"
          >
            {{ sheetJar.doneDate ? t('care.cure.reopen') : t('care.cure.finish') }}
          </button>
          <button
            type="button"
            class="link danger"
            @click="removeJar"
          >
            {{ t('care.cure.delete') }}
          </button>
        </div>
      </form>
      <template #footer>
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
          @click="saveJar"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>
  </section>
</template>

<style scoped src="./care.css"></style>

<style scoped>
.jars {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  overflow: hidden;
}

.jar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 8px;
}

.jar + .jar {
  border-top: 1px solid var(--line);
}

.jar-main {
  flex: 1;
  min-width: 0;
  min-height: 60px;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: "name burp" "sub burp";
  align-items: center;
  column-gap: 8px;
  row-gap: 2px;
  padding: 8px 4px 8px 12px;
  border: 0;
  background: none;
  color: var(--text);
  text-align: left;
}

.jar-name {
  grid-area: name;
  font-size: 15px;
  font-weight: 600;
}

.jar-name .num {
  font-weight: 400;
  color: var(--text-2);
}

.jar-sub {
  grid-area: sub;
  font-size: 12px;
  color: var(--text-3);
}

.rh[data-state="ideal"] {
  color: var(--green);
}

.rh[data-state="high"],
.rh[data-state="low"] {
  color: var(--text-2);
}

.rh[data-state="wet"],
.rh[data-state="damp"],
.rh[data-state="dry"] {
  color: var(--amber);
}

.jar-burp {
  grid-area: burp;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  text-align: right;
}

.jar-burp.due {
  color: var(--amber);
}

.jar.done .jar-name {
  color: var(--text-2);
}

.burp-btn {
  flex-shrink: 0;
}

.advice-line {
  display: flex;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-2);
}

.advice-line .iconify {
  margin-top: 1px;
  color: var(--text-3);
}

.advice-line.warn .iconify {
  color: var(--amber);
}

.advice-line strong {
  color: var(--text);
  font-weight: 600;
}

.cure-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  font-size: 13px;
  color: var(--text-2);
}

.phases {
  margin: 0;
  padding: 8px 0 8px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--text-3);
  border-top: 1px solid var(--line);
}

.phases li.current {
  color: var(--text);
  font-weight: 600;
}

.sheet-burp {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: var(--text-2);
}

.reading-row {
  display: flex;
  gap: 8px;
}

.reading-row .unit-input {
  flex: 1;
}

.readings ol {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
}

.readings li {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text-2);
}

.readings li + li {
  border-top: 1px solid var(--line);
}

.readings strong {
  font-weight: 600;
  color: var(--text);
}

.readings strong[data-state="ideal"] {
  color: var(--green);
}

.readings strong[data-state="wet"],
.readings strong[data-state="damp"],
.readings strong[data-state="dry"] {
  color: var(--amber);
}

.sheet-links {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.link.danger {
  color: var(--red);
}
</style>
