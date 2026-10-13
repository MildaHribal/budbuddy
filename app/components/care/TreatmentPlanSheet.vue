<script setup lang="ts">
import { issueTemplate, planProgress, stepDate } from '~/utils/treatment'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ planId: string | null }>()

const { t } = useI18n()
const grow = useGrow()
const care = useCare()
const { notify } = useNotify()
const { confirm } = useConfirm()
const today = useToday()

const plan = computed(() => (props.planId ? grow.state.treatments?.find(p => p.id === props.planId) ?? null : null))
const issue = computed(() => (plan.value ? issueTemplate(plan.value.issue) ?? null : null))
const plant = computed(() => (plan.value ? grow.getPlant(plan.value.plantId) ?? null : null))
const progress = computed(() => (plan.value ? planProgress(plan.value, today.value) : null))
const careful = computed(() => issue.value && (issue.value.group === 'pests' || issue.value.group === 'mould'))

// the sheet closes itself when the plan disappears (deleted elsewhere)
watch(plan, (p) => {
  if (!p && open.value) open.value = false
})

const entry = (id: string | null | undefined) => (id ? grow.state.entries.find(e => e.id === id) ?? null : null)
const before = computed(() => entry(plan.value?.beforeEntryId))
const lastCheck = computed(() => {
  const ids = plan.value?.checkEntryIds ?? []
  for (let i = ids.length - 1; i >= 0; i--) {
    const e = entry(ids[i])
    if (e?.photoIds.length) return e
  }
  return null
})
const source = computed(() => entry(plan.value?.sourceEntryId))

const busy = ref(false)

async function addPhoto(kind: 'check' | 'before') {
  if (!plan.value || !plant.value) return
  const file = await pickImage('environment')
  if (!file) return
  busy.value = true
  try {
    const photoId = await grow.savePhoto(file)
    const name = care.issueName(plan.value.issue)
    const e = grow.addEntry({
      plantId: plant.value.id,
      type: 'photo',
      photoIds: [photoId],
      note: kind === 'before' ? t('care.treat.noteBefore', { issue: name }) : t('care.treat.noteCheck', { issue: name.toLowerCase(), n: progress.value?.day ?? 1 })
    })
    if (kind === 'before') care.setBefore(plan.value.id, e.id)
    else care.addCheckEntry(plan.value.id, e.id)
    notify(t('care.treat.photoTaken'), { icon: 'i-tabler-camera' })
  } catch (err) {
    console.error(err)
    notify(t('entry.imageError'), { tone: 'error' })
  } finally {
    busy.value = false
  }
}

function resolve() {
  if (!plan.value) return
  care.closePlan(plan.value.id, 'resolved')
  notify(t('care.treat.resolvedToast'))
}

async function stop() {
  if (!plan.value) return
  const ok = await confirm({ title: t('care.treat.stopTitle'), message: t('care.treat.stopText'), confirmLabel: t('care.treat.stop') })
  if (ok) care.closePlan(plan.value.id, 'stopped')
}

