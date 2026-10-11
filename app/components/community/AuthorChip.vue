<script setup lang="ts">
import type { PublicAuthor } from '~/types/community'

const props = withDefaults(defineProps<{ author: PublicAuthor | null | undefined, size?: number, badge?: boolean }>(), { size: 28, badge: true })
const name = computed(() => props.author?.display_name?.trim() || props.author?.username || '?')
</script>

<template>
  <NuxtLink
    v-if="author"
    :to="`/u/${author.username}`"
    class="author-chip"
  >
    <CommunityUserAvatar
      :url="author.avatar_url"
      :name="name"
      :size="size"
    />
    <span class="chip-text">
      <span class="chip-line">
        <span class="chip-name">{{ name }}</span>
        <CommunityFeedRepBadge
          v-if="badge && author.reputation != null"
          :rep="author.reputation"
        />
      </span>
      <span
        v-if="$slots.default"
        class="chip-meta"
      ><slot /></span>
    </span>
  </NuxtLink>
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
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  color: inherit;
  text-decoration: none;
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
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
