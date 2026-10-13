<script setup lang="ts">
import type { ChallengeEntry } from '~/utils/challenge'

const props = defineProps<{ winners: ChallengeEntry[], title?: string }>()
const { t } = useI18n()

const slots = computed(() => props.winners.slice(0, 3).map((e, i) => ({ e, place: i + 1 })))
const name = (e: ChallengeEntry) => e.author?.display_name || e.author?.username || '—'
</script>

<template>
  <section
    class="podium-wrap card"
    :aria-label="t('challenge.winners')"
  >
    <p
      v-if="title"
      class="podium-title"
    >
      <UIcon name="i-tabler-trophy" />{{ title }}
    </p>
    <ol class="podium">
      <li
        v-for="s in slots"
        :key="s.e.id"
        class="cell"
        :class="`p${s.place}`"
      >
        <div class="shot">
          <img
            :src="s.e.image_url"
            :alt="s.e.caption || name(s.e)"
            loading="lazy"
          >
          <span class="place num">{{ s.place }}</span>
        </div>
        <NuxtLink
          v-if="s.e.author"
          :to="`/u/${s.e.author.username}`"
          class="who"
        >{{ name(s.e) }}</NuxtLink>
        <span
          v-else
          class="who"
        >{{ name(s.e) }}</span>
        <span class="votes num">{{ t('challenge.votes', { n: s.e.votes_count ?? 0 }) }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.podium-wrap {
  --bronze: #b08d57;
  overflow: hidden;
}

.podium-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.podium-title .iconify {
  font-size: 20px;
  color: var(--amber);
}

.podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 12px 10px 14px;
  text-align: center;
}

.cell + .cell {
  border-left: 1px solid var(--line);
}

.shot {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-2);
}

.shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.place {
  position: absolute;
  top: 6px;
  left: 6px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  color: var(--on-accent);
}

.p1 .place { background: var(--amber); }
.p2 .place { background: var(--text-2); }
.p3 .place { background: var(--bronze); }

.who {
  max-width: 100%;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.votes {
  font-size: 12px;
  color: var(--text-3);
}
</style>