async function remove() {
  if (!plan.value) return
  const ok = await confirm({ title: t('care.treat.deleteTitle'), message: t('care.treat.deleteText'), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  care.deletePlan(plan.value.id)
  open.value = false
  notify(t('care.treat.deleted'), { tone: 'info' })
}

const dayLabel = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short' })
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="issue ? care.issueName(issue.id) : t('care.treat.title')"
    icon-color="#f0905a"
  >
    <template #icon>
      <GrowIcon
        :name="issue?.glyph ?? 'pest'"
        class="sheet-glyph"
      />
    </template>

    <div
      v-if="plan && issue && progress"
      class="form-stack"
    >
      <p class="plan-meta num">
        <span v-if="plant">{{ plant.name }}</span>
        <span>{{ t('care.treat.dayN', { n: progress.day }) }}</span>
        <span>{{ t('care.treat.progress', { done: progress.done, total: progress.total }) }}</span>
        <span
          v-if="plan.status !== 'active'"
          class="badge"
          :class="plan.status === 'resolved' ? 'ok' : ''"
        >{{ plan.status === 'resolved' ? t('care.treat.resolved') : t('care.treat.stopped') }}</span>
      </p>
      <p
        v-if="source"
        class="care-note"
      >
        {{ t('care.treat.fromEntry', { date: dayLabel(source.date) }) }}<template v-if="source.product || source.note">
          · {{ source.product || source.note }}
        </template>
      </p>

      <div
        v-if="progress.checkDue"
        class="due-row"
      >
        <div>
          <strong>{{ t('care.treat.checkDue') }}</strong>
          <span>{{ t('care.treat.checkDueText') }}</span>
        </div>
        <button
          type="button"
          class="btn btn-lamp"
          :disabled="busy"
          @click="addPhoto('check')"
        >
          <UIcon
            name="i-tabler-camera"
            class="size-5"
          />
        </button>
      </div>
      <p
        v-else-if="plan.status === 'active' && !plan.checkEntryIds.length"
        class="check-line num"
      >
        <UIcon
          name="i-tabler-camera"
          class="size-[18px] shrink-0"
        />
        {{ t('care.treat.checkOn', { date: formatDate(progress.checkDate, { weekday: 'short', day: 'numeric', month: 'numeric' }) }) }}
      </p>

      <div
        v-if="before || lastCheck"
        class="compare"
      >
        <figure>
          <div class="cmp-photo">
            <PlantPhoto
              v-if="before?.photoIds[0]"
              :photo-id="before.photoIds[0]"
              :stage="plant?.stage ?? 'vegetative'"
              size="full"
            />
            <button
              v-else-if="plan.status === 'active'"
              type="button"
              class="cmp-add"
              :disabled="busy"
              @click="addPhoto('before')"
            >
              <UIcon
                name="i-tabler-camera-plus"
                class="size-6"
              />
            </button>
          </div>
          <figcaption class="num">
            {{ t('care.treat.before') }}<template v-if="before">
              · {{ dayLabel(before.date) }}
            </template>
          </figcaption>
        </figure>
        <figure>
          <div class="cmp-photo">
            <PlantPhoto
              v-if="lastCheck?.photoIds[0]"
              :photo-id="lastCheck.photoIds[0]"
              :stage="plant?.stage ?? 'vegetative'"
              size="full"
            />
            <button
              v-else-if="plan.status === 'active'"
              type="button"
              class="cmp-add"
              :disabled="busy"
              :aria-label="t('care.treat.addCheck')"
              @click="addPhoto('check')"
            >
              <UIcon
                name="i-tabler-camera-plus"
                class="size-6"
              />
            </button>
          </div>
          <figcaption class="num">
            {{ t('care.treat.after') }}<template v-if="lastCheck">
              · {{ dayLabel(lastCheck.date) }}
            </template>
          </figcaption>
        </figure>
      </div>

      <div>
        <h3 class="group-title">
          {{ t('care.treat.stepsTitle') }}
        </h3>
        <ul class="checklist">
          <li
            v-for="s in plan.steps"
            :key="s.key"
          >
            <label :class="{ done: s.done }">
              <input
                type="checkbox"
                :checked="s.done"
                :disabled="plan.status !== 'active'"
                @change="care.toggleStep(plan.id, s.key)"
              >
              <span
                class="box"
                aria-hidden="true"
              ><UIcon
                name="i-tabler-check"
                class="size-4"
              /></span>
              <span class="step-text">
                {{ t(`care.treat.steps.${s.key}`) }}
                <span
                  v-if="stepDate(plan, s.key) > plan.startDate"
                  class="step-day num"
                >{{ dayLabel(stepDate(plan, s.key)) }}</span>
              </span>
            </label>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="group-title">
          {{ t('care.treat.betterTitle') }}
        </h3>
        <p class="care-note">
          {{ t(`care.treat.issues.${issue.id}.better`) }}
        </p>
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

      <NuxtLink
        :to="`/guide/${issue.lesson.chapter}#${issue.lesson.lesson}`"
        class="lesson-link"
        @click="open = false"
      >
        <GrowIcon name="guide" />
        <span>{{ t('care.treat.lesson') }}</span>
        <UIcon
          name="i-tabler-chevron-right"
          class="size-5"
        />
      </NuxtLink>

      <div class="plan-actions">
        <template v-if="plan.status === 'active'">
          <button
            v-if="!progress.checkDue"
            type="button"
            class="btn"
            :disabled="busy"
            @click="addPhoto('check')"
          >
            <UIcon
              name="i-tabler-camera"
              class="size-5"
            /> {{ t('care.treat.addCheck') }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="resolve"
          >
            <UIcon
              name="i-tabler-circle-check"
              class="size-5"
            /> {{ t('care.treat.resolve') }}
          </button>
        </template>
        <button
          v-else
          type="button"
          class="btn"
          @click="care.reopenPlan(plan.id)"
        >
          {{ t('care.treat.reopen') }}
        </button>
      </div>
      <div class="sheet-links">
        <button
          v-if="plan.status === 'active'"
          type="button"
          class="link"
          @click="stop"
        >
          {{ t('care.treat.stop') }}
        </button>
        <span v-else />
        <button
          type="button"
          class="link danger"
          @click="remove"
        >
          {{ t('care.treat.delete') }}
        </button>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped src="./care.css"></style>

<style scoped src="./treatment.css"></style>

<style scoped>
.plan-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

.plan-meta > span + span:not(.badge)::before {
  content: "·";
  margin-right: 10px;
  color: var(--text-3);
}

.badge {
  color: var(--text-2);
}

.badge.ok {
  color: var(--green);
}

.due-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-control);
  background: var(--lamp-soft);
}

.due-row div {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.due-row strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--amber);
}

.due-row span {
  font-size: 13px;
  color: var(--text-2);
}

.due-row .btn {
  flex-shrink: 0;
  width: 48px;
  padding: 0;
}

.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.compare figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cmp-photo {
  aspect-ratio: 1;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-2);
}

.cmp-add {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border: 1px dashed var(--line-strong);
  border-radius: inherit;
  background: var(--well);
  color: var(--green);
}

.compare figcaption {
  font-size: 12px;
  color: var(--text-3);
}

.checklist {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
}

.checklist li + li {
  border-top: 1px solid var(--line);
}

.checklist label {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  min-height: 48px;
  font-size: 14px;
  line-height: 1.45;
  cursor: pointer;
}

.checklist input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.box {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 2px solid var(--line-strong);
  border-radius: 6px;
  color: transparent;
  transition: background var(--dur-fast) ease, border-color var(--dur-fast) ease;
}

.checklist input:focus-visible + .box {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}

.checklist label.done .box {
  background: var(--green);
  border-color: var(--green);
  color: var(--on-accent);
}

.checklist label.done .step-text {
  color: var(--text-3);
  text-decoration: line-through;
}

.step-text .step-day {
  margin-left: 6px;
}

.lesson-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  color: var(--text);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.lesson-link .grow-icon {
  font-size: 20px;
  color: var(--green);
}

.lesson-link span {
  flex: 1;
}

.lesson-link .iconify {
  color: var(--text-3);
}

.plan-actions {
  display: flex;
  gap: 8px;
}

.plan-actions .btn {
  flex: 1;
}

.sheet-links {
  display: flex;
  justify-content: space-between;
}

.link.danger {
  color: var(--red);
}
</style>
