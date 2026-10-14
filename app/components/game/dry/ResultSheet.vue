<script setup lang="ts">
import type { CureResult } from '~~/shared/game/drying/view'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ result: CureResult | null }>()
const { t } = useI18n()

type Part = 'aroma' | 'cleanliness' | 'cure' | 'moisture'
const PARTS: Part[] = ['aroma', 'cleanliness', 'cure', 'moisture']

const score = computed(() => Math.round((props.result?.breakdown.score ?? 0) * 100))
const rows = computed(() => PARTS.map(k => ({ key: k, value: Math.round((props.result?.breakdown[k] ?? 0) * 100) })))
// one lesson: the factor that cost the most
const weakest = computed(() => {
  const r = props.result
  if (!r) return null
  const worst = PARTS.reduce((a, b) => (r.breakdown[b] < r.breakdown[a] ? b : a))
  return r.breakdown[worst] < 0.95 ? worst : null
})
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('gameDry.result.title')"
    icon="curing"
    icon-color="var(--amber)"
  >
    <div
      v-if="result"
      class="result"
    >
      <p class="name">
        {{ result.name }}
      </p>
      <div class="score">
        <span class="score-label">{{ t('gameDry.result.score') }}</span>
        <span class="score-value num">{{ score }}<span class="slash">/100</span></span>
      </div>
      <ul class="rows">
        <li
          v-for="r in rows"
          :key="r.key"
          class="row"
        >
          <span class="row-label">{{ t(`gameDry.result.${r.key}`) }}</span>
          <span class="row-value num">{{ r.value }} %</span>
          <div
            class="progress"
            aria-hidden="true"
          >
            <div :style="{ width: `${r.value}%` }" />
          </div>
        </li>
        <li class="row weight">
          <span class="row-label">{{ t('gameDry.result.weight') }}</span>
          <span class="row-value num">{{ formatNumber(result.dryG, 1) }} g</span>
        </li>
      </ul>
      <p
        v-if="weakest"
        class="tip"
      >
        {{ t(`gameDry.result.tip.${weakest}`) }}
      </p>
      <p class="note">
        {{ t('gameDry.result.note') }}
      </p>
    </div>
    <template #footer>
      <button
        type="button"
        class="btn btn-primary"
        @click="open = false"
      >
        {{ t('gameDry.result.done') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.name {
  margin: 0;
  font-size: 15px;
  color: var(--text-2);
}

.score {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slash {
  margin-left: 2px;
  font-size: 15px;
  color: var(--text-3);
}

.score-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.score-label {
  font-size: 13px;
  color: var(--text-3);
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}

.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  padding: 12px 14px;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row .progress {
  grid-column: 1 / -1;
  height: 4px;
}

.row-label {
  font-size: 14px;
  color: var(--text-2);
}

.row-value {
  font-size: 15px;
  font-weight: 600;
}

.tip {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-control);
  background: var(--lamp-soft);
  color: var(--amber);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
}

.note {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}
</style>
