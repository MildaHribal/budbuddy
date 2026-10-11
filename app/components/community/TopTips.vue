<script setup lang="ts">
import type { StageId } from '~/types/grow'
import { tipGroupOf } from '~/utils/tips'

interface MiniTip { id: string, author_id: string, body: string, helpful_count: number, unhelpful_count: number }

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
const group = computed(() => tipGroupOf(stage.value))
const groupLabel = computed(() => (group.value ? t(`tips.groups.${group.value.id}`) : ''))

const tips = ref<MiniTip[]>([])
const shown = computed(() => tips.value.filter(x => !isBlocked(x.author_id)).slice(0, 3))

async function load() {
  tips.value = []
  const g = group.value
  if (!g || (typeof navigator !== 'undefined' && !navigator.onLine)) return
  try {
    const { data, error } = await useSupabase()
      .from('tips')
      .select('id, author_id, body, helpful_count, unhelpful_count')
      .in('stage', g.stages)
      .gt('helpful_count', 0)
      .order('score', { ascending: false })
      .limit(6)
    if (!error) tips.value = (data ?? []) as MiniTip[]
  } catch {
    tips.value = []
  }
}

watch(() => group.value?.id, load)
const pct = (x: MiniTip) => helpfulShare(x.helpful_count, x.unhelpful_count)?.pct ?? 0
onMounted(load)
</script>

<template>
  <section
    v-if="info && group && shown.length"
    class="top-tips"
    aria-labelledby="top-tips-title"
  >
    <div class="section-head">
      <h2
        id="top-tips-title"
        class="section-title"
      >
        <GrowIcon
          :name="info.glyph"
          :style="{ color: info.color }"
        />
        {{ t('tips.topTitle', { stage: groupLabel.toLocaleLowerCase(intlLocale()) }) }}
      </h2>
      <NuxtLink
        :to="{ path: '/community/tips', query: { stage: group.id } }"
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
          :to="{ path: '/community/tips', query: { stage: group.id } }"
          class="item"
        >
          <span class="body">{{ tip.body }}</span>
          <span
            class="votes num"
            :aria-label="t('tips.helpfulTo', { pct: pct(tip), n: tip.helpful_count + tip.unhelpful_count })"
          >
            <UIcon name="i-tabler-thumb-up" />{{ t('tips.pct', { n: pct(tip) }) }}
          </span>
        </NuxtLink>
      </li>
    </ol>
  </section>
</template>

<style scoped>
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
