<script setup lang="ts">
import { stageInfo } from '~/utils/stages'
import { useFeedActions } from '~/utils/feed/actions'
import { authorName, CATEGORY_GLYPH, isHelp, isSolved, relTime, type Post } from '~/utils/feed/feed'

const props = defineProps<{
  post: Post
  /** full post on the detail page: no clamp, no link */
  detail?: boolean
}>()
const emit = defineEmits<{ edit: [post: Post], deleted: [post: Post], comment: [] }>()

const { t } = useI18n()
const { saved, toggleSave, share, deletePost } = useFeedActions()

const Link = resolveComponent('NuxtLink')
const to = computed(() => `/community/post/${props.post.id}`)
const name = computed(() => authorName(props.post.author))
const isSaved = computed(() => saved.value.has(props.post.id))
const plantStage = computed(() => (props.post.plant ? stageInfo(props.post.plant.stage) : null))
const help = computed(() => (isHelp(props.post) ? (isSolved(props.post) ? 'solved' : 'open') : null))
const solver = computed(() => props.post.solver?.author?.username ?? null)
const symptoms = computed(() => props.post.symptom_tags ?? [])

const expanded = ref(false)
const long = computed(() => props.post.body.length > 260 || props.post.body.split('\n').length > 5)
const clamped = computed(() => !props.detail && !expanded.value && long.value)

async function remove() {
  if (await deletePost(props.post)) emit('deleted', props.post)
}
</script>

<template>
  <article
    class="post card"
    :class="{ detail }"
  >
    <div
      v-if="post.is_hidden"
      class="removed"
      role="note"
    >
      <UIcon name="i-tabler-eye-off" />
      <span><strong>{{ t('feed.removed') }}</strong> {{ t('feed.removedText') }}</span>
    </div>

    <header class="head">
      <div
        v-if="post.author"
        class="who"
      >
        <CommunityUserAvatar
          :url="post.author.avatar_url"
          :name="name"
          :size="32"
        />
        <span class="who-text">
          <span class="who-line">
            <NuxtLink
              :to="`/u/${post.author.username}`"
              class="who-name"
            >{{ name }}</NuxtLink>
            <CommunityFeedRepBadge :rep="post.author.reputation" />
          </span>
          <span class="who-meta">
            <span class="who-handle">@{{ post.author.username }}</span>
            <span aria-hidden="true">·</span>
            <time
              :datetime="post.created_at"
              class="num"
            >{{ relTime(post.created_at) }}</time>
            <template v-if="post.edited_at">
              <span aria-hidden="true">·</span>
              <span>{{ t('feed.edited') }}</span>
            </template>
          </span>
        </span>
      </div>
      <CommunityReportMenu
        target-type="post"
        :target-id="post.id"
        :author-id="post.author_id"
        :author-name="name"
        @edit="emit('edit', post)"
        @delete="remove"
      />
    </header>

    <div class="tags">
      <span
        class="badge cat"
        :class="`cat-${post.category}`"
      >
        <GrowIcon :name="CATEGORY_GLYPH[post.category]" />
        {{ t(`feed.cats.${post.category}`) }}
      </span>
      <span
        v-if="help === 'open'"
        class="badge badge-attention"
      >
        {{ t('feed.help.needs') }}
      </span>
      <span
        v-else-if="help === 'solved'"
        class="badge solved"
      >
        <UIcon name="i-tabler-circle-check-filled" />
        {{ solver ? t('feed.help.solvedBy', { name: solver }) : t('feed.help.solved') }}
      </span>
      <CommunityFeedFirstGrowChip
        v-if="post.author?.first_grow"
        class="tag-first"
      />
      <span
        v-for="s in symptoms"
        :key="s"
        class="symptom"
      >{{ t(`feed.symptoms.${s}`) }}</span>
    </div>

    <component
      :is="detail ? 'div' : Link"
      v-bind="detail ? {} : { to }"
      class="content"
    >
      <h2
        v-if="post.title"
        class="title"
      >
        {{ post.title }}
      </h2>
      <p
        v-if="post.body"
        class="body"
        :class="{ clamped }"
      >
        {{ post.body }}
      </p>
    </component>
    <button
      v-if="!detail && long"
      type="button"
      class="link more"
      @click="expanded = !expanded"
    >
      {{ expanded ? t('feed.less') : t('feed.more') }}
    </button>

    <CommunityFeedImageGrid
      v-if="post.images.length"
      :images="post.images"
      :title="post.title"
      class="media"
    />

    <NuxtLink
      v-if="post.plant"
      :to="`/plant/${post.plant.id}`"
      class="plant-chip"
    >
      <span
        class="plant-thumb"
        :style="{ color: plantStage?.color }"
      >
        <img
          v-if="post.plant.cover_url"
          :src="post.plant.cover_url"
          alt=""
          loading="lazy"
        >
        <GrowIcon
          v-else
          :name="plantStage?.glyph ?? 'vegetative'"
        />
      </span>
      <span class="plant-text">
        <strong>{{ post.plant.name }}</strong>
        <span>{{ [post.plant.strain, plantStage?.label].filter(Boolean).join(' · ') }}</span>
      </span>
      <UIcon
        name="i-tabler-chevron-right"
        class="plant-chev"
      />
    </NuxtLink>

    <CommunityFeedPlantContext
      v-if="post.plant_context"
      :ctx="post.plant_context"
      :compact="!detail"
    />

    <footer class="actions">
      <CommunityFeedReactionBar :post="post" />
      <component
        :is="detail ? 'button' : Link"
        v-bind="detail ? { type: 'button' } : { to: `${to}#comments` }"
        class="act"
        :aria-label="t('feed.comments', { n: post.comments_count })"
        @click="detail && emit('comment')"
      >
        <UIcon name="i-tabler-message-circle" />
        <span
          class="num"
          aria-hidden="true"
        >{{ post.comments_count }}</span>
      </component>
      <span class="spacer" />
      <button
        type="button"
        class="act"
        :class="{ on: isSaved, saved: isSaved }"
        :aria-pressed="isSaved"
        :aria-label="t('feed.save')"
        @click="toggleSave(post)"
      >
        <UIcon :name="isSaved ? 'i-tabler-bookmark-filled' : 'i-tabler-bookmark'" />
      </button>
      <button
        type="button"
        class="act"
        :aria-label="t('feed.share')"
        @click="share(post)"
      >
        <UIcon name="i-tabler-share-2" />
      </button>
    </footer>
  </article>
