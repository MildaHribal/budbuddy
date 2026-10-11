<script setup lang="ts">
import type { ChallengeEntry } from '~/utils/challenge'

const props = defineProps<{ winners: ChallengeEntry[], title?: string }>()
const { t } = useI18n()

// visual order 2 · 1 · 3
const slots = computed(() => {
  const [a, b, c] = props.winners
  return [b && { e: b, place: 2 }, a && { e: a, place: 1 }, c && { e: c, place: 3 }].filter(Boolean) as { e: ChallengeEntry, place: number }[]
})
const name = (e: ChallengeEntry) => e.author?.display_name || e.author?.username || '—'
</script>

<template>
  <section
    class="podium-wrap"
    :aria-label="t('challenge.winners')"
  >
    <div
      class="lamp-glow"
      aria-hidden="true"
    />
    <p
      v-if="title"
      class="podium-title"
    >
      <GrowIcon
        name="lamp"
        glow
      />{{ title }}
    </p>
    <ol class="podium">
      <li
        v-for="s in slots"
        :key="s.e.id"
        class="step"
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
        <span class="votes num">{{ t('challenge.votes', { n: s.e.votes_count }) }}</span>
        <div
          class="block"
          aria-hidden="true"
        />
      </li>
    </ol>
  </section>
</template>

<style scoped>
.podium-wrap {
  position: relative;
  padding: 18px 12px 0;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: linear-gradient(180deg, #1b1a16 0%, #121417 100%);
  box-shadow: var(--panel-shadow);
  overflow: hidden;
  isolation: isolate;
}

.lamp-glow {
  position: absolute;
  inset: -40% 10% auto;
  height: 80%;
  z-index: -1;
  background: radial-gradient(50% 50% at 50% 50%, rgba(255, 210, 138, 0.32), rgba(255, 210, 138, 0.08) 55%, transparent 75%);
  animation: lights-on 1.6s var(--ease-out) both;
}

.podium-wrap::before {
  content: '';
  position: absolute;
  top: 0;
  left: 25%;
  right: 25%;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: var(--lamp);
  box-shadow: var(--glow-lamp);
  animation: flicker 1.1s steps(1) both;
}

@keyframes flicker {
  0% { opacity: 0; }
  12% { opacity: 1; }
  20% { opacity: 0.2; }
  32% { opacity: 1; }
  40% { opacity: 0.5; }
  52%, 100% { opacity: 1; }
}

@keyframes lights-on {
  0%, 35% { opacity: 0; transform: scaleY(0.6); }
  100% { opacity: 1; transform: none; }
}

.podium-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 4px 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--lamp);
}

.podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: end;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  animation: rise var(--dur-slow) var(--ease-out) both;
}

.p1 { grid-column: 2; grid-row: 1; animation-delay: 0.9s; }
.p2 { grid-column: 1; grid-row: 1; animation-delay: 1.05s; }
.p3 { grid-column: 3; grid-row: 1; animation-delay: 1.2s; }

.shot {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--line-strong);
}

.p1 .shot {
  border-color: rgba(255, 210, 138, 0.55);
  box-shadow: 0 0 24px -4px rgba(255, 210, 138, 0.5);
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
  background: rgba(7, 8, 10, 0.72);
  backdrop-filter: blur(6px);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.p1 .place {
  background: var(--lamp);
  color: #1a1206;
}

.who {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.votes {
  font-size: 11px;
  color: var(--text-3);
}

.block {
  width: 100%;
  margin-top: 6px;
  border-radius: 10px 10px 0 0;
  background: linear-gradient(180deg, #262a30, #181b1f);
  border: 1px solid var(--line);
  border-bottom: 0;
  box-shadow: inset 0 1px 0 var(--highlight);
}

.p1 .block {
  height: 54px;
  background: linear-gradient(180deg, rgba(255, 210, 138, 0.22), #1b1a16);
  border-color: rgba(255, 210, 138, 0.28);
}

.p2 .block { height: 36px; }
.p3 .block { height: 22px; }

@media (prefers-reduced-motion: reduce) {
  .lamp-glow,
  .podium-wrap::before,
  .step {
    animation: none;
  }
}
</style>
