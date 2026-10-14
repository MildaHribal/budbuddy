<script setup lang="ts">
import type { Plant } from '~/types/grow'
import { overallScore, SCORE_KEYS, totalHarvestPoints } from '~/utils/harvestScore'

const props = defineProps<{ plant: Plant }>()

const { t } = useI18n()
const grow = useGrow()
const sheet = ref(false)
const fresh = ref(false)

const rating = computed(() => props.plant.harvest?.rating ?? null)
const overall = computed(() => (rating.value ? overallScore(rating.value.scores) : 0))
const garden = computed(() => totalHarvestPoints(grow.state.plants))
const quality = computed(() => Math.round(overall.value * 10))
const photos = computed(() => (rating.value?.photoIds ?? []).slice(0, 3))

function onRated() {
  fresh.value = true
  setTimeout(() => (fresh.value = false), 1600)
}
</script>

<template>
  <section
    class="card care"
    style="--tone: #f2b544"
    :aria-label="t('care.rate.title')"
  >
    <div class="care-head">
      <span
        class="care-tile"
        aria-hidden="true"
      ><UIcon name="i-tabler-star" /></span>
      <div class="care-title">
        <h2>{{ t('care.rate.title') }}</h2>
        <p v-if="!rating">
          {{ t('care.rate.teaser') }}
        </p>
        <p v-else>
          {{ garden.rated > 1 ? t('care.rate.gardenTotal', { points: garden.points, n: garden.rated }) : t('care.rate.ratedOn', { date: formatDate(rating.ratedAt.slice(0, 10)) }) }}
        </p>
      </div>
    </div>

    <template v-if="rating">
      <div
        class="result"
        :class="{ fresh }"
      >
        <div
          class="stars"
          role="img"
          :aria-label="t('care.rate.starsLabel', { n: rating.stars })"
        >
          <UIcon
            v-for="i in 5"
            :key="i"
            :name="i <= rating.stars ? 'i-tabler-star-filled' : 'i-tabler-star'"
            class="star"
            :class="{ on: i <= rating.stars }"
            :style="{ '--i': i }"
          />
        </div>
        <div class="points">
          <span class="points-n num">{{ rating.points }}</span>
          <span class="points-label">{{ t('care.rate.points') }}</span>
        </div>
      </div>

      <p
        v-if="rating.summary"
        class="summary"
      >
        {{ rating.summary }}
      </p>

      <ul class="scores">
        <li
          v-for="k in SCORE_KEYS"
          :key="k"
        >
          <span class="score-label">{{ t(`care.rate.score.${k}`) }}</span>
          <span
            class="bar"
            aria-hidden="true"
          ><span :style="{ width: `${rating.scores[k] * 10}%` }" /></span>
          <span class="score-n num">{{ rating.scores[k] }}<span class="of">/10</span></span>
        </li>
      </ul>

      <div
        v-if="rating.good.length || rating.improve.length"
        class="notes"
      >
        <div v-if="rating.good.length">
          <h3>{{ t('care.rate.good') }}</h3>
          <ul>
            <li
              v-for="g in rating.good"
              :key="g"
            >
              {{ g }}
            </li>
          </ul>
        </div>
        <div v-if="rating.improve.length">
          <h3>{{ t('care.rate.improve') }}</h3>
          <ul>
            <li
              v-for="g in rating.improve"
              :key="g"
            >
              {{ g }}
            </li>
          </ul>
        </div>
      </div>

      <details class="breakdown">
        <summary>{{ t('care.rate.howPoints') }}</summary>
        <ul>
          <li>
            <span>{{ t('care.rate.bonus.quality') }}</span>
            <span class="num">+{{ quality }}</span>
          </li>
          <li
            v-for="b in rating.bonuses"
            :key="b.key"
          >
            <span>{{ t(`care.rate.bonus.${b.key}`) }}</span>
            <span class="num">+{{ b.points }}</span>
          </li>
        </ul>
      </details>

      <div
        v-if="photos.length"
        class="thumbs"
      >
        <PlantPhoto
          v-for="id in photos"
          :key="id"
          :photo-id="id"
          stage="curing"
          class="thumb"
        />
      </div>
    </template>

    <div class="care-actions">
      <button
        type="button"
        class="btn"
        :class="rating ? 'btn-soft' : 'btn-primary'"
        @click="sheet = true"
      >
        <UIcon name="i-tabler-camera" />
        {{ rating ? t('care.rate.again') : t('care.rate.start') }}
      </button>
    </div>

    <CareHarvestRatingSheet
      v-model:open="sheet"
      :plant="plant"
      @rated="onRated"
    />
  </section>
</template>

<style scoped src="./care.css"></style>

<style scoped>
.result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stars {
  display: flex;
  gap: 4px;
  font-size: 26px;
  color: var(--line-strong);
}

.star.on {
  color: var(--amber);
}

.fresh .star.on {
  animation: pop 420ms var(--ease-out, ease-out) both;
  animation-delay: calc(var(--i) * 90ms);
}

@keyframes pop {
  from {
    transform: scale(0.4);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fresh .star.on {
    animation: none;
  }
}

.points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.points-n {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
  color: var(--amber);
}

.points-label {
  font-size: 12px;
  color: var(--text-2);
}

.summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.scores {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.scores li {
  display: grid;
  grid-template-columns: 110px 1fr 44px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.score-label {
  color: var(--text-2);
}

.bar {
  height: 6px;
  border-radius: 999px;
  background: var(--track, #2a302d);
  overflow: hidden;
}

.bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--amber);
}

.score-n {
  text-align: right;
  font-weight: 600;
}

.of {
  font-weight: 400;
  color: var(--text-3);
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notes h3 {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
}

.notes ul {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

.breakdown {
  font-size: 13px;
  color: var(--text-2);
}

.breakdown summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--text);
  font-weight: 600;
}

.breakdown ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.breakdown li {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.thumbs {
  display: flex;
  gap: 8px;
}

.thumb {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
</style>
