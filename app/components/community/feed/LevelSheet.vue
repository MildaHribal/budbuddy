<script setup lang="ts">
import { growerLevel, LEVELS } from '~/utils/grower'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ rep: number }>()

const { t } = useI18n()
const current = computed(() => growerLevel(props.rep))
const nextLevel = computed(() => LEVELS[current.value.tier + 1] ?? null)
const progress = computed(() => {
  const lo = LEVELS[current.value.tier]!.min
  const hi = nextLevel.value?.min
  return hi ? Math.min(1, (props.rep - lo) / (hi - lo)) : 1
})
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('feed.levelSheet.title')"
  >
    <div class="levels">
      <p class="intro">
        {{ t('feed.levelSheet.intro') }}
      </p>

      <div class="now">
        <div class="now-row">
          <span class="now-name">{{ current.label }}</span>
          <span class="now-rep num">{{ t('feed.levelSheet.rep', { n: rep }) }}</span>
        </div>
        <div
          class="progress"
          role="progressbar"
          :aria-valuenow="Math.round(progress * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="current.label"
        >
          <div :style="{ width: `${Math.max(4, progress * 100)}%` }" />
        </div>
        <p class="now-next">
          {{ nextLevel ? t('feed.levelSheet.toNext', { n: nextLevel.min - rep, level: t(`feed.levels.${nextLevel.id}`) }) : t('feed.levelSheet.top') }}
        </p>
      </div>

      <ol class="ladder">
        <li
          v-for="(l, i) in LEVELS"
          :key="l.id"
          class="rung"
          :class="{ here: i === current.tier, reached: i <= current.tier }"
          :style="{ '--c': l.color }"
        >
          <span class="dot" />
          <span class="rung-text">
            <span class="rung-line">
              <strong>{{ t(`feed.levels.${l.id}`) }}</strong>
              <span class="rung-min num">{{ t('feed.levelSheet.rep', { n: l.min }) }}</span>
              <span
                v-if="i === current.tier"
                class="badge you"
              >{{ t('feed.levelSheet.you') }}</span>
            </span>
            <span class="rung-perk">{{ t(`feed.levelSheet.perks.${l.id}`) }}</span>
          </span>
        </li>
      </ol>

      <p class="how">
        <GrowIcon name="i-tabler-trending-up" />
        <span>{{ t('feed.levelSheet.how') }}</span>
      </p>
    </div>
  </BottomSheet>
</template>

<style scoped>
.levels {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 12px;
}

.intro {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.now {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.now-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.now-name {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.now-rep {
  font-size: 13px;
  color: var(--text-3);
}

.now-next {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

.ladder {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.rung {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 10px 0;
}

.rung:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 26px;
  bottom: -8px;
  width: 1px;
  background: var(--line-strong);
}

.dot {
  flex-shrink: 0;
  width: 11px;
  height: 11px;
  margin-top: 4px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
  background: var(--surface);
}

.reached .dot {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 30%, transparent);
}

.here .dot {
  background: var(--c);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 60%, transparent);
}

.rung-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rung-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rung-line strong {
  font-size: 15px;
  font-weight: 600;
}

.rung:not(.reached) .rung-line strong {
  color: var(--text-2);
}

.rung-min {
  font-size: 12px;
  color: var(--text-3);
}

.you {
  color: var(--leaf);
}

.rung-perk {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-3);
}

.how {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--accent-line);
  background: var(--accent-soft);
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.how .grow-icon {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 18px;
  color: var(--leaf);
}
</style>
