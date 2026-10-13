<script setup lang="ts">
import type { FeedPhase, FeedSchedule } from '~/types/kit'
import { createId } from '~/utils/id'
import { FEED_PHASES } from '~/utils/kitSchema'
import { sortedWeeks } from '~/utils/feeding'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ draft: FeedSchedule | null }>()
const emit = defineEmits<{ saved: [schedule: FeedSchedule] }>()

const { t } = useI18n()
const feeding = useFeeding()
const { notify } = useNotify()

const form = ref<FeedSchedule>({ id: '', brand: '', line: '', media: [], products: [], weeks: [], custom: true })
const submitted = ref(false)

watch(open, (v) => {
  if (!v || !props.draft) return
  submitted.value = false
  const d: FeedSchedule = JSON.parse(JSON.stringify(props.draft))
  d.weeks = sortedWeeks(d)
  if (!d.products.length) d.products.push({ id: createId(), name: '' })
  if (!d.weeks.length) d.weeks.push({ phase: 'veg', n: 1, doses: {}, ec: null })
  form.value = d
}, { immediate: true })

const without = (o: Record<string, number>, key: string) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== key))

const MEDIA = ['soil', 'coco', 'hydro'] as const
function toggleMedium(m: typeof MEDIA[number]) {
  const list = form.value.media
  form.value.media = list.includes(m) ? list.filter(x => x !== m) : [...list, m]
}

function addProduct() {
  form.value.products.push({ id: createId(), name: '' })
}
function removeProduct(id: string) {
  form.value.products = form.value.products.filter(p => p.id !== id)
  for (const w of form.value.weeks) w.doses = without(w.doses, id)
}

function renumber() {
  const count: Partial<Record<FeedPhase, number>> = {}
  form.value.weeks = sortedWeeks({ weeks: form.value.weeks.map((w, i) => ({ ...w, n: i })) })
    .map(w => ({ ...w, n: (count[w.phase] = (count[w.phase] ?? 0) + 1) }))
}

function addWeek() {
  const last = form.value.weeks[form.value.weeks.length - 1]
  form.value.weeks.push({ phase: last?.phase ?? 'veg', n: 99, doses: { ...(last?.doses ?? {}) }, ec: last?.ec ?? null })
  renumber()
}
function removeWeek(i: number) {
  form.value.weeks.splice(i, 1)
  renumber()
}

function setDose(i: number, productId: string, v: string) {
  const n = Number(v.replace(',', '.'))
  const w = form.value.weeks[i]
  if (!w) return
  w.doses = v === '' || !Number.isFinite(n) || n <= 0 ? without(w.doses, productId) : { ...w.doses, [productId]: n }
}

function setEc(i: number, v: string) {
  const n = Number(v.replace(',', '.'))
  const w = form.value.weeks[i]
  if (w) w.ec = v === '' || !Number.isFinite(n) || n < 0 ? null : n
}

const named = computed(() => form.value.products.filter(p => p.name.trim()))
const errors = computed(() => ({
  brand: !form.value.brand.trim(),
  products: !named.value.length,
  weeks: !form.value.weeks.length
}))

function save() {
  submitted.value = true
  if (Object.values(errors.value).some(Boolean)) return
  const s = feeding.saveCustom({ ...form.value, products: named.value })
  notify(t('kit.editor.saved'))
  emit('saved', s)
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('kit.editor.title')"
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
      <div class="form-grid">
        <div class="field">
          <label
            class="field-label"
            for="se-brand"
          >{{ t('kit.editor.brand') }}</label>
          <input
            id="se-brand"
            v-model="form.brand"
            class="input"
            :class="{ invalid: submitted && errors.brand }"
            maxlength="60"
            :placeholder="t('kit.editor.brandPlaceholder')"
          >
        </div>
        <div class="field">
          <label
            class="field-label"
            for="se-line"
          >{{ t('kit.editor.line') }}</label>
          <input
            id="se-line"
            v-model="form.line"
            class="input"
            maxlength="60"
            :placeholder="t('common.optional')"
          >
        </div>
      </div>
      <span
        v-if="submitted && errors.brand"
        class="field-error"
      >{{ t('kit.editor.brandError') }}</span>

      <div class="field">
        <span class="field-label">{{ t('kit.editor.media') }}</span>
        <div class="chips">
          <button
            v-for="m in MEDIA"
            :key="m"
            type="button"
            class="chip"
            :aria-pressed="form.media.includes(m)"
            @click="toggleMedium(m)"
          >
            {{ t(`kit.media.${m}`) }}
          </button>
        </div>
      </div>

      <div class="field">
        <span class="field-label">{{ t('kit.editor.products') }}</span>
        <div
          v-for="(p, i) in form.products"
          :key="p.id"
          class="product-row"
        >
          <input
            v-model="p.name"
            class="input"
            maxlength="60"
            :placeholder="t('kit.editor.productPlaceholder')"
            :aria-label="t('kit.editor.productName', { n: i + 1 })"
          >
          <button
            type="button"
            class="icon-btn danger"
            :aria-label="t('kit.editor.removeProduct', { n: i + 1 })"
            @click="removeProduct(p.id)"
          >
            <UIcon
              name="i-tabler-x"
              class="size-4"
            />
          </button>
        </div>
        <button
          type="button"
          class="btn btn-soft"
          @click="addProduct"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-4"
          /> {{ t('kit.editor.addProduct') }}
        </button>
        <span
          v-if="submitted && errors.products"
          class="field-error"
        >{{ t('kit.editor.productsError') }}</span>
      </div>

      <div class="field">
        <span class="field-label">{{ t('kit.editor.weeks') }}</span>
        <span class="field-hint">{{ t('kit.editor.weeksHint') }}</span>
        <div
          v-for="(w, i) in form.weeks"
          :key="i"
          class="week card"
        >
          <div class="week-head">
            <select
              v-model="w.phase"
              class="input"
              :aria-label="t('kit.editor.phaseOf', { n: i + 1 })"
              @change="renumber"
            >
              <option
                v-for="ph in FEED_PHASES"
                :key="ph"
                :value="ph"
              >
                {{ t(`kit.phase.${ph}`) }}
              </option>
            </select>
            <span class="week-n num">{{ t('kit.weekN', { n: w.n }) }}</span>
            <button
              type="button"
              class="icon-btn danger"
              :aria-label="t('kit.editor.removeWeek', { week: feedWeekLabel(w.phase, w.n) })"
              @click="removeWeek(i)"
            >
              <UIcon
                name="i-tabler-trash"
                class="size-4"
              />
            </button>
          </div>
          <div class="doses">
            <label
              v-for="p in named"
              :key="p.id"
              class="dose"
            >
              <span>{{ p.name }} <small>{{ p.unit === 'g' ? 'g/L' : 'ml/L' }}</small></span>
              <input
                class="input num"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.1"
                :value="w.doses[p.id] ?? ''"
                placeholder="0"
                @input="setDose(i, p.id, ($event.target as HTMLInputElement).value)"
              >
            </label>
            <label class="dose">
              <span>EC <small>mS/cm</small></span>
              <input
                class="input num"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.1"
                :value="w.ec ?? ''"
                :placeholder="t('common.optional')"
                @input="setEc(i, ($event.target as HTMLInputElement).value)"
              >
            </label>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-soft"
          @click="addWeek"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-4"
          /> {{ t('kit.editor.addWeek') }}
        </button>
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
        @click="save"
      >
        {{ t('common.save') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.product-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.week {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.week-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.week-head select {
  flex: 1;
}

.week-n {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  white-space: nowrap;
}

.doses {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.dose {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}

.dose span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dose small {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-3);
}
</style>
