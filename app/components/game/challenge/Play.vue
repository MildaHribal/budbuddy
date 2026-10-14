<script setup lang="ts">
import { PRODUCTS, STRAINS, TREATMENTS } from '~~/shared/game/content/catalog'
import type { GameAction } from '~~/shared/game/types'
import { gameText, pct, STAGE_STYLE } from '~/utils/gameUi'
import { useChallengeRun } from './useChallengeRun'

const emit = defineEmits<{ clear: [] }>()
const { t } = useI18n()
const feedback = useGameFeedback()
const { run, state, plant, observation, visual, act } = useChallengeRun()

type Sheet = 'water' | 'train' | 'treat' | 'climate' | 'dry'
const sheet = ref<Sheet | null>(null)
const sheetOpen = computed({
  get: () => sheet.value !== null,
  set: (v) => {
    if (!v) sheet.value = null
  }
})

const strainName = computed(() => {
  const id = run.value?.def.strainId ?? ''
  return STRAINS.find(s => s.id === id)?.name ?? id
})
const tent = computed(() => state.value?.tents.find(x => x.id === plant.value?.tentId) ?? state.value?.tents[0] ?? null)
const stage = computed(() => plant.value?.stage ?? 'germination')
const stageColor = computed(() => STAGE_STYLE[stage.value].color)
const ageDays = computed(() => observation.value?.ageDays ?? Math.max(0, Math.floor(((state.value?.nowH ?? 0) - (plant.value?.sownAtH ?? 0)) / 24)))
const health = computed(() => pct(observation.value?.health ?? plant.value?.health ?? 0))
const growing = computed(() => !!plant.value && !plant.value.dead && !['harvested', 'dead'].includes(plant.value.stage))
const canFlip = computed(() => growing.value && plant.value?.genome.kind === 'photo' && stage.value === 'veg' && (tent.value?.lightHours ?? 12) > 12)
const canHarvest = computed(() => growing.value && (stage.value === 'flower' || stage.value === 'ripening'))
const batches = computed(() => (state.value?.drying ?? []).filter(b => !b.done))
const jars = computed(() => (state.value?.jars ?? []).filter(j => !j.done))

const readings = computed(() => {
  const r = observation.value?.readings
  if (!r) return []
  const out: string[] = []
  if (r.ph != null) out.push(`pH ${r.ph.toFixed(1)}`)
  if (r.ec != null) out.push(`EC ${r.ec.toFixed(1)}`)
  if (r.tempC != null) out.push(`${Math.round(r.tempC)} °C`)
  if (r.rh != null) out.push(`${Math.round(r.rh)} % RH`)
  if (r.vpd != null) out.push(`VPD ${r.vpd.toFixed(2)}`)
  return out
})

function run1(action: GameAction, ok?: string) {
  const r = act(action)
  return feedback(r, ok)
}

// ── water ──
const LITERS = [0.5, 1, 2, 3, 5]
const DOSES = [0.5, 1, 2]
const liters = ref(1)
const ph = ref(6.4)
const dose = ref(1)
const picked = ref<string[]>([])
const stocked = computed(() => PRODUCTS.filter(p => (state.value?.inventory[p.id] ?? 0) > 0))
const phValid = computed(() => Number.isFinite(ph.value) && ph.value >= 4 && ph.value <= 8.5)

function openWater() {
  ph.value = plant.value?.medium === 'soil' ? 6.4 : 5.9
  picked.value = picked.value.filter(id => stocked.value.some(p => p.id === id))
  sheet.value = 'water'
}
function togglePick(id: string) {
  picked.value = picked.value.includes(id) ? picked.value.filter(x => x !== id) : [...picked.value, id]
}
function water() {
  if (!plant.value || !phValid.value) return
  const feed = picked.value.map(productId => ({ productId, mlPerL: dose.value }))
  if (run1({ t: 'water', plantId: plant.value.id, liters: liters.value, ph: Math.round(ph.value * 10) / 10, feed }, t('gameChallenge.play.watered'))) sheet.value = null
}

// ── train / treat ──
function train(kind: 'top' | 'lst' | 'defoliate') {
  if (plant.value && run1({ t: 'train', plantId: plant.value.id, kind }, t('gameChallenge.trainSheet.done'))) sheet.value = null
}
const treatments = computed(() => TREATMENTS.filter(x => x.unlockLevel <= (state.value?.level ?? 1)))
function treat(id: string, price: number) {
  if (!plant.value) return
  // free treatments (price 0) are plain actions without stock
  if (price > 0 && (state.value?.inventory[id] ?? 0) < 1 && !run1({ t: 'buy', itemId: id, qty: 1 })) return
  if (run1({ t: 'treat', plantId: plant.value.id, treatmentId: id })) sheet.value = null
}

