<script setup lang="ts">
import type { PhenoHunt } from '~/types/grow'

// Create a pheno hunt, or edit its name, strain, seed source and candidates.
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  hunt?: PhenoHunt | null
  /** plants to start with (new hunt) */
  initialIds?: string[]
}>()
const emit = defineEmits<{ saved: [id: string] }>()

const { t } = useI18n()
const grow = useGrow()
const { notify } = useNotify()
const { addHunt, updateHunt, setCandidates } = useHunts()
const formId = useId()

const form = reactive({ name: '', strain: '', source: '' })
const picked = ref<string[]>([])
const showAll = ref(false)
const submitted = ref(false)

const strains = computed(() => [...new Set(grow.state.plants.map(p => p.strain.trim()).filter(Boolean))].sort())

watch(open, (v) => {
  if (!v) return
  submitted.value = false
  showAll.value = false
  const h = props.hunt
  if (h) {
    Object.assign(form, { name: h.name, strain: h.strain, source: h.source })
    picked.value = h.candidates.map(c => c.plantId)
    return
  }
  picked.value = (props.initialIds ?? []).filter(id => grow.getPlant(id))
  const first = picked.value.map(id => grow.getPlant(id)?.strain.trim()).find(Boolean) ?? ''
  Object.assign(form, { name: first ? t('hunts.form.defaultName', { strain: first }) : '', strain: first, source: '' })
}, { immediate: true })

// same strain first; everything else on request
const choices = computed(() => {
  const all = grow.state.plants.filter(p => !p.archived || picked.value.includes(p.id))
  if (showAll.value || !form.strain.trim()) return all
  const same = sameStrain(all, form.strain)
  return [...same, ...all.filter(p => picked.value.includes(p.id) && !same.includes(p))]
})

const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = t('hunts.form.nameRequired')
  if (picked.value.length < 2) e.plants = t('hunts.form.minPlants')
  return e
})

function save() {
  submitted.value = true
  if (Object.keys(errors.value).length) return
  const data = { name: form.name.trim(), strain: form.strain.trim(), source: form.source.trim() }
  let id: string
  if (props.hunt) {
    updateHunt(props.hunt.id, data)
    setCandidates(props.hunt.id, picked.value)
    id = props.hunt.id
    notify(t('hunts.form.updated'))
  } else {
    id = addHunt({ ...data, plantIds: picked.value }).id
    notify(t('hunts.form.created'), { icon: 'i-tabler-dna-2' })
  }
  emit('saved', id)
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="hunt ? t('hunts.form.editTitle') : t('hunts.form.newTitle')"
    icon="i-tabler-dna-2"
  >
    <form
      :id="formId"
      class="form-stack"
      novalidate
      @submit.prevent="save"
    >
      <div class="field">
        <label
          class="field-label"
          :for="`${formId}-name`"
        >{{ t('hunts.form.name') }}</label>
        <input
          :id="`${formId}-name`"
          v-model="form.name"
          class="input"
          :class="{ invalid: submitted && errors.name }"
          maxlength="60"
          :placeholder="t('hunts.form.namePlaceholder')"
        >
        <span
          v-if="submitted && errors.name"
          class="field-error"
        >{{ errors.name }}</span>
      </div>
      <div class="form-grid">
        <div class="field">
          <label
            class="field-label"
            :for="`${formId}-strain`"
          >{{ t('hunts.form.strain') }}</label>
          <input
            :id="`${formId}-strain`"
            v-model="form.strain"
            class="input"
            maxlength="60"
            :list="`${formId}-strains`"
          >
          <datalist :id="`${formId}-strains`">
            <option
              v-for="s in strains"
              :key="s"
              :value="s"
            />
          </datalist>
        </div>
        <div class="field">
          <label
            class="field-label"
            :for="`${formId}-source`"
          >{{ t('hunts.form.source') }}</label>
          <input
            :id="`${formId}-source`"
            v-model="form.source"
            class="input"
            maxlength="80"
            :placeholder="t('hunts.form.sourcePlaceholder')"
          >
        </div>
      </div>

      <SpacesPlantPicker
        v-if="choices.length"
        v-model="picked"
        :plants="choices"
        :label="t('hunts.form.plants', { n: picked.length })"
      />
      <p
        v-else
        class="muted none"
      >
        {{ t('hunts.form.noStrainMatch') }}
      </p>
      <button
        v-if="form.strain.trim() && !showAll"
        type="button"
        class="link"
        @click="showAll = true"
      >
        {{ t('hunts.form.showAll') }}
      </button>
      <span
        v-if="submitted && errors.plants"
        class="field-error"
      >{{ errors.plants }}</span>
      <button
        type="submit"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
      >
        {{ t('common.save') }}
      </button>
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
        type="submit"
        :form="formId"
        class="btn btn-primary"
      >
        {{ hunt ? t('common.save') : t('hunts.form.create') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.none {
  margin: 0;
  font-size: 14px;
}

.link {
  align-self: flex-start;
}
</style>
