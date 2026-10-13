<script setup lang="ts">
// Entry points for timelapse, compare, Grow Wrapped and export (tools list and stats page).
import { timelapseFrames } from '~/utils/review/timelapse'

const props = withDefaults(defineProps<{ variant?: 'tools' | 'stats' }>(), { variant: 'tools' })

const { t } = useI18n()
const grow = useGrow()

type Target = 'timelapse' | 'export'
const pickFor = ref<Target | null>(null)
const pickOpen = computed({
  get: () => pickFor.value !== null,
  set: (v) => {
    if (!v) pickFor.value = null
  }
})

const plants = computed(() => [...grow.state.plants]
  .map(p => ({ plant: p, photos: timelapseFrames(p, grow.state.entries).length }))
  .sort((a, b) => Number(a.plant.archived) - Number(b.plant.archived) || b.plant.startDate.localeCompare(a.plant.startDate)))

const rows = computed(() => {
  const all = [
    { id: 'wrapped', icon: 'harvest', tone: 'var(--amber)', to: '/wrapped' },
    { id: 'compare', icon: 'i-tabler-arrows-diff', tone: '#b58cf5', to: '/compare' },
    { id: 'timelapse', icon: 'i-tabler-movie', tone: '#8ea6f5', to: null },
    { id: 'export', icon: 'i-tabler-file-export', tone: 'var(--text-2)', to: null }
  ] as const
  const order = props.variant === 'stats' ? ['wrapped', 'compare', 'timelapse', 'export'] : ['timelapse', 'compare', 'wrapped', 'export']
  return order.map(id => all.find(r => r.id === id)!)
})

function open(id: Target) {
  if (plants.value.length === 1) return navigateTo(`/plants/${plants.value[0]!.plant.id}/${id}`)
  pickFor.value = id
}

function go(id: string) {
  const target = pickFor.value
  pickFor.value = null
  if (target) navigateTo(`/plants/${id}/${target}`)
}
</script>

<template>
  <section>
    <div class="section-head">
      <h2 class="section-title">
        {{ t('review.links.title') }}
      </h2>
    </div>
    <nav
      class="card"
      :aria-label="t('review.links.title')"
    >
      <template
        v-for="r in rows"
        :key="r.id"
      >
        <NuxtLink
          v-if="r.to"
          :to="r.to"
          class="rv-row"
        >
          <span
            class="rv-tile"
            :style="{ color: r.tone }"
          >
            <GrowIcon :name="r.icon" />
          </span>
          <span class="rv-row-text">
            <span class="rv-row-title">{{ t(`review.links.${r.id}`) }}</span>
            <span class="rv-row-desc">{{ t(`review.links.${r.id}Desc`) }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="size-5 rv-row-go"
          />
        </NuxtLink>
        <button
          v-else
          type="button"
          class="rv-row"
          :disabled="!plants.length"
          @click="open(r.id as Target)"
        >
          <span
            class="rv-tile"
            :style="{ color: r.tone }"
          >
            <GrowIcon :name="r.icon" />
          </span>
          <span class="rv-row-text">
            <span class="rv-row-title">{{ t(`review.links.${r.id}`) }}</span>
            <span class="rv-row-desc">{{ t(`review.links.${r.id}Desc`) }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="size-5 rv-row-go"
          />
        </button>
      </template>
    </nav>

    <BottomSheet
      v-model:open="pickOpen"
      :title="t('review.links.pickPlant')"
      icon="plants"
    >
      <div class="pick-list">
        <button
          v-for="x in plants"
          :key="x.plant.id"
          type="button"
          class="rv-row"
          :disabled="pickFor === 'timelapse' && x.photos < 2"
          @click="go(x.plant.id)"
        >
          <span class="pick-photo">
            <PlantPhoto
              :photo-id="x.plant.photoId"
              :stage="x.plant.stage"
            />
          </span>
          <span class="rv-row-text">
            <span class="rv-row-title">{{ x.plant.name }}</span>
            <span class="rv-row-desc">
              {{ t('review.links.photos', { n: x.photos }) }}<template v-if="x.plant.archived"> · {{ t('review.links.archived') }}</template>
            </span>
          </span>
          <StageBadge :stage="x.plant.stage" />
        </button>
      </div>
    </BottomSheet>
  </section>
</template>

<style src="./review.css"></style>

<style scoped>
.card {
  overflow: hidden;
}

.pick-list {
  margin: 0 -20px;
}

.pick-list .rv-row {
  padding-left: 20px;
  padding-right: 20px;
}

.pick-photo {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-2);
}
</style>
