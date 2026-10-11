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
  padding: 10px 8px 12px 14px;
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
  line-height: 1.5;
  white-space: pre-line;
  overflow-wrap: anywhere;
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
  gap: 8px;
  padding-right: 6px;
}

.vote {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
  transition: background var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.vote .iconify {
  font-size: 18px;
}

.vote:active {
  transform: scale(0.95);
}

.vote.up.on {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--leaf);
}

.vote.down.on {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.22);
  color: var(--text);
}

.vote-icon {
  display: inline-flex;
}

.vote-icon.burst {
  animation: like-burst 420ms var(--ease-out);
}

@keyframes like-burst {
  0% { transform: scale(1); }
  35% { transform: scale(1.35) rotate(-10deg); }
  100% { transform: scale(1); }
}

.own {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-3);
  font-size: 13px;
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
