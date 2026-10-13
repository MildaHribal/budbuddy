<script setup lang="ts">
import type { TreatmentPlan } from '~/types/grow'
import { addDays } from '~/utils/date'
import { ISSUES, issueTemplate, type IssueGroup, type IssueId } from '~/utils/treatment'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  plantId?: string | null
  issue?: IssueId | null
  sourceEntryId?: string | null
}>()
const emit = defineEmits<{ started: [plan: TreatmentPlan] }>()

const { t } = useI18n()
const grow = useGrow()
const care = useCare()
const { notify } = useNotify()
const today = useToday()

const plants = computed(() => grow.state.plants.filter(p => !p.archived))
const plantChoice = ref<string | null>(null)
const issueChoice = ref<IssueId | null>(null)
const step = ref<'pick' | 'review'>('pick')
const photoId = ref<string | null>(null)
const latestEntryId = ref<string | null>(null)
const busy = ref(false)

const GROUPS: IssueGroup[] = ['nutrition', 'environment', 'pests', 'mould']
const grouped = computed(() => GROUPS.map(g => ({ id: g, issues: ISSUES.filter(i => i.group === g) })))
const tpl = computed(() => (issueChoice.value ? issueTemplate(issueChoice.value) ?? null : null))
const plant = computed(() => (plantChoice.value ? grow.getPlant(plantChoice.value) ?? null : null))
const careful = computed(() => tpl.value && (tpl.value.group === 'pests' || tpl.value.group === 'mould'))

// newest photo entry of the plant from the last 3 days can serve as the "before" picture
const recentPhoto = computed(() => {
  if (!plant.value) return null
  return grow.entriesFor(plant.value.id).find(e => e.type === 'photo' && e.photoIds.length && e.date >= addDays(today.value, -3)) ?? null
})

watch(open, (v) => {
  if (!v) return
  plantChoice.value = props.plantId ?? (plants.value.length === 1 ? plants.value[0]!.id : null)
  issueChoice.value = props.issue ?? null
  step.value = props.issue ? 'review' : 'pick'
  photoId.value = null
  latestEntryId.value = null
}, { immediate: true })

function pick(id: IssueId) {
  issueChoice.value = id
  step.value = 'review'
}

async function takePhoto() {
  const file = await pickImage('environment')
  if (!file) return
  busy.value = true
  try {
    photoId.value = await grow.savePhoto(file)
    latestEntryId.value = null
  } catch (e) {
    console.error(e)
    notify(t('entry.imageError'), { tone: 'error' })
  } finally {
    busy.value = false
  }
}

function useLatest() {
  if (!recentPhoto.value) return
  latestEntryId.value = recentPhoto.value.id
  photoId.value = null
}

const previewPhoto = computed(() => photoId.value ?? (latestEntryId.value ? recentPhoto.value?.photoIds[0] ?? null : null))

