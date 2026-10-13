<script setup lang="ts">
import type { PhenoHunt } from '~/types/grow'

const { t } = useI18n()
useHead({ title: () => t('hunts.title') })

const route = useRoute()
const router = useRouter()
const grow = useGrow()
const { hunts } = useHunts()

const creating = ref(false)
const initialIds = ref<string[]>([])
// /hunts?new=id1,id2 comes from multi-select in the plant list
onMounted(() => {
  if (typeof route.query.new === 'string') {
    initialIds.value = route.query.new.split(',').filter(Boolean)
    creating.value = true
    router.replace({ query: {} })
  }
})
function startNew() {
  initialIds.value = []
  creating.value = true
}

function summary(h: PhenoHunt) {
  const ranked = rankCandidates(h)
  const scored = h.candidates.filter(c => scoredShare(c, h) > 0).length
  const keeper = h.keeper ? h.candidates.find(c => c.plantId === h.keeper!.plantId) : null
  const leader = ranked[0]?.score != null ? ranked[0] : null
  return {
    scored,
    keeper: keeper ? { tag: keeper.tag, name: grow.getPlant(keeper.plantId)?.name ?? '', role: h.keeper!.role } : null,
    leader: leader ? { tag: leader.candidate.tag, name: grow.getPlant(leader.candidate.plantId)?.name ?? '', score: leader.score! } : null,
    photos: h.candidates.slice(0, 4).map(c => grow.getPlant(c.plantId)).filter(p => !!p)
  }
}

const active = computed(() => hunts.value.filter(h => !h.done))
const finished = computed(() => hunts.value.filter(h => h.done))
</script>

<template>
  <div>
    <AppHeader
      :title="t('hunts.title')"
      :subtitle="hunts.length ? t('hunts.subtitle', { n: hunts.length }) : undefined"
      back
    />
    <div class="page">
      <EmptyState
        v-if="!hunts.length"
        icon="flowering"
        :title="t('hunts.emptyTitle')"
        :text="t('hunts.emptyText')"
      >
        <button
          type="button"
          class="btn btn-primary"
          @click="startNew"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-5"
          /> {{ t('hunts.start') }}
        </button>
      </EmptyState>

      <section
        v-for="group in [{ key: 'active', list: active }, { key: 'done', list: finished }].filter(g => g.list.length)"
        :key="group.key"
        :aria-labelledby="`hunts-${group.key}`"
      >
        <div class="section-head">
          <h2
            :id="`hunts-${group.key}`"
            class="section-title"
          >
            {{ t(`hunts.group.${group.key}`) }}
          </h2>
        </div>
        <ul class="hunt-list rise">
          <li
            v-for="h in group.list"
            :key="h.id"
          >
            <NuxtLink
              :to="`/hunts/${h.id}`"
              class="card hunt"
            >
              <span class="hunt-top">
                <span class="hunt-name">{{ h.name }}</span>
                <span
                  class="badge"
                  :class="h.done ? 'done' : 'live'"
                >{{ h.done ? t('hunts.status.done') : t('hunts.status.active') }}</span>
              </span>
              <span class="hunt-sub">
                {{ [h.strain, h.source].filter(Boolean).join(' · ') || t('hunts.noStrain') }}
              </span>
              <span class="hunt-lower">
                <span class="hunt-thumbs">
                  <span
                    v-for="p in summary(h).photos"
                    :key="p.id"
                    class="thumb"
                  >
                    <PlantPhoto
                      :photo-id="p.photoId"
                      :stage="p.stage"
                    />
                  </span>
                </span>
                <span class="hunt-meta">
                  <template v-if="summary(h).keeper">
                    <UIcon
                      name="i-tabler-crown"
                      class="size-4 crown"
                    />
                    {{ t('hunts.keeperLine', { tag: summary(h).keeper!.tag, name: summary(h).keeper!.name }) }}
                  </template>
                  <template v-else-if="summary(h).leader">
                    {{ t('hunts.leaderLine', { tag: summary(h).leader!.tag, score: formatNumber(summary(h).leader!.score, 1, true) }) }}
                  </template>
                  <template v-else>
                    {{ t('hunts.scoredLine', { n: summary(h).scored, total: h.candidates.length }) }}
                  </template>
                </span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <button
      v-if="hunts.length"
      type="button"
      class="fab"
      :aria-label="t('hunts.start')"
      @click="startNew"
    >
      <UIcon name="i-tabler-plus" />
    </button>

    <PhenoHuntSheet
      v-model:open="creating"
      :initial-ids="initialIds"
      @saved="id => navigateTo(`/hunts/${id}`)"
    />
  </div>
</template>

<style scoped>
.hunt-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hunt {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.hunt:active {
  transform: scale(0.985);
}

.hunt-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.hunt-name {
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge.live {
  color: var(--green);
}

.badge.done {
  color: var(--text-2);
}

.hunt-sub {
  font-size: 13px;
  color: var(--text-2);
}

.hunt-lower {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.hunt-thumbs {
  display: flex;
  flex-shrink: 0;
}

.thumb {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--surface);
}

.thumb + .thumb {
  margin-left: -10px;
}

.hunt-meta {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
}

.crown {
  flex-shrink: 0;
  color: var(--green);
}
</style>
