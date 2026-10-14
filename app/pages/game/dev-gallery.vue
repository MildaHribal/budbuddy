<script setup lang="ts">
import type { PlantVisual, SymptomKind } from '../../../shared/game/types'
import GamePlant from '~/components/game/render/GamePlant.vue'
import GamePlantThumb from '~/components/game/render/GamePlantThumb.vue'
import { SAMPLE_FLOWER, SAMPLE_STAGES, SAMPLE_VARIANTS, SAMPLE_VEG, SYMPTOM_KINDS, symptom } from '~/utils/gameRender/fixtures'

// Dev-only sheet for reviewing the plant renderer; production builds get the not-found state.
const isDev = import.meta.dev
const { t } = useI18n()
useHead({ title: isDev ? 'Plant renderer gallery' : () => t('common.notFound.title') })

const INTENSITIES = [0.3, 0.7, 1]
const base = ref<'veg' | 'flower'>('veg')
const baseVisual = computed(() => (base.value === 'veg' ? SAMPLE_VEG : SAMPLE_FLOWER))

type Cell = { title: string, v: PlantVisual }
const symptomRows = computed<{ kind: SymptomKind, cells: Cell[] }[]>(() =>
  SYMPTOM_KINDS.map(kind => ({
    kind,
    cells: INTENSITIES.map(i => ({ title: `${kind} ${i}`, v: { ...baseVisual.value, symptoms: [symptom(kind, i)] } }))
  }))
)
</script>

<template>
  <div>
    <AppHeader
      :title="isDev ? 'Plant renderer gallery' : t('common.notFound.title')"
      back
    />
    <div
      v-if="!isDev"
      class="page"
    >
      <EmptyState
        icon="seedling"
        :title="t('common.notFound.title')"
        :text="t('common.notFound.text')"
      >
        <NuxtLink
          to="/"
          replace
          class="btn btn-soft"
        >
          {{ t('common.notFound.home') }}
        </NuxtLink>
      </EmptyState>
    </div>
    <div
      v-else
      class="page gallery"
    >
      <section>
        <div class="section-head">
          <h2 class="section-title">
            Healthy reference
          </h2>
          <span class="section-meta">seed 42</span>
        </div>
        <div class="row-scroll">
          <figure
            v-for="c in SAMPLE_STAGES"
            :key="c.title"
            class="cell"
          >
            <GamePlant
              :visual="c.v"
              :size="150"
              :label="c.title"
            />
            <figcaption>{{ c.title }}</figcaption>
          </figure>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            Training, media, genetics
          </h2>
        </div>
        <div class="grid-3">
          <figure
            v-for="c in SAMPLE_VARIANTS"
            :key="c.title"
            class="cell"
          >
            <GamePlant
              :visual="c.v"
              :size="110"
              :label="c.title"
            />
            <figcaption>{{ c.title }}</figcaption>
          </figure>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            List thumbnails
          </h2>
        </div>
        <div class="row-scroll">
          <figure
            v-for="c in SAMPLE_STAGES"
            :key="c.title"
            class="cell"
          >
            <GamePlantThumb
              :visual="c.v"
              :size="56"
              :label="c.title"
            />
            <figcaption>{{ c.title }}</figcaption>
          </figure>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            Symptoms at 0.3, 0.7 and 1.0
          </h2>
          <span class="section-meta">{{ symptomRows.length }} kinds</span>
        </div>
        <div
          class="segmented"
          role="group"
          aria-label="Base plant"
        >
          <button
            type="button"
            :class="{ selected: base === 'veg' }"
            :aria-pressed="base === 'veg'"
            @click="base = 'veg'"
          >
            Veg plant
          </button>
          <button
            type="button"
            :class="{ selected: base === 'flower' }"
            :aria-pressed="base === 'flower'"
            @click="base = 'flower'"
          >
            Flower plant
          </button>
        </div>
        <div
          v-for="row in symptomRows"
          :key="row.kind"
          class="symptom-row"
        >
          <h3 class="row-title">
            {{ row.kind }}
          </h3>
          <div class="grid-3">
            <figure
              v-for="c in row.cells"
              :key="c.title"
              class="cell"
            >
              <GamePlant
                :visual="c.v"
                :size="110"
                :label="c.title"
              />
              <figcaption>{{ c.v.symptoms[0]?.intensity }}</figcaption>
            </figure>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.gallery {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.row-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.cell {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm, 10px);
  background: var(--surface);
  flex: 0 0 auto;
}

.cell figcaption {
  font-size: 12px;
  color: var(--text-2);
  text-align: center;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.symptom-row {
  margin-top: 16px;
}

.row-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.segmented {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--well);
}

.segmented button {
  flex: 1;
  height: 38px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-3);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.segmented button.selected {
  background: var(--surface-3);
  color: var(--text);
}

.segmented button:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}
</style>
