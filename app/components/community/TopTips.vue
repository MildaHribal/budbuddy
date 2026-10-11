<script setup lang="ts">
import type { StageId } from '~/types/grow'

interface MiniTip { id: string, author_id: string, body: string, helpful_count: number }

const { t } = useI18n()
const { state } = useGrow()
const { isBlocked } = useBlocks()

// most common stage among growing plants
const stage = computed<StageId | null>(() => {
  const counts = new Map<StageId, number>()
  for (const p of state.plants) if (isGrowing(p)) counts.set(p.stage, (counts.get(p.stage) ?? 0) + 1)
  let best: StageId | null = null
  let n = 0
  for (const [s, c] of counts) if (c > n) [best, n] = [s, c]
  return best
})
const info = computed(() => (stage.value ? stageInfo(stage.value) : null))

const tips = ref<MiniTip[]>([])
const shown = computed(() => tips.value.filter(x => !isBlocked(x.author_id)).slice(0, 3))

async function load() {
  tips.value = []
  if (!stage.value || (typeof navigator !== 'undefined' && !navigator.onLine)) return
  try {
    const { data, error } = await useSupabase()
      .from('tips')
      .select('id, author_id, body, helpful_count')
      .eq('stage', stage.value)
      .order('score', { ascending: false })
      .limit(5)
    if (!error) tips.value = (data ?? []) as MiniTip[]
  } catch {
    tips.value = []
  }
}

watch(stage, load)
onMounted(load)
</script>

<template>
  <section
    v-if="info && shown.length"
    class="top-tips"
    aria-labelledby="top-tips-title"
  >
    <div class="section-head">
      <h2
        id="top-tips-title"
        class="section-title"
      >
        <GrowIcon name="lamp" />
        {{ t('tips.topTitle', { stage: info.label.toLowerCase() }) }}
      </h2>
      <NuxtLink
        :to="{ path: '/community/tips', query: { stage: info.id } }"
        class="link"
      >
        {{ t('tips.topMore') }}
        <UIcon name="i-tabler-chevron-right" />
      </NuxtLink>
    </div>
    <ol class="card list rise">
      <li
        v-for="tip in shown"
        :key="tip.id"
      >
        <NuxtLink
          :to="{ path: '/community/tips', query: { stage: info.id } }"
          class="item"
        >
          <span class="body">{{ tip.body }}</span>
          <span class="votes num">
            <UIcon name="i-tabler-thumb-up" />{{ tip.helpful_count }}
          </span>
        </NuxtLink>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.section-title .grow-icon {
  color: var(--lamp);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li + li {
  border-top: 1px solid var(--line);
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 48px;
  padding: 12px 14px;
  color: var(--text);
  text-decoration: none;
}

.item:active {
  background: rgba(255, 255, 255, 0.03);
}

.body {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.votes {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding-top: 1px;
  color: var(--leaf);
  font-size: 12px;
  font-weight: 600;
}
</style>
