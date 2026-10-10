<script setup lang="ts">
// Single-series vertical bar chart with per-bar tooltip.
export interface Bar {
  label: string
  value: number
  hint?: string
  highlight?: boolean
}

const props = withDefaults(defineProps<{
  bars: Bar[]
  label: string
  unit?: string
}>(), { unit: '' })

const active = ref<number | null>(null)
const max = computed(() => Math.max(...props.bars.map(b => b.value), 1))
</script>

<template>
  <figure
    class="bars"
    role="img"
    :aria-label="label"
  >
    <div
      v-for="(b, i) in bars"
      :key="i"
      class="bar-col"
      @pointerenter="active = i"
      @pointerdown="active = i"
      @pointerleave="active = null"
    >
      <div class="bar-track">
        <div
          v-if="active === i"
          class="tip"
        >
          <strong>{{ b.value }}{{ unit }}</strong>
          <span v-if="b.hint">{{ b.hint }}</span>
        </div>
        <div
          class="bar"
          :class="{ empty: !b.value, highlight: b.highlight }"
          :style="{ height: b.value ? `${Math.max(6, (b.value / max) * 100)}%` : '3px' }"
        />
      </div>
      <span
        class="bar-label"
        :class="{ highlight: b.highlight }"
      >{{ b.label }}</span>
    </div>
  </figure>
</template>

<style scoped>
.bars {
  display: flex;
  align-items: stretch;
  gap: 6px;
  height: 150px;
  margin: 0;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.bar-track {
  position: relative;
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: min(28px, 70%);
  border-radius: 4px 4px 0 0;
  background: color-mix(in srgb, var(--accent) 65%, transparent);
  transition: height 0.4s ease;
}

.bar.highlight {
  background: var(--accent);
}

.bar.empty {
  background: rgba(255, 255, 255, 0.08);
}

.bar-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
}

.bar-label.highlight {
  color: var(--accent);
}

.tip {
  position: absolute;
  bottom: calc(100% - 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  background: #222622;
  border: 1px solid var(--line-strong);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}

.tip span {
  font-size: 11px;
  color: var(--text-2);
}
</style>