// ── climate (tent) and drying room (batch) share the two fields ──
const tempC = ref(24)
const rh = ref(55)
const dryBatch = ref<string | null>(null)
const climateValid = computed(() => Number.isFinite(tempC.value) && tempC.value >= 10 && tempC.value <= 40 && Number.isFinite(rh.value) && rh.value >= 20 && rh.value <= 90)
function openClimate() {
  tempC.value = tent.value?.climate.tempC ?? 24
  rh.value = tent.value?.climate.rh ?? 55
  sheet.value = 'climate'
}
function openDry(id: string) {
  const b = batches.value.find(x => x.id === id)
  dryBatch.value = id
  tempC.value = b?.tempC ?? 18
  rh.value = b?.rh ?? 60
  sheet.value = 'dry'
}
function saveClimate() {
  if (!climateValid.value) return
  const ok = sheet.value === 'dry' && dryBatch.value
    ? run1({ t: 'dry', batchId: dryBatch.value, tempC: tempC.value, rh: rh.value }, t('gameChallenge.climateSheet.saved'))
    : tent.value && run1({ t: 'climate', tentId: tent.value.id, tempC: tempC.value, rh: rh.value }, t('gameChallenge.climateSheet.saved'))
  if (ok) sheet.value = null
}

const sheetTitle = computed(() => ({
  water: t('gameChallenge.water.title'),
  train: t('gameChallenge.trainSheet.title'),
  treat: t('gameChallenge.treatSheet.title'),
  climate: t('gameChallenge.climateSheet.title'),
  dry: t('gameChallenge.drying.set')
})[sheet.value ?? 'water'])
</script>

