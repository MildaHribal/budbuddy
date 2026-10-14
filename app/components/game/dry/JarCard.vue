<script setup lang="ts">
import type { CureJar } from '~~/shared/game/types'
import { MIN_CURE_H } from '~~/shared/game/drying'
import { durationParts, jarStatus } from '~~/shared/game/drying/view'

const props = defineProps<{ jar: CureJar, name: string, nowH: number, due: boolean, nextBurpH: number, feedback: string | null }>()
const emit = defineEmits<{ burp: [], finish: [] }>()
const { t } = useI18n()

const status = computed(() => jarStatus(props.jar, props.due))
const rh = computed(() => Math.round(props.jar.jarRh))
const age = computed(() => props.nowH - props.jar.startedAtH)
const canFinish = computed(() => age.value >= MIN_CURE_H)
const curePct = computed(() => Math.round(props.jar.cureQuality * 100))
const attention = computed(() => status.value === 'wet' || status.value === 'burp' || status.value === 'stale')

const dur = (h: number) => {
  const d = durationParts(h)
  return t(`gameDry.time.${d.key}`, { h: d.h, m: d.m })
}
</script>

<template>
  <article
    class="card jar"
    :aria-labelledby="`j-${jar.id}`"
  >
    <header class="top">
      <h3
        :id="`j-${jar.id}`"
        class="name"
      >
        {{ name }}
      </h3>
      <span
        class="badge"
        :class="attention ? 'burp' : 'curing'"
      >{{ t(attention ? 'gameDry.badge.burp' : 'gameDry.badge.curing') }}</span>
    </header>

    <div class="body">
      <GameDryJarArt
        class="art"
        :rh="jar.jarRh"
        :label="t('gameDry.art.jar', { rh })"
      />
      <div class="reading">
        <span class="label">{{ t('gameDry.jar.air') }}</span>
        <span
          class="rh num"
          :class="status"
        >{{ rh }} %</span>
        <p
          class="status"
          :class="status"
        >
          {{ t(`gameDry.jar.status.${status}`, { time: dur(nextBurpH) }) }}
        </p>
      </div>
    </div>

    <div class="cure">
      <div class="cure-head">
        <span class="cure-label num">{{ t('gameDry.jar.cure', { pct: curePct }) }}</span>
        <span class="cure-age">{{ t('gameDry.jar.curing', { time: dur(age) }) }}</span>
      </div>
      <div
        class="progress"
        role="progressbar"
        :aria-label="t('gameDry.jar.cure', { pct: curePct })"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="curePct"
      >
        <div :style="{ width: `${curePct}%` }" />
      </div>
    </div>

    <p
      class="feedback"
      role="status"
      v-text="feedback ?? ''"
    />

    <div class="actions">
      <button
        type="button"
        class="btn"
        :class="attention ? 'btn-lamp' : ''"
        @click="emit('burp')"
      >
        {{ t('gameDry.jar.burp') }}
      </button>
      <button
        type="button"
        class="btn"
        :class="canFinish && curePct >= 60 ? 'btn-primary' : ''"
        :disabled="!canFinish"
        :aria-describedby="canFinish ? undefined : `f-${jar.id}`"
        @click="emit('finish')"
      >
        {{ t('gameDry.jar.finish') }}
      </button>
    </div>
    <p
      v-if="!canFinish"
      :id="`f-${jar.id}`"
      class="hint"
    >
      {{ t('gameDry.jar.finishIn', { time: dur(MIN_CURE_H - age) }) }}
    </p>
  </article>
</template>

<style scoped>
.jar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.name {
  margin: 0;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge.curing {
  color: var(--amber);
}

.badge.burp {
  color: var(--amber);
  background: var(--lamp-soft);
}

.body {
  display: flex;
  gap: 14px;
  align-items: center;
}

.art {
  flex: none;
  width: 84px;
}

.reading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.rh {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.rh.wet {
  color: var(--red);
}

.rh.burp {
  color: var(--amber);
}

.status {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.status.wet {
  color: var(--red);
}

.status.burp,
.status.stale {
  color: var(--amber);
}

.cure {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.cure-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.cure-label {
  font-size: 15px;
  font-weight: 600;
}

.cure-age {
  font-size: 12px;
  color: var(--text-3);
}

.feedback {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
}

.feedback:empty {
  margin-top: -12px;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.actions .btn {
  padding: 0 12px;
}

.hint {
  margin: -4px 0 0;
  font-size: 12px;
  color: var(--text-3);
}
</style>