</template>

<style scoped>
.post {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 12px 4px 14px;
}

.removed {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  color: var(--red);
  font-size: 12px;
  line-height: 1.4;
}

.removed .iconify {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 15px;
}

.head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-right: -6px;
}

.who {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
}

.who-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.who-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.who-name {
  min-width: 5ch;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
  text-decoration: none;
}

/* stretched link: the whole author block opens the profile */
.who-name::after {
  content: '';
  position: absolute;
  inset: 0;
}

.who-meta {
  display: flex;
  gap: 5px;
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
}

.who-handle {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat {
  color: var(--text-2);
}

.cat .grow-icon,
.cat .iconify {
  font-size: 13px;
}

.cat-question {
  color: var(--blue);
}

.cat-harvest {
  color: var(--amber);
}

.cat-problem {
  color: var(--red);
}

.cat-plants,
.cat-outdoor {
  color: var(--green);
}

.solved {
  color: var(--green);
}

.solved .iconify {
  font-size: 13px;
}

.symptom {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-2);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: inherit;
  text-decoration: none;
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
  text-wrap: pretty;
}

.detail .title {
  font-size: 19px;
}

.body {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  color: var(--text-2);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.detail .body {
  color: var(--text);
}

.body.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.more {
  align-self: flex-start;
  margin-top: -10px;
  min-height: 44px;
}

.media {
  margin: 2px 0;
}

.plant-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 6px 10px 6px 6px;
  border-radius: var(--radius-control);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.plant-chip:active {
  transform: scale(0.98);
}

.plant-thumb {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  font-size: 22px;
}

.plant-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plant-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.plant-text strong {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-text span {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-chev {
  color: var(--text-3);
}

.actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 0 -6px 0 -8px;
  border-top: 1px solid var(--line);
  padding-top: 2px;
}

.spacer {
  flex: 1;
}

.act {
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
  text-decoration: none;
  justify-content: center;
  transition: color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.act .iconify {
  font-size: 20px;
}

.act:active {
  transform: scale(0.92);
}

.act.on {
  color: var(--green);
}
</style>
