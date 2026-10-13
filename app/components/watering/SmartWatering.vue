<script setup lang="ts">
import type { Plant } from '~/types/grow'
import { wateringGaps } from '~/utils/watering'

// Watering interval line on the plant page + a sheet to switch smart / manual / off.
const props = defineProps<{ plant: Plant }>()

const { t } = useI18n()
const grow = useGrow()
const { notify } = useNotify()

const suggestion = computed(() => grow.wateringSuggestion(props.plant))
const status = computed(() => grow.wateringStatus(props.plant))
const smart = computed(() => !!props.plant.wateringAuto)
const reminderOff = computed(() => !smart.value && !props.plant.wateringInterval)
// a manual interval that the log clearly disagrees with
const differs = computed(() => !smart.value && !reminderOff.value && suggestion.value.source !== 'estimate'
  && suggestion.value.days !== props.plant.wateringInterval)

const recentGaps = computed(() => wateringGaps(grow.state.entries
  .filter(e => e.plantId === props.plant.id && (e.type === 'water' || e.type === 'feed'))
  .map(e => e.date)).slice(-6).map(g => g.days))

const explanation = computed(() => {
  const s = suggestion.value
  const pot = s.potLitres === null ? t('organize.water.potUnknown') : t('organize.water.pot', { l: formatNumber(s.potLitres, 1) })
  const ctx = { pot, medium: t(`plantForm.media.${props.plant.medium}`).toLowerCase(), stage: stageInfo(props.plant.stage).label.toLowerCase() }
  if (s.source === 'history') return t('organize.water.whyHistory', { n: s.samples, avg: formatNumber(s.learned ?? s.days, 1) })
  if (s.source === 'blend') return t('organize.water.whyBlend', { n: s.samples, avg: formatNumber(s.learned ?? s.days, 1), ...ctx, est: s.estimate })
  return t('organize.water.whyEstimate', ctx)
})

type Mode = 'smart' | 'manual' | 'off'
const sheetOpen = ref(false)
const mode = ref<Mode>('smart')
const manualDays = ref(3)

function openSheet() {
  mode.value = smart.value ? 'smart' : reminderOff.value ? 'off' : 'manual'
  manualDays.value = props.plant.wateringInterval ?? suggestion.value.days
  sheetOpen.value = true
}

function bump(d: number) {
  manualDays.value = Math.min(30, Math.max(1, manualDays.value + d))
}

function apply(next: Mode, days = manualDays.value) {
  if (next === 'smart') grow.updatePlant(props.plant.id, { wateringAuto: true, wateringInterval: suggestion.value.days })
  else if (next === 'manual') grow.updatePlant(props.plant.id, { wateringAuto: false, wateringInterval: days })
  else grow.updatePlant(props.plant.id, { wateringAuto: false, wateringInterval: null })
}

function save() {
  apply(mode.value)
  sheetOpen.value = false
  notify(t('organize.water.saved'))
}

function useSuggestion() {
  apply('smart')
  notify(t('organize.water.switched', { n: suggestion.value.days }))
}

const nextLabel = computed(() => (status.value ? formatDate(status.value.nextDate, { weekday: 'short', day: 'numeric', month: 'numeric' }) : ''))
</script>

<template>
  <div
    class="smart"
    :class="{ standalone: reminderOff }"
  >
    <p class="smart-line">
      <UIcon
        :name="smart ? 'i-tabler-sparkles' : 'i-tabler-calendar-repeat'"
        class="size-4 smart-icon"
        :class="{ on: smart }"
      />
      <span class="smart-text">
        <template v-if="smart">
          {{ t('organize.water.smartLine', { n: suggestion.days }) }}<template v-if="nextLabel">
            · {{ t('organize.water.next', { date: nextLabel }) }}
          </template>
        </template>
        <template v-else-if="reminderOff">
          {{ t('organize.water.offLine', { n: suggestion.days }) }}
        </template>
        <template v-else-if="differs">
          {{ t('organize.water.suggestLine', { n: suggestion.days, m: plant.wateringInterval ?? 0 }) }}
        </template>
        <template v-else>
          {{ t('organize.water.manualLine', { n: plant.wateringInterval ?? 0 }) }}
        </template>
      </span>
      <button
        v-if="differs"
        type="button"
        class="link"
        @click="useSuggestion"
      >
        {{ t('organize.water.use') }}
      </button>
      <button
        type="button"
        class="link"
        aria-haspopup="dialog"
        @click="openSheet"
      >
        {{ t('organize.water.adjust') }}
      </button>
    </p>

    <BottomSheet
      v-model:open="sheetOpen"
      :title="t('organize.water.title')"
      icon-color="var(--blue)"
    >
      <template #icon>
        <GrowIcon
          name="water"
          class="sheet-glyph"
        />
      </template>
      <div class="form-stack">
        <div class="suggest card">
          <span class="suggest-label">{{ t('organize.water.suggested') }}</span>
          <strong class="suggest-num num">{{ t('organize.water.every', { n: suggestion.days }) }}</strong>
          <p class="suggest-why">
            {{ explanation }}
          </p>
          <p
            v-if="recentGaps.length"
            class="suggest-gaps num"
          >
            {{ t('organize.water.gaps', { list: recentGaps.join(', ') }) }}
          </p>
          <p
            v-if="suggestion.irregular"
            class="suggest-warn"
          >
            {{ t('organize.water.irregular') }}
          </p>
        </div>

        <div
          class="segmented"
          role="group"
          :aria-label="t('organize.water.mode')"
        >
          <button
            v-for="m in (['smart', 'manual', 'off'] as const)"
            :key="m"
            type="button"
            :aria-pressed="mode === m"
            @click="mode = m"
          >
            {{ t(`organize.water.modes.${m}`) }}
          </button>
        </div>
        <p class="field-hint">
          {{ t(`organize.water.modeHint.${mode}`) }}
        </p>

        <div
          v-if="mode === 'manual'"
          class="field"
        >
          <span class="field-label">{{ t('organize.water.manualLabel') }}</span>
          <div class="stepper">
            <button
              type="button"
              class="icon-btn"
              :aria-label="t('organize.water.less')"
              :disabled="manualDays <= 1"
              @click="bump(-1)"
            >
              <UIcon
                name="i-tabler-minus"
                class="size-5"
              />
            </button>
            <output class="stepper-value num">{{ t('organize.water.every', { n: manualDays }) }}</output>
            <button
              type="button"
              class="icon-btn"
              :aria-label="t('organize.water.more')"
              :disabled="manualDays >= 30"
              @click="bump(1)"
            >
              <UIcon
                name="i-tabler-plus"
                class="size-5"
              />
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="sheetOpen = false"
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
  </div>
</template>

<style scoped>
.smart.standalone {
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.smart-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.smart-icon {
  flex-shrink: 0;
}

.smart-icon.on {
  color: var(--blue);
}

.smart-text {
  flex: 1;
  min-width: 0;
}

.smart-line .link {
  font-size: 13px;
  padding: 0;
}

.sheet-glyph {
  font-size: 26px;
}

.suggest {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  background: var(--well);
}

.suggest-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.suggest-num {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--blue);
}

.suggest-why,
.suggest-gaps,
.suggest-warn {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

.suggest-gaps {
  color: var(--text-3);
}

.suggest-warn {
  color: var(--amber);
}

.segmented button {
  min-height: 40px;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stepper-value {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
}

.stepper .icon-btn:disabled {
  opacity: 0.4;
}
</style>
