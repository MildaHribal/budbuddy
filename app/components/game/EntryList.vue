<script setup lang="ts">
import type { GameState } from '~~/shared/game/types'
import { BREED_LEVEL, CHALLENGE_LEVEL } from '~/utils/gameUi'

const props = defineProps<{ state: GameState }>()
const { t } = useI18n()

const rows = computed(() => {
  const s = props.state
  const drying = s.drying.filter(b => !b.done).length
  const jars = s.jars.filter(j => !j.done).length
  return [
    { id: 'shop', to: '/game/shop', icon: 'i-tabler-shopping-bag', tone: 'var(--green)', desc: t('game.more.shopDesc'), lock: 0 },
    {
      id: 'dry',
      to: '/game/dry',
      icon: 'drying',
      tone: '#d9a06a',
      desc: drying || jars ? t('game.more.dryBusy', { batches: drying, jars }) : t('game.more.dryDesc'),
      lock: 0
    },
    {
      id: 'knowledge',
      to: '/game/knowledge',
      icon: 'i-tabler-books',
      tone: '#8ea6f5',
      desc: t('game.more.knowledgeDesc', { problems: s.knowledge.length, harvests: s.history.length }),
      lock: 0
    },
    { id: 'challenge', to: '/game/challenge', icon: 'i-tabler-trophy', tone: 'var(--amber)', desc: t('game.more.challengeDesc'), lock: CHALLENGE_LEVEL },
    { id: 'breed', to: '/game/breed', icon: 'i-tabler-dna-2', tone: '#b58cf5', desc: t('game.more.breedDesc'), lock: BREED_LEVEL }
  ].map(r => ({ ...r, locked: s.level < r.lock }))
})
</script>

<template>
  <section aria-labelledby="g-more">
    <div class="section-head">
      <h2
        id="g-more"
        class="section-title"
      >
        {{ t('game.more.title') }}
      </h2>
    </div>
    <nav
      class="card rows"
      aria-labelledby="g-more"
    >
      <template
        v-for="r in rows"
        :key="r.id"
      >
        <div
          v-if="r.locked"
          class="row locked"
        >
          <span class="tile">
            <UIcon name="i-tabler-lock" />
          </span>
          <span class="text">
            <span class="title">{{ t(`game.more.${r.id}`) }}</span>
            <span class="desc">{{ t('game.more.locked', { n: r.lock }) }}</span>
          </span>
        </div>
        <NuxtLink
          v-else
          :to="r.to"
          class="row"
        >
          <span
            class="tile"
            :style="{ color: r.tone }"
          >
            <GrowIcon :name="r.icon" />
          </span>
          <span class="text">
            <span class="title">{{ t(`game.more.${r.id}`) }}</span>
            <span class="desc">{{ r.desc }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="size-5 go"
          />
        </NuxtLink>
      </template>
    </nav>
  </section>
</template>

<style scoped>
.rows {
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 14px;
  color: inherit;
  text-decoration: none;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.tile {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, currentColor 14%, var(--surface));
  font-size: 22px;
}

.locked .tile {
  color: var(--text-3);
  font-size: 18px;
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 15px;
  font-weight: 600;
}

.locked .title {
  color: var(--text-2);
}

.desc {
  font-size: 13px;
  color: var(--text-2);
}

.locked .desc {
  color: var(--text-3);
}

.go {
  color: var(--text-3);
  flex-shrink: 0;
}
</style>
