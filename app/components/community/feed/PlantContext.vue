<script setup lang="ts">
import { formatDate } from '~/utils/date'
import { stageInfo } from '~/utils/stages'
import type { PlantContext } from '~/utils/feed/feed'

const props = defineProps<{ ctx: PlantContext, compact?: boolean }>()
const { t } = useI18n()

const stage = computed(() => (props.ctx.stage ? stageInfo(props.ctx.stage) : null))
const facts = computed(() => [props.ctx.medium, props.ctx.environment, props.ctx.type].filter(Boolean).join(' · '))
const feed = computed(() => {
  const f = props.ctx.lastFeed
  if (!f) return null
  return [formatDate(f.date, { day: 'numeric', month: 'short' }), f.ph != null ? `pH ${f.ph}` : null, f.ec != null ? `EC ${f.ec}` : null].filter(Boolean).join(' · ')
})
</script>

<template>
  <div
    class="ctx"
    :class="{ compact }"
  >
    <div class="ctx-head">
      <span
        v-if="stage"
        class="ctx-stage"
        :style="{ color: stage.color }"
      >
        <GrowIcon :name="stage.glyph" />
      </span>
      <div class="ctx-title">
        <strong>{{ ctx.strain || ctx.name || t('feed.context.title') }}</strong>
        <span class="num">
          <template v-if="stage">{{ stage.label }}</template>
          <template v-if="ctx.day != null"> · {{ t('feed.context.day', { n: ctx.day }) }}</template>
          <template v-if="ctx.dayInStage != null && !compact"> · {{ t('feed.context.inStage', { n: ctx.dayInStage }) }}</template>
        </span>
      </div>
    </div>
    <dl
      v-if="!compact"
      class="ctx-list"
    >
      <template v-if="facts">
        <dt>{{ t('feed.context.setup') }}</dt>
        <dd>{{ facts }}</dd>
      </template>
      <template v-if="ctx.lastWater">
        <dt>{{ t('feed.context.lastWater') }}</dt>
        <dd class="num">
          {{ formatDate(ctx.lastWater, { day: 'numeric', month: 'short' }) }}
        </dd>
      </template>
      <template v-if="feed">
        <dt>{{ t('feed.context.lastFeed') }}</dt>
        <dd class="num">
          {{ feed }}
        </dd>
      </template>
      <template v-if="ctx.notes?.length">
        <dt>{{ t('feed.context.notes') }}</dt>
        <dd>
          <p
            v-for="(n, i) in ctx.notes"
            :key="i"
          >
            {{ n }}
          </p>
        </dd>
      </template>
    </dl>
  </div>
</template>

<style scoped>
.ctx {
  padding: 12px 14px;
  border-radius: 14px;
  background: #0b0d10;
  border: 1px solid var(--line);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}

.ctx.compact {
  padding: 8px 12px;
}

.ctx-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctx-stage {
  display: inline-flex;
  font-size: 22px;
}

.compact .ctx-stage {
  font-size: 18px;
}

.ctx-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.ctx-title strong {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ctx-title span {
  font-size: 12px;
  color: var(--text-3);
}

.ctx-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 12px 0 0;
  font-size: 13px;
}

dt {
  color: var(--text-3);
}

dd {
  margin: 0;
  min-width: 0;
  color: var(--text-2);
  text-transform: none;
}

dd p {
  margin: 0 0 4px;
  line-height: 1.4;
}
</style>