function start() {
  if (!plant.value || !tpl.value) return
  let beforeEntryId = latestEntryId.value
  if (photoId.value) {
    beforeEntryId = grow.addEntry({
      plantId: plant.value.id,
      type: 'photo',
      photoIds: [photoId.value],
      note: t('care.treat.noteBefore', { issue: care.issueName(tpl.value.id) })
    }).id
  }
  const plan = care.startPlan(plant.value, tpl.value.id, { beforeEntryId, sourceEntryId: props.sourceEntryId ?? null })
  notify(t('care.treat.createdTasks', { n: plan.taskIds.length }), { icon: 'i-tabler-list-check' })
  emit('started', plan)
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="step === 'pick' ? t('care.treat.pickIssue') : tpl ? care.issueName(tpl.id) : t('care.treat.title')"
    :icon-color="'var(--entry-pest, #f0905a)'"
  >
    <template #icon>
      <GrowIcon
        :name="tpl?.glyph ?? 'pest'"
        class="sheet-glyph"
      />
    </template>

    <div class="form-stack">
      <div
        v-if="!props.plantId"
        class="field"
      >
        <span class="field-label">{{ t('care.treat.pickPlant') }}</span>
        <p
          v-if="!plants.length"
          class="care-note"
        >
          {{ t('care.treat.noPlants') }}
        </p>
        <div
          v-else
          class="chips"
          role="group"
          :aria-label="t('care.treat.pickPlant')"
        >
          <button
            v-for="p in plants"
            :key="p.id"
            type="button"
            class="chip"
            :aria-pressed="plantChoice === p.id"
            @click="plantChoice = p.id"
          >
            {{ p.name }}
          </button>
        </div>
      </div>

      <template v-if="step === 'pick'">
        <div
          v-for="g in grouped"
          :key="g.id"
          class="group"
        >
          <h3 class="group-title">
            {{ t(`care.treat.groups.${g.id}`) }}
          </h3>
          <div class="issue-list">
            <button
              v-for="i in g.issues"
              :key="i.id"
              type="button"
              class="issue"
              :aria-pressed="issueChoice === i.id"
              @click="pick(i.id)"
            >
              <span class="issue-text">
                <strong>{{ care.issueName(i.id) }}</strong>
                <span>{{ t(`care.treat.issues.${i.id}.signs`) }}</span>
              </span>
              <UIcon
                name="i-tabler-chevron-right"
                class="size-5 issue-go"
              />
            </button>
          </div>
        </div>
      </template>

      <template v-else-if="tpl">
        <button
          v-if="!props.issue"
          type="button"
          class="link back"
          @click="step = 'pick'"
        >
          <UIcon
            name="i-tabler-chevron-left"
            class="size-4"
          /> {{ t('care.treat.pickIssue') }}
        </button>

        <div>
          <h3 class="group-title">
            {{ t('care.treat.signsTitle') }}
          </h3>
          <p class="care-note">
            {{ t(`care.treat.issues.${tpl.id}.signs`) }}
          </p>
        </div>

        <div>
          <h3 class="group-title">
            {{ t('care.treat.stepsTitle') }}
          </h3>
          <ol class="steps">
            <li
              v-for="s in tpl.steps"
              :key="s.key"
            >
              <span>{{ t(`care.treat.steps.${s.key}`) }}</span>
              <span
                v-if="s.day > 0"
                class="step-day num"
              >{{ t('care.treat.dueDay', { n: s.day + 1 }) }}</span>
            </li>
          </ol>
        </div>

        <p class="check-line num">
          <UIcon
            name="i-tabler-camera"
            class="size-[18px] shrink-0"
          />
          {{ t('care.treat.checkOn', { date: formatDate(addDays(today, tpl.checkDay), { weekday: 'short', day: 'numeric', month: 'numeric' }) }) }}
        </p>

        <div
          v-if="plant"
          class="field"
        >
          <span class="field-label">{{ t('care.treat.beforePhoto') }}</span>
          <div class="before">
            <div
              v-if="previewPhoto"
              class="before-thumb"
            >
              <PlantPhoto
                :photo-id="previewPhoto"
                :stage="plant.stage"
              />
            </div>
            <div class="before-actions">
              <button
                type="button"
                class="btn"
                :disabled="busy"
                @click="takePhoto"
              >
                <UIcon
                  :name="busy ? 'i-tabler-loader-2' : 'i-tabler-camera-plus'"
                  class="size-5"
                  :class="{ 'animate-spin': busy }"
                /> {{ t('care.treat.takeBefore') }}
              </button>
              <button
                v-if="recentPhoto && !latestEntryId"
                type="button"
                class="btn btn-ghost"
                @click="useLatest"
              >
                {{ t('care.treat.useLatest') }}
              </button>
            </div>
          </div>
          <span class="field-hint">{{ t('care.treat.beforeHint') }}</span>
        </div>

        <p
          v-if="careful"
          class="safety"
        >
          <UIcon
            name="i-tabler-alert-triangle"
            class="size-[18px] shrink-0"
          />
          <span>{{ t('care.treat.safety') }}</span>
        </p>
        <p class="care-note">
          {{ t('care.treat.notDiagnosis') }}
        </p>
      </template>
    </div>

    <template
      v-if="step === 'review'"
      #footer
    >
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
        :disabled="!plant || !tpl || busy"
        @click="start"
      >
        {{ t('care.treat.startBtn') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped src="./care.css"></style>

<style scoped src="./treatment.css"></style>
