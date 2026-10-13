<script setup lang="ts">
import { challengePhase, phaseDeadline, splitDuration, type Challenge } from '~/utils/challenge'

const props = defineProps<{ challenge: Challenge }>()
const emit = defineEmits<{ phase: [] }>()
const { t } = useI18n()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => timer && clearInterval(timer))

const phase = computed(() => challengePhase(props.challenge, now.value))
watch(phase, () => emit('phase'))
const deadline = computed(() => phaseDeadline(props.challenge, now.value))
const parts = computed(() => splitDuration(deadline.value ? Date.parse(deadline.value) - now.value : 0))
const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <div
    v-if="deadline"
    class="countdown"
  >
    <span class="cd-label">{{ t(`challenge.countdown.${phase}`) }}</span>
    <span
      class="cd-value num"
      role="timer"
    >
      <template v-if="parts.d">{{ parts.d }}<small>{{ t('challenge.unit.d') }}</small></template>
      {{ pad(parts.h) }}<small>{{ t('challenge.unit.h') }}</small>
      {{ pad(parts.m) }}<small>{{ t('challenge.unit.m') }}</small>
      <template v-if="!parts.d">{{ pad(parts.s) }}<small>{{ t('challenge.unit.s') }}</small></template>
    </span>
  </div>
</template>

<style scoped>
.countdown {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cd-label {
  font-size: 13px;
  color: var(--text-3);
}

.cd-value {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--text);
}

.cd-value small {
  margin: 0 6px 0 2px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--text-3);
}
</style>
