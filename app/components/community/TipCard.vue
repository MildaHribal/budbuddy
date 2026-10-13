<script setup lang="ts">
import type { PublicAuthor } from '~/types/community'

export interface TipRow {
  id: string
  author_id: string
  body: string
  stage: string | null
  medium: string | null
  environment: string | null
  helpful_count: number
  unhelpful_count: number
  score: number
  created_at: string
  author: PublicAuthor | null
}

const props = defineProps<{ tip: TipRow, vote?: number, mine?: boolean }>()
const emit = defineEmits<{ vote: [value: 1 | -1], edit: [], delete: [] }>()
const { t } = useI18n()

const authorName = computed(() => props.tip.author?.display_name || props.tip.author?.username || '?')
const stage = computed(() => (isStageId(props.tip.stage) ? stageInfo(props.tip.stage) : null))
const burst = ref(0)
const share = computed(() => helpfulShare(props.tip.helpful_count, props.tip.unhelpful_count))

function onVote(v: 1 | -1) {
  if (v === 1 && props.vote !== 1) burst.value++
  emit('vote', v)
}
</script>

<template>
  <article class="card tip-card">
    <header class="tip-head">
      <CommunityAuthorChip :author="tip.author">
        <time
          :datetime="tip.created_at"
          class="num"
        >{{ communityAgo(tip.created_at) }}</time>
      </CommunityAuthorChip>
      <CommunityReportMenu
        target-type="tip"
        :target-id="tip.id"
        :author-id="tip.author_id"
        :author-name="authorName"
        @edit="emit('edit')"
        @delete="emit('delete')"
      />
    </header>

    <p class="tip-body">
      {{ tip.body }}
    </p>

    <p
      class="share"
      :class="{ strong: share && share.n >= 5 && share.pct >= 75 }"
    >
      <template v-if="share">
        <span
          class="meter"
          aria-hidden="true"
        ><i :style="{ transform: `scaleX(${share.pct / 100})` }" /></span>
        <span class="num">{{ t('tips.helpfulTo', { pct: share.pct, n: share.n }) }}</span>
      </template>
      <span v-else>{{ t('tips.notRated') }}</span>
    </p>

    <div class="tip-tags">
      <span
        v-if="stage"
        class="badge"
        :style="{ color: stage.color }"
      >
        <GrowIcon
          :name="stage.glyph"
          class="text-[13px]"
        />{{ stage.label }}
      </span>
      <span
        v-if="tip.medium"
        class="badge tag"
      >{{ t(`tips.mediums.${tip.medium}`) }}</span>
      <span
        v-if="tip.environment"
        class="badge tag"
      >{{ t(`tips.envs.${tip.environment}`) }}</span>
    </div>

    <footer class="tip-foot">
      <template v-if="mine">
        <span class="own">
          <UIcon name="i-tabler-thumb-up" />
          <span class="num">{{ tip.helpful_count }}</span>
          <span class="sep" />
          <UIcon name="i-tabler-thumb-down" />
          <span class="num">{{ tip.unhelpful_count }}</span>
        </span>
        <span class="own-label">{{ t('tips.yours') }}</span>
      </template>
      <template v-else>
        <button
          type="button"
          class="vote up"
          :class="{ on: vote === 1 }"
          :aria-pressed="vote === 1"
          :aria-label="`${t('tips.helpful')} (${tip.helpful_count})`"
          @click="onVote(1)"
        >
          <span
            :key="burst"
            class="vote-icon"
            :class="{ burst: burst > 0 && vote === 1 }"
          >
            <UIcon :name="vote === 1 ? 'i-tabler-thumb-up-filled' : 'i-tabler-thumb-up'" />
          </span>
          <span class="vote-label">{{ t('tips.helpful') }}</span>
          <span class="num">{{ tip.helpful_count }}</span>
        </button>
        <button
          type="button"
          class="vote down"
          :class="{ on: vote === -1 }"
          :aria-pressed="vote === -1"
          :aria-label="`${t('tips.unhelpful')} (${tip.unhelpful_count})`"
          @click="onVote(-1)"
        >
          <UIcon :name="vote === -1 ? 'i-tabler-thumb-down-filled' : 'i-tabler-thumb-down'" />
          <span class="num">{{ tip.unhelpful_count }}</span>
        </button>
      </template>
    </footer>
  </article>
</template>

<style scoped>
.tip-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 8px 6px 14px;
}

.tip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tip-body {
  margin: 0;
  padding-right: 6px;
  font-size: 15px;
  line-height: 1.45;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.share {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -2px 0 0;
  color: var(--text-3);
  font-size: 12px;
}

.share.strong {
  color: var(--text-2);
}

.meter {
  flex-shrink: 0;
  width: 36px;
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--track);
}

.meter i {
  display: block;
  height: 100%;
  background: var(--green);
  transform-origin: left;
  transition: transform var(--dur-slow) var(--ease-out);
}

.tip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tip-tags:empty {
  display: none;
}

.tag {
  color: var(--text-2);
}

.tip-foot {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 0 0 0 -10px;
  padding-right: 6px;
  border-top: 1px solid var(--line);
  padding-top: 2px;
}

.vote {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-control);
  background: none;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 600;
  transition: color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.vote .iconify {
  font-size: 20px;
}

.vote:active {
  transform: scale(0.95);
}

.vote.up.on {
  color: var(--green);
}

.vote.down.on {
  color: var(--text);
}

.vote-icon {
  display: inline-flex;
}

.vote-icon.burst {
  animation: like-burst 360ms var(--ease-out);
}

@keyframes like-burst {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

.own {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 44px;
  padding-left: 10px;
  color: var(--text-3);
  font-size: 13px;
}

.own .iconify {
  font-size: 18px;
}

.own .sep {
  width: 8px;
}

.own-label {
  margin-left: auto;
  color: var(--text-3);
  font-size: 12px;
}
</style>
