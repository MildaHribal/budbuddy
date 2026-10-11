<script setup lang="ts">
import type { ChallengePhase } from '~/utils/challenge'

defineProps<{ phase: ChallengePhase }>()
const { t } = useI18n()
</script>

<template>
  <span
    class="badge phase"
    :class="phase"
  >
    <span
      class="dot"
      aria-hidden="true"
    />
    {{ t(`challenge.phase.${phase}`) }}
  </span>
</template>

<style scoped>
.phase.entries { color: var(--leaf); }
.phase.voting { color: var(--lamp); }
.phase.upcoming { color: var(--info); }
.phase.finished { color: var(--text-3); }

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.entries .dot,
.voting .dot {
  box-shadow: 0 0 8px currentColor;
  animation: pulse 2.4s ease-in-out infinite;
}

@keyframes pulse {
  50% { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .dot { animation: none !important; }
}
</style>
