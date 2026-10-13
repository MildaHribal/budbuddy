<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ initialName?: string }>()

const { t } = useI18n()
const { user } = useAuth()
const { notify } = useNotify()

const DOMS = ['indica', 'sativa', 'hybrid'] as const
const draft = reactive({
  name: '',
  breeder: '',
  dominance: null as 'indica' | 'sativa' | 'hybrid' | null,
  flowering: 'photo' as 'auto' | 'photo',
  min: '' as number | '',
  max: '' as number | '',
  description: ''
})
const busy = ref(false)

watch(open, (v) => {
  if (!v) return
  Object.assign(draft, { name: props.initialName?.trim() ?? '', breeder: '', dominance: null, flowering: 'photo', min: '', max: '', description: '' })
})

const weeksOk = (w: number | '') => w === '' || (Number.isInteger(w) && w >= 4 && w <= 20)
const valid = computed(() => {
  const n = draft.name.trim()
  return n.length >= 2 && n.length <= 60 && strainSlug(n).length >= 2 && weeksOk(draft.min) && weeksOk(draft.max)
    && (draft.min === '' || draft.max === '' || draft.min <= draft.max)
})

async function submit() {
  if (!valid.value || busy.value || !user.value) return
  busy.value = true
  const { error } = await useSupabase().from('strains').insert({
    slug: strainSlug(draft.name),
    name: draft.name.trim(),
    breeder: draft.breeder.trim() || null,
    dominance: draft.dominance,
    flowering: draft.flowering,
    flowering_weeks_min: draft.min === '' ? null : draft.min,
    flowering_weeks_max: draft.max === '' ? null : draft.max,
    description: draft.description.trim() || null,
    created_by: user.value.id,
    approved: false
  })
  busy.value = false
  if (error) {
    const blocked = contentBlockedKey(error)
    notify(blocked ? t(`strains.blocked.${blocked}`) : error.code === '23505' ? t('strains.exists') : error.code === 'P0001' ? t('strains.rateLimited') : t('strains.failed'), { tone: 'error' })
    return
  }
  open.value = false
  notify(t('strains.suggested'))
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('strains.suggestTitle')"
    icon="flowering"
    icon-color="var(--green)"
  >
    <form
      id="strain-suggest"
      class="form-stack"
      @submit.prevent="submit"
    >
      <p class="muted intro">
        {{ t('strains.suggestText') }}
      </p>
      <label class="field">
        <span class="field-label">{{ t('strains.name') }}</span>
        <input
          v-model="draft.name"
          class="input"
          maxlength="60"
          autocomplete="off"
          lang="en"
        >
      </label>
      <label class="field">
        <span class="field-label">{{ t('strains.breederOptional') }}</span>
        <input
          v-model="draft.breeder"
          class="input"
          maxlength="60"
          autocomplete="off"
        >
      </label>
      <div class="field">
        <span class="field-label">{{ t('strains.type') }}</span>
        <div class="segmented">
          <button
            v-for="d in DOMS"
            :key="d"
            type="button"
            :aria-pressed="draft.dominance === d"
            @click="draft.dominance = draft.dominance === d ? null : d"
          >
            <UIcon
              :name="dominanceIcon(d)"
              class="dom-icon"
            />{{ t(`strains.dominance.${d}`) }}
          </button>
        </div>
        <div class="segmented">
          <button
            type="button"
            :aria-pressed="draft.flowering === 'photo'"
            @click="draft.flowering = 'photo'"
          >
            {{ t('strains.floweringLong.photo') }}
          </button>
          <button
            type="button"
            :aria-pressed="draft.flowering === 'auto'"
            @click="draft.flowering = 'auto'"
          >
            {{ t('strains.floweringLong.auto') }}
          </button>
        </div>
      </div>
      <div class="form-grid">
        <label class="field">
          <span class="field-label">{{ t('strains.weeksMin') }}</span>
          <input
            v-model.number="draft.min"
            class="input"
            :class="{ invalid: !weeksOk(draft.min) }"
            type="number"
            inputmode="numeric"
            min="4"
            max="20"
          >
        </label>
        <label class="field">
          <span class="field-label">{{ t('strains.weeksMax') }}</span>
          <input
            v-model.number="draft.max"
            class="input"
            :class="{ invalid: !weeksOk(draft.max) }"
            type="number"
            inputmode="numeric"
            min="4"
            max="20"
          >
        </label>
      </div>
      <label class="field">
        <span class="field-label">{{ t('strains.description') }}</span>
        <textarea
          v-model="draft.description"
          class="input"
          maxlength="1200"
          rows="3"
          lang="en"
          :placeholder="t('strains.descriptionPlaceholder')"
        />
        <span class="field-hint">{{ t('strains.english') }}</span>
      </label>
      <p class="rule">
        <UIcon name="i-tabler-ban" />{{ t('strains.noSale') }}
      </p>
    </form>
    <template #footer>
      <button
        type="submit"
        form="strain-suggest"
        class="btn btn-primary"
        :disabled="!valid || busy"
      >
        {{ t('strains.send') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.dom-icon {
  margin-right: 4px;
  font-size: 15px;
  opacity: 0.8;
}

.intro {
  margin: 0;
  font-size: 14px;
}

.field .segmented + .segmented {
  margin-top: 4px;
}

.segmented button {
  font-size: 13px;
}

.rule {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
}
</style>
