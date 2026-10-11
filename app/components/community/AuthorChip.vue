<script setup lang="ts">
import type { PublicAuthor } from '~/types/community'

const props = withDefaults(defineProps<{ author: (PublicAuthor & { first_grow?: boolean | null }) | null | undefined, size?: number, badge?: boolean }>(), { size: 28, badge: true })
const name = computed(() => props.author?.display_name?.trim() || props.author?.username || '?')
</script>

<template>
  <div
    v-if="author"
    class="author-chip"
  >
    <CommunityUserAvatar
      :url="author.avatar_url"
      :name="name"
      :size="size"
    />
    <span class="chip-text">
      <span class="chip-line">
        <NuxtLink
          :to="`/u/${author.username}`"
          class="chip-name"
        >{{ name }}</NuxtLink>
        <CommunityFeedRepBadge
          v-if="badge && author.reputation != null"
          :rep="author.reputation"
        />
        <CommunityFeedFirstGrowChip v-if="author.first_grow" />
      </span>
      <span
        v-if="$slots.default"
        class="chip-meta"
      ><slot /></span>
    </span>
  </div>
  <span
    v-else
    class="author-chip"
  >
    <CommunityUserAvatar
      name="?"
      :size="size"
    />
  </span>
</template>

<style scoped>
.author-chip {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  color: inherit;
}

.chip-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chip-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.chip-name {
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
  text-decoration: none;
}

/* the whole chip opens the profile; the level badge sits above it */
.chip-name::after {
  content: '';
  position: absolute;
  inset: 0;
}

.chip-meta {
  display: flex;
  gap: 5px;
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
}
</style>