<template>
  <section
    v-if="state"
    class="play card"
    :aria-label="t('gameChallenge.play.title')"
  >
    <div
      v-if="plant"
      class="plant-head"
    >
      <GameThumb
        :visual="visual"
        :size="112"
        :label="strainName"
      />
      <div class="plant-text">
        <div class="name-row">
          <h3>{{ strainName }}</h3>
          <span class="coins num">{{ t('gameChallenge.play.coins', { n: state.coins }) }}</span>
        </div>
        <div class="meta-row">
          <span
            class="badge stage"
            :style="{ color: stageColor }"
          >{{ t(`gameChallenge.stage.${stage}`) }}</span>
          <span class="day num">{{ t('gameChallenge.play.day', { n: ageDays + 1 }) }}</span>
        </div>
        <template v-if="growing">
          <div
            class="progress"
            role="meter"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="health"
            :aria-label="t('gameChallenge.play.health', { n: health })"
          >
            <div :style="{ width: `${health}%` }" />
          </div>
          <p class="sub">
            {{ t('gameChallenge.play.health', { n: health }) }}<template v-if="observation">
              , {{ t(`gameChallenge.play.pot.${observation.potFeel}`).toLowerCase() }}
            </template>
          </p>
        </template>
      </div>
    </div>

    <div
      v-if="plant?.dead"
      class="row dead"
    >
      <p>{{ t('gameChallenge.play.dead') }}</p>
      <button
        type="button"
        class="btn btn-danger"
        @click="emit('clear')"
      >
        {{ t('gameChallenge.play.clear') }}
      </button>
    </div>

    <div
      v-if="growing"
      class="row"
    >
      <p class="label">
        {{ t('gameChallenge.play.signs') }}
      </p>
      <ul
        v-if="observation?.signs.length"
        class="signs"
      >
        <template
          v-for="sign in observation.signs"
          :key="sign.key"
        >
          <li
            v-for="(line, i) in sign.lines"
            :key="`${sign.key}-${i}`"
            :class="sign.phase"
          >
            {{ gameText(line) }}
          </li>
        </template>
      </ul>
      <p
        v-else
        class="sub"
      >
        {{ t('gameChallenge.play.noSigns') }}
      </p>
      <p
        v-if="readings.length"
        class="readings"
      >
        <span class="sr-only">{{ t('gameChallenge.play.readings') }}: </span>
        <span
          v-for="r in readings"
          :key="r"
          class="reading num"
        >{{ r }}</span>
      </p>
    </div>

    <div
      v-if="growing"
      class="row actions"
    >
      <button
        type="button"
        class="btn btn-primary water"
        @click="openWater"
      >
        <GrowIcon name="water" />{{ t('gameChallenge.play.water') }}
      </button>
      <button
        type="button"
        class="btn"
        @click="plant && run1({ t: 'flush', plantId: plant.id }, t('gameChallenge.play.flushed'))"
      >
        {{ t('gameChallenge.play.flush') }}
      </button>
      <button
        type="button"
        class="btn"
        @click="sheet = 'train'"
      >
        <GrowIcon name="train" />{{ t('gameChallenge.play.train') }}
      </button>
      <button
        type="button"
        class="btn"
        @click="sheet = 'treat'"
      >
        <GrowIcon name="pest" />{{ t('gameChallenge.play.treat') }}
      </button>
      <button
        type="button"
        class="btn"
        @click="openClimate"
      >
        <GrowIcon name="measure" />{{ t('gameChallenge.play.climate') }}
      </button>
      <button
        v-if="canFlip && tent"
        type="button"
        class="btn btn-lamp"
        @click="run1({ t: 'flip', tentId: tent.id })"
      >
        <GrowIcon name="lamp" />{{ t('gameChallenge.play.flip') }}
      </button>
      <button
        v-if="canHarvest && plant"
        type="button"
        class="btn btn-lamp"
        @click="run1({ t: 'harvest', plantId: plant.id })"
      >
        <GrowIcon name="harvest" />{{ t('gameChallenge.play.harvest') }}
      </button>
    </div>

    <div
      v-for="b in batches"
      :key="b.id"
      class="row stage-row"
    >
      <div class="stage-line">
        <span class="label">{{ t('gameChallenge.drying.title') }}</span>
        <span class="sub num">{{ t('gameChallenge.drying.moisture', { n: pct(b.moisture) }) }}</span>
      </div>
      <div
        class="progress dry"
        aria-hidden="true"
      >
        <div :style="{ width: `${100 - pct(b.moisture)}%` }" />
      </div>
      <div class="pair">
        <button
          type="button"
          class="btn"
          @click="openDry(b.id)"
        >
          {{ t('gameChallenge.drying.set') }}
        </button>
        <button
          type="button"
          class="btn btn-soft"
          @click="run1({ t: 'jar', batchId: b.id })"
        >
          {{ t('gameChallenge.drying.jar') }}
        </button>
      </div>
    </div>

    <div
      v-for="j in jars"
      :key="j.id"
      class="row stage-row"
    >
      <div class="stage-line">
        <span class="label">{{ t('gameChallenge.jars.title') }}</span>
        <span class="sub num">{{ t('gameChallenge.jars.rh', { n: Math.round(j.jarRh) }) }}</span>
      </div>
      <div class="pair">
        <button
          type="button"
          class="btn"
          @click="run1({ t: 'burp', jarId: j.id }, t('gameChallenge.jars.burped'))"
        >
          {{ t('gameChallenge.jars.burp') }}
        </button>
        <button
          type="button"
          class="btn btn-soft"
          @click="run1({ t: 'finishCure', jarId: j.id })"
        >
          {{ t('gameChallenge.jars.finish') }}
        </button>
      </div>
    </div>

    <BottomSheet
      v-model:open="sheetOpen"
      :title="sheetTitle"
    >
      <div
        v-if="sheet === 'water'"
        class="form-stack"
      >
        <div class="field">
          <span class="field-label">{{ t('gameChallenge.water.liters') }}</span>
          <div
            class="segmented"
            role="group"
            :aria-label="t('gameChallenge.water.liters')"
          >
            <button
              v-for="l in LITERS"
              :key="l"
              type="button"
              :aria-pressed="liters === l"
              @click="liters = l"
            >
              {{ t('gameChallenge.water.litersValue', { n: l }) }}
            </button>
          </div>
        </div>
        <label class="field">
          <span class="field-label">{{ t('gameChallenge.water.ph') }}</span>
          <input
            v-model.number="ph"
            class="input"
            :class="{ invalid: !phValid }"
            type="number"
            inputmode="decimal"
            min="4"
            max="8.5"
            step="0.1"
          >
        </label>
        <div class="field">
          <span class="field-label">{{ t('gameChallenge.water.feed') }}</span>
          <div
            v-if="stocked.length"
            class="chips wrap"
          >
            <button
              v-for="p in stocked"
              :key="p.id"
              type="button"
              class="chip"
              :aria-pressed="picked.includes(p.id)"
              @click="togglePick(p.id)"
            >
              {{ gameText(p.name) }}
            </button>
          </div>
          <span
            v-else
            class="field-hint"
          >{{ t('gameChallenge.water.noFeed') }}</span>
        </div>
        <div
          v-if="picked.length"
          class="field"
        >
          <span class="field-label">{{ t('gameChallenge.water.dose') }}</span>
          <div
            class="segmented"
            role="group"
            :aria-label="t('gameChallenge.water.dose')"
          >
            <button
              v-for="d in DOSES"
              :key="d"
              type="button"
              :aria-pressed="dose === d"
              @click="dose = d"
            >
              {{ t('gameChallenge.water.doseValue', { n: d }) }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-else-if="sheet === 'train'"
        class="list"
      >
        <button
          v-for="k in (['top', 'lst', 'defoliate'] as const)"
          :key="k"
          type="button"
          class="btn btn-block list-btn"
          @click="train(k)"
        >
          {{ t(`gameChallenge.trainSheet.${k}`) }}
        </button>
      </div>

      <div
        v-else-if="sheet === 'treat'"
        class="list"
      >
        <p
          v-if="!treatments.length"
          class="sub"
        >
          {{ t('gameChallenge.treatSheet.none') }}
        </p>
        <div
          v-for="x in treatments"
          :key="x.id"
          class="treat-row"
        >
          <div class="treat-text">
            <span class="treat-name">{{ gameText(x.name) }}</span>
            <span class="sub">{{ gameText(x.blurb) }}</span>
            <span
              v-if="x.price"
              class="sub num"
            >{{ (state.inventory[x.id] ?? 0) > 0 ? t('gameChallenge.treatSheet.owned', { n: state.inventory[x.id] ?? 0 }) : t('gameChallenge.treatSheet.price', { n: x.price }) }}</span>
          </div>
          <button
            type="button"
            class="btn btn-soft"
            @click="treat(x.id, x.price)"
          >
            {{ t('gameChallenge.treatSheet.apply') }}
          </button>
        </div>
      </div>

      <div
        v-else
        class="form-grid"
      >
        <label class="field">
          <span class="field-label">{{ t('gameChallenge.climateSheet.temp') }}</span>
          <input
            v-model.number="tempC"
            class="input"
            :class="{ invalid: !climateValid }"
            type="number"
            inputmode="decimal"
            min="10"
            max="40"
          >
        </label>
        <label class="field">
          <span class="field-label">{{ t('gameChallenge.climateSheet.rh') }}</span>
          <input
            v-model.number="rh"
            class="input"
            :class="{ invalid: !climateValid }"
            type="number"
            inputmode="numeric"
            min="20"
            max="90"
          >
        </label>
      </div>

      <template
        v-if="sheet === 'water' || sheet === 'climate' || sheet === 'dry'"
        #footer
      >
        <button
          v-if="sheet === 'water'"
          type="button"
          class="btn btn-primary"
          :disabled="!phValid"
          @click="water"
        >
          {{ t('gameChallenge.water.confirm') }}
        </button>
        <button
          v-else
          type="button"
          class="btn btn-primary"
          :disabled="!climateValid"
          @click="saveClimate"
        >
          {{ sheet === 'dry' ? t('gameChallenge.drying.set') : t('gameChallenge.climateSheet.save') }}
        </button>
      </template>
    </BottomSheet>
  </section>
</template>

<style scoped>
.play {
  padding: 0;
  overflow: hidden;
}

.plant-head {
  display: flex;
  gap: 14px;
  padding: 14px;
}

.plant-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name-row,
.meta-row,
.stage-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.meta-row {
  justify-content: flex-start;
}

h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coins {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
}

.stage {
  background: color-mix(in srgb, currentColor 16%, var(--surface));
}

.day {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid var(--line);
}

.label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.signs {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.signs li {
  font-size: 15px;
  line-height: 1.45;
}

.signs li.severe {
  color: var(--red);
}

.readings {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}

.reading {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--well);
  border: 1px solid var(--line);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.actions .btn {
  gap: 8px;
  padding: 0 12px;
}

.actions .water {
  grid-column: 1 / -1;
}

.dead p {
  margin: 0;
  font-size: 15px;
  color: var(--text-2);
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.progress.dry > div {
  background: var(--amber);
}

.chips.wrap {
  flex-wrap: wrap;
  overflow: visible;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-btn {
  justify-content: flex-start;
}

.treat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}

.treat-row:first-of-type {
  border-top: 0;
}

.treat-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.treat-name {
  font-size: 15px;
  font-weight: 600;
}
</style>
