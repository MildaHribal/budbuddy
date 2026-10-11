<script setup lang="ts">
import { authorName, relTime, type Comment } from '~/utils/feed/feed'

const props = defineProps<{
  comment: Comment
  liked: boolean
  accepted?: boolean
  /** viewer owns the question and may pick the best answer */
  canAccept?: boolean
  reply?: boolean
  /** draw attention to the accept control (?solve=1) */
  nudge?: boolean
}>()
const emit = defineEmits<{ like: [], reply: [], delete: [], accept: [], save: [body: string] }>()

const { t } = useI18n()
const name = computed(() => (props.comment.is_ai ? t('feed.detail.ai') : authorName(props.comment.author)))

const editing = ref(false)
const draft = ref('')
function startEdit() {
  draft.value = props.comment.body
  editing.value = true
}
function saveEdit() {
  const body = draft.value.trim()
  if (!body) return
  emit('save', body)
  editing.value = false
}
</script>

<template>
  <div
    class="comment"
    :class="{ accepted, reply, ai: comment.is_ai }"
  >
    <NuxtLink
      v-if="comment.author && !comment.is_ai"
      :to="`/u/${comment.author.username}`"
      class="avatar-link"
      :aria-label="name"
    >
      <CommunityUserAvatar
        :url="comment.author.avatar_url"
        :name="name"
        :size="reply ? 28 : 34"
      />
    </NuxtLink>
    <span
      v-else
      class="ai-avatar"
      :class="{ sm: reply }"
      aria-hidden="true"
    >
      <GrowIcon name="spark" />
    </span>

    <div class="main">
      <div class="meta">
        <span class="name">{{ name }}</span>
        <span
          v-if="comment.is_ai"
          class="badge ai-badge"
        >{{ t('feed.detail.aiBadge') }}</span>
        <template v-else-if="comment.author">
          <CommunityFeedRepBadge :rep="comment.author.reputation" />
          <CommunityFeedFirstGrowChip v-if="comment.author.first_grow" />
        </template>
        <time
          class="time num"
          :datetime="comment.created_at"
        >{{ relTime(comment.created_at) }}</time>
        <span class="grow" />
        <CommunityReportMenu
          target-type="comment"
          :target-id="comment.id"
          :author-id="comment.author_id"
          :author-name="name"
          @edit="startEdit"
          @delete="emit('delete')"
        />
      </div>

      <p
        v-if="accepted"
        class="best"
      >
        <UIcon name="i-tabler-circle-check-filled" />
        {{ t('feed.detail.bestAnswer') }}
      </p>

      <form
        v-if="editing"
        class="edit"
        @submit.prevent="saveEdit"
      >
        <textarea
          v-model="draft"
          class="input"
          maxlength="2000"
          rows="2"
          lang="en"
        />
        <div class="edit-actions">
          <button
            type="button"
            class="btn btn-ghost"
            @click="editing = false"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="submit"
            class="btn btn-soft"
            :disabled="!draft.trim()"
          >
            {{ t('common.save') }}
          </button>
        </div>
      </form>
      <p
        v-else
        class="body"
      >
        {{ comment.body }}
      </p>

      <div class="actions">
        <button
          type="button"
          class="act"
          :class="{ on: liked }"
          :aria-pressed="liked"
          :aria-label="t('feed.react.count', { label: t('feed.like'), n: comment.likes_count })"
          @click="emit('like')"
        >
          <UIcon :name="liked ? 'i-tabler-heart-filled' : 'i-tabler-heart'" />
          <span
            v-if="comment.likes_count"
            class="num"
            aria-hidden="true"
          >{{ comment.likes_count }}</span>
        </button>
        <button
          type="button"
          class="act"
          @click="emit('reply')"
        >
          {{ t('feed.detail.reply') }}
        </button>
        <button
          v-if="canAccept"
          type="button"
          class="act accept"
          :class="{ on: accepted, nudge: nudge && !accepted }"
          :aria-pressed="accepted"
          @click="emit('accept')"
        >
          <UIcon :name="accepted ? 'i-tabler-circle-check-filled' : 'i-tabler-circle-check'" />
          {{ accepted ? t('feed.detail.unmarkBest') : t('feed.detail.markBest') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment {
  display: flex;
  gap: 10px;
  padding: 12px 0 2px;
}

.comment.accepted {
  margin: 0 -12px;
  padding: 12px 12px 2px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(155, 227, 107, 0.09), rgba(155, 227, 107, 0.03));
  border: 1px solid var(--accent-line);
}

.avatar-link {
  position: relative;
  display: inline-flex;
  align-self: flex-start;
  border-radius: 50%;
}

/* 44px hit area around the small avatar */
.avatar-link::after {
  content: '';
  position: absolute;
  inset: -8px;
}

.ai-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--lamp-soft);
  border: 1px solid rgba(255, 210, 138, 0.3);
  color: var(--lamp);
  font-size: 18px;
}

.ai-avatar.sm {
  width: 28px;
  height: 28px;
  font-size: 15px;
}

.main {
  flex: 1;
  min-width: 0;
}

.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  margin: -6px -8px 0 0;
}

.name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.ai-badge {
  color: var(--lamp);
}

.time {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.grow {
  flex: 1;
}

.best {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--leaf);
}

.body {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.45;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit textarea {
  min-height: 72px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.edit-actions .btn {
  min-height: 44px;
  padding: 0 14px;
  font-size: 13px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-left: -10px;
}

.act {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
  justify-content: center;
  transition: color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.act .iconify {
  font-size: 17px;
}

.act:active {
  transform: scale(0.94);
}

.act.on {
  color: var(--leaf);
}

.act.nudge {
  color: var(--leaf);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent-line);
  animation: nudge 1.6s var(--ease-out) 3;
}

@keyframes nudge {
  0%, 100% { box-shadow: inset 0 0 0 1px var(--accent-line), 0 0 0 0 rgba(155, 227, 107, 0.4); }
  50% { box-shadow: inset 0 0 0 1px var(--accent-line), 0 0 0 6px rgba(155, 227, 107, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .act.nudge {
    animation: none;
  }
}
</style>
