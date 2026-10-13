<script setup lang="ts">
import { scheduleTitle, scheduleWeekFor, suggestedStrength, weekDoses } from '~/utils/feeding'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  /** preselected plants */
  plantIds?: string[]
  scheduleId?: string | null
}>()

const { t } = useI18n()
const grow = useGrow()
const feeding = useFeeding()
const { notify } = useNotify()

const growing = computed(() => grow.state.plants.filter(isGrowing))
const picked = ref<string[]>([])
const sid = ref('')
const strength = ref<number | ''>(100)
const waterL = ref<number | ''>(5)
const submitted = ref(false)

watch(open, (v) => {
  if (!v) return
  submitted.value = false
  picked.value = props.plantIds?.length ? [...props.plantIds] : []
  const first = picked.value[0] ? grow.getPlant(picked.value[0]) : undefined
  const plan = first ? feeding.planOf(first.id) : undefined
  sid.value = props.scheduleId ?? plan?.scheduleId ?? suggestedSchedule(first?.medium)
  strength.value = plan?.strength ?? suggestedStrength(first?.type ?? 'photoperiod')
  waterL.value = plan?.waterL ?? 5
}, { immediate: true })

function suggestedSchedule(medium?: string): string {
  const list = feeding.schedules.value
  return (list.find(s => s.media.includes(medium as never)) ?? list[0])?.id ?? ''
}

const schedule = computed(() => feeding.getSchedule(sid.value))
const hasAuto = computed(() => picked.value.some(id => grow.getPlant(id)?.type === 'autoflower'))
const toggle = (id: string) => {
  picked.value = picked.value.includes(id) ? picked.value.filter(x => x !== id) : [...picked.value, id]
}

const strengthOk = computed(() => typeof strength.value === 'number' && strength.value > 0 && strength.value <= 200)
const waterOk = computed(() => typeof waterL.value === 'number' && waterL.value > 0 && waterL.value <= 1000)

// preview for the first picked plant
const preview = computed(() => {
  const p = picked.value[0] ? grow.getPlant(picked.value[0]) : undefined
  const s = schedule.value
  if (!p || !s || !strengthOk.value || !waterOk.value) return null
  const cur = scheduleWeekFor(p, s)
  if (!cur) return { plant: p, label: t('kit.fill.noWeek'), doses: [] }
  return { plant: p, label: feedWeekLabel(cur.week.phase, cur.week.n), doses: weekDoses(s, cur.week, Number(strength.value), Number(waterL.value)) }
})

function save() {
  submitted.value = true
  if (!picked.value.length || !schedule.value || !strengthOk.value || !waterOk.value) return
  for (const id of picked.value) {
    feeding.setPlan(id, { scheduleId: sid.value, strength: Math.round(Number(strength.value)), waterL: Number(waterL.value) })
  }
  notify(t('kit.assign.saved', { n: picked.value.length }), { icon: 'i-tabler-flask' })
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('kit.assign.title')"
    icon-color="#b58cf5"
  >
    <template #icon>
      <GrowIcon name="feed" />
    </template>
    <form
      class="form-stack"
      novalidate
      @submit.prevent="save"
    >
      <div class="field">
        <span
          id="as-plants"
          class="field-label"
        >{{ t('kit.assign.plants') }}</span>
        <p
          v-if="!growing.length"
          class="field-hint"
        >
          {{ t('kit.assign.noPlants') }}
        </p>
        <div
          v-else
          class="pick-list"
          role="group"
          aria-labelledby="as-plants"
        >
          <button
            v-for="p in growing"
            :key="p.id"
            type="button"
            class="chip"
            :aria-pressed="picked.includes(p.id)"
            @click="toggle(p.id)"
          >
            {{ p.name }}
          </button>
        </div>
        <span
          v-if="submitted && !picked.length"
          class="field-error"
        >{{ t('kit.assign.pickPlant') }}</span>
      </div>

      <div class="field">
        <label
          class="field-label"
          for="as-schedule"
        >{{ t('kit.assign.schedule') }}</label>
        <select
          id="as-schedule"
          v-model="sid"
          class="input"
        >
          <option
            v-for="s in feeding.schedules.value"
            :key="s.id"
            :value="s.id"
          >
            {{ scheduleTitle(s) }}{{ s.custom ? ` · ${t('kit.custom')}` : '' }}
          </option>
        </select>
      </div>

      <div class="form-grid">
        <div class="field">
          <label
            class="field-label"
            for="as-strength"
          >{{ t('kit.assign.strength') }}</label>
          <div class="unit-field">
            <input
              id="as-strength"
              v-model.number="strength"
              class="input num"
              :class="{ invalid: submitted && !strengthOk }"
              type="number"
              inputmode="numeric"
              min="5"
              max="200"
              step="5"
            >
            <span aria-hidden="true">%</span>
          </div>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="as-water"
          >{{ t('kit.assign.water') }}</label>
          <div class="unit-field">
            <input
              id="as-water"
              v-model.number="waterL"
              class="input num"
              :class="{ invalid: submitted && !waterOk }"
              type="number"
              inputmode="decimal"
              min="0.1"
              step="any"
            >
            <span aria-hidden="true">L</span>
          </div>
        </div>
      </div>
      <p class="field-hint">
        {{ hasAuto ? t('kit.assign.autoHint') : t('kit.assign.strengthHint') }}
      </p>

      <div
        v-if="preview"
        class="preview"
        aria-live="polite"
      >
        <span class="preview-title">{{ t('kit.assign.preview', { name: preview.plant.name, week: preview.label }) }}</span>
        <ul v-if="preview.doses.length">
          <li
            v-for="d in preview.doses"
            :key="d.productId"
          >
            <span>{{ d.name }}</span>
            <span class="num">{{ formatNumber(d.perLitre, 2) }} {{ d.unit }}/L · <strong>{{ formatNumber(d.total, 1) }} {{ d.unit }}</strong></span>
          </li>
        </ul>
        <p
          v-else
          class="field-hint"
        >
          {{ t('kit.plainWater') }}
        </p>
      </div>
    </form>
    <template #footer>
      <button
        type="button"
        class="btn"
        @click="open = false"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!growing.length"
        @click="save"
      >
        {{ t('common.save') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.pick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.unit-field {
  position: relative;
}

.unit-field .input {
  padding-right: 40px;
}

.unit-field span {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--text-3);
  pointer-events: none;
}

.preview {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--well);
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.preview ul {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.preview li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 14px;
}

.preview li + li {
  border-top: 1px solid var(--line);
}

.preview li span:last-child {
  color: var(--text-2);
  white-space: nowrap;
}

.preview strong {
  color: var(--text);
  font-weight: 600;
}
</style>
