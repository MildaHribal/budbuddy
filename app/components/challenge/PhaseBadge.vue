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
.phase.entries { color: var(--green); }
.phase.voting { color: var(--amber); }
.phase.upcoming { color: var(--blue); }
.phase.finished { color: var(--text-2); }

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
