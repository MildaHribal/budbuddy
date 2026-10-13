<script setup lang="ts">
import type { PhenoCandidate, PhenoHunt } from '~/types/grow'

// One phenotype in a hunt: facts, 1–5 scores per criterion, notes and photos.
const props = defineProps<{
  hunt: PhenoHunt
  candidate: PhenoCandidate
}>()

const { t } = useI18n()
const grow = useGrow()
const { notify } = useNotify()
const { setScore, updateCandidate } = useHunts()
const today = useToday()

const plant = computed(() => grow.getPlant(props.candidate.plantId))
const score = computed(() => candidateScore(props.candidate, props.hunt))
const criteria = computed(() => PHENO_CRITERIA.filter(c => criterionWeight(props.hunt, c) > 0))
const isKeeper = computed(() => props.hunt.keeper?.plantId === props.candidate.plantId)

const facts = computed(() => {
  const p = plant.value
  if (!p) return []
  const out = [t('hunts.facts.day', { n: stageProgress(p, today.value).age })]
  const flower = floweringDays(p, today.value)
  if (flower !== null) out.push(t('hunts.facts.flower', { n: flower }))
  if (p.harvest?.dryWeight) out.push(t('hunts.facts.dry', { g: p.harvest.dryWeight }))
  else if (p.harvest?.wetWeight) out.push(t('hunts.facts.wet', { g: p.harvest.wetWeight }))
  return out
})

const photos = computed(() => grow.entriesFor(props.candidate.plantId).flatMap(e => e.photoIds).slice(0, 6))

function rate(c: typeof PHENO_CRITERIA[number], v: number) {
  setScore(props.hunt.id, props.candidate.plantId, c, props.candidate.scores[c] === v ? null : v)
}

const notes = ref(props.candidate.notes)
const tag = ref(props.candidate.tag)
watch(() => props.candidate.notes, (v) => {
  if (v !== notes.value) notes.value = v
})
const saveNotes = useDebounceFn(() => updateCandidate(props.hunt.id, props.candidate.plantId, { notes: notes.value.slice(0, 1000) }), 400)
function saveTag() {
  const v = tag.value.trim().slice(0, 12)
  if (!v) {
    tag.value = props.candidate.tag
    return
  }
  updateCandidate(props.hunt.id, props.candidate.plantId, { tag: v })
}

const adding = ref(false)
async function addPhoto() {
  const file = await pickImage('environment')
  if (!file || !plant.value) return
  adding.value = true
  try {
    const id = await grow.savePhoto(file)
    grow.addEntry({ plantId: plant.value.id, type: 'photo', photoIds: [id], note: t('hunts.photoNote', { hunt: props.hunt.name, tag: props.candidate.tag }) })
    notify(t('hunts.photoAdded'), { icon: 'photo' })
  } catch (e) {
    console.error(e)
    notify(t('entry.imageError'), { tone: 'error' })
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <article
    v-if="plant"
    class="card cand"
    :class="{ keeper: isKeeper }"
  >
    <header class="cand-head">
      <NuxtLink
        :to="`/plants/${plant.id}`"
        class="cand-photo"
        :aria-label="plant.name"
      >
        <PlantPhoto
          :photo-id="plant.photoId"
          :stage="plant.stage"
          :alt="plant.name"
        />
      </NuxtLink>
      <div class="cand-id">
        <div class="cand-line">
          <input
            v-model="tag"
            class="cand-tag"
            maxlength="12"
            :aria-label="t('hunts.tag')"
            @change="saveTag"
          >
          <span class="cand-name">{{ plant.name }}</span>
        </div>
        <span class="cand-facts num">{{ facts.join(' · ') }}</span>
      </div>
      <span
        class="cand-score num"
        :class="{ empty: score === null }"
        :aria-label="t('hunts.scoreAria', { s: score === null ? '–' : formatNumber(score, 1, true) })"
      >{{ score === null ? '–' : formatNumber(score, 1, true) }}</span>
    </header>

    <p
      v-if="isKeeper"
      class="keeper-line"
    >
      <UIcon
        name="i-tabler-crown"
        class="size-4"
      /> {{ t(`hunts.keeper.${hunt.keeper!.role}`) }}
    </p>

    <div class="crit-list">
      <div
        v-for="c in criteria"
        :key="c"
        class="crit"
      >
        <span
          :id="`crit-${candidate.plantId}-${c}`"
          class="crit-label"
        >{{ t(`hunts.criteria.${c}`) }}</span>
        <div
          class="scale"
          role="radiogroup"
          :aria-labelledby="`crit-${candidate.plantId}-${c}`"
        >
          <button
            v-for="v in 5"
            :key="v"
            type="button"
            role="radio"
            class="dot num"
            :class="{ fill: (candidate.scores[c] ?? 0) >= v }"
            :aria-checked="candidate.scores[c] === v"
            :aria-label="`${v}/5`"
            @click="rate(c, v)"
          >
            {{ v }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="photos.length"
      class="cand-photos"
    >
      <span
        v-for="id in photos"
        :key="id"
        class="cand-thumb"
      >
        <PlantPhoto
          :photo-id="id"
          :stage="plant.stage"
        />
      </span>
    </div>

    <textarea
      v-model="notes"
      class="input cand-notes"
      rows="2"
      maxlength="1000"
      :placeholder="t('hunts.notesPlaceholder')"
      :aria-label="t('hunts.notes')"
      @input="saveNotes"
    />

    <div class="cand-actions">
      <button
        type="button"
        class="btn btn-soft"
        :disabled="adding"
        @click="addPhoto"
      >
        <UIcon
          :name="adding ? 'i-tabler-loader-2' : 'i-tabler-camera-plus'"
          class="size-5"
          :class="{ 'animate-spin': adding }"
        /> {{ t('hunts.addPhoto') }}
      </button>
      <NuxtLink
        :to="`/plants/${plant.id}`"
        class="btn btn-ghost"
      >
        {{ t('hunts.openPlant') }}
      </NuxtLink>
    </div>
  </article>
</template>

<style scoped>
.cand {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.cand.keeper {
  border-color: var(--accent-line);
}

.cand-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cand-photo {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: var(--radius-control);
  overflow: hidden;
}

.cand-id {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cand-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cand-tag {
  width: 52px;
  min-height: 32px;
  flex-shrink: 0;
  padding: 0 8px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--well);
  color: var(--green);
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  outline: none;
}

.cand-tag:focus {
  border-color: var(--green);
}

.cand-name {
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cand-facts {
  font-size: 12px;
  color: var(--text-3);
}

.cand-score {
  flex-shrink: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--green);
}

.cand-score.empty {
  color: var(--text-3);
}

.keeper-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--green);
}

.crit-list {
  display: flex;
  flex-direction: column;
}

.crit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  border-top: 1px solid var(--line);
}

.crit-label {
  font-size: 14px;
  color: var(--text-2);
}

.scale {
  display: flex;
  gap: 4px;
}

.dot {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: transparent;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 600;
  position: relative;
  transition: background var(--dur) ease, color var(--dur) ease, border-color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.dot::after {
  content: "";
  position: absolute;
  inset: -4px -2px;
}

.dot:active {
  transform: scale(0.92);
}

.dot.fill {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--green);
}

.dot[aria-checked="true"] {
  background: var(--green);
  color: var(--on-accent);
}

.cand-photos {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.cand-thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.cand-notes {
  min-height: 64px;
}

.cand-actions {
  display: flex;
  gap: 8px;
}

.cand-actions .btn {
  flex: 1;
  min-height: 44px;
  padding: 0 12px;
  font-size: 14px;
}
</style>
